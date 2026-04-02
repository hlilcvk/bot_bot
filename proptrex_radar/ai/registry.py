from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class AIRole:
    role_id: str
    label: str
    purpose: str
    evidence_sources: List[str]
    output_shape: str


AI_ROLE_REGISTRY: Dict[str, AIRole] = {
    "analyzer": AIRole(
        role_id="analyzer",
        label="Analyzer",
        purpose="Reads deterministic truth and produces structured analysis.",
        evidence_sources=["scores", "realization", "health", "telegram", "entitlement", "crm", "finance", "audit"],
        output_shape="structured-analysis",
    ),
    "explainer": AIRole(
        role_id="explainer",
        label="Explainer",
        purpose="Explains changes in scores, regime, and operational truth.",
        evidence_sources=["scores", "realization", "health", "audit"],
        output_shape="evidence-explanation",
    ),
    "risk_critic": AIRole(
        role_id="risk_critic",
        label="Risk Critic",
        purpose="Flags weak evidence, low confidence, and regime drift.",
        evidence_sources=["scores", "realization", "health", "audit"],
        output_shape="risk-narrative",
    ),
    "operator_recommender": AIRole(
        role_id="operator_recommender",
        label="Operator Recommender",
        purpose="Suggests operator actions without execution authority.",
        evidence_sources=["scores", "realization", "entitlement", "crm", "finance", "audit"],
        output_shape="operator-recommendation",
    ),
    "auditor_commentary": AIRole(
        role_id="auditor_commentary",
        label="Auditor Commentary",
        purpose="Summarizes audit findings without overriding deterministic truth.",
        evidence_sources=["audit", "health", "entitlement"],
        output_shape="audit-commentary",
    ),
}


AI_PERMISSION_MATRIX = {
    "analyzer": ["read_truth"],
    "explainer": ["read_truth"],
    "risk_critic": ["read_truth"],
    "operator_recommender": ["read_truth", "suggest_actions"],
    "auditor_commentary": ["read_truth", "summarize_audit"],
}


AI_TRUTH_SOURCES = [
    "filter scores",
    "realization metrics",
    "regime state",
    "health state",
    "telegram state",
    "entitlement state",
    "CRM profile",
    "finance mirror",
    "audit findings",
]
