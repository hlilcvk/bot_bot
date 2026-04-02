from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def auditor_root() -> Path:
    return Path(__file__).resolve().parent


def auditor_evidence_dir() -> Path:
    path = auditor_root() / "evidence"
    path.mkdir(parents=True, exist_ok=True)
    return path


def verdict_summary_dir() -> Path:
    path = auditor_evidence_dir() / "summaries"
    path.mkdir(parents=True, exist_ok=True)
    return path


def auditor_reports_dir() -> Path:
    path = auditor_root() / "reports"
    path.mkdir(parents=True, exist_ok=True)
    return path


def rapor_dir() -> Path:
    path = repo_root() / "rapor"
    path.mkdir(parents=True, exist_ok=True)
    return path


def timestamp_token() -> str:
    return datetime.now().strftime("%Y-%m-%d_%H%M%S")


def date_token() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def latest_verdict_path() -> Optional[Path]:
    evidence = auditor_evidence_dir()
    verdicts = sorted(evidence.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
    return verdicts[0] if verdicts else None


def list_verdict_paths(limit: int = 10) -> List[Path]:
    evidence = auditor_evidence_dir()
    verdicts = sorted(evidence.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
    return verdicts[:limit]


def list_summary_paths(limit: int = 10) -> List[Path]:
    summaries = sorted(verdict_summary_dir().glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
    return summaries[:limit]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def cleanup_transient_artifacts() -> Dict[str, Any]:
    candidates = [
        repo_root() / "__pycache__",
        repo_root() / ".pytest_cache",
        repo_root() / "public" / "proptrex_radar" / "evidence" / "build",
    ]
    removed: List[str] = []
    failed: List[Dict[str, str]] = []
    for path in candidates:
        if not path.exists():
            continue
        try:
            if path.is_dir():
                import shutil

                shutil.rmtree(path)
            else:
                path.unlink()
            removed.append(path.as_posix())
        except Exception as exc:
            failed.append({"path": path.as_posix(), "error": str(exc)})

    for path in repo_root().rglob("__pycache__"):
        if not path.is_dir():
            continue
        try:
            import shutil

            shutil.rmtree(path)
            removed.append(path.as_posix())
        except Exception as exc:
            failed.append({"path": path.as_posix(), "error": str(exc)})

    return {"removed": removed, "failed": failed}
