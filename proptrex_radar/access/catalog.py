from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List


TRIAL_DAYS = 4
ENTITLEMENT_VERSION = "2026-03-30.access.v1"
DEFAULT_PLAN_CODE = "RADAR_SILVER_V1"

PLAN_CATALOG: Dict[str, Dict[str, Any]] = {
    "RADAR_SILVER_V1": {
        "plan_code": "RADAR_SILVER_V1",
        "label": "Radar Silver",
        "currency": "USD",
        "entitlements": {
            "can_access_radar": True,
            "can_use_ai_summary": False,
            "can_use_ai_recommendations": False,
            "can_export": False,
            "can_use_api": False,
            "max_alerts": 10,
            "max_profiles": 2,
            "max_workspaces": 1,
            "history_window_days": 7,
        },
    },
    "RADAR_GOLD_V1": {
        "plan_code": "RADAR_GOLD_V1",
        "label": "Radar Gold",
        "currency": "USD",
        "entitlements": {
            "can_access_radar": True,
            "can_use_ai_summary": True,
            "can_use_ai_recommendations": False,
            "can_export": True,
            "can_use_api": True,
            "max_alerts": 50,
            "max_profiles": 5,
            "max_workspaces": 2,
            "history_window_days": 30,
        },
    },
    "RADAR_PLATINUM_V1": {
        "plan_code": "RADAR_PLATINUM_V1",
        "label": "Radar Platinum",
        "currency": "USD",
        "entitlements": {
            "can_access_radar": True,
            "can_use_ai_summary": True,
            "can_use_ai_recommendations": True,
            "can_export": True,
            "can_use_api": True,
            "max_alerts": 200,
            "max_profiles": 20,
            "max_workspaces": 10,
            "history_window_days": 365,
        },
    },
}

CANONICAL_ACCOUNT_STATES: List[str] = [
    "trial_full_active",
    "trial_expired_locked",
    "subscription_active",
    "subscription_past_due",
    "subscription_canceled",
    "access_locked_manual",
    "access_locked_system",
]


def plan_payloads() -> List[Dict[str, Any]]:
    return [deepcopy(PLAN_CATALOG[key]) for key in sorted(PLAN_CATALOG)]


def locked_entitlements() -> Dict[str, Any]:
    return {
        "can_access_radar": False,
        "can_use_ai_summary": False,
        "can_use_ai_recommendations": False,
        "can_export": False,
        "can_use_api": False,
        "max_alerts": 0,
        "max_profiles": 0,
        "max_workspaces": 0,
        "history_window_days": 0,
    }


def trial_entitlements() -> Dict[str, Any]:
    return deepcopy(PLAN_CATALOG["RADAR_PLATINUM_V1"]["entitlements"])

