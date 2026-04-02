from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from .catalog import DEFAULT_PLAN_CODE, ENTITLEMENT_VERSION, TRIAL_DAYS, locked_entitlements, trial_entitlements


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat()


def parse_iso(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def default_account_record(account_id: str, plan_code: str = DEFAULT_PLAN_CODE) -> Dict[str, Any]:
    now = utc_now()
    trial_end = now + timedelta(days=TRIAL_DAYS)
    return {
        "account_id": account_id,
        "account_state": "trial_full_active",
        "trial_state": "trial_full_active",
        "subscription_state": "",
        "plan_code": plan_code,
        "access_locked": 0,
        "locked_reason": "",
        "locked_until": "",
        "trial_started_at": now.isoformat(),
        "trial_end_at": trial_end.isoformat(),
        "current_period_end": "",
        "last_seen_at": now.isoformat(),
        "entitlement_version": ENTITLEMENT_VERSION,
    }


def _plan_entitlements(plan_code: str) -> Dict[str, Any]:
    from .catalog import PLAN_CATALOG

    return deepcopy(PLAN_CATALOG.get(plan_code, PLAN_CATALOG[DEFAULT_PLAN_CODE])["entitlements"])


def _subscription_allows_access(subscription_state: str, current_period_end: Optional[str], now: datetime) -> bool:
    if subscription_state in {"active", "trialing"}:
        return True
    if subscription_state == "past_due":
        period_end = parse_iso(current_period_end)
        if period_end is None:
            return True
        return now <= period_end
    return False


def resolve_account_snapshot(record: Dict[str, Any], now: Optional[datetime] = None) -> Dict[str, Any]:
    current = now or utc_now()
    plan_code = str(record.get("plan_code") or DEFAULT_PLAN_CODE)
    subscription_state = str(record.get("subscription_state") or "").strip()
    access_locked = bool(record.get("access_locked"))
    locked_reason = str(record.get("locked_reason") or "").strip()
    locked_until = parse_iso(record.get("locked_until"))
    trial_started_at = parse_iso(record.get("trial_started_at")) or current
    trial_end_at = parse_iso(record.get("trial_end_at"))
    current_period_end = parse_iso(record.get("current_period_end"))
    trial_active = trial_end_at is None or current <= trial_end_at
    subscription_active = _subscription_allows_access(subscription_state, record.get("current_period_end"), current)

    if access_locked and locked_until and current > locked_until:
        access_locked = False
        locked_reason = ""
        locked_until = None

    if access_locked:
        account_state = "access_locked_manual" if locked_reason == "manual" else "access_locked_system"
        can_access = False
    elif subscription_state == "active":
        account_state = "subscription_active"
        can_access = True
    elif subscription_state == "trialing":
        account_state = "trial_full_active"
        can_access = True
    elif subscription_state == "past_due":
        account_state = "subscription_past_due"
        can_access = subscription_active
    elif subscription_state == "canceled":
        account_state = "subscription_canceled"
        can_access = False
    elif subscription_state in {"unpaid", "incomplete", "incomplete_expired"}:
        account_state = "access_locked_system"
        can_access = False
    elif trial_active:
        account_state = "trial_full_active"
        can_access = True
    else:
        account_state = "trial_expired_locked"
        can_access = False
        locked_reason = locked_reason or "trial_expired"

    if account_state == "trial_expired_locked":
        trial_state = "trial_expired_locked"
    elif account_state == "trial_full_active":
        trial_state = "trial_full_active"
    else:
        trial_state = str(record.get("trial_state") or "")

    entitlements = _plan_entitlements(plan_code)
    if account_state == "trial_full_active":
        entitlements = trial_entitlements()
    elif account_state in {"trial_expired_locked", "access_locked_manual", "access_locked_system"} or not can_access:
        entitlements = locked_entitlements()

    snapshot = {
        "account_id": str(record.get("account_id") or ""),
        "account_state": account_state,
        "trial_state": trial_state,
        "subscription_state": subscription_state,
        "plan_code": plan_code,
        "access_locked": bool(not can_access or access_locked),
        "locked_reason": locked_reason,
        "locked_until": locked_until.isoformat() if locked_until else "",
        "trial_started_at": trial_started_at.isoformat(),
        "trial_end_at": trial_end_at.isoformat() if trial_end_at else "",
        "current_period_end": current_period_end.isoformat() if current_period_end else "",
        "last_seen_at": str(record.get("last_seen_at") or ""),
        "entitlement_version": str(record.get("entitlement_version") or ENTITLEMENT_VERSION),
        "entitlements": deepcopy(entitlements),
        "can_access_radar": bool(entitlements.get("can_access_radar")) and can_access,
    }
    snapshot.update(entitlements)
    return snapshot


def resolve_entitlements(record: Dict[str, Any], now: Optional[datetime] = None) -> Dict[str, Any]:
    return resolve_account_snapshot(record, now=now)


def access_decision(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    locked = bool(snapshot.get("access_locked"))
    return {
        "can_access_radar": bool(snapshot.get("can_access_radar")),
        "locked": locked,
        "locked_reason": str(snapshot.get("locked_reason") or ""),
        "surface": "radar",
        "redirect_to": "/locked/" if locked or not snapshot.get("can_access_radar") else "",
    }
