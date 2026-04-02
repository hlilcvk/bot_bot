"""AI orchestrator that keeps track of signal efficiency and truth."""

from __future__ import annotations

from typing import Any, Dict, List

from ...analytics import get_realization_summary


def _verdict_from_metrics(success_rate: float, low_confidence: int, sample_size: int) -> str:
    if sample_size == 0:
        return "no-data"
    if success_rate >= 50 and low_confidence <= max(1, sample_size * 0.3):
        return "pass"
    if success_rate >= 30:
        return "monitor"
    return "review"


def _format_highlights(groups: List[Dict[str, Any]], limit: int = 5) -> List[Dict[str, Any]]:
    highlights: List[Dict[str, Any]] = []
    sorted_groups = sorted(groups, key=lambda item: float(item.get("success_rate_pct") or 0.0))
    for group in sorted_groups[:limit]:
        highlights.append(
            {
                "filter_group_id": group.get("filter_group_id") or "unknown",
                "success_rate_pct": round(float(group.get("success_rate_pct") or 0.0), 2),
                "sample_size": int(group.get("sample_size") or 0),
                "low_confidence_flag": bool(group.get("low_confidence_flag")),
            }
        )
    return highlights


def _build_notes(sample_size: int, success_rate: float, low_confidence: int, data_state: str) -> List[str]:
    notes: List[str] = []
    if sample_size == 0:
        notes.append("No signals have been evaluated in the past 24 hours.")
    else:
        if success_rate < 30:
            notes.append("Efficiency below 30%; review signal scoring thresholds.")
        if low_confidence > max(1, sample_size * 0.3):
            notes.append("Multiple filter groups still flagged as low-confidence.")
    if data_state and data_state != "ready":
        notes.append(f"Data state is {data_state}.")
    return notes


def orchestrate_signal_truth(limit_highlights: int = 5) -> Dict[str, Any]:
    """Return an AI-friendly verdict for signal efficiency and truth."""
    summary = get_realization_summary()
    if not summary.get("ok"):
        return {"ok": False, "reason": "realization-summary-unavailable"}

    sample_size = int(summary.get("sample_size") or summary.get("total_evaluated_signals") or 0)
    success_rate = float(summary.get("overall_success_rate_pct") or 0.0)
    low_confidence = int(summary.get("low_confidence_count") or 0)
    data_state = str(summary.get("data_state") or "unknown")
    truth_health = max(0.0, 100.0 - min(100.0, low_confidence * 8.0))
    efficiency_score = round(success_rate * (truth_health / 100.0), 2)

    verdict = _verdict_from_metrics(success_rate, low_confidence, sample_size)
    notes = _build_notes(sample_size, success_rate, low_confidence, data_state)
    highlights = _format_highlights(summary.get("filter_groups") or [], limit=limit_highlights)

    return {
        "ok": True,
        "sample_size": sample_size,
        "efficiency_pct": round(success_rate, 2),
        "truth_health": round(truth_health, 2),
        "score": efficiency_score,
        "low_confidence_count": low_confidence,
        "data_state": data_state,
        "verdict": verdict,
        "notes": notes,
        "filter_highlights": highlights,
    }
