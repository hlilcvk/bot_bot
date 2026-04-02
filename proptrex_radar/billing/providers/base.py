from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class BillingProviderResponse:
    ok: bool
    provider: str
    reason: str = ""
    status_code: int = 200
    data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ok": self.ok,
            "provider": self.provider,
            "reason": self.reason,
            "status_code": self.status_code,
            **self.data,
        }


class BillingProviderAdapter:
    name = "none"

    def provider_status(self) -> Dict[str, Any]:
        return {"provider": self.name, "configured": False, "ready": False, "missing": [], "details": {}}

    def create_checkout_session(self, account_id: str, plan_code: str, success_url: str, cancel_url: str) -> BillingProviderResponse:
        return BillingProviderResponse(ok=False, provider=self.name, reason="provider-unavailable", status_code=503)

    def create_portal_link(self, account_id: str, return_url: str) -> BillingProviderResponse:
        return BillingProviderResponse(ok=False, provider=self.name, reason="provider-unavailable", status_code=503)

    def verify_webhook(self, headers: Dict[str, str], raw_body: bytes) -> BillingProviderResponse:
        return BillingProviderResponse(ok=False, provider=self.name, reason="provider-unavailable", status_code=503)

    def normalize_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "event_id": str(event.get("id") or ""),
            "event_type": str(event.get("type") or ""),
            "account_id": str(event.get("account_id") or ""),
            "provider_customer_id": str(event.get("provider_customer_id") or ""),
            "provider_subscription_id": str(event.get("provider_subscription_id") or ""),
            "provider_status": str(event.get("provider_status") or ""),
            "plan_code": str(event.get("plan_code") or ""),
            "current_period_end": str(event.get("current_period_end") or ""),
            "trial_end_at": str(event.get("trial_end_at") or ""),
            "raw_event": event,
            "mapped_state": str(event.get("provider_status") or "incomplete"),
        }

