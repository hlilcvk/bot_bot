from __future__ import annotations

from typing import Any, Dict

from ..services.telegram_service import TelegramService


def config_payload(service: TelegramService) -> Dict[str, Any]:
    settings = service.settings
    return {
        "bot_ready": service.bot_ready(),
        "bot_username": settings.telegram_bot_username,
        "webhook_secret_configured": bool(settings.telegram_webhook_secret),
        "public_base_url": settings.public_base_url,
    }


def create_link_session(service: TelegramService, payload: Dict[str, Any]) -> Dict[str, Any]:
    session_id = str(payload.get("session_id") or payload.get("client_id") or "").strip() or None
    label = str(payload.get("label") or payload.get("name") or "Radar Operator").strip()
    return service.create_session(session_id=session_id, label=label)


def session_status(service: TelegramService, session_id: str) -> Dict[str, Any]:
    session = service.get_session(session_id)
    return session or {"ok": False, "reason": "missing-session"}


def test_message(service: TelegramService, payload: Dict[str, Any]) -> Dict[str, Any]:
    session_id = str(payload.get("session_id") or "").strip()
    text = str(payload.get("text") or "").strip() or None
    return service.send_test_message(session_id=session_id, text=text)


def unlink_session(service: TelegramService, payload: Dict[str, Any]) -> Dict[str, Any]:
    session_id = str(payload.get("session_id") or "").strip()
    return service.unlink_session(session_id)

