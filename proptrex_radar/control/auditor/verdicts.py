from __future__ import annotations

from typing import Iterable, Set


PASS = "PASS"
PARTIAL = "PARTIAL"
BLOCKED = "BLOCKED"
FAIL = "FAIL"

SOFT_LANGUAGE_TOKENS = {
    "probably",
    "maybe",
    "might",
    "seems",
    "appears",
    "likely",
    "should",
}

BLOCKING_CODES = {
    "ASSUMPTION_VIOLATION",
    "FAKE_COMPLETION",
    "UNPROVEN_RUNTIME",
    "MISSING_EVIDENCE",
    "ORPHAN_FILE",
    "DEAD_CODE_LEAK",
    "TOPOLOGY_DRIFT",
    "REPORT_DIFF_MISMATCH",
    "UNAUTHORIZED_SCOPE",
    "SOFT_LANGUAGE_VIOLATION",
}


def verdict_from_codes(codes: Iterable[str], runtime_complete: bool, evidence_complete: bool) -> str:
    code_set: Set[str] = {str(code) for code in codes}
    if not runtime_complete or not evidence_complete:
        return BLOCKED
    if code_set & BLOCKING_CODES:
        return BLOCKED
    return PASS

