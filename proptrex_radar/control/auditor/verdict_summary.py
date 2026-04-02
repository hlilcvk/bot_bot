from __future__ import annotations

from typing import Any, Dict, List


def summarize_verdict(payload: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "timestamp": payload.get("timestamp"),
        "verdict": payload.get("verdict"),
        "violations_found": payload.get("violations_found") or [],
        "blockers": payload.get("blockers") or [],
        "unresolved_items": payload.get("unresolved_items") or [],
    }
