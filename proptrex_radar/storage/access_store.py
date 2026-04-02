from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..access.catalog import ENTITLEMENT_VERSION
from ..access.resolver import default_account_record
from .sqlite_store import DB_LOCK, connect


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def initialize() -> None:
    with DB_LOCK, connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS access_accounts (
                account_id TEXT PRIMARY KEY,
                account_state TEXT NOT NULL,
                trial_state TEXT NOT NULL,
                subscription_state TEXT NOT NULL,
                plan_code TEXT NOT NULL,
                access_locked INTEGER NOT NULL DEFAULT 0,
                locked_reason TEXT NOT NULL DEFAULT '',
                trial_started_at TEXT NOT NULL,
                trial_end_at TEXT NOT NULL,
                current_period_end TEXT NOT NULL DEFAULT '',
                entitlement_version TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS access_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                route TEXT NOT NULL,
                decision TEXT NOT NULL,
                reason TEXT NOT NULL,
                detail TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS billing_events (
                event_id TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                event_type TEXT NOT NULL,
                signature_valid INTEGER NOT NULL,
                status TEXT NOT NULL,
                account_id TEXT,
                provider_customer_id TEXT,
                provider_subscription_id TEXT,
                provider_status TEXT,
                plan_code TEXT,
                current_period_end TEXT,
                trial_end_at TEXT,
                raw_event TEXT NOT NULL,
                detail TEXT NOT NULL,
                processed_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS subscription_mirror (
                account_id TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                provider_event_id TEXT NOT NULL,
                provider_customer_id TEXT,
                provider_subscription_id TEXT,
                provider_status TEXT NOT NULL,
                mapped_state TEXT NOT NULL,
                plan_code TEXT NOT NULL,
                current_period_end TEXT,
                trial_end_at TEXT,
                raw_event TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(access_accounts)").fetchall()}
        if "last_seen_at" not in columns:
            conn.execute("ALTER TABLE access_accounts ADD COLUMN last_seen_at TEXT NOT NULL DEFAULT ''")
        if "locked_until" not in columns:
            conn.execute("ALTER TABLE access_accounts ADD COLUMN locked_until TEXT NOT NULL DEFAULT ''")


def _row_to_dict(row) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    return dict(row)


def get_account(account_id: str) -> Optional[Dict[str, Any]]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM access_accounts WHERE account_id = ?", (account_id,)).fetchone()
    return _row_to_dict(row)


def list_accounts(limit: int = 50) -> List[Dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM access_accounts ORDER BY updated_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def upsert_account(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    base = default_account_record(str(record.get("account_id") or ""))
    merged = {**base, **record}
    with DB_LOCK, connect() as conn:
        existing = conn.execute("SELECT created_at FROM access_accounts WHERE account_id = ?", (merged["account_id"],)).fetchone()
        created_at = existing["created_at"] if existing else now
        conn.execute(
            """
            INSERT INTO access_accounts (
                account_id, account_state, trial_state, subscription_state, plan_code,
                access_locked, locked_reason, trial_started_at, trial_end_at, current_period_end,
                last_seen_at, locked_until, entitlement_version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(account_id) DO UPDATE SET
                account_state=excluded.account_state,
                trial_state=excluded.trial_state,
                subscription_state=excluded.subscription_state,
                plan_code=excluded.plan_code,
                access_locked=excluded.access_locked,
                locked_reason=excluded.locked_reason,
                trial_started_at=excluded.trial_started_at,
                trial_end_at=excluded.trial_end_at,
                current_period_end=excluded.current_period_end,
                last_seen_at=excluded.last_seen_at,
                locked_until=excluded.locked_until,
                entitlement_version=excluded.entitlement_version,
                updated_at=excluded.updated_at
            """,
            (
                merged["account_id"],
                merged["account_state"],
                merged["trial_state"],
                merged["subscription_state"],
                merged["plan_code"],
                int(bool(merged["access_locked"])),
                merged["locked_reason"],
                merged["trial_started_at"],
                merged["trial_end_at"],
                merged.get("current_period_end") or "",
                merged.get("last_seen_at") or "",
                merged.get("locked_until") or "",
                merged.get("entitlement_version") or ENTITLEMENT_VERSION,
                created_at,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM access_accounts WHERE account_id = ?", (merged["account_id"],)).fetchone()
    return _row_to_dict(row) or {}


def record_access_event(account_id: str, event_type: str, route: str, decision: str, reason: str, detail: Dict[str, Any]) -> None:
    initialize()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO access_events (account_id, event_type, route, decision, reason, detail, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (account_id, event_type, route, decision, reason, json.dumps(detail, ensure_ascii=False), _utc_now()),
        )


def touch_account(account_id: str, **fields: Any) -> Optional[Dict[str, Any]]:
    row = get_account(account_id)
    if row is None:
        return None
    row.update(fields)
    row["account_id"] = account_id
    row["last_seen_at"] = fields.get("last_seen_at") or _utc_now()
    return upsert_account(row)


def get_subscription_mirror(account_id: str) -> Optional[Dict[str, Any]]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM subscription_mirror WHERE account_id = ?", (account_id,)).fetchone()
    return _row_to_dict(row)


def upsert_subscription_mirror(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO subscription_mirror (
                account_id, provider, provider_event_id, provider_customer_id,
                provider_subscription_id, provider_status, mapped_state, plan_code,
                current_period_end, trial_end_at, raw_event, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(account_id) DO UPDATE SET
                provider=excluded.provider,
                provider_event_id=excluded.provider_event_id,
                provider_customer_id=excluded.provider_customer_id,
                provider_subscription_id=excluded.provider_subscription_id,
                provider_status=excluded.provider_status,
                mapped_state=excluded.mapped_state,
                plan_code=excluded.plan_code,
                current_period_end=excluded.current_period_end,
                trial_end_at=excluded.trial_end_at,
                raw_event=excluded.raw_event,
                updated_at=excluded.updated_at
            """,
            (
                record["account_id"],
                record["provider"],
                record["provider_event_id"],
                record.get("provider_customer_id"),
                record.get("provider_subscription_id"),
                record["provider_status"],
                record["mapped_state"],
                record["plan_code"],
                record.get("current_period_end") or "",
                record.get("trial_end_at") or "",
                record["raw_event"],
                now,
            ),
        )
        row = conn.execute("SELECT * FROM subscription_mirror WHERE account_id = ?", (record["account_id"],)).fetchone()
    return _row_to_dict(row) or {}


def record_billing_event(record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        try:
            conn.execute(
                """
                INSERT INTO billing_events (
                    event_id, provider, event_type, signature_valid, status, account_id,
                    provider_customer_id, provider_subscription_id, provider_status, plan_code,
                    current_period_end, trial_end_at, raw_event, detail, processed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["event_id"],
                    record["provider"],
                    record["event_type"],
                    int(bool(record["signature_valid"])),
                    record["status"],
                    record.get("account_id"),
                    record.get("provider_customer_id"),
                    record.get("provider_subscription_id"),
                    record.get("provider_status"),
                    record.get("plan_code"),
                    record.get("current_period_end") or "",
                    record.get("trial_end_at") or "",
                    record["raw_event"],
                    record.get("detail") or "{}",
                    now,
                ),
            )
        except Exception:
            row = conn.execute("SELECT * FROM billing_events WHERE event_id = ?", (record["event_id"],)).fetchone()
            return _row_to_dict(row)
        row = conn.execute("SELECT * FROM billing_events WHERE event_id = ?", (record["event_id"],)).fetchone()
    return _row_to_dict(row)


def list_billing_events(limit: int = 50) -> List[Dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM billing_events ORDER BY processed_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def list_access_events(limit: int = 100) -> List[Dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM access_events ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]
