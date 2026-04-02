from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any, Dict, List

from ...config import Settings
from .base import BillingProviderAdapter, BillingProviderResponse


class StripeBillingProvider(BillingProviderAdapter):
    name = "stripe"

    def __init__(self, settings: Settings):
        self.settings = settings
        self.price_map = self._parse_price_map(settings.stripe_price_ids_json)

    def _parse_price_map(self, value: str) -> Dict[str, str]:
        if not value.strip():
            return {}
        try:
            payload = json.loads(value)
        except json.JSONDecodeError:
            return {}
        if not isinstance(payload, dict):
            return {}
        return {str(key): str(val) for key, val in payload.items() if str(val).strip()}

    def _missing(self) -> List[str]:
        missing = []
        if not self.settings.stripe_secret_key.strip():
            missing.append("STRIPE_SECRET_KEY")
        if not self.price_map:
            missing.append("STRIPE_PRICE_IDS_JSON")
        return missing

    def provider_status(self) -> Dict[str, Any]:
        missing = self._missing()
        return {
            "provider": self.name,
            "configured": not missing,
            "ready": not missing,
            "missing": missing,
            "details": {"price_map_keys": sorted(self.price_map.keys())},
        }

    def create_checkout_session(self, account_id: str, plan_code: str, success_url: str, cancel_url: str) -> BillingProviderResponse:
        missing = self._missing()
        if missing:
            return BillingProviderResponse(ok=False, provider=self.name, reason="provider-unavailable", status_code=503, data={"missing": missing})
        if plan_code not in self.price_map:
            return BillingProviderResponse(ok=False, provider=self.name, reason="plan-not-mapped", status_code=400)
        return BillingProviderResponse(
            ok=False,
            provider=self.name,
            reason="stripe-http-integration-not-wired",
            status_code=501,
            data={"account_id": account_id, "plan_code": plan_code, "success_url": success_url, "cancel_url": cancel_url},
        )

    def create_portal_link(self, account_id: str, return_url: str) -> BillingProviderResponse:
        return BillingProviderResponse(
            ok=False,
            provider=self.name,
            reason="stripe-customer-portal-requires-customer-link",
            status_code=501,
            data={"account_id": account_id, "return_url": return_url},
        )

    def verify_webhook(self, headers: Dict[str, str], raw_body: bytes) -> BillingProviderResponse:
        secret = self.settings.billing_webhook_secret.strip() or self.settings.stripe_webhook_secret.strip()
        if not secret:
            return BillingProviderResponse(ok=False, provider=self.name, reason="webhook-secret-missing", status_code=503)
        signature = headers.get("Stripe-Signature", "")
        parts = {}
        for piece in signature.split(","):
            if "=" in piece:
                key, value = piece.split("=", 1)
                parts[key.strip()] = value.strip()
        timestamp = parts.get("t", "")
        received = parts.get("v1", "")
        if not timestamp or not received:
            return BillingProviderResponse(ok=False, provider=self.name, reason="signature-invalid", status_code=401)
        payload = f"{timestamp}.{raw_body.decode('utf-8', errors='ignore')}".encode("utf-8")
        expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, received):
            return BillingProviderResponse(ok=False, provider=self.name, reason="signature-invalid", status_code=401)
        try:
            event = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            return BillingProviderResponse(ok=False, provider=self.name, reason="invalid-json", status_code=400)
        return BillingProviderResponse(ok=True, provider=self.name, reason="verified", data={"event": event})

    def normalize_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        data = event.get("data") or {}
        obj = data.get("object") or {}
        metadata = obj.get("metadata") or {}
        status = str(obj.get("status") or event.get("status") or "")
        provider_status = {
            "active": "active",
            "trialing": "trialing",
            "past_due": "past_due",
            "canceled": "canceled",
            "unpaid": "unpaid",
            "incomplete": "incomplete",
            "incomplete_expired": "incomplete_expired",
        }.get(status, status or "incomplete")
        return {
            "event_id": str(event.get("id") or obj.get("id") or ""),
            "event_type": str(event.get("type") or ""),
            "account_id": str(metadata.get("account_id") or obj.get("client_reference_id") or obj.get("account_id") or ""),
            "provider_customer_id": str(obj.get("customer") or obj.get("customer_id") or ""),
            "provider_subscription_id": str(obj.get("subscription") or obj.get("id") or ""),
            "provider_status": provider_status,
            "plan_code": str(metadata.get("plan_code") or obj.get("plan_code") or ""),
            "current_period_end": str(obj.get("current_period_end") or ""),
            "trial_end_at": str(obj.get("trial_end") or obj.get("trial_end_at") or ""),
            "raw_event": event,
            "mapped_state": provider_status,
        }

