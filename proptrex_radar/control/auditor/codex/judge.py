from __future__ import annotations

import re
from typing import Dict, List

from ..verdicts import SOFT_LANGUAGE_TOKENS


def judge_text(text: str) -> List[Dict[str, str]]:
    findings: List[Dict[str, str]] = []
    lowered = text.lower()
    for token in sorted(SOFT_LANGUAGE_TOKENS):
        if re.search(rf"\b{re.escape(token)}\b", lowered):
            findings.append(
                {
                    "code": "SOFT_LANGUAGE_VIOLATION",
                    "token": token,
                    "message": f"Soft language token present: {token}",
                }
            )
    return findings

