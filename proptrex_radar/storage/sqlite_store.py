from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from ..config import DATA_DIR


DB_PATH = DATA_DIR / "proptrex_radar.sqlite3"
DB_LOCK = threading.Lock()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def initialize() -> None:
    with DB_LOCK, connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS telegram_sessions (
                session_id TEXT PRIMARY KEY,
                token TEXT NOT NULL UNIQUE,
                label TEXT NOT NULL,
                status TEXT NOT NULL,
                chat_id INTEGER,
                telegram_user_id INTEGER,
                telegram_username TEXT,
                created_at TEXT NOT NULL,
                confirmed_at TEXT,
                last_seen_at TEXT,
                last_message_at TEXT,
                last_error TEXT
            );

            CREATE TABLE IF NOT EXISTS telegram_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def _row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    return dict(row)


def upsert_session(session_id: str, token: str, label: str) -> Dict[str, Any]:
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO telegram_sessions (
                session_id, token, label, status, created_at
            ) VALUES (?, ?, ?, 'pending', ?)
            ON CONFLICT(session_id) DO UPDATE SET
                token=excluded.token,
                label=excluded.label,
                status='pending',
                created_at=excluded.created_at
            """,
            (session_id, token, label, now),
        )
        row = conn.execute(
            "SELECT * FROM telegram_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    return _row_to_dict(row) or {}


def get_session_by_id(session_id: str) -> Optional[Dict[str, Any]]:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM telegram_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    return _row_to_dict(row)


def get_session_by_token(token: str) -> Optional[Dict[str, Any]]:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM telegram_sessions WHERE token = ?",
            (token,),
        ).fetchone()
    return _row_to_dict(row)


def list_sessions() -> Iterable[Dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM telegram_sessions ORDER BY created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def bind_session(
    session_id: str,
    chat_id: int,
    telegram_user_id: Optional[int],
    telegram_username: Optional[str],
) -> Optional[Dict[str, Any]]:
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            UPDATE telegram_sessions
            SET status = 'bound',
                chat_id = ?,
                telegram_user_id = ?,
                telegram_username = ?,
                confirmed_at = ?,
                last_seen_at = ?,
                last_error = NULL
            WHERE session_id = ?
            """,
            (chat_id, telegram_user_id, telegram_username, now, now, session_id),
        )
        row = conn.execute(
            "SELECT * FROM telegram_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    return _row_to_dict(row)


def update_session_seen(session_id: str) -> None:
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            "UPDATE telegram_sessions SET last_seen_at = ? WHERE session_id = ?",
            (now, session_id),
        )


def mark_session_message_sent(session_id: str) -> None:
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            "UPDATE telegram_sessions SET last_message_at = ?, last_seen_at = ? WHERE session_id = ?",
            (now, now, session_id),
        )


def mark_session_error(session_id: str, error: str) -> None:
    now = _utc_now()
    with DB_LOCK, connect() as conn:
        conn.execute(
            "UPDATE telegram_sessions SET last_error = ?, last_seen_at = ? WHERE session_id = ?",
            (error[:500], now, session_id),
        )


def record_event(session_id: str, event_type: str, payload: Dict[str, Any]) -> None:
    with DB_LOCK, connect() as conn:
        conn.execute(
            """
            INSERT INTO telegram_events (session_id, event_type, payload, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, event_type, json.dumps(payload, ensure_ascii=False), _utc_now()),
        )
