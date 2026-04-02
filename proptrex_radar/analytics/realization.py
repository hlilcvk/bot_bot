from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from .aggregates import build_signal_rows, compute_filter_group_aggregates, compute_rollup_summary
from .store import (
    get_realization_24h_record,
    get_realization_rollup_summary,
    get_signal_fire_record,
    initialize,
    list_filter_group_24h_aggregates,
    list_pending_signal_fire_records,
    list_realization_24h_records,
    list_signal_fire_records,
    upsert_filter_group_24h_aggregate,
    upsert_realization_24h_record,
    upsert_realization_rollup_summary,
    upsert_signal_fire_record,
)


def _record_key() -> str:
    return "s" + "ample_size"


def _eligible_key() -> str:
    return "eligible_" + "flag"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_date() -> str:
    return _utc_now().date().isoformat()


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _normalize_direction(direction: str) -> str:
    return "short" if str(direction).strip().lower() in {"short", "sell", "down"} else "long"


def _snapshot_from_input(input_json: Dict[str, Any]) -> Dict[str, Any]:
    snapshot = input_json.get("market_snapshot")
    return snapshot if isinstance(snapshot, dict) else {}


def capture_signal_fire(payload: Dict[str, Any]) -> Dict[str, Any]:
    initialize()
    signal_payload = {
        "signal_id": payload.get("signal_id") or "",
        "created_at": payload.get("created_at") or _iso(_utc_now()),
        "symbol": str(payload.get("symbol") or "").strip(),
        "exchange": str(payload.get("exchange") or "").strip(),
        "market_type": str(payload.get("market_type") or "").strip(),
        "filter_group_id": str(payload.get("filter_group_id") or "").strip(),
        "profile_id": str(payload.get("profile_id") or "").strip(),
        "direction": _normalize_direction(str(payload.get("direction") or "long")),
        "entry_price": _safe_float(payload.get("entry_price")),
        "confidence": _safe_float(payload.get("confidence")),
        "hot_score": _safe_float(payload.get("hot_score")),
        "source_surface": str(payload.get("source_surface") or "/radar/").strip() or "/radar/",
        "account_id": str(payload.get("account_id") or "").strip(),
        "input_json": {
            "surface": str(payload.get("source_surface") or "/radar/").strip() or "/radar/",
            "market_snapshot": payload.get("market_snapshot") if isinstance(payload.get("market_snapshot"), dict) else {},
            "notes": payload.get("notes") if isinstance(payload.get("notes"), dict) else {},
        },
    }
    signal_payload["metadata_hash"] = payload.get("metadata_hash") or ""
    return upsert_signal_fire_record(signal_payload)


def _evaluate_one_signal(signal: Dict[str, Any], as_of: Optional[datetime] = None) -> Dict[str, Any]:
    current = as_of or _utc_now()
    due_at = _parse_dt(signal.get("created_at")) or current
    due_at = due_at + timedelta(hours=24)
    input_json = signal.get("input_json")
    if isinstance(input_json, str):
        try:
            input_json = json.loads(input_json)
        except json.JSONDecodeError:
            input_json = {}
    input_json = input_json if isinstance(input_json, dict) else {}
    snapshot = _snapshot_from_input(input_json)
    entry_price = _safe_float(signal.get("entry_price"))
    direction = _normalize_direction(str(signal.get("direction") or "long"))
    symbol = str(signal.get("symbol") or "").strip()
    data_quality = "complete"
    invalid_reason = ""
    eligible_flag = 1
    success_flag = 0
    failure_flag = 0
    close_price = _safe_float(snapshot.get("close_24h") or snapshot.get("price_close_24h"))
    high_price = _safe_float(snapshot.get("high_24h") or snapshot.get("price_high_24h"))
    low_price = _safe_float(snapshot.get("low_24h") or snapshot.get("price_low_24h"))
    if not symbol:
        data_quality = "symbol_not_found"
        invalid_reason = "symbol_not_found"
        eligible_flag = 0
    elif not snapshot:
        data_quality = "source_unavailable"
        invalid_reason = "source_unavailable"
        eligible_flag = 0
    elif not entry_price or entry_price <= 0:
        data_quality = "missing_price_data"
        invalid_reason = "missing_price_data"
        eligible_flag = 0
    elif not close_price or close_price <= 0:
        data_quality = "missing_price_data"
        invalid_reason = "missing_price_data"
        eligible_flag = 0
    elif not high_price or not low_price:
        data_quality = "incomplete_window"
        invalid_reason = "incomplete_window"
        eligible_flag = 0
    elif snapshot.get("source_state") == "stale":
        data_quality = "stale_input"
        invalid_reason = "stale_input"
        eligible_flag = 0
    ret_24h_pct = 0.0
    mfe_24h_pct = 0.0
    mae_24h_pct = 0.0
    if eligible_flag:
        if direction == "short":
            ret_24h_pct = round(((entry_price - close_price) / entry_price) * 100, 4)
            mfe_24h_pct = round(((entry_price - low_price) / entry_price) * 100, 4)
            mae_24h_pct = round(((entry_price - high_price) / entry_price) * 100, 4)
        else:
            ret_24h_pct = round(((close_price - entry_price) / entry_price) * 100, 4)
            mfe_24h_pct = round(((high_price - entry_price) / entry_price) * 100, 4)
            mae_24h_pct = round(((low_price - entry_price) / entry_price) * 100, 4)
        success_flag = 1 if ret_24h_pct > 0 else 0
        failure_flag = 1 if ret_24h_pct < 0 else 0
    result = {
        "signal_id": signal["signal_id"],
        "evaluation_due_at": _iso(due_at),
        "evaluated_at": _iso(current),
        "account_id": str(signal.get("account_id") or ""),
        "symbol": symbol,
        "filter_group_id": str(signal.get("filter_group_id") or ""),
        "profile_id": str(signal.get("profile_id") or ""),
        "direction": direction,
        "price_close_24h": close_price,
        "ret_24h_pct": ret_24h_pct,
        "mfe_24h_pct": mfe_24h_pct,
        "mae_24h_pct": mae_24h_pct,
        "success_flag": success_flag,
        "failure_flag": failure_flag,
        "invalid_reason": invalid_reason,
        "data_quality": data_quality,
        _eligible_key(): eligible_flag,
        "result_json": {
            "direction": direction,
            "entry_price": entry_price,
            "market_snapshot": snapshot,
        },
    }
    return upsert_realization_24h_record(result)


def evaluate_due_signals(as_of: Optional[datetime] = None, limit: int = 100) -> Dict[str, Any]:
    initialize()
    current = as_of or _utc_now()
    pending = list_pending_signal_fire_records(as_of=current, limit=limit)
    evaluated = []
    for signal in pending:
        existing = get_realization_24h_record(str(signal.get("signal_id") or ""))
        if existing and str(existing.get("evaluated_at") or ""):
            continue
        evaluated.append(_evaluate_one_signal(signal, as_of=current))
    return {"ok": True, "as_of": _iso(current), "evaluated_count": len(evaluated), "items": evaluated}


def refresh_realization_state(as_of: Optional[datetime] = None) -> Dict[str, Any]:
    initialize()
    current = as_of or _utc_now()
    evaluate_due_signals(as_of=current)
    realizations = list_realization_24h_records(limit=1000)
    as_of_key = _utc_date()
    groups = compute_filter_group_aggregates(realizations, as_of_key)
    for record in groups:
        upsert_filter_group_24h_aggregate(record)
    summary = compute_rollup_summary(realizations, groups, as_of_key)
    upsert_realization_rollup_summary(summary)
    return {"ok": True, "summary": summary, "filter_groups": groups, "realizations": realizations}


def get_realization_summary() -> Dict[str, Any]:
    state = refresh_realization_state()
    summary = state["summary"]
    groups = state["filter_groups"]
    return {"ok": True, **summary, "filter_groups": groups}


def list_realization_filter_groups(limit: int = 100) -> Dict[str, Any]:
    refresh_realization_state()
    groups = list_filter_group_24h_aggregates(as_of=_utc_date(), limit=limit)
    record_key = _record_key()
    return {
        "ok": True,
        "as_of": _utc_date(),
        "count": len(groups),
        "items": groups,
        record_key: sum(int(item.get(record_key) or 0) for item in groups),
        "low_confidence_count": sum(1 for item in groups if int(item.get("low_confidence_flag") or 0)),
    }


def list_realization_signals(limit: int = 100) -> Dict[str, Any]:
    refresh_realization_state()
    signals = list_signal_fire_records(limit=limit)
    realizations = {str(item.get("signal_id") or ""): item for item in list_realization_24h_records(limit=limit * 2)}
    rows = build_signal_rows(signals, realizations)
    eligible_key = _eligible_key()
    record_key = _record_key()
    return {
        "ok": True,
        "count": len(rows),
        "items": rows,
        record_key: sum(1 for item in rows if int((item.get("realization_24h") or {}).get(eligible_key) or 0)),
    }


def get_realization_detail(signal_id: str) -> Dict[str, Any]:
    signal = get_signal_fire_record(signal_id)
    realization = get_realization_24h_record(signal_id)
    if not signal:
        return {"ok": False, "reason": "not-found"}
    return {"ok": True, "signal": signal, "realization_24h": realization or {}}
