from __future__ import annotations

import json
import secrets
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional

from ..config import Settings
from ..domain.telegram import TelegramSessionView
from ..storage.sqlite_store import (
    bind_session,
    get_session_by_id,
    get_session_by_token,
    initialize,
    list_sessions,
    mark_session_error,
    mark_session_message_sent,
    record_event,
    update_session_seen,
    upsert_session,
)


class TelegramService:
    def __init__(self, settings: Settings):
        self.settings = settings
        initialize()

    def _bot_username(self) -> str:
        return self.settings.telegram_bot_username.strip().lstrip("@")

    def bot_ready(self) -> bool:
        return bool(self.settings.telegram_bot_token and self._bot_username())

    def create_session(self, session_id: Optional[str] = None, label: str = "Radar Operator") -> Dict[str, Any]:
        session_id = (session_id or secrets.token_urlsafe(12)).strip()
        token = secrets.token_urlsafe(18)
        row = upsert_session(session_id=session_id, token=token, label=label.strip() or "Radar Operator")
        return self._decorate_session(row)

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        row = get_session_by_id(session_id)
        return self._decorate_session(row) if row else None

    def get_session_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        row = get_session_by_token(token)
        return self._decorate_session(row) if row else None

    def list_sessions(self) -> list[Dict[str, Any]]:
        return [self._decorate_session(row) for row in list_sessions()]

    def _deep_link(self, token: str) -> str:
        username = self._bot_username()
        if not username:
            return ""
        return f"https://t.me/{username}?start={urllib.parse.quote(token)}"

    def _decorate_session(self, row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        token = row.get("token", "")
        return {
            **row,
            "bot_username": self._bot_username(),
            "deep_link": self._deep_link(token) if token else "",
            "bot_ready": self.bot_ready(),
        }

    def session_view(self, session_id: str) -> Optional[TelegramSessionView]:
        row = self.get_session(session_id)
        if not row:
            return None
        return TelegramSessionView(
            session_id=row["session_id"],
            token=row["token"],
            label=row.get("label", ""),
            status=row.get("status", ""),
            bot_username=row.get("bot_username", ""),
            deep_link=row.get("deep_link", ""),
            chat_id=row.get("chat_id"),
            telegram_user_id=row.get("telegram_user_id"),
            telegram_username=row.get("telegram_username"),
            confirmed_at=row.get("confirmed_at"),
            created_at=row.get("created_at"),
        )

    def handle_webhook_update(self, update: Dict[str, Any]) -> Dict[str, Any]:
        message = update.get("message") or update.get("edited_message") or {}
        chat = message.get("chat") or {}
        user = message.get("from") or {}
        text = (message.get("text") or message.get("caption") or "").strip()
        if not text.startswith("/start"):
            return {"handled": False, "reason": "not-start"}

        parts = text.split(maxsplit=1)
        token = parts[1].strip() if len(parts) > 1 else ""
        if not token:
            return {"handled": False, "reason": "missing-token"}

        row = get_session_by_token(token)
        if not row:
            return {"handled": False, "reason": "unknown-token"}

        session_id = row["session_id"]
        bound = bind_session(
            session_id=session_id,
            chat_id=int(chat.get("id") or 0),
            telegram_user_id=user.get("id"),
            telegram_username=user.get("username"),
        )
        record_event(
            session_id,
            "telegram_start_confirmed",
            {
                "chat_id": chat.get("id"),
                "telegram_user_id": user.get("id"),
                "telegram_username": user.get("username"),
            },
        )
        update_session_seen(session_id)
        confirmation = self._send_confirmation(bound, session_id)
        return {"handled": True, "confirmed": True, "confirmation": confirmation}

    def _send_confirmation(self, session_row: Optional[Dict[str, Any]], session_id: str) -> Dict[str, Any]:
        if not session_row:
            return {"sent": False, "reason": "missing-session"}
        chat_id = session_row.get("chat_id")
        if not chat_id:
            return {"sent": False, "reason": "missing-chat"}
        text = (
            "PROPTREX Radar bağlantın onaylandı.\n"
            "Artık bu Telegram hesabına Radar bildirimleri gönderilebilir."
        )
        result = self.send_message(chat_id=int(chat_id), text=text)
        if result.get("sent"):
            mark_session_message_sent(session_id)
            update_session_seen(session_id)
        else:
            mark_session_error(session_id, result.get("detail") or result.get("reason") or "send-failed")
        return result

    def send_message(self, chat_id: int, text: str) -> Dict[str, Any]:
        if not self.bot_ready():
            return {"sent": False, "reason": "bot-not-configured"}

        url = f"https://api.telegram.org/bot{self.settings.telegram_bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "disable_web_page_preview": True,
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {"sent": True, "response": data}
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            return {"sent": False, "reason": f"http-{exc.code}", "detail": body}
        except Exception as exc:  # pragma: no cover - runtime safeguard
            return {"sent": False, "reason": "send-failed", "detail": str(exc)}

    def send_test_message(self, session_id: str, text: Optional[str] = None) -> Dict[str, Any]:
        row = self.get_session(session_id)
        if not row:
            return {"sent": False, "reason": "missing-session"}
        if row.get("status") != "bound" or not row.get("chat_id"):
            return {"sent": False, "reason": "session-not-bound"}
        message = text or "PROPTREX Radar test mesajı başarıyla ulaştı."
        result = self.send_message(int(row["chat_id"]), message)
        if result.get("sent"):
            record_event(session_id, "telegram_test_sent", {"text": message})
            mark_session_message_sent(session_id)
            update_session_seen(session_id)
        else:
            mark_session_error(session_id, result.get("detail") or result.get("reason") or "send-failed")
        return result

    def unlink_session(self, session_id: str) -> Dict[str, Any]:
        row = get_session_by_id(session_id)
        if not row:
            return {"ok": False, "reason": "missing-session"}
        # Reuse upsert to keep a stable record but reset binding metadata.
        from ..storage.sqlite_store import connect

        with connect() as conn:
            conn.execute(
                """
                UPDATE telegram_sessions
                SET status='pending',
                    chat_id=NULL,
                    telegram_user_id=NULL,
                    telegram_username=NULL,
                    confirmed_at=NULL,
                    last_message_at=NULL,
                    last_error=NULL
                WHERE session_id = ?
                """,
                (session_id,),
            )
        record_event(session_id, "telegram_unlinked", {})
        return {"ok": True}
