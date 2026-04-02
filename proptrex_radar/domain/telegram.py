from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class TelegramSessionView:
    session_id: str
    token: str
    label: str
    status: str
    bot_username: str
    deep_link: str
    chat_id: Optional[int] = None
    telegram_user_id: Optional[int] = None
    telegram_username: Optional[str] = None
    confirmed_at: Optional[str] = None
    created_at: Optional[str] = None

