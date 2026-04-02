from __future__ import annotations

from typing import Any, Dict

from ..analytics.realization import (
    capture_signal_fire,
    get_realization_detail,
    get_realization_summary,
    list_realization_filter_groups,
    list_realization_signals,
)


def fire_signal_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    signal = capture_signal_fire(payload)
    return {"ok": True, "signal": signal, "evaluation_due_at": signal.get("created_at", "")}


def realization_summary_payload() -> Dict[str, Any]:
    return get_realization_summary()


def realization_filter_groups_payload() -> Dict[str, Any]:
    return list_realization_filter_groups()


def realization_signals_payload() -> Dict[str, Any]:
    return list_realization_signals()


def realization_detail_payload(signal_id: str) -> Dict[str, Any]:
    return get_realization_detail(signal_id)
