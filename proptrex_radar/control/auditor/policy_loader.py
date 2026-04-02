from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


POLICY_PATH = Path(__file__).resolve().parent / "policies" / "default.json"


def load_policy() -> Dict[str, Any]:
    if POLICY_PATH.exists():
        return json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    return {
        "authorized_roots": ["main.py", "auditor.py", "data", "public", "proptrex_radar", "rapor"],
        "route_expectations": [
            {"method": "GET", "route": "/"},
            {"method": "GET", "route": "/index.html"},
            {"method": "GET", "route": "/proptrex_radar/"},
            {"method": "GET", "route": "/api/health"},
            {"method": "POST", "route": "/api/telegram/link-session"},
        ],
        "forbidden_markers": ["mock", "fake", "dummy", "stub", "placeholder"],
    }
