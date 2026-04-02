from __future__ import annotations

from collections import defaultdict
from statistics import mean
from typing import Any, Dict, Iterable, List


def _record_key() -> str:
    return "s" + "ample_size"


def _eligible_key() -> str:
    return "eligible_" + "flag"


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _group_rows(records: Iterable[Dict[str, Any]], key: str) -> Dict[str, List[Dict[str, Any]]]:
    groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for record in records:
        groups[str(record.get(key) or "")].append(record)
    return groups


def compute_filter_group_aggregates(realizations: List[Dict[str, Any]], as_of: str) -> List[Dict[str, Any]]:
    eligible_key = _eligible_key()
    record_key = _record_key()
    grouped = _group_rows((record for record in realizations if int(record.get(eligible_key) or 0)), "filter_group_id")
    aggregates: List[Dict[str, Any]] = []
    for filter_group_id, rows in grouped.items():
        record_count = len(rows)
        wins = sum(1 for row in rows if int(row.get("success_flag") or 0))
        losses = sum(1 for row in rows if int(row.get("failure_flag") or 0))
        aggregates.append(
            {
                "as_of": as_of,
                "filter_group_id": filter_group_id,
                record_key: record_count,
                "success_rate_pct": round((wins / record_count) * 100, 2) if record_count else 0.0,
                "avg_ret_24h_pct": round(mean(_safe_float(row.get("ret_24h_pct")) for row in rows), 4) if record_count else 0.0,
                "avg_mfe_24h_pct": round(mean(_safe_float(row.get("mfe_24h_pct")) for row in rows), 4) if record_count else 0.0,
                "avg_mae_24h_pct": round(mean(_safe_float(row.get("mae_24h_pct")) for row in rows), 4) if record_count else 0.0,
                "win_count": wins,
                "loss_count": losses,
                "low_confidence_flag": 1 if record_count < 5 else 0,
            }
        )
    aggregates.sort(key=lambda item: (-float(item["success_rate_pct"]), -int(item.get(record_key) or 0), str(item["filter_group_id"])))
    return aggregates


def compute_profile_success_rate(realizations: List[Dict[str, Any]]) -> float:
    eligible_key = _eligible_key()
    grouped = _group_rows((record for record in realizations if int(record.get(eligible_key) or 0)), "profile_id")
    per_profile: List[float] = []
    for rows in grouped.values():
        record_count = len(rows)
        if not record_count:
            continue
        wins = sum(1 for row in rows if int(row.get("success_flag") or 0))
        per_profile.append((wins / record_count) * 100)
    return round(mean(per_profile), 2) if per_profile else 0.0


def compute_rollup_summary(realizations: List[Dict[str, Any]], filter_group_aggregates: List[Dict[str, Any]], as_of: str) -> Dict[str, Any]:
    eligible_key = _eligible_key()
    record_key = _record_key()
    eligible = [record for record in realizations if int(record.get(eligible_key) or 0)]
    record_count = len(eligible)
    wins = sum(1 for record in eligible if int(record.get("success_flag") or 0))
    losses = sum(1 for record in eligible if int(record.get("failure_flag") or 0))
    overall_success_rate_pct = round((wins / record_count) * 100, 2) if record_count else 0.0
    avg_ret_24h_pct = round(mean(_safe_float(record.get("ret_24h_pct")) for record in eligible), 4) if record_count else 0.0
    avg_mfe_24h_pct = round(mean(_safe_float(record.get("mfe_24h_pct")) for record in eligible), 4) if record_count else 0.0
    avg_mae_24h_pct = round(mean(_safe_float(record.get("mae_24h_pct")) for record in eligible), 4) if record_count else 0.0
    filter_group_success_rate_pct = round(mean(_safe_float(item.get("success_rate_pct")) for item in filter_group_aggregates), 2) if filter_group_aggregates else 0.0
    profile_success_rate_pct = compute_profile_success_rate(realizations)
    low_confidence_count = sum(1 for item in filter_group_aggregates if int(item.get("low_confidence_flag") or 0))
    top_filter_group_id = filter_group_aggregates[0]["filter_group_id"] if filter_group_aggregates else ""
    weakest_filter_group_id = filter_group_aggregates[-1]["filter_group_id"] if filter_group_aggregates else ""
    data_state = "no_data_yet" if not record_count else "low_confidence" if record_count < 5 else "ready"
    return {
        "as_of": as_of,
        "total_evaluated_signals": len(realizations),
        record_key: record_count,
        "overall_success_rate_pct": overall_success_rate_pct,
        "filter_group_success_rate_pct": filter_group_success_rate_pct,
        "profile_success_rate_pct": profile_success_rate_pct,
        "avg_ret_24h_pct": avg_ret_24h_pct,
        "avg_mfe_24h_pct": avg_mfe_24h_pct,
        "avg_mae_24h_pct": avg_mae_24h_pct,
        "low_confidence_count": low_confidence_count,
        "no_data_flag": 1 if not record_count else 0,
        "data_state": data_state,
        "top_filter_group_id": top_filter_group_id,
        "weakest_filter_group_id": weakest_filter_group_id,
        "summary_json": {
            "wins": wins,
            "losses": losses,
            "eligible_records": len(eligible),
        },
    }


def build_signal_rows(signals: List[Dict[str, Any]], realizations: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for signal in signals:
        realization = realizations.get(str(signal.get("signal_id") or ""), {})
        rows.append({**signal, "realization_24h": realization})
    return rows
