from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from ..access.catalog import DEFAULT_PLAN_CODE, ENTITLEMENT_VERSION, TRIAL_DAYS
from ..access.resolver import default_account_record, resolve_account_snapshot
from ..config import Settings
from ..storage.access_store import (
    get_account,
    get_subscription_mirror,
    initialize,
    record_access_event,
    upsert_account,
)


class AccessService:
    def __init__(self, settings: Settings):
        self.settings = settings
        initialize()

    def ensure_account(self, account_id: Optional[str] = None, plan_code: Optional[str] = None) -> Dict[str, Any]:
        resolved = (account_id or "").strip() or f"acct_{secrets.token_urlsafe(10)}"
        row = get_account(resolved)
        if row is None:
            row = upsert_account(default_account_record(resolved, plan_code or DEFAULT_PLAN_CODE))
        return row

    def set_account(self, account_id: str, **fields: Any) -> Dict[str, Any]:
        row = get_account(account_id) or default_account_record(account_id, fields.get("plan_code") or DEFAULT_PLAN_CODE)
        row.update(fields)
        row["account_id"] = account_id
        row["entitlement_version"] = fields.get("entitlement_version") or ENTITLEMENT_VERSION
        return upsert_account(row)

    def seed_trial_account(self, account_id: str, plan_code: str = DEFAULT_PLAN_CODE, trial_days: int = TRIAL_DAYS) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        return self.set_account(
            account_id,
            account_state="trial_full_active",
            trial_state="trial_full_active",
            subscription_state="",
            plan_code=plan_code,
            access_locked=False,
            locked_reason="",
            trial_started_at=now.isoformat(),
            trial_end_at=(now + timedelta(days=trial_days)).isoformat(),
            current_period_end="",
        )

    def seed_paid_account(
        self,
        account_id: str,
        plan_code: str = DEFAULT_PLAN_CODE,
        subscription_state: str = "active",
        current_period_end: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        if subscription_state == "active":
            account_state = "subscription_active"
            trial_state = "trial_expired_locked"
            access_locked = False
        elif subscription_state == "trialing":
            account_state = "trial_full_active"
            trial_state = "trial_full_active"
            access_locked = False
        elif subscription_state == "past_due":
            account_state = "subscription_past_due"
            trial_state = "trial_expired_locked"
            access_locked = False
        elif subscription_state == "canceled":
            account_state = "subscription_canceled"
            trial_state = "trial_expired_locked"
            access_locked = False
        else:
            account_state = "access_locked_system"
            trial_state = "trial_expired_locked"
            access_locked = True
        return self.set_account(
            account_id,
            account_state=account_state,
            trial_state=trial_state,
            subscription_state=subscription_state,
            plan_code=plan_code,
            access_locked=access_locked,
            locked_reason="",
            trial_started_at=now.isoformat(),
            trial_end_at=now.isoformat(),
            current_period_end=current_period_end or "",
        )

    def set_locked_account(self, account_id: str, locked_reason: str, plan_code: str = DEFAULT_PLAN_CODE) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        return self.set_account(
            account_id,
            account_state="access_locked_manual" if locked_reason == "manual" else "access_locked_system",
            trial_state="trial_expired_locked",
            subscription_state="",
            plan_code=plan_code,
            access_locked=True,
            locked_reason=locked_reason,
            trial_started_at=now.isoformat(),
            trial_end_at=now.isoformat(),
            current_period_end="",
        )

    def reconcile_from_subscription_mirror(self, account_id: str) -> Optional[Dict[str, Any]]:
        mirror = get_subscription_mirror(account_id)
        if not mirror:
            return None
        row = get_account(account_id)
        if row is None:
            row = default_account_record(account_id, mirror.get("plan_code") or DEFAULT_PLAN_CODE)
        row.update(
            {
                "subscription_state": mirror.get("provider_status") or "",
                "plan_code": mirror.get("plan_code") or row.get("plan_code") or DEFAULT_PLAN_CODE,
                "current_period_end": mirror.get("current_period_end") or row.get("current_period_end") or "",
                "trial_end_at": mirror.get("trial_end_at") or row.get("trial_end_at") or "",
            }
        )
        snapshot = resolve_account_snapshot(row)
        return upsert_account(
            {
                **row,
                "account_state": snapshot["account_state"],
                "trial_state": snapshot["trial_state"],
                "subscription_state": snapshot["subscription_state"],
                "plan_code": snapshot["plan_code"],
                "access_locked": int(bool(snapshot["access_locked"])),
                "locked_reason": snapshot["locked_reason"],
                "trial_started_at": snapshot["trial_started_at"],
                "trial_end_at": snapshot["trial_end_at"],
                "current_period_end": snapshot["current_period_end"],
                "entitlement_version": snapshot["entitlement_version"],
            }
        )

    def get_snapshot(self, account_id: str) -> Dict[str, Any]:
        row = self.ensure_account(account_id)
        if not row.get("last_seen_at"):
            row = upsert_account({**row, "last_seen_at": row.get("created_at") or datetime.now(timezone.utc).isoformat()})
        snapshot = resolve_account_snapshot(row)
        if snapshot["account_state"] != row.get("account_state") or snapshot["locked_reason"] != row.get("locked_reason"):
            row = upsert_account(
                {
                    **row,
                    "account_state": snapshot["account_state"],
                    "trial_state": snapshot["trial_state"],
                    "subscription_state": snapshot["subscription_state"],
                    "plan_code": snapshot["plan_code"],
                    "access_locked": int(bool(snapshot["access_locked"])),
                    "locked_reason": snapshot["locked_reason"],
                    "trial_started_at": snapshot["trial_started_at"],
                    "trial_end_at": snapshot["trial_end_at"],
                    "current_period_end": snapshot["current_period_end"],
                    "entitlement_version": snapshot["entitlement_version"],
                }
            )
        resolved = resolve_account_snapshot(row)
        return {
            "account": row,
            "entitlements": resolved,
            "decision": {
                "can_access_radar": bool(resolved.get("can_access_radar")),
                "locked": bool(resolved.get("access_locked")),
                "locked_reason": resolved.get("locked_reason") or "",
                "redirect_to": "/locked/" if not resolved.get("can_access_radar") else "",
            },
        }

    def record_access_decision(self, account_id: str, route: str, decision: str, reason: str, detail: Dict[str, Any]) -> None:
        record_access_event(account_id, "route-decision", route, decision, reason, detail)

    def catalog_payload(self) -> Dict[str, Any]:
        from ..access.catalog import CANONICAL_ACCOUNT_STATES, PLAN_CATALOG

        return {
            "ok": True,
            "entitlement_version": ENTITLEMENT_VERSION,
            "trial_days": TRIAL_DAYS,
            "canonical_states": CANONICAL_ACCOUNT_STATES,
            "plans": [PLAN_CATALOG[key] for key in sorted(PLAN_CATALOG)],
        }
