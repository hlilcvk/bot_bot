from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from ..access.catalog import DEFAULT_PLAN_CODE
from ..storage.access_store import initialize as initialize_access_store
from ..storage.sqlite_store import DB_LOCK, connect


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _utc_date() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def initialize() -> None:
    initialize_access_store()
    with DB_LOCK, connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS control_admins (
                admin_id TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                display_name TEXT NOT NULL,
                email TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS usage_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL,
                surface TEXT NOT NULL,
                route TEXT NOT NULL,
                event_type TEXT NOT NULL,
                detail TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS usage_daily_rollups (
                rollup_date TEXT NOT NULL,
                account_id TEXT NOT NULL,
                surface TEXT NOT NULL,
                daily_active_status INTEGER NOT NULL DEFAULT 0,
                route_access_frequency INTEGER NOT NULL DEFAULT 0,
                radar_session_count INTEGER NOT NULL DEFAULT 0,
                feature_usage_count INTEGER NOT NULL DEFAULT 0,
                alert_usage_count INTEGER NOT NULL DEFAULT 0,
                telegram_link_state_changes INTEGER NOT NULL DEFAULT 0,
                last_product_surface_touched TEXT NOT NULL DEFAULT '',
                last_seen_at TEXT NOT NULL DEFAULT '',
                PRIMARY KEY (rollup_date, account_id, surface)
            );

            CREATE TABLE IF NOT EXISTS crm_profiles (
                account_id TEXT PRIMARY KEY,
                lifecycle_stage TEXT NOT NULL,
                engagement_score INTEGER NOT NULL,
                feature_adoption_score INTEGER NOT NULL,
                usage_pattern TEXT NOT NULL,
                plan_fit_score INTEGER NOT NULL,
                payment_reliability_score INTEGER NOT NULL,
                support_risk_score INTEGER NOT NULL,
                upgrade_propensity INTEGER NOT NULL,
                churn_probability INTEGER NOT NULL,
                owner_admin TEXT NOT NULL DEFAULT '',
                last_segmented_at TEXT NOT NULL,
                profile_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS crm_tags (
                account_id TEXT NOT NULL,
                tag TEXT NOT NULL,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (account_id, tag)
            );

            CREATE TABLE IF NOT EXISTS crm_notes (
                note_id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL,
                author_admin_id TEXT NOT NULL,
                note TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS invoice_mirror (
                invoice_id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                provider_status TEXT NOT NULL,
                status TEXT NOT NULL,
                amount_cents INTEGER NOT NULL DEFAULT 0,
                currency TEXT NOT NULL DEFAULT 'USD',
                plan_code TEXT NOT NULL,
                current_period_end TEXT NOT NULL DEFAULT '',
                due_at TEXT NOT NULL DEFAULT '',
                paid_at TEXT NOT NULL DEFAULT '',
                raw_event TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS payment_mirror (
                payment_id TEXT PRIMARY KEY,
                invoice_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                status TEXT NOT NULL,
                amount_cents INTEGER NOT NULL DEFAULT 0,
                currency TEXT NOT NULL DEFAULT 'USD',
                attempted_at TEXT NOT NULL DEFAULT '',
                settled_at TEXT NOT NULL DEFAULT '',
                failure_reason TEXT NOT NULL DEFAULT '',
                plan_code TEXT NOT NULL,
                raw_event TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS failed_payment_events (
                event_id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                provider_status TEXT NOT NULL,
                reason TEXT NOT NULL,
                raw_event TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS finance_reconciliation_queue (
                queue_id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_id TEXT NOT NULL,
                state TEXT NOT NULL,
                reason TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notification_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                notification_type TEXT NOT NULL,
                state TEXT NOT NULL,
                reason TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS blockchain_wallets (
                wallet_id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                address TEXT NOT NULL,
                network TEXT NOT NULL,
                description TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                added_by TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS admin_action_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_admin_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                target_user_id TEXT NOT NULL,
                before_state TEXT NOT NULL,
                after_state TEXT NOT NULL,
                reason TEXT NOT NULL,
                request_id TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE VIEW IF NOT EXISTS control_users_view AS
            SELECT
                a.account_id AS user_id,
                a.account_id AS identity_key,
                a.account_state,
                a.trial_state,
                a.subscription_state,
                a.plan_code AS current_plan,
                a.trial_end_at,
                a.current_period_end,
                a.access_locked,
                a.locked_reason,
                a.last_seen_at,
                a.created_at,
                a.updated_at,
                COALESCE(m.provider, '') AS mirror_provider,
                COALESCE(m.provider_status, '') AS mirror_provider_status,
                COALESCE(m.mapped_state, '') AS mirror_mapped_state,
                COALESCE(m.provider_subscription_id, '') AS mirror_subscription_id
            FROM access_accounts a
            LEFT JOIN subscription_mirror m ON m.account_id = a.account_id;
            """
        )
        now = _utc_now()
        for admin_id, role, display_name, email in (
            ("admin_support", "support_admin", "Support Admin", "support@proptrex.local"),
            ("admin_ops", "ops_admin", "Ops Admin", "ops@proptrex.local"),
            ("admin_super", "super_admin", "Super Admin", "super@proptrex.local"),
        ):
            conn.execute(
                """
                INSERT INTO control_admins (admin_id, role, display_name, email, active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?)
                ON CONFLICT(admin_id) DO UPDATE SET
                    role=excluded.role,
                    display_name=excluded.display_name,
                    email=excluded.email,
                    active=1,
                    updated_at=excluded.updated_at
                """,
                (admin_id, role, display_name, email, now, now),
            )


def _row(row) -> Optional[Dict[str, Any]]:
    return dict(row) if row is not None else None


def get_admin(admin_id: str) -> Optional[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        row = conn.execute("SELECT * FROM control_admins WHERE admin_id = ? AND active = 1", (admin_id,)).fetchone()
    return _row(row)


def list_admins() -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM control_admins ORDER BY role, admin_id").fetchall()
    return [dict(row) for row in rows]


def _surface_from_route(route: str) -> str:
    if route.startswith("/radar"):
        return "radar"
    if route.startswith("/proptrex_radar"):
        return "legacy_product"
    if route.startswith("/pricing"):
        return "pricing"
    if route.startswith("/checkout"):
        return "checkout"
    if route.startswith("/locked"):
        return "locked"
    if route.startswith("/control"):
        return "control"
    return "api"


def record_usage_event(account_id: str, route: str, event_type: str = "route-hit", detail: Optional[Dict[str, Any]] = None) -> None:
    initialize()
    account_id = (account_id or "").strip()
    if not account_id:
        return
    detail = detail or {}
    surface = _surface_from_route(route)
    now = _utc_now()
    rollup_date = _utc_date()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO usage_events (account_id, surface, route, event_type, detail, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (account_id, surface, route, event_type, json.dumps(detail, ensure_ascii=False), now),
        )
        row = conn.execute(
            "SELECT * FROM usage_daily_rollups WHERE rollup_date = ? AND account_id = ? AND surface = ?",
            (rollup_date, account_id, surface),
        ).fetchone()
        current = dict(row) if row else {}
        route_access_frequency = int(current.get("route_access_frequency", 0)) + 1
        radar_session_count = int(current.get("radar_session_count", 0)) + (1 if surface == "radar" else 0)
        feature_usage_count = int(current.get("feature_usage_count", 0)) + (1 if surface == "radar" else 0)
        alert_usage_count = int(current.get("alert_usage_count", 0)) + (1 if "alert" in route or detail.get("alert_related") else 0)
        telegram_link_state_changes = int(current.get("telegram_link_state_changes", 0)) + (
            1 if surface == "api" and route.startswith("/api/telegram/") and event_type in {"telegram-link", "telegram-unlink"} else 0
        )
        conn.execute(
            """
            INSERT INTO usage_daily_rollups (
                rollup_date, account_id, surface, daily_active_status, route_access_frequency,
                radar_session_count, feature_usage_count, alert_usage_count, telegram_link_state_changes,
                last_product_surface_touched, last_seen_at
            ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(rollup_date, account_id, surface) DO UPDATE SET
                daily_active_status=1,
                route_access_frequency=excluded.route_access_frequency,
                radar_session_count=excluded.radar_session_count,
                feature_usage_count=excluded.feature_usage_count,
                alert_usage_count=excluded.alert_usage_count,
                telegram_link_state_changes=excluded.telegram_link_state_changes,
                last_product_surface_touched=excluded.last_product_surface_touched,
                last_seen_at=excluded.last_seen_at
            """,
            (
                rollup_date,
                account_id,
                surface,
                route_access_frequency,
                radar_session_count,
                feature_usage_count,
                alert_usage_count,
                telegram_link_state_changes,
                route,
                now,
            ),
        )


def list_usage_rollups(account_id: Optional[str] = None, window_days: int = 30) -> List[Dict[str, Any]]:
    initialize()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=window_days)).date().isoformat()
    query = "SELECT * FROM usage_daily_rollups WHERE rollup_date >= ?"
    params: List[Any] = [cutoff]
    if account_id:
        query += " AND account_id = ?"
        params.append(account_id)
    query += " ORDER BY rollup_date DESC, account_id ASC, surface ASC"
    with connect() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
    return [dict(row) for row in rows]


def get_usage_summary(account_id: str, window_days: int = 30) -> Dict[str, Any]:
    rows = list_usage_rollups(account_id=account_id, window_days=window_days)
    return {
        "window_days": window_days,
        "route_access_frequency": sum(int(row.get("route_access_frequency", 0)) for row in rows),
        "radar_session_count": sum(int(row.get("radar_session_count", 0)) for row in rows),
        "feature_usage_count": sum(int(row.get("feature_usage_count", 0)) for row in rows),
        "alert_usage_count": sum(int(row.get("alert_usage_count", 0)) for row in rows),
        "telegram_link_state_changes": sum(int(row.get("telegram_link_state_changes", 0)) for row in rows),
        "last_product_surface_touched": rows[0]["last_product_surface_touched"] if rows else "",
        "daily_active_status": bool(rows),
        "last_seen_at": rows[0]["last_seen_at"] if rows else "",
    }


def upsert_crm_profile(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO crm_profiles (
                account_id, lifecycle_stage, engagement_score, feature_adoption_score, usage_pattern,
                plan_fit_score, payment_reliability_score, support_risk_score, upgrade_propensity,
                churn_probability, owner_admin, last_segmented_at, profile_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(account_id) DO UPDATE SET
                lifecycle_stage=excluded.lifecycle_stage,
                engagement_score=excluded.engagement_score,
                feature_adoption_score=excluded.feature_adoption_score,
                usage_pattern=excluded.usage_pattern,
                plan_fit_score=excluded.plan_fit_score,
                payment_reliability_score=excluded.payment_reliability_score,
                support_risk_score=excluded.support_risk_score,
                upgrade_propensity=excluded.upgrade_propensity,
                churn_probability=excluded.churn_probability,
                owner_admin=excluded.owner_admin,
                last_segmented_at=excluded.last_segmented_at,
                profile_json=excluded.profile_json,
                updated_at=excluded.updated_at
            """,
            (
                record["account_id"],
                record["lifecycle_stage"],
                int(record["engagement_score"]),
                int(record["feature_adoption_score"]),
                record["usage_pattern"],
                int(record["plan_fit_score"]),
                int(record["payment_reliability_score"]),
                int(record["support_risk_score"]),
                int(record["upgrade_propensity"]),
                int(record["churn_probability"]),
                record.get("owner_admin", ""),
                record.get("last_segmented_at") or now,
                json.dumps(record.get("profile_json") or {}, ensure_ascii=False),
                now,
            ),
        )
        row = conn.execute("SELECT * FROM crm_profiles WHERE account_id = ?", (record["account_id"],)).fetchone()
    return _row(row) or {}


def get_crm_profile(account_id: str) -> Optional[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        row = conn.execute("SELECT * FROM crm_profiles WHERE account_id = ?", (account_id,)).fetchone()
    return _row(row)


def list_crm_profiles() -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM crm_profiles ORDER BY churn_probability DESC, engagement_score DESC").fetchall()
    return [dict(row) for row in rows]


def replace_crm_tags(account_id: str, tags: List[str], source: str = "rule") -> List[Dict[str, Any]]:
    initialize()
    now = _utc_now()
    clean = sorted({tag.strip() for tag in tags if tag and tag.strip()})
    with DB_LOCK, connect() as conn:
        conn.execute("DELETE FROM crm_tags WHERE account_id = ?", (account_id,))
        for tag in clean:
            conn.execute(
                "INSERT INTO crm_tags (account_id, tag, source, created_at) VALUES (?, ?, ?, ?)",
                (account_id, tag, source, now),
            )
        rows = conn.execute("SELECT * FROM crm_tags WHERE account_id = ? ORDER BY tag", (account_id,)).fetchall()
    return [dict(row) for row in rows]


def list_crm_tags(account_id: Optional[str] = None) -> List[Dict[str, Any]]:
    initialize()
    query = "SELECT * FROM crm_tags"
    params: List[Any] = []
    if account_id:
        query += " WHERE account_id = ?"
        params.append(account_id)
    query += " ORDER BY account_id, tag"
    with connect() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
    return [dict(row) for row in rows]


def add_crm_note(account_id: str, author_admin_id: str, note: str) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            "INSERT INTO crm_notes (account_id, author_admin_id, note, created_at) VALUES (?, ?, ?, ?)",
            (account_id, author_admin_id, note, now),
        )
        row = conn.execute(
            "SELECT * FROM crm_notes WHERE account_id = ? ORDER BY note_id DESC LIMIT 1",
            (account_id,),
        ).fetchone()
    return _row(row) or {}


def list_crm_notes(account_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    query = "SELECT * FROM crm_notes"
    params: List[Any] = []
    if account_id:
        query += " WHERE account_id = ?"
        params.append(account_id)
    query += " ORDER BY created_at DESC, note_id DESC LIMIT ?"
    params.append(limit)
    with connect() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
    return [dict(row) for row in rows]


def record_admin_action(
    actor_admin_id: str,
    action_type: str,
    target_user_id: str,
    before_state: Dict[str, Any],
    after_state: Dict[str, Any],
    reason: str,
    request_id: str,
) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO admin_action_log (
                actor_admin_id, action_type, target_user_id, before_state, after_state, reason, request_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                actor_admin_id,
                action_type,
                target_user_id,
                json.dumps(before_state, ensure_ascii=False),
                json.dumps(after_state, ensure_ascii=False),
                reason,
                request_id,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM admin_action_log WHERE request_id = ? ORDER BY id DESC LIMIT 1", (request_id,)).fetchone()
    return _row(row) or {}


def list_admin_actions(limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM admin_action_log ORDER BY created_at DESC, id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def list_blockchain_wallets() -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM blockchain_wallets ORDER BY created_at DESC").fetchall()
    return [dict(row) for row in rows]


def add_blockchain_wallet(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO blockchain_wallets (
                wallet_id, label, address, network, description, active, created_at, updated_at, added_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["wallet_id"],
                record["label"],
                record["address"],
                record["network"],
                record.get("description") or "",
                int(bool(record.get("active", True))),
                now,
                now,
                record.get("added_by") or "",
            ),
        )
        row = conn.execute("SELECT * FROM blockchain_wallets WHERE wallet_id = ?", (record["wallet_id"],)).fetchone()
    return dict(row) if row else {}


def upsert_invoice_mirror(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO invoice_mirror (
                invoice_id, account_id, provider, provider_status, status, amount_cents, currency,
                plan_code, current_period_end, due_at, paid_at, raw_event, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(invoice_id) DO UPDATE SET
                account_id=excluded.account_id,
                provider=excluded.provider,
                provider_status=excluded.provider_status,
                status=excluded.status,
                amount_cents=excluded.amount_cents,
                currency=excluded.currency,
                plan_code=excluded.plan_code,
                current_period_end=excluded.current_period_end,
                due_at=excluded.due_at,
                paid_at=excluded.paid_at,
                raw_event=excluded.raw_event,
                updated_at=excluded.updated_at
            """,
            (
                record["invoice_id"],
                record["account_id"],
                record["provider"],
                record["provider_status"],
                record["status"],
                int(record.get("amount_cents") or 0),
                record.get("currency") or "USD",
                record["plan_code"],
                record.get("current_period_end") or "",
                record.get("due_at") or "",
                record.get("paid_at") or "",
                record["raw_event"],
                now,
            ),
        )
        row = conn.execute("SELECT * FROM invoice_mirror WHERE invoice_id = ?", (record["invoice_id"],)).fetchone()
    return _row(row) or {}


def upsert_payment_mirror(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO payment_mirror (
                payment_id, invoice_id, account_id, provider, status, amount_cents, currency,
                attempted_at, settled_at, failure_reason, plan_code, raw_event, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(payment_id) DO UPDATE SET
                invoice_id=excluded.invoice_id,
                account_id=excluded.account_id,
                provider=excluded.provider,
                status=excluded.status,
                amount_cents=excluded.amount_cents,
                currency=excluded.currency,
                attempted_at=excluded.attempted_at,
                settled_at=excluded.settled_at,
                failure_reason=excluded.failure_reason,
                plan_code=excluded.plan_code,
                raw_event=excluded.raw_event,
                updated_at=excluded.updated_at
            """,
            (
                record["payment_id"],
                record["invoice_id"],
                record["account_id"],
                record["provider"],
                record["status"],
                int(record.get("amount_cents") or 0),
                record.get("currency") or "USD",
                record.get("attempted_at") or "",
                record.get("settled_at") or "",
                record.get("failure_reason") or "",
                record["plan_code"],
                record["raw_event"],
                now,
            ),
        )
        row = conn.execute("SELECT * FROM payment_mirror WHERE payment_id = ?", (record["payment_id"],)).fetchone()
    return _row(row) or {}


def record_failed_payment_event(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO failed_payment_events (event_id, account_id, provider, provider_status, reason, raw_event, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(event_id) DO UPDATE SET
                account_id=excluded.account_id,
                provider=excluded.provider,
                provider_status=excluded.provider_status,
                reason=excluded.reason,
                raw_event=excluded.raw_event
            """,
            (
                record["event_id"],
                record["account_id"],
                record["provider"],
                record["provider_status"],
                record["reason"],
                record["raw_event"],
                now,
            ),
        )
        row = conn.execute("SELECT * FROM failed_payment_events WHERE event_id = ?", (record["event_id"],)).fetchone()
    return _row(row) or {}


def queue_reconciliation(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO finance_reconciliation_queue (
                queue_id, account_id, provider, source_type, source_id, state, reason, payload, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(queue_id) DO UPDATE SET
                account_id=excluded.account_id,
                provider=excluded.provider,
                source_type=excluded.source_type,
                source_id=excluded.source_id,
                state=excluded.state,
                reason=excluded.reason,
                payload=excluded.payload,
                updated_at=excluded.updated_at
            """,
            (
                record["queue_id"],
                record["account_id"],
                record["provider"],
                record["source_type"],
                record["source_id"],
                record["state"],
                record["reason"],
                record["payload"],
                now,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM finance_reconciliation_queue WHERE queue_id = ?", (record["queue_id"],)).fetchone()
    return _row(row) or {}


def record_notification_event(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO notification_events (account_id, channel, notification_type, state, reason, payload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["account_id"],
                record["channel"],
                record["notification_type"],
                record["state"],
                record["reason"],
                record["payload"],
                now,
            ),
        )
        row = conn.execute(
            "SELECT * FROM notification_events WHERE account_id = ? ORDER BY id DESC LIMIT 1",
            (record["account_id"],),
        ).fetchone()
    return _row(row) or {}


def list_invoice_mirror(limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM invoice_mirror ORDER BY updated_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def list_payment_mirror(limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM payment_mirror ORDER BY updated_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def list_failed_payment_events(limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM failed_payment_events ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def list_reconciliation_queue(limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM finance_reconciliation_queue ORDER BY updated_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def list_notification_events(limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM notification_events ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def list_control_users_view() -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM control_users_view ORDER BY updated_at DESC, user_id ASC").fetchall()
    return [dict(row) for row in rows]


def get_control_user_view(user_id: str) -> Optional[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        row = conn.execute("SELECT * FROM control_users_view WHERE user_id = ?", (user_id,)).fetchone()
    return _row(row)


def mirror_billing_event(provider: str, normalized: Dict[str, Any], raw_event: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    obj = (raw_event.get("data") or {}).get("object") or {}
    account_id = str(normalized.get("account_id") or "").strip()
    if not account_id:
        return {"invoice": {}, "payment": {}, "skipped": True}
    event_id = str(normalized.get("event_id") or obj.get("id") or "")
    plan_code = str(normalized.get("plan_code") or DEFAULT_PLAN_CODE)
    provider_status = str(normalized.get("provider_status") or "incomplete")
    currency = str(obj.get("currency") or obj.get("currency_code") or "USD")
    amount_cents = int(
        obj.get("amount_paid")
        or obj.get("amount_due")
        or obj.get("amount")
        or ((obj.get("totals") or {}).get("total") if isinstance(obj.get("totals"), dict) else 0)
        or 0
    )
    invoice_id = str(obj.get("invoice") or obj.get("invoice_id") or f"invoice_{event_id}")
    payment_id = str(obj.get("payment_intent") or obj.get("transaction_id") or f"payment_{event_id}")
    current_period_end = str(normalized.get("current_period_end") or obj.get("current_period_end") or "")
    paid_at = _utc_now() if provider_status == "active" else ""
    invoice = upsert_invoice_mirror(
        {
            "invoice_id": invoice_id,
            "account_id": account_id,
            "provider": provider,
            "provider_status": provider_status,
            "status": "paid" if provider_status == "active" else provider_status,
            "amount_cents": amount_cents,
            "currency": currency,
            "plan_code": plan_code,
            "current_period_end": current_period_end,
            "due_at": str(obj.get("due_at") or obj.get("billing_period_start") or ""),
            "paid_at": paid_at,
            "raw_event": json.dumps(raw_event, ensure_ascii=False),
        }
    )
    payment = upsert_payment_mirror(
        {
            "payment_id": payment_id,
            "invoice_id": invoice_id,
            "account_id": account_id,
            "provider": provider,
            "status": "paid" if provider_status == "active" else provider_status,
            "amount_cents": amount_cents,
            "currency": currency,
            "attempted_at": str(obj.get("created") or obj.get("attempted_at") or _utc_now()),
            "settled_at": paid_at,
            "failure_reason": "" if provider_status == "active" else provider_status,
            "plan_code": plan_code,
            "raw_event": json.dumps(raw_event, ensure_ascii=False),
        }
    )
    if provider_status in {"past_due", "unpaid", "incomplete", "incomplete_expired"}:
        record_failed_payment_event(
            {
                "event_id": event_id,
                "account_id": account_id,
                "provider": provider,
                "provider_status": provider_status,
                "reason": provider_status,
                "raw_event": json.dumps(raw_event, ensure_ascii=False),
            }
        )
        queue_reconciliation(
            {
                "queue_id": f"recon_{event_id}",
                "account_id": account_id,
                "provider": provider,
                "source_type": "webhook",
                "source_id": event_id,
                "state": "pending",
                "reason": provider_status,
                "payload": json.dumps({"invoice_id": invoice_id, "payment_id": payment_id}, ensure_ascii=False),
            }
        )
    return {"invoice": invoice, "payment": payment}
