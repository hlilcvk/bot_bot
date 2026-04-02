from __future__ import annotations

from typing import Any, Dict

from ..services.billing_service import BillingService


def provider_payload(service: BillingService) -> Dict[str, Any]:
    return {"ok": True, **service.provider_status()}


def checkout_payload(service: BillingService, payload: Dict[str, Any]) -> Dict[str, Any]:
    account_id = str(payload.get("account_id") or payload.get("client_id") or "").strip()
    plan_code = str(payload.get("plan_code") or payload.get("plan") or "").strip()
    return service.create_checkout_session(account_id=account_id, plan_code=plan_code)


def portal_payload(service: BillingService, payload: Dict[str, Any]) -> Dict[str, Any]:
    account_id = str(payload.get("account_id") or payload.get("client_id") or "").strip()
    return service.create_portal_link(account_id=account_id)

