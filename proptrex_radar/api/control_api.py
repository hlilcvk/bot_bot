from __future__ import annotations

import time
from typing import Any, Dict, List

from ..control.service import ControlPlaneService


def context_payload(service: ControlPlaneService, admin_id: str) -> Dict[str, Any]:
    context = service.admin_context(admin_id)
    if not context:
        return {"ok": False, "reason": "admin-required"}
    return {
        "ok": True,
        "admin_id": context.admin_id,
        "role": context.role,
        "display_name": context.display_name,
        "email": context.email,
        "permissions": sorted(context.permissions),
    }


def overview_payload(service: ControlPlaneService, admin_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "read_control"):
        return {"ok": False, "reason": "admin-required"}
    return service.overview()


def overview_realization_payload(service: ControlPlaneService, admin_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "read_control"):
        return {"ok": False, "reason": "admin-required"}
    return service.realization_summary()


def users_payload(service: ControlPlaneService, admin_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "read_control"):
        return {"ok": False, "reason": "admin-required"}
    return service.list_users()


def user_payload(service: ControlPlaneService, admin_id: str, user_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "read_control"):
        return {"ok": False, "reason": "admin-required"}
    return service.get_user(user_id)


def crm_payload(service: ControlPlaneService, admin_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "read_crm"):
        return {"ok": False, "reason": "admin-required"}
    return service.crm_overview()


def finance_payload(service: ControlPlaneService, admin_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "read_finance"):
        return {"ok": False, "reason": "admin-required"}
    return service.finance_overview()


def audit_payload(service: ControlPlaneService, admin_id: str, limit: int = 20) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "read_control"):
        return {"ok": False, "reason": "admin-required"}
    return service.audit_overview(limit=limit)


def note_payload(service: ControlPlaneService, admin_id: str, user_id: str, note: str, request_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "add_note"):
        return {"ok": False, "reason": "admin-required"}
    return service.add_note(admin_id, user_id, note, request_id)


def lock_payload(service: ControlPlaneService, admin_id: str, user_id: str, reason: str, request_id: str, locked_until: str = "") -> Dict[str, Any]:
    if not service.require_admin(admin_id, "temporary_lock"):
        return {"ok": False, "reason": "admin-required"}
    return service.temporary_lock(admin_id, user_id, reason, request_id, locked_until=locked_until or None)


def unlock_payload(service: ControlPlaneService, admin_id: str, user_id: str, reason: str, request_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "temporary_unlock"):
        return {"ok": False, "reason": "admin-required"}
    return service.temporary_unlock(admin_id, user_id, reason, request_id)


def assign_owner_payload(service: ControlPlaneService, admin_id: str, user_id: str, owner_admin: str, request_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "assign_owner"):
        return {"ok": False, "reason": "admin-required"}
    return service.assign_owner(admin_id, user_id, owner_admin, request_id)


def tag_payload(service: ControlPlaneService, admin_id: str, user_id: str, tags: List[str], request_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "tag_change"):
        return {"ok": False, "reason": "admin-required"}
    return service.set_tags(admin_id, user_id, tags, request_id)


def wallets_payload(service: ControlPlaneService, admin_id: str) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "read_control"):
        return {"ok": False, "reason": "admin-required"}
    return service.list_wallets()


def add_wallet_payload(service: ControlPlaneService, admin_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if not service.require_admin(admin_id, "manage_wallets"):
        return {"ok": False, "reason": "admin-required"}
    request_id = str(payload.get("request_id") or f"wallet-{int(time.time())}")
    return service.add_wallet(admin_id, payload, request_id)
