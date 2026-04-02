from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from ..artifact_inventory import repo_root


def ensure_parent(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def write_text(path: Path, content: str) -> Path:
    ensure_parent(path)
    path.write_text(content, encoding="utf-8")
    return path


def write_json(path: Path, payload: Dict[str, Any]) -> Path:
    ensure_parent(path)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def root_file(*parts: str) -> Path:
    return repo_root().joinpath(*parts)

