from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class AuditArtifact:
    kind: str
    path: str
    created_at: str
    size_bytes: int = 0
    sha256: str = ""


@dataclass
class AuditFinding:
    code: str
    message: str
    severity: str
    path: Optional[str] = None
    scope: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None


@dataclass
class RuntimeCheck:
    name: str
    route: str
    method: str
    url: str
    ok: bool
    status_code: Optional[int] = None
    payload_present: bool = False
    shape_ok: bool = False
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AuditResult:
    timestamp: str
    verdict: str
    runtime_truth: List[RuntimeCheck] = field(default_factory=list)
    hygiene_truth: List[AuditFinding] = field(default_factory=list)
    evidence_outputs: List[AuditArtifact] = field(default_factory=list)
    violations_found: List[str] = field(default_factory=list)
    unresolved_items: List[str] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)
    diff_summary: Dict[str, Any] = field(default_factory=dict)
    machine_readable_artifact: Optional[str] = None
    repo_snapshot: Dict[str, Any] = field(default_factory=dict)
    codex_compliance: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

