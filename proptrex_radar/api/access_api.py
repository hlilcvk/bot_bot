from __future__ import annotations

from typing import Any, Dict

from ..services.entitlements_service import AccessService


def access_me_payload(service: AccessService, account_id: str) -> Dict[str, Any]:
    snapshot = service.get_snapshot(account_id)
    account = snapshot["account"]
    entitlements = snapshot["entitlements"]
    decision = snapshot["decision"]
    return {
        "ok": True,
        "account_id": account["account_id"],
        "account": account,
        "entitlements": entitlements,
        "decision": decision,
    }


def access_catalog_payload(service: AccessService) -> Dict[str, Any]:
    return service.catalog_payload()

