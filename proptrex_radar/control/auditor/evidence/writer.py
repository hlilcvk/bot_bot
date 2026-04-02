from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from ..adapters.filesystem import write_json
from ..artifact_inventory import auditor_evidence_dir, verdict_summary_dir


def write_json_artifact(stamp: str, payload: Dict[str, Any]) -> Path:
    path = auditor_evidence_dir() / f"{stamp}_audit.json"
    write_json(path, payload)
    return path


def write_summary_artifact(stamp: str, payload: Dict[str, Any]) -> Path:
    path = verdict_summary_dir() / f"{stamp}_summary.json"
    write_json(path, payload)
    return path
