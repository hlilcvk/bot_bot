from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .artifact_inventory import (
    auditor_evidence_dir,
    latest_verdict_path,
    list_summary_paths,
    list_verdict_paths,
)
from .enforcement_runner import run_audit
from .verdict_summary import summarize_verdict

def load_latest_verdict_json() -> Optional[Dict[str, Any]]:
    path = latest_verdict_path()
    if not path:
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def load_verdict_history(limit: int = 10) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for path in list_summary_paths(limit=limit):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        items.append(summarize_verdict(payload))
    return items


__all__ = [
    "auditor_evidence_dir",
    "load_latest_verdict_json",
    "load_verdict_history",
    "run_audit",
    "summarize_verdict",
]
