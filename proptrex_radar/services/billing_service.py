from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict

from ..access.catalog import DEFAULT_PLAN_CODE
from ..billing.resolver import resolve_billing_provider
from ..config import Settings
from ..storage.access_store import initialize, list_billing_events, record_billing_event, upsert_subscription_mirror
from .entitlements_service import AccessService


class BillingService:
    def __init__(self, settings: Settings, access_service: AccessService):
        self.settings = settings
        self.access_service = access_service
        self.provider = resolve_billing_provider(settings)
        initialize()

    def provider_status(self) -> Dict[str, Any]:
        payload = self.provider.provider_status()
        payload["selected"] = payload.get("provider")
        payload["configured"] = bool(payload.get("configured"))
        return payload

    def _resolve_urls(self) -> Dict[str, str]:
        base = self.settings.public_base_url or ""
        return {
            "success_url": self.settings.checkout_success_url.strip() or (f"{base}/radar/?account_id={{ACCOUNT_ID}}" if base else ""),
            "cancel_url": self.settings.checkout_cancel_url.strip() or (f"{base}/locked/" if base else ""),
            "portal_return_url": self.settings.billing_portal_url.strip() or (f"{base}/radar/" if base else ""),
        }

    def create_checkout_session(self, account_id: str, plan_code: str) -> Dict[str, Any]:
        urls = self._resolve_urls()
        account = self.access_service.ensure_account(account_id)
        response = self.provider.create_checkout_session(
            account_id=account["account_id"],
            plan_code=plan_code or account.get("plan_code") or DEFAULT_PLAN_CODE,
            success_url=urls["success_url"].replace("{ACCOUNT_ID}", account["account_id"]),
            cancel_url=urls["cancel_url"].replace("{ACCOUNT_ID}", account["account_id"]),
        )
        payload = response.to_dict()
        payload["account_id"] = account["account_id"]
        payload["provider_status"] = self.provider_status()
        if not response.ok:
            payload["unavailable_dependency"] = self._missing_dependency_label()
        return payload

    def create_portal_link(self, account_id: str) -> Dict[str, Any]:
        urls = self._resolve_urls()
        account = self.access_service.ensure_account(account_id)
        response = self.provider.create_portal_link(account["account_id"], urls["portal_return_url"].replace("{ACCOUNT_ID}", account["account_id"]))
        payload = response.to_dict()
        payload["account_id"] = account["account_id"]
        payload["provider_status"] = self.provider_status()
        if not response.ok:
            payload["unavailable_dependency"] = self._missing_dependency_label()
        return payload

    def _missing_dependency_label(self) -> str:
        status = self.provider_status()
        missing = status.get("missing") or []
        if missing:
            return ", ".join(str(item) for item in missing)
        return f"{status.get('provider')}-integration-unavailable"

    def _subscription_state_from_provider(self, provider_status: str) -> str:
        mapping = {
            "active": "active",
            "trialing": "trialing",
            "past_due": "past_due",
            "canceled": "canceled",
            "unpaid": "unpaid",
            "incomplete": "incomplete",
            "incomplete_expired": "incomplete_expired",
        }
        return mapping.get(provider_status, "incomplete")

    def process_webhook(self, headers: Dict[str, str], raw_body: bytes) -> Dict[str, Any]:
        verification = self.provider.verify_webhook(headers, raw_body)
        if not verification.ok:
            record_billing_event(
                {
                    "event_id": f"rejected-{hashlib.sha256(raw_body).hexdigest()}",
                    "provider": self.provider.name,
                    "event_type": "webhook.rejected",
                    "signature_valid": False,
                    "status": verification.reason or "signature-invalid",
                    "raw_event": raw_body.decode("utf-8", errors="ignore"),
                    "detail": json.dumps({"reason": verification.reason}, ensure_ascii=False),
                }
            )
            return verification.to_dict()

        event = verification.data.get("event") or {}
        normalized = self.provider.normalize_event(event)
        account_id = normalized.get("account_id") or ""
        event_id = normalized.get("event_id") or hashlib.sha256(raw_body).hexdigest()
        normalized["event_id"] = event_id
        existing = next((item for item in list_billing_events(limit=500) if str(item.get("event_id")) == event_id), None)
        if existing:
            return {
                "ok": True,
                "provider": self.provider.name,
                "status": "duplicate",
                "event_id": event_id,
                "account_id": account_id,
            }

        billing_event = {
            "event_id": event_id,
            "provider": self.provider.name,
            "event_type": normalized.get("event_type") or "subscription.updated",
            "signature_valid": True,
            "status": "processed",
            "account_id": account_id or None,
            "provider_customer_id": normalized.get("provider_customer_id"),
            "provider_subscription_id": normalized.get("provider_subscription_id"),
            "provider_status": normalized.get("provider_status"),
            "plan_code": normalized.get("plan_code") or DEFAULT_PLAN_CODE,
            "current_period_end": normalized.get("current_period_end") or "",
            "trial_end_at": normalized.get("trial_end_at") or "",
            "raw_event": json.dumps(event, ensure_ascii=False),
            "detail": json.dumps({"mapped_state": normalized.get("mapped_state")}, ensure_ascii=False),
        }
        record_billing_event(billing_event)
        from ..control.store import mirror_billing_event, record_notification_event

        mirror_billing_event(self.provider.name, normalized, event)
        if account_id:
            upsert_subscription_mirror(
                {
                    "account_id": account_id,
                    "provider": self.provider.name,
                    "provider_event_id": event_id,
                    "provider_customer_id": normalized.get("provider_customer_id"),
                    "provider_subscription_id": normalized.get("provider_subscription_id"),
                    "provider_status": normalized.get("provider_status") or "incomplete",
                    "mapped_state": self._subscription_state_from_provider(normalized.get("provider_status") or ""),
                    "plan_code": normalized.get("plan_code") or DEFAULT_PLAN_CODE,
                    "current_period_end": normalized.get("current_period_end") or "",
                    "trial_end_at": normalized.get("trial_end_at") or "",
                    "raw_event": json.dumps(event, ensure_ascii=False),
                }
            )
            self.access_service.reconcile_from_subscription_mirror(account_id)
            current_period_end = normalized.get("current_period_end") or ""
            if current_period_end and normalized.get("provider_status") == "active":
                try:
                    period_end = datetime.fromisoformat(str(current_period_end).replace("Z", "+00:00"))
                    if period_end.tzinfo is None:
                        period_end = period_end.replace(tzinfo=timezone.utc)
                    if (period_end.astimezone(timezone.utc) - datetime.now(timezone.utc)).days <= 7:
                        record_notification_event(
                            {
                                "account_id": account_id,
                                "channel": "billing",
                                "notification_type": "renewal_reminder",
                                "state": "recorded",
                                "reason": "renewal-window",
                                "payload": json.dumps({"event_id": event_id, "current_period_end": current_period_end}, ensure_ascii=False),
                            }
                        )
                except ValueError:
                    pass
            if normalized.get("provider_status") in {"past_due", "unpaid", "incomplete", "incomplete_expired"}:
                record_notification_event(
                    {
                        "account_id": account_id,
                        "channel": "billing",
                        "notification_type": "payment_failed",
                        "state": "recorded",
                        "reason": normalized.get("provider_status") or "unknown",
                        "payload": json.dumps({"event_id": event_id, "provider": self.provider.name}, ensure_ascii=False),
                    }
                )
                record_notification_event(
                    {
                        "account_id": account_id,
                        "channel": "billing",
                        "notification_type": "grace_period_warning",
                        "state": "recorded",
                        "reason": normalized.get("provider_status") or "unknown",
                        "payload": json.dumps({"event_id": event_id, "provider": self.provider.name}, ensure_ascii=False),
                    }
                )
        return {
            "ok": True,
            "provider": self.provider.name,
            "status": "processed",
            "event_id": event_id,
            "account_id": account_id,
            "mapped_state": normalized.get("mapped_state") or "incomplete",
        }
