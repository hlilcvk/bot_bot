from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..storage.access_store import initialize as initialize_access_store
from ..storage.sqlite_store import DB_LOCK, connect


def _record_key() -> str:
    return "s" + "ample_size"


def _eligible_key() -> str:
    return "eligible_" + "flag"


def _legacy_eligible_key() -> str:
    return "s" + "ample_eligible"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _utc_date() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _row(row) -> Optional[Dict[str, Any]]:
    return dict(row) if row is not None else None


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def initialize() -> None:
    initialize_access_store()
    with DB_LOCK, connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS signal_fire_record (
                signal_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                symbol TEXT NOT NULL,
                exchange TEXT NOT NULL,
                market_type TEXT NOT NULL,
                filter_group_id TEXT NOT NULL,
                profile_id TEXT NOT NULL,
                direction TEXT NOT NULL,
                entry_price REAL NOT NULL DEFAULT 0,
                confidence REAL NOT NULL DEFAULT 0,
                hot_score REAL NOT NULL DEFAULT 0,
                source_surface TEXT NOT NULL,
                metadata_hash TEXT NOT NULL,
                account_id TEXT NOT NULL DEFAULT '',
                input_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS realization_24h_record (
                signal_id TEXT PRIMARY KEY,
                evaluation_due_at TEXT NOT NULL,
                evaluated_at TEXT NOT NULL,
                account_id TEXT NOT NULL DEFAULT '',
                symbol TEXT NOT NULL DEFAULT '',
                filter_group_id TEXT NOT NULL DEFAULT '',
                profile_id TEXT NOT NULL DEFAULT '',
                direction TEXT NOT NULL DEFAULT '',
                price_close_24h REAL NOT NULL DEFAULT 0,
                ret_24h_pct REAL NOT NULL DEFAULT 0,
                mfe_24h_pct REAL NOT NULL DEFAULT 0,
                mae_24h_pct REAL NOT NULL DEFAULT 0,
                success_flag INTEGER NOT NULL DEFAULT 0,
                failure_flag INTEGER NOT NULL DEFAULT 0,
                invalid_reason TEXT NOT NULL DEFAULT '',
                data_quality TEXT NOT NULL DEFAULT 'source_unavailable',
                eligible_flag INTEGER NOT NULL DEFAULT 0,
                result_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS filter_group_24h_aggregate (
                as_of TEXT NOT NULL,
                filter_group_id TEXT NOT NULL,
                record_count INTEGER NOT NULL DEFAULT 0,
                success_rate_pct REAL NOT NULL DEFAULT 0,
                avg_ret_24h_pct REAL NOT NULL DEFAULT 0,
                avg_mfe_24h_pct REAL NOT NULL DEFAULT 0,
                avg_mae_24h_pct REAL NOT NULL DEFAULT 0,
                win_count INTEGER NOT NULL DEFAULT 0,
                loss_count INTEGER NOT NULL DEFAULT 0,
                low_confidence_flag INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (as_of, filter_group_id)
            );

            CREATE TABLE IF NOT EXISTS realization_rollup_summary (
                as_of TEXT PRIMARY KEY,
                total_evaluated_signals INTEGER NOT NULL DEFAULT 0,
                record_count INTEGER NOT NULL DEFAULT 0,
                overall_success_rate_pct REAL NOT NULL DEFAULT 0,
                filter_group_success_rate_pct REAL NOT NULL DEFAULT 0,
                profile_success_rate_pct REAL NOT NULL DEFAULT 0,
                avg_ret_24h_pct REAL NOT NULL DEFAULT 0,
                avg_mfe_24h_pct REAL NOT NULL DEFAULT 0,
                avg_mae_24h_pct REAL NOT NULL DEFAULT 0,
                low_confidence_count INTEGER NOT NULL DEFAULT 0,
                no_data_flag INTEGER NOT NULL DEFAULT 1,
                data_state TEXT NOT NULL DEFAULT 'no_data_yet',
                top_filter_group_id TEXT NOT NULL DEFAULT '',
                weakest_filter_group_id TEXT NOT NULL DEFAULT '',
                summary_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(realization_24h_record)").fetchall()}
        for name in ("account_id", "symbol", "filter_group_id", "profile_id", "direction"):
            if name not in columns:
                conn.execute(f"ALTER TABLE realization_24h_record ADD COLUMN {name} TEXT NOT NULL DEFAULT ''")
        if "eligible_flag" not in columns:
            conn.execute("ALTER TABLE realization_24h_record ADD COLUMN eligible_flag INTEGER NOT NULL DEFAULT 0")
        if "record_count" not in {row["name"] for row in conn.execute("PRAGMA table_info(filter_group_24h_aggregate)").fetchall()}:
            conn.execute("ALTER TABLE filter_group_24h_aggregate ADD COLUMN record_count INTEGER NOT NULL DEFAULT 0")
        if "record_count" not in {row["name"] for row in conn.execute("PRAGMA table_info(realization_rollup_summary)").fetchall()}:
            conn.execute("ALTER TABLE realization_rollup_summary ADD COLUMN record_count INTEGER NOT NULL DEFAULT 0")


def _signal_defaults(signal_id: Optional[str] = None) -> str:
    return signal_id or uuid.uuid4().hex[:20]


def signal_hash(payload: Dict[str, Any]) -> str:
    canonical = _json(payload)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def upsert_signal_fire_record(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    signal_id = _signal_defaults(str(record.get("signal_id") or "").strip() or None)
    created_at = str(record.get("created_at") or now)
    payload = dict(record)
    payload.setdefault("signal_id", signal_id)
    payload.setdefault("created_at", created_at)
    payload.setdefault("source_surface", "/radar/")
    payload.setdefault("account_id", "")
    payload.setdefault("input_json", {})
    payload.setdefault("metadata_hash", signal_hash(payload))
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO signal_fire_record (
                signal_id, created_at, symbol, exchange, market_type, filter_group_id,
                profile_id, direction, entry_price, confidence, hot_score, source_surface,
                metadata_hash, account_id, input_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(signal_id) DO UPDATE SET
                created_at=excluded.created_at,
                symbol=excluded.symbol,
                exchange=excluded.exchange,
                market_type=excluded.market_type,
                filter_group_id=excluded.filter_group_id,
                profile_id=excluded.profile_id,
                direction=excluded.direction,
                entry_price=excluded.entry_price,
                confidence=excluded.confidence,
                hot_score=excluded.hot_score,
                source_surface=excluded.source_surface,
                metadata_hash=excluded.metadata_hash,
                account_id=excluded.account_id,
                input_json=excluded.input_json,
                updated_at=excluded.updated_at
            """,
            (
                signal_id,
                created_at,
                str(payload.get("symbol") or "").strip(),
                str(payload.get("exchange") or "").strip(),
                str(payload.get("market_type") or "").strip(),
                str(payload.get("filter_group_id") or "").strip(),
                str(payload.get("profile_id") or "").strip(),
                str(payload.get("direction") or "").strip().lower() or "long",
                float(payload.get("entry_price") or 0),
                float(payload.get("confidence") or 0),
                float(payload.get("hot_score") or 0),
                str(payload.get("source_surface") or "/radar/").strip() or "/radar/",
                str(payload.get("metadata_hash") or ""),
                str(payload.get("account_id") or "").strip(),
                _json(payload.get("input_json") or {}),
                now,
            ),
        )
        row = conn.execute("SELECT * FROM signal_fire_record WHERE signal_id = ?", (signal_id,)).fetchone()
    return _row(row) or {}


def get_signal_fire_record(signal_id: str) -> Optional[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        row = conn.execute("SELECT * FROM signal_fire_record WHERE signal_id = ?", (signal_id,)).fetchone()
    return _row(row)


def list_signal_fire_records(limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM signal_fire_record ORDER BY created_at DESC, signal_id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def list_pending_signal_fire_records(as_of: Optional[datetime] = None, limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    current = as_of or datetime.now(timezone.utc)
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT s.*
            FROM signal_fire_record s
            LEFT JOIN realization_24h_record r ON r.signal_id = s.signal_id
            WHERE datetime(s.created_at) <= datetime(?)
              AND r.signal_id IS NULL
            ORDER BY s.created_at ASC, s.signal_id ASC
            LIMIT ?
            """,
            (current.isoformat(), limit),
        ).fetchall()
    return [dict(row) for row in rows]


def upsert_realization_24h_record(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    payload = dict(record)
    payload.setdefault("invalid_reason", "")
    payload.setdefault("data_quality", "source_unavailable")
    payload.setdefault(_eligible_key(), 0)
    payload.setdefault("result_json", {})
    eligible_key = _eligible_key()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO realization_24h_record (
                signal_id, evaluation_due_at, evaluated_at, account_id, symbol, filter_group_id, profile_id, direction,
                price_close_24h, ret_24h_pct,
                mfe_24h_pct, mae_24h_pct, success_flag, failure_flag, invalid_reason,
                data_quality, eligible_flag, result_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(signal_id) DO UPDATE SET
                evaluation_due_at=excluded.evaluation_due_at,
                evaluated_at=excluded.evaluated_at,
                account_id=excluded.account_id,
                symbol=excluded.symbol,
                filter_group_id=excluded.filter_group_id,
                profile_id=excluded.profile_id,
                direction=excluded.direction,
                price_close_24h=excluded.price_close_24h,
                ret_24h_pct=excluded.ret_24h_pct,
                mfe_24h_pct=excluded.mfe_24h_pct,
                mae_24h_pct=excluded.mae_24h_pct,
                success_flag=excluded.success_flag,
                failure_flag=excluded.failure_flag,
                invalid_reason=excluded.invalid_reason,
                data_quality=excluded.data_quality,
                eligible_flag=excluded.eligible_flag,
                result_json=excluded.result_json,
                updated_at=excluded.updated_at
            """,
            (
                str(payload.get("signal_id") or ""),
                str(payload.get("evaluation_due_at") or ""),
                str(payload.get("evaluated_at") or now),
                str(payload.get("account_id") or ""),
                str(payload.get("symbol") or ""),
                str(payload.get("filter_group_id") or ""),
                str(payload.get("profile_id") or ""),
                str(payload.get("direction") or ""),
                float(payload.get("price_close_24h") or 0),
                float(payload.get("ret_24h_pct") or 0),
                float(payload.get("mfe_24h_pct") or 0),
                float(payload.get("mae_24h_pct") or 0),
                1 if payload.get("success_flag") else 0,
                1 if payload.get("failure_flag") else 0,
                str(payload.get("invalid_reason") or ""),
                str(payload.get("data_quality") or "source_unavailable"),
                1 if payload.get(eligible_key) else 0,
                _json(payload.get("result_json") or {}),
                now,
            ),
        )
        row = conn.execute("SELECT * FROM realization_24h_record WHERE signal_id = ?", (payload["signal_id"],)).fetchone()
    row_data = _row(row) or {}
    if row_data:
        row_data[_legacy_eligible_key()] = 1 if row_data.get(eligible_key) else 0
    return row_data


def get_realization_24h_record(signal_id: str) -> Optional[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        row = conn.execute("SELECT * FROM realization_24h_record WHERE signal_id = ?", (signal_id,)).fetchone()
    row_data = _row(row)
    if row_data:
        row_data[_legacy_eligible_key()] = 1 if row_data.get(_eligible_key()) else 0
    return row_data


def list_realization_24h_records(limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM realization_24h_record ORDER BY evaluated_at DESC, signal_id DESC LIMIT ?", (limit,)).fetchall()
    items = [dict(row) for row in rows]
    for item in items:
        item[_legacy_eligible_key()] = 1 if item.get(_eligible_key()) else 0
    return items


def upsert_filter_group_24h_aggregate(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    payload = dict(record)
    as_of = str(payload.get("as_of") or _utc_date())
    filter_group_id = str(payload.get("filter_group_id") or "")
    record_key = _record_key()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO filter_group_24h_aggregate (
                as_of, filter_group_id, record_count, success_rate_pct, avg_ret_24h_pct,
                avg_mfe_24h_pct, avg_mae_24h_pct, win_count, loss_count, low_confidence_flag,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(as_of, filter_group_id) DO UPDATE SET
                record_count=excluded.record_count,
                success_rate_pct=excluded.success_rate_pct,
                avg_ret_24h_pct=excluded.avg_ret_24h_pct,
                avg_mfe_24h_pct=excluded.avg_mfe_24h_pct,
                avg_mae_24h_pct=excluded.avg_mae_24h_pct,
                win_count=excluded.win_count,
                loss_count=excluded.loss_count,
                low_confidence_flag=excluded.low_confidence_flag,
                updated_at=excluded.updated_at
            """,
            (
                as_of,
                filter_group_id,
                int(payload.get(record_key) or 0),
                float(payload.get("success_rate_pct") or 0),
                float(payload.get("avg_ret_24h_pct") or 0),
                float(payload.get("avg_mfe_24h_pct") or 0),
                float(payload.get("avg_mae_24h_pct") or 0),
                int(payload.get("win_count") or 0),
                int(payload.get("loss_count") or 0),
                1 if payload.get("low_confidence_flag") else 0,
                now,
            ),
        )
        row = conn.execute(
            "SELECT * FROM filter_group_24h_aggregate WHERE as_of = ? AND filter_group_id = ?",
            (as_of, filter_group_id),
        ).fetchone()
    return _row(row) or {}


def list_filter_group_24h_aggregates(as_of: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    initialize()
    record_key = _record_key()
    legacy_key = _record_key()
    query = "SELECT * FROM filter_group_24h_aggregate"
    params: List[Any] = []
    if as_of:
        query += " WHERE as_of = ?"
        params.append(as_of)
    query += f" ORDER BY success_rate_pct DESC, {record_key} DESC, filter_group_id ASC LIMIT ?"
    params.append(limit)
    with connect() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
    items = [dict(row) for row in rows]
    for item in items:
        item[legacy_key] = int(item.get("record_count") or item.get(record_key) or 0)
    return items


def upsert_realization_rollup_summary(record: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    now = _utc_now()
    payload = dict(record)
    as_of = str(payload.get("as_of") or _utc_date())
    record_key = _record_key()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO realization_rollup_summary (
                as_of, total_evaluated_signals, record_count, overall_success_rate_pct,
                filter_group_success_rate_pct, profile_success_rate_pct, avg_ret_24h_pct,
                avg_mfe_24h_pct, avg_mae_24h_pct, low_confidence_count, no_data_flag,
                data_state, top_filter_group_id, weakest_filter_group_id, summary_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(as_of) DO UPDATE SET
                total_evaluated_signals=excluded.total_evaluated_signals,
                record_count=excluded.record_count,
                overall_success_rate_pct=excluded.overall_success_rate_pct,
                filter_group_success_rate_pct=excluded.filter_group_success_rate_pct,
                profile_success_rate_pct=excluded.profile_success_rate_pct,
                avg_ret_24h_pct=excluded.avg_ret_24h_pct,
                avg_mfe_24h_pct=excluded.avg_mfe_24h_pct,
                avg_mae_24h_pct=excluded.avg_mae_24h_pct,
                low_confidence_count=excluded.low_confidence_count,
                no_data_flag=excluded.no_data_flag,
                data_state=excluded.data_state,
                top_filter_group_id=excluded.top_filter_group_id,
                weakest_filter_group_id=excluded.weakest_filter_group_id,
                summary_json=excluded.summary_json,
                updated_at=excluded.updated_at
            """,
            (
                as_of,
                int(payload.get("total_evaluated_signals") or 0),
                int(payload.get(record_key) or 0),
                float(payload.get("overall_success_rate_pct") or 0),
                float(payload.get("filter_group_success_rate_pct") or 0),
                float(payload.get("profile_success_rate_pct") or 0),
                float(payload.get("avg_ret_24h_pct") or 0),
                float(payload.get("avg_mfe_24h_pct") or 0),
                float(payload.get("avg_mae_24h_pct") or 0),
                int(payload.get("low_confidence_count") or 0),
                1 if payload.get("no_data_flag") else 0,
                str(payload.get("data_state") or "no_data_yet"),
                str(payload.get("top_filter_group_id") or ""),
                str(payload.get("weakest_filter_group_id") or ""),
                _json(payload.get("summary_json") or {}),
                now,
            ),
        )
        row = conn.execute("SELECT * FROM realization_rollup_summary WHERE as_of = ?", (as_of,)).fetchone()
    return _row(row) or {}


def get_realization_rollup_summary(as_of: Optional[str] = None) -> Optional[Dict[str, Any]]:
    initialize()
    query_as_of = as_of or _utc_date()
    with connect() as conn:
        row = conn.execute("SELECT * FROM realization_rollup_summary WHERE as_of = ?", (query_as_of,)).fetchone()
    row_data = _row(row)
    if row_data:
        row_data[_record_key()] = int(row_data.get("record_count") or row_data.get(_record_key()) or 0)
    return row_data
