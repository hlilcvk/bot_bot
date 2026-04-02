from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional, Set

from .store import get_admin


ROLE_ORDER = {
    "support_admin": 1,
    "ops_admin": 2,
    "super_admin": 3,
}

ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "support_admin": {"read_control", "read_crm", "add_note"},
    "ops_admin": {"read_control", "read_crm", "read_finance", "add_note", "temporary_lock", "temporary_unlock", "export_finance"},
    "super_admin": {
        "read_control",
        "read_crm",
        "read_finance",
        "add_note",
        "temporary_lock",
        "temporary_unlock",
        "export_finance",
        "assign_owner",
        "tag_change",
        "manage_wallets",
    },
}


@dataclass(frozen=True)
class AdminContext:
    admin_id: str
    role: str
    display_name: str
    email: str
    permissions: Set[str]


def resolve_admin_context(admin_id: str) -> Optional[AdminContext]:
    admin = get_admin(admin_id)
    if not admin:
        return None
    role = str(admin.get("role") or "")
    return AdminContext(
        admin_id=str(admin.get("admin_id") or ""),
        role=role,
        display_name=str(admin.get("display_name") or ""),
        email=str(admin.get("email") or ""),
        permissions=set(ROLE_PERMISSIONS.get(role, set())),
    )


def has_permission(context: AdminContext, permission: str) -> bool:
    return permission in context.permissions


def authorize_route(admin_id: str, required_permission: str) -> Optional[AdminContext]:
    context = resolve_admin_context(admin_id)
    if context is None or not has_permission(context, required_permission):
        return None
    return context
