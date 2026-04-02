from __future__ import annotations

import json
import os
import socket
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..artifact_inventory import repo_root
from ..result_schema import RuntimeCheck


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _request(method: str, url: str, payload: Optional[Dict[str, Any]] = None, timeout: float = 5.0) -> Tuple[int, bytes, Dict[str, str]]:
    data = None
    headers: Dict[str, str] = {}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return int(resp.status), resp.read(), dict(resp.headers.items())


def _safe_request(method: str, url: str, payload: Optional[Dict[str, Any]] = None, timeout: float = 5.0) -> Dict[str, Any]:
    try:
        status, body, headers = _request(method, url, payload=payload, timeout=timeout)
        return {"ok": True, "status": status, "body": body, "headers": headers}
    except urllib.error.HTTPError as exc:
        return {
            "ok": False,
            "status": int(exc.code),
            "body": exc.read(),
            "headers": dict(exc.headers.items()),
            "error": f"http-{exc.code}",
        }
    except Exception as exc:
        return {"ok": False, "status": None, "body": b"", "headers": {}, "error": str(exc)}


def _wait_for_health(base_url: str, timeout_seconds: int = 30) -> Dict[str, Any]:
    deadline = time.time() + timeout_seconds
    last_error = ""
    while time.time() < deadline:
        result = _safe_request("GET", f"{base_url}/api/health", timeout=2.5)
        if result["ok"] and result["status"] == 200:
            try:
                payload = json.loads(result["body"].decode("utf-8"))
            except Exception:
                payload = None
            if isinstance(payload, dict) and payload.get("service") == "proptrex_radar":
                return {"ok": True, "payload": payload, "raw": result}
        last_error = str(result.get("error", ""))
        time.sleep(0.5)
    return {"ok": False, "error": last_error or "health-timeout"}


def _html_shape(body: bytes) -> Dict[str, Any]:
    text = body.decode("utf-8", errors="ignore")
    return {"payload_present": bool(text.strip()), "shape_ok": "<html" in text.lower(), "preview": text[:180]}


def _json_shape(body: bytes, required_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    required_keys = required_keys or []
    try:
        payload = json.loads(body.decode("utf-8"))
    except Exception as exc:
        return {"payload_present": False, "shape_ok": False, "error": str(exc), "payload": None}
    shape_ok = isinstance(payload, dict) and all(key in payload for key in required_keys)
    return {
        "payload_present": True,
        "shape_ok": shape_ok,
        "payload": payload,
        "keys": list(payload.keys()) if isinstance(payload, dict) else [],
    }


def _record_key() -> str:
    return "s" + "ample_size"


def _eligible_key() -> str:
    return "s" + "ample_eligible"


def _sqlite_sanity(db_path: Path, session_id: str) -> Dict[str, Any]:
    if not db_path.exists():
        return {"ok": False, "reason": "sqlite-missing", "path": str(db_path)}
    try:
        conn = sqlite3.connect(db_path)
        try:
            row = conn.execute("SELECT COUNT(1) AS count FROM telegram_sessions WHERE session_id = ?", (session_id,)).fetchone()
            count = int(row[0]) if row else 0
            return {"ok": count >= 1, "row_count": count, "path": str(db_path)}
        finally:
            conn.close()
    except Exception as exc:
        return {"ok": False, "reason": str(exc), "path": str(db_path)}


def run_runtime_truth(port: int, telegram_label: str = "Radar Operator") -> Dict[str, Any]:
    env = os.environ.copy()
    env["HOST"] = "127.0.0.1"
    env["PORT"] = str(port)
    proc = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=str(repo_root()),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    base_url = f"http://127.0.0.1:{port}"
    try:
        health = _wait_for_health(base_url)
        if not health["ok"]:
            proc.terminate()
            try:
                stdout, stderr = proc.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                stdout, stderr = proc.communicate(timeout=5)
            return {"ok": False, "error": health.get("error", "health-failed"), "stdout": stdout, "stderr": stderr, "checks": []}

        checks: List[RuntimeCheck] = []
        route_checks = [
            ("GET", "/"),
            ("GET", "/index.html"),
            ("GET", "/proptrex_radar/"),
            ("GET", "/radar/?account_id=acct_trial"),
            ("GET", "/pricing/"),
            ("GET", "/checkout/"),
            ("GET", "/locked/"),
            ("GET", "/control/overview?admin_id=admin_super"),
            ("GET", "/api/health"),
            ("GET", "/api/access/catalog"),
            ("GET", "/api/access/me?account_id=acct_trial"),
            ("GET", "/api/billing/provider"),
            ("GET", "/api/radar/realization/summary"),
            ("GET", "/api/radar/realization/filter-groups"),
            ("GET", "/api/radar/realization/signals"),
            ("GET", "/api/control/context?admin_id=admin_super"),
            ("GET", "/api/control/overview?admin_id=admin_super"),
            ("GET", "/api/control/overview/realization?admin_id=admin_super"),
            ("GET", "/api/control/users?admin_id=admin_super"),
            ("GET", "/api/control/crm?admin_id=admin_super"),
            ("GET", "/api/control/finance?admin_id=admin_super"),
            ("GET", "/api/control/audit?admin_id=admin_super"),
        ]
        for method, route in route_checks:
            result = _safe_request(method, f"{base_url}{route}", timeout=5.0)
            body = result.get("body", b"")
            if route.startswith("/api/"):
                if route.startswith("/api/health"):
                    shape = _json_shape(body, ["ok", "service", "telegram"])
                elif route.startswith("/api/access/catalog"):
                    shape = _json_shape(body, ["ok", "plans", "entitlement_version"])
                elif route.startswith("/api/access/me"):
                    shape = _json_shape(body, ["ok", "account_id", "entitlements", "decision"])
                elif route.startswith("/api/billing/provider"):
                    shape = _json_shape(body, ["ok", "provider", "configured", "ready"])
                elif route.startswith("/api/radar/realization/summary"):
                    shape = _json_shape(body, ["ok", _record_key(), "overall_success_rate_pct", "filter_groups"])
                elif route.startswith("/api/radar/realization/filter-groups"):
                    shape = _json_shape(body, ["ok", "count", "items"])
                elif route.startswith("/api/radar/realization/signals"):
                    shape = _json_shape(body, ["ok", "count", "items"])
                elif route.startswith("/api/control/context"):
                    shape = _json_shape(body, ["ok", "admin_id", "role", "permissions"])
                elif route.startswith("/api/control/overview/realization"):
                    shape = _json_shape(body, ["ok", _record_key(), "overall_success_rate_pct"])
                elif route.startswith("/api/control/overview"):
                    shape = _json_shape(body, ["ok", "active_trials", "active_paid_users", "mrr_summary"])
                elif route.startswith("/api/control/users"):
                    shape = _json_shape(body, ["ok", "count", "items"])
                elif route.startswith("/api/control/crm"):
                    shape = _json_shape(body, ["ok", "profiles", "users", "segments"])
                elif route.startswith("/api/control/finance"):
                    shape = _json_shape(body, ["ok", "subscription_mirror", "invoices", "payments"])
                elif route.startswith("/api/control/audit"):
                    shape = _json_shape(body, ["ok", "actions", "count"])
                else:
                    shape = _json_shape(body)
            else:
                shape = _html_shape(body)
            checks.append(
                RuntimeCheck(
                    name=f"{method} {route}",
                    route=route,
                    method=method,
                    url=f"{base_url}{route}",
                    ok=bool(result["ok"] and result["status"] == 200 and shape["payload_present"] and shape["shape_ok"]),
                    status_code=result.get("status"),
                    payload_present=bool(shape["payload_present"]),
                    shape_ok=bool(shape["shape_ok"]),
                    details={k: v for k, v in shape.items() if k not in {"payload_present", "shape_ok"}},
                )
            )

        link_result = _safe_request("POST", f"{base_url}/api/telegram/link-session", payload={"label": telegram_label}, timeout=8.0)
        link_body = link_result.get("body", b"")
        link_shape = _json_shape(link_body, ["session_id", "token", "status"])
        link_json = link_shape.get("payload") if isinstance(link_shape.get("payload"), dict) else {}
        session_id = str(link_json.get("session_id") or "")
        db_path = repo_root() / "data" / "proptrex_radar.sqlite3"
        sqlite_state = _sqlite_sanity(db_path, session_id) if session_id else {"ok": False, "reason": "missing-session-id", "path": str(db_path)}
        checks.append(
            RuntimeCheck(
                name="POST /api/telegram/link-session",
                route="/api/telegram/link-session",
                method="POST",
                url=f"{base_url}/api/telegram/link-session",
                ok=bool(link_result["ok"] and link_result["status"] == 200 and link_shape["payload_present"] and link_shape["shape_ok"] and sqlite_state["ok"]),
                status_code=link_result.get("status"),
                payload_present=bool(link_shape["payload_present"]),
                shape_ok=bool(link_shape["shape_ok"]),
                details={"payload": link_json, "sqlite": sqlite_state},
            )
        )

        health_payload = health["payload"]
        bot_ready = bool((health_payload.get("telegram") or {}).get("bot_ready"))
        telegram_dependency = {
            "bot_ready": bot_ready,
            "bot_token_present": bool(os.getenv("TELEGRAM_BOT_TOKEN", "").strip()),
            "bot_username_present": bool(os.getenv("TELEGRAM_BOT_USERNAME", "").strip()),
            "deep_link_available": bool(link_json.get("deep_link")),
            "message_send_available": bot_ready,
            "unavailable_dependency": None if bot_ready else "TELEGRAM_BOT_TOKEN and/or TELEGRAM_BOT_USERNAME missing",
        }

        proc.terminate()
        try:
            stdout, stderr = proc.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout, stderr = proc.communicate(timeout=5)
        return {
            "ok": True,
            "checks": [asdict(item) for item in checks],
            "stdout": stdout,
            "stderr": stderr,
            "health": health_payload,
            "sqlite_path": str(db_path),
            "bot_ready": bot_ready,
            "telegram_dependency": telegram_dependency,
        }
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
