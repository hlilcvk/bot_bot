from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from ..access.catalog import DEFAULT_PLAN_CODE, PLAN_CATALOG
from ..analytics.realization import get_realization_summary as get_global_realization_summary
from ..analytics.realization import list_realization_filter_groups as list_global_realization_filter_groups
from ..analytics.realization import list_realization_signals as list_global_realization_signals
from ..access.resolver import resolve_account_snapshot
from ..config import Settings
from ..storage.access_store import get_account, get_subscription_mirror, list_access_events, list_accounts, list_billing_events, upsert_account
from ..storage.sqlite_store import list_sessions
from ..services.billing_service import BillingService
from ..services.entitlements_service import AccessService
from .rbac import AdminContext, authorize_route, resolve_admin_context
from .store import (
    add_crm_note,
    add_blockchain_wallet,
    get_crm_profile,
    get_control_user_view,
    get_usage_summary,
    list_admin_actions,
    list_blockchain_wallets,
    list_crm_notes,
    list_crm_profiles,
    list_crm_tags,
    list_control_users_view,
    list_failed_payment_events,
    list_invoice_mirror,
    list_notification_events,
    list_payment_mirror,
    list_reconciliation_queue,
    list_usage_rollups,
    record_admin_action,
    record_notification_event,
    record_usage_event,
    replace_crm_tags,
    upsert_crm_profile,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: int) -> int:
    return max(0, min(100, value))


def _days_remaining(iso_value: str) -> int:
    if not iso_value:
        return 999
    try:
        parsed = datetime.fromisoformat(iso_value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return 999
    return (parsed - _utc_now()).days


class ControlPlaneService:
    def __init__(self, settings: Settings, access_service: AccessService, billing_service: BillingService):
        self.settings = settings
        self.access_service = access_service
        self.billing_service = billing_service

    def admin_context(self, admin_id: str) -> Optional[AdminContext]:
        return resolve_admin_context(admin_id)

    def require_admin(self, admin_id: str, permission: str) -> Optional[AdminContext]:
        return authorize_route(admin_id, permission)

    def _build_telegram_state(self, account_id: str) -> Dict[str, Any]:
        return {
            "linked": False,
            "status": "unknown",
            "reason": "no-account-link-model",
            "session_count": len([item for item in list_sessions() if str(item.get("label") or "").strip() == account_id]),
        }

    def _build_user_profile(self, account_id: str, account: Dict[str, Any], snapshot: Dict[str, Any], usage: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        usage = usage or get_usage_summary(account_id, window_days=30)
        plan_code = str(snapshot.get("plan_code") or DEFAULT_PLAN_CODE)
        plan = PLAN_CATALOG.get(plan_code, PLAN_CATALOG[DEFAULT_PLAN_CODE])
        entitlements = plan["entitlements"]
        route_access = int(usage.get("route_access_frequency", 0))
        radar_sessions = int(usage.get("radar_session_count", 0))
        feature_usage = int(usage.get("feature_usage_count", 0))
        alert_usage = int(usage.get("alert_usage_count", 0))
        engagement_score = _clamp(route_access * 4 + radar_sessions * 10 + feature_usage * 5 + alert_usage * 8)
        feature_adoption_score = _clamp(
            int(entitlements.get("can_use_ai_summary", False)) * 20
            + int(entitlements.get("can_use_ai_recommendations", False)) * 25
            + int(entitlements.get("can_export", False)) * 15
            + int(entitlements.get("can_use_api", False)) * 20
            + int(entitlements.get("max_profiles", 0)) * 2
            + int(entitlements.get("max_workspaces", 0)) * 3
        )
        payment_reliability_score = {
            "subscription_active": 100,
            "trial_full_active": 95,
            "subscription_past_due": 45,
            "subscription_canceled": 15,
            "access_locked_manual": 20,
            "access_locked_system": 20,
            "trial_expired_locked": 10,
        }.get(str(snapshot.get("account_state") or ""), 50)
        support_risk_score = _clamp(20 + (50 if snapshot.get("access_locked") else 0) + (20 if str(snapshot.get("subscription_state") or "") in {"past_due", "unpaid"} else 0))
        if plan_code == "RADAR_PLATINUM_V1":
            plan_fit_score = 95
        elif plan_code == "RADAR_GOLD_V1":
            plan_fit_score = 80
        else:
            plan_fit_score = 60
        usage_pattern = "power_user" if engagement_score >= 70 else "steady_user" if engagement_score >= 40 else "light_user"
        if snapshot.get("trial_state") == "trial_full_active":
            lifecycle_stage = "trial_active"
        elif snapshot.get("account_state") == "trial_expired_locked":
            lifecycle_stage = "trial_locked"
        elif snapshot.get("subscription_state") == "active":
            lifecycle_stage = "paid_active"
        elif snapshot.get("subscription_state") == "past_due":
            lifecycle_stage = "paid_past_due"
        elif snapshot.get("subscription_state") == "canceled":
            lifecycle_stage = "paid_canceled"
        else:
            lifecycle_stage = "unknown"
        upgrade_propensity = _clamp(engagement_score + (15 if plan_code == "RADAR_SILVER_V1" else 5 if plan_code == "RADAR_GOLD_V1" else 0))
        churn_probability = _clamp(100 - engagement_score + (20 if snapshot.get("trial_state") == "trial_expired_locked" else 0) + (20 if snapshot.get("subscription_state") in {"past_due", "unpaid"} else 0))
        tags = self._derive_tags(snapshot, engagement_score, payment_reliability_score, support_risk_score, churn_probability, plan_code)
        profile = {
            "account_id": account_id,
            "lifecycle_stage": lifecycle_stage,
            "engagement_score": engagement_score,
            "feature_adoption_score": feature_adoption_score,
            "usage_pattern": usage_pattern,
            "plan_fit_score": plan_fit_score,
            "payment_reliability_score": payment_reliability_score,
            "support_risk_score": support_risk_score,
            "upgrade_propensity": upgrade_propensity,
            "churn_probability": churn_probability,
            "owner_admin": "",
            "last_segmented_at": _utc_now().isoformat(),
            "profile_json": {
                "plan_code": plan_code,
                "account_state": snapshot.get("account_state"),
                "subscription_state": snapshot.get("subscription_state"),
                "usage": usage,
            },
            "tags": tags,
        }
        stored = upsert_crm_profile(profile)
        replace_crm_tags(account_id, tags, source="rule")
        return {**profile, "stored": stored}

    def _derive_tags(
        self,
        snapshot: Dict[str, Any],
        engagement_score: int,
        payment_reliability_score: int,
        support_risk_score: int,
        churn_probability: int,
        plan_code: str,
    ) -> List[str]:
        tags: List[str] = []
        trial_state = str(snapshot.get("trial_state") or "")
        account_state = str(snapshot.get("account_state") or "")
        subscription_state = str(snapshot.get("subscription_state") or "")
        if trial_state == "trial_full_active" and engagement_score >= 60:
            tags.append("demo_active_high_usage")
        if trial_state == "trial_full_active" and engagement_score < 60:
            tags.append("demo_active_low_usage")
        if trial_state == "trial_full_active" and _days_remaining(str(snapshot.get("trial_end_at") or "")) <= 1:
            tags.append("trial_expiring_soon")
        if account_state == "trial_expired_locked":
            tags.append("trial_expired_locked")
        if plan_code == "RADAR_SILVER_V1" and subscription_state == "active" and engagement_score < 40:
            tags.append("paid_silver_low_usage")
        if plan_code == "RADAR_GOLD_V1" and subscription_state == "active" and engagement_score >= 60:
            tags.append("paid_gold_power_user")
        if plan_code == "RADAR_PLATINUM_V1" and subscription_state == "active":
            tags.append("paid_platinum_team")
        if subscription_state in {"past_due", "unpaid", "incomplete", "incomplete_expired"} or payment_reliability_score < 60:
            tags.append("payment_risk")
        if churn_probability >= 60:
            tags.append("churn_risk")
        if engagement_score >= 55 and plan_code != "RADAR_PLATINUM_V1" and account_state not in {"trial_expired_locked", "access_locked_manual", "access_locked_system"}:
            tags.append("upgrade_candidate")
        if support_risk_score >= 70 or account_state in {"access_locked_manual", "access_locked_system"}:
            tags.append("support_sensitive")
        if not tags:
            tags.append("general_watch")
        return tags

    def build_user_payload(self, account_id: str) -> Dict[str, Any]:
        account = get_account(account_id) or self.access_service.ensure_account(account_id)
        snapshot = resolve_account_snapshot(account)
        usage = get_usage_summary(account_id, window_days=30)
        profile = self._build_user_profile(account_id, account, snapshot, usage=usage)
        notes = list_crm_notes(account_id=account_id, limit=20)
        tags = [row["tag"] for row in list_crm_tags(account_id=account_id)]
        mirror = get_subscription_mirror(account_id) or {}
        telegram_state = self._build_telegram_state(account_id)
        access_events = [item for item in list_access_events(limit=200) if str(item.get("account_id") or "") == account_id]
        return {
            "user_id": account_id,
            "identity_key": account_id,
            "account": account,
            "snapshot": snapshot,
            "usage": usage,
            "crm_profile": profile,
            "tags": tags,
            "notes": notes,
            "subscription_mirror": mirror,
            "telegram_state": telegram_state,
            "access_events": access_events,
        }

    def list_users(self) -> Dict[str, Any]:
        accounts = list_accounts(limit=500)
        items = [self.build_user_payload(account["account_id"]) for account in accounts]
        return {"ok": True, "count": len(items), "items": items, "view_count": len(list_control_users_view())}

    def get_user(self, account_id: str) -> Dict[str, Any]:
        return {"ok": True, **self.build_user_payload(account_id)}

    def overview(self) -> Dict[str, Any]:
        accounts = list_accounts(limit=500)
        snapshots = [resolve_account_snapshot(account) for account in accounts]
        active_trials = [item for item in snapshots if item["trial_state"] == "trial_full_active" and item["account_state"] == "trial_full_active"]
        expiring_trials = [item for item in active_trials if _days_remaining(str(item.get("trial_end_at") or "")) <= 1]
        active_paid = [item for item in snapshots if item["account_state"] == "subscription_active"]
        past_due = [item for item in snapshots if item["account_state"] == "subscription_past_due"]
        profiles = list_crm_profiles()
        churn_risk_count = sum(1 for profile in profiles if int(profile.get("churn_probability", 0)) >= 60)
        mrr_by_plan: Dict[str, int] = {}
        for item in active_paid:
            mrr_by_plan[item["plan_code"]] = mrr_by_plan.get(item["plan_code"], 0) + 1
        return {
            "ok": True,
            "active_trials": len(active_trials),
            "expiring_trials": len(expiring_trials),
            "active_paid_users": len(active_paid),
            "past_due_subscriptions": len(past_due),
            "recent_billing_failures": len(list_failed_payment_events(limit=100)),
            "mrr_summary": {"active_subscriptions": len(active_paid), "by_plan": dict(sorted(mrr_by_plan.items()))},
            "churn_risk_count": churn_risk_count,
            "access_event_count": len(list_access_events(limit=200)),
            "realization_24h": self.realization_summary(),
            "latest_audit_verdicts": self._latest_audit_verdicts(),
        }

    def realization_summary(self) -> Dict[str, Any]:
        return get_global_realization_summary()

    def realization_filter_groups(self, limit: int = 100) -> Dict[str, Any]:
        return list_global_realization_filter_groups(limit=limit)

    def realization_signals(self, limit: int = 100) -> Dict[str, Any]:
        return list_global_realization_signals(limit=limit)

    def crm_overview(self) -> Dict[str, Any]:
        accounts = list_accounts(limit=500)
        items = [self.build_user_payload(account["account_id"]) for account in accounts]
        segments: Dict[str, List[str]] = {}
        for item in items:
            for tag in item["tags"]:
                segments.setdefault(tag, []).append(item["user_id"])
        return {
            "ok": True,
            "profiles": [item["crm_profile"] for item in items],
            "users": items,
            "segments": {key: sorted(set(value)) for key, value in segments.items()},
            "upgrade_candidates": [item for item in items if "upgrade_candidate" in item["tags"]],
            "churn_risk": [item for item in items if "churn_risk" in item["tags"]],
            "payment_risk": [item for item in items if "payment_risk" in item["tags"]],
        }

    def finance_overview(self) -> Dict[str, Any]:
        active_mirror = [get_subscription_mirror(account["account_id"]) for account in list_accounts(limit=500)]
        active_mirror = [row for row in active_mirror if row]
        invoices = list_invoice_mirror(limit=200)
        payments = list_payment_mirror(limit=200)
        failed = list_failed_payment_events(limit=200)
        recon = list_reconciliation_queue(limit=200)
        active_plan_mix: Dict[str, int] = {}
        for item in active_mirror:
            if item.get("mapped_state") == "active":
                key = item.get("plan_code") or DEFAULT_PLAN_CODE
                active_plan_mix[key] = active_plan_mix.get(key, 0) + 1
        return {
            "ok": True,
            "subscription_mirror": active_mirror,
            "invoices": invoices,
            "payments": payments,
            "failed_payments": failed,
            "reconciliation_queue": recon,
            "mrr_summary": {"mrr_count": sum(active_plan_mix.values()), "plan_mix": dict(sorted(active_plan_mix.items()))},
            "renewal_upcoming": [item for item in active_mirror if item.get("current_period_end")],
            "cancel_at_period_end": [item for item in active_mirror if item.get("provider_status") == "canceled"],
            "grace_period": [item for item in active_mirror if item.get("provider_status") == "past_due"],
            "plan_revenue": dict(sorted(active_plan_mix.items())),
            "receivable_risk_buckets": {
                "past_due": len([item for item in active_mirror if item.get("provider_status") == "past_due"]),
                "unpaid": len([item for item in active_mirror if item.get("provider_status") == "unpaid"]),
                "inactive": len([item for item in active_mirror if item.get("provider_status") in {"canceled", "incomplete", "incomplete_expired"}]),
            },
            "billing_visibility": {
                "recent_billing_events": list_billing_events(limit=50),
                "notification_events": list_notification_events(limit=50),
            },
        }

    def audit_overview(self, limit: int = 20) -> Dict[str, Any]:
        actions = list_admin_actions(limit=limit)
        return {"ok": True, "actions": actions, "count": len(actions), "latest_audit_verdicts": self._latest_audit_verdicts()}

    def add_note(self, actor_admin_id: str, target_user_id: str, note: str, request_id: str) -> Dict[str, Any]:
        before = self.build_user_payload(target_user_id)
        note_row = add_crm_note(target_user_id, actor_admin_id, note)
        after = self.build_user_payload(target_user_id)
        record_admin_action(actor_admin_id, "add_note", target_user_id, before, after, "support-note", request_id)
        return {"ok": True, "note": note_row, "user": after}

    def temporary_lock(self, actor_admin_id: str, target_user_id: str, reason: str, request_id: str, locked_until: Optional[str] = None) -> Dict[str, Any]:
        before = self.build_user_payload(target_user_id)
        account = before["account"].copy()
        account["locked_until"] = locked_until or (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()
        account.update(
            {
                "access_locked": True,
                "locked_reason": reason or "manual",
            }
        )
        upsert_account(account)
        after = self.build_user_payload(target_user_id)
        record_admin_action(actor_admin_id, "temporary_lock", target_user_id, before, after, reason, request_id)
        return {"ok": True, "before": before, "after": after}

    def temporary_unlock(self, actor_admin_id: str, target_user_id: str, reason: str, request_id: str) -> Dict[str, Any]:
        before = self.build_user_payload(target_user_id)
        account = before["account"].copy()
        account.update({"access_locked": False, "locked_reason": "", "locked_until": ""})
        upsert_account(account)
        after = self.build_user_payload(target_user_id)
        record_admin_action(actor_admin_id, "temporary_unlock", target_user_id, before, after, reason, request_id)
        return {"ok": True, "before": before, "after": after}

    def assign_owner(self, actor_admin_id: str, target_user_id: str, owner_admin: str, request_id: str) -> Dict[str, Any]:
        before = self.build_user_payload(target_user_id)
        profile = before["crm_profile"].copy()
        profile["owner_admin"] = owner_admin
        upsert_crm_profile(profile)
        after = self.build_user_payload(target_user_id)
        record_admin_action(actor_admin_id, "assign_owner", target_user_id, before, after, owner_admin, request_id)
        return {"ok": True, "before": before, "after": after}

    def set_tags(self, actor_admin_id: str, target_user_id: str, tags: List[str], request_id: str) -> Dict[str, Any]:
        before = self.build_user_payload(target_user_id)
        replace_crm_tags(target_user_id, tags, source="admin")
        after = self.build_user_payload(target_user_id)
        record_admin_action(actor_admin_id, "tag_change", target_user_id, before, after, ",".join(tags), request_id)
        return {"ok": True, "before": before, "after": after}

    def record_usage(self, account_id: str, route: str, event_type: str = "route-hit", detail: Optional[Dict[str, Any]] = None) -> None:
        record_usage_event(account_id, route, event_type=event_type, detail=detail)

    def record_notification(self, account_id: str, channel: str, notification_type: str, state: str, reason: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return record_notification_event(
            {
                "account_id": account_id,
                "channel": channel,
                "notification_type": notification_type,
                "state": state,
                "reason": reason,
                "payload": json.dumps(payload, ensure_ascii=False),
            }
        )

    def _latest_audit_verdicts(self) -> List[Dict[str, Any]]:
        try:
            from .auditor import load_verdict_history

            return load_verdict_history(limit=5)
        except Exception:
            return []

    def list_wallets(self) -> Dict[str, Any]:
        wallets = list_blockchain_wallets()
        return {"ok": True, "count": len(wallets), "items": wallets}

    def add_wallet(self, actor_admin_id: str, payload: Dict[str, Any], request_id: str) -> Dict[str, Any]:
        label = str(payload.get("label") or "").strip()
        address = str(payload.get("address") or "").strip()
        network = str(payload.get("network") or "").strip()
        description = str(payload.get("description") or "").strip()
        reason = str(payload.get("reason") or "blockchain-wallet-add").strip()
        active_flag = bool(payload.get("active") if payload.get("active") is not None else True)
        if not label or not address or not network:
            return {"ok": False, "reason": "missing_required_fields"}
        if self.settings.admin_security_token:
            token = str(payload.get("security_token") or "").strip()
            if token != self.settings.admin_security_token:
                return {"ok": False, "reason": "invalid_security_token"}
        before = list_blockchain_wallets()
        wallet_record = add_blockchain_wallet(
            {
                "wallet_id": uuid.uuid4().hex,
                "label": label,
                "address": address,
                "network": network,
                "description": description,
                "active": active_flag,
                "added_by": actor_admin_id,
            }
        )
        after = list_blockchain_wallets()
        before_ids = [item.get("wallet_id") for item in before]
        after_ids = [item.get("wallet_id") for item in after]
        record_admin_action(
            actor_admin_id,
            "add_wallet",
            actor_admin_id,
            {"wallet_ids": before_ids},
            {"wallet_ids": after_ids, "wallet": wallet_record},
            reason,
            request_id,
        )
        return {"ok": True, "wallet": wallet_record, "items": after}
