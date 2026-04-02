from __future__ import annotations

from pathlib import Path

from ..adapters.filesystem import write_text
from ..artifact_inventory import auditor_reports_dir, date_token, rapor_dir


def write_markdown_report(stamp: str, markdown: str) -> Path:
    path = auditor_reports_dir() / f"{stamp}_audit.md"
    write_text(path, markdown)
    return path


def write_rapor_report(stamp: str, markdown: str) -> Path:
    day_dir = rapor_dir() / date_token()
    day_dir.mkdir(parents=True, exist_ok=True)
    path = day_dir / f"{stamp}_audit.md"
    write_text(path, markdown)
    return path

