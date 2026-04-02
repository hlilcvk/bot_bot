from __future__ import annotations

import json
import mimetypes

mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("application/json", ".json")

from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, Tuple
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from .api.access_api import access_catalog_payload, access_me_payload
from .api.control_api import (
    add_wallet_payload,
    assign_owner_payload,
    audit_payload,
    context_payload,
    crm_payload,
    finance_payload,
    lock_payload,
    note_payload,
    overview_realization_payload,
    overview_payload,
    tag_payload,
    unlock_payload,
    user_payload,
    users_payload,
    wallets_payload,
)
from .api.realization_api import (
    fire_signal_payload,
    realization_filter_groups_payload,
    realization_signals_payload,
    realization_summary_payload,
)
from .api.billing_api import checkout_payload, portal_payload, provider_payload
from .api.telegram_api import (
    config_payload,
    create_link_session,
    session_status,
    test_message,
    unlink_session,
)
from .config import PUBLIC_DIR, load_settings
from .services.billing_service import BillingService
from .services.entitlements_service import AccessService
from .control.service import ControlPlaneService
from .ai.service import orchestrate_signal_truth
from .services.telegram_service import TelegramService


SETTINGS = load_settings()
ACCESS_SERVICE = AccessService(SETTINGS)
BILLING_SERVICE = BillingService(SETTINGS, ACCESS_SERVICE)
TELEGRAM_SERVICE = TelegramService(SETTINGS)
CONTROL_SERVICE = ControlPlaneService(SETTINGS, ACCESS_SERVICE, BILLING_SERVICE)


def _json_bytes(payload: Dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


class RadarHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self._body_cache: bytes | None = None
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def log_message(self, format, *args):
        super().log_message(format, *args)

    def _route_path(self) -> str:
        return urlparse(self.path).path

    def _route_query(self) -> Dict[str, list[str]]:
        return parse_qs(urlparse(self.path).query)

    def _cookie_account_id(self) -> str:
        cookie = SimpleCookie()
        header = self.headers.get("Cookie", "")
        if header:
            cookie.load(header)
        morsel = cookie.get("proptrex_account_id")
        return morsel.value.strip() if morsel and morsel.value else ""

    def _resolve_account_id(self, create: bool = True) -> Dict[str, Any]:
        query = self._route_query()
        account_id = (query.get("account_id") or [""])[0].strip()
        if not account_id:
            account_id = self._cookie_account_id()
        created = False
        if account_id:
            account = ACCESS_SERVICE.ensure_account(account_id)
        elif create:
            account = ACCESS_SERVICE.ensure_account()
            account_id = account["account_id"]
            created = True
        else:
            account = {}
        return {"account_id": account_id, "account": account, "created": created}

    def _cookie_admin_id(self) -> str:
        cookie = SimpleCookie()
        header = self.headers.get("Cookie", "")
        if header:
            cookie.load(header)
        morsel = cookie.get("proptrex_admin_id")
        return morsel.value.strip() if morsel and morsel.value else ""

    def _resolve_admin_id(self) -> str:
        query = self._route_query()
        admin_id = (query.get("admin_id") or [""])[0].strip()
        if not admin_id:
            admin_id = (self.headers.get("X-Admin-Id") or "").strip()
        if not admin_id:
            admin_id = self._cookie_admin_id()
        return admin_id

    def _is_control_page(self) -> bool:
        path = self._route_path()
        return path == "/control" or path.startswith("/control/")

    def _control_denied(self) -> None:
        payload = {"ok": False, "reason": "admin-required"}
        body = _json_bytes(payload)
        self.send_response(403)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _record_usage(self, account_id: str, route: str, event_type: str = "route-hit", detail: Dict[str, Any] | None = None) -> None:
        if account_id:
            CONTROL_SERVICE.record_usage(account_id, route, event_type=event_type, detail=detail or {})

    def _redirect(self, location: str, account_id: str = "") -> None:
        self.send_response(302)
        if account_id:
            self.send_header("Set-Cookie", f"proptrex_account_id={account_id}; Path=/; SameSite=Lax")
        self.send_header("Location", location)
        self.end_headers()

    def _read_body_bytes(self) -> bytes:
        if self._body_cache is not None:
            return self._body_cache
        length = int(self.headers.get("Content-Length", "0") or 0)
        self._body_cache = self.rfile.read(length) if length else b""
        return self._body_cache

    def _rewrite_static_route(self) -> None:
        if self.path in ("/", "/index.html"):
            self.path = "/proptrex_radar/index.html"
        elif self.path == "/proptrex_radar":
            self.path = "/proptrex_radar/"
        elif self.path in ("/pricing", "/checkout", "/locked", "/radar"):
            self.path = f"{self.path}/"
        elif self.path in (
            "/control",
            "/control/",
            "/control/overview",
            "/control/users",
            "/control/trials",
            "/control/subscriptions",
            "/control/billing",
            "/control/entitlements",
            "/control/crm",
            "/control/finance",
            "/control/audit",
        ):
            self.path = "/control/index.html"
        elif self.path in ("/pricing/", "/checkout/", "/locked/"):
            self.path = f"{self.path}index.html"
        elif self.path.startswith("/control/") and not self.path.endswith("index.html"):
            self.path = "/control/index.html"

    def _read_json_body(self) -> Dict[str, Any]:
        raw = self._read_body_bytes() or b"{}"
        if not raw:
            return {}
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def _write_json(self, payload: Dict[str, Any], status: int = 200, extra_headers: Dict[str, str] | None = None) -> None:
        body = _json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _write_control_json(self, payload: Dict[str, Any], status: int | None = None) -> None:
        if status is None:
            status = 403 if not payload.get("ok", True) and payload.get("reason") == "admin-required" else 200
        self._write_json(payload, status=status)

    def _access_route_guard(self) -> bool:
        path = self._route_path()
        if path not in {"/radar", "/radar/", "/radar/index.html"}:
            return False
        context = self._resolve_account_id(create=True)
        account_id = context["account_id"]
        snapshot = ACCESS_SERVICE.get_snapshot(account_id)
        decision = snapshot["decision"]
        ACCESS_SERVICE.record_access_decision(
            account_id,
            route=path,
            decision="allow" if decision["can_access_radar"] else "deny",
            reason=decision["locked_reason"] or ("access-denied" if not decision["can_access_radar"] else ""),
            detail={"account_state": snapshot["account"]["account_state"], "decision": decision},
        )
        if not decision["can_access_radar"]:
            query = urlencode({"account_id": account_id, "reason": decision["locked_reason"] or snapshot["account"]["account_state"]})
            self._redirect(f"/locked/?{query}", account_id=account_id)
            return True
        if path != "/radar/index.html":
            self._record_usage(account_id, "/radar/", event_type="route-hit")
            query = urlencode({"account_id": account_id})
            self._redirect(f"/radar/index.html?{query}", account_id=account_id)
            return True
        self._record_usage(account_id, "/radar/index.html", event_type="route-hit")
        return False

    def _control_route_guard(self) -> bool:
        if not self._is_control_page():
            return False
        admin_id = self._resolve_admin_id()
        if not CONTROL_SERVICE.admin_context(admin_id):
            self._control_denied()
            return True
        return False

    def _handle_api(self) -> bool:
        path = self._route_path()
        if path.startswith("/api/control/"):
            admin_id = self._resolve_admin_id()
            query = self._route_query()
            if path == "/api/control/context" and self.command == "GET":
                self._write_control_json(context_payload(CONTROL_SERVICE, admin_id))
                return True
            if path == "/api/control/overview" and self.command == "GET":
                self._write_control_json(overview_payload(CONTROL_SERVICE, admin_id))
                return True
            if path == "/api/control/overview/realization" and self.command == "GET":
                self._write_control_json(overview_realization_payload(CONTROL_SERVICE, admin_id))
                return True
            if path == "/api/control/users" and self.command == "GET":
                self._write_control_json(users_payload(CONTROL_SERVICE, admin_id))
                return True
            if path.startswith("/api/control/users/") and self.command == "GET":
                user_id = path.split("/api/control/users/", 1)[1].strip("/")
                if "/" in user_id:
                    user_id = user_id.split("/", 1)[0]
                self._write_control_json(user_payload(CONTROL_SERVICE, admin_id, user_id))
                return True
            if path.startswith("/api/control/users/") and path.endswith("/note") and self.command == "POST":
                user_id = path.split("/api/control/users/", 1)[1].split("/", 1)[0]
                payload = self._read_json_body()
                request_id = str(payload.get("request_id") or f"req-{user_id}")
                self._write_control_json(note_payload(CONTROL_SERVICE, admin_id, user_id, str(payload.get("note") or ""), request_id))
                return True
            if path.startswith("/api/control/users/") and path.endswith("/lock") and self.command == "POST":
                user_id = path.split("/api/control/users/", 1)[1].split("/", 1)[0]
                payload = self._read_json_body()
                request_id = str(payload.get("request_id") or f"req-{user_id}-lock")
                self._write_control_json(lock_payload(CONTROL_SERVICE, admin_id, user_id, str(payload.get("reason") or "manual"), request_id, str(payload.get("locked_until") or "")))
                return True
            if path.startswith("/api/control/users/") and path.endswith("/unlock") and self.command == "POST":
                user_id = path.split("/api/control/users/", 1)[1].split("/", 1)[0]
                payload = self._read_json_body()
                request_id = str(payload.get("request_id") or f"req-{user_id}-unlock")
                self._write_control_json(unlock_payload(CONTROL_SERVICE, admin_id, user_id, str(payload.get("reason") or "manual"), request_id))
                return True
            if path.startswith("/api/control/users/") and path.endswith("/owner") and self.command == "POST":
                user_id = path.split("/api/control/users/", 1)[1].split("/", 1)[0]
                payload = self._read_json_body()
                request_id = str(payload.get("request_id") or f"req-{user_id}-owner")
                self._write_control_json(assign_owner_payload(CONTROL_SERVICE, admin_id, user_id, str(payload.get("owner_admin") or ""), request_id))
                return True
            if path.startswith("/api/control/users/") and path.endswith("/tags") and self.command == "POST":
                user_id = path.split("/api/control/users/", 1)[1].split("/", 1)[0]
                payload = self._read_json_body()
                request_id = str(payload.get("request_id") or f"req-{user_id}-tags")
                tags = payload.get("tags") if isinstance(payload.get("tags"), list) else []
                self._write_control_json(tag_payload(CONTROL_SERVICE, admin_id, user_id, [str(tag) for tag in tags], request_id))
                return True
            if path == "/api/control/crm" and self.command == "GET":
                self._write_control_json(crm_payload(CONTROL_SERVICE, admin_id))
                return True
            if path == "/api/control/finance" and self.command == "GET":
                self._write_control_json(finance_payload(CONTROL_SERVICE, admin_id))
                return True
            if path == "/api/control/audit" and self.command == "GET":
                limit_raw = (query.get("limit") or ["20"])[0]
                try:
                    limit = max(1, min(int(limit_raw), 100))
                except ValueError:
                    limit = 20
                self._write_control_json(audit_payload(CONTROL_SERVICE, admin_id, limit=limit))
                return True
            if path == "/api/control/wallets" and self.command == "GET":
                self._write_control_json(wallets_payload(CONTROL_SERVICE, admin_id))
                return True
            if path == "/api/control/wallets" and self.command == "POST":
                payload = self._read_json_body()
                self._write_control_json(add_wallet_payload(CONTROL_SERVICE, admin_id, payload))
                return True
            self._write_control_json({"ok": False, "reason": "not-found"}, status=404)
            return True
        if path == "/api/radar/signals/fire" and self.command == "POST":
            payload = self._read_json_body()
            self._write_json(fire_signal_payload(payload))
            return True
        if path == "/api/radar/realization/summary" and self.command == "GET":
            self._write_json(realization_summary_payload())
            return True
        if path == "/api/radar/realization/filter-groups" and self.command == "GET":
            self._write_json(realization_filter_groups_payload())
            return True
        if path == "/api/radar/realization/signals" and self.command == "GET":
            self._write_json(realization_signals_payload())
            return True
        if path == "/api/health":
            self._write_json(
                {
                    "ok": True,
                    "service": "proptrex_radar",
                    "telegram": config_payload(TELEGRAM_SERVICE),
                    "access": ACCESS_SERVICE.catalog_payload(),
                    "billing": BILLING_SERVICE.provider_status(),
                }
            )
            return True
        if path == "/api/ai/orchestrator" and self.command == "GET":
            self._write_json(orchestrate_signal_truth())
            return True
        if path == "/api/auditor/latest" and self.command == "GET":
            from .control.auditor import load_latest_verdict_json

            payload = load_latest_verdict_json()
            self._write_json(payload or {"ok": False, "reason": "missing-audit-artifact"}, 200 if payload else 404)
            return True
        if path == "/api/auditor/history" and self.command == "GET":
            from .control.auditor import load_verdict_history

            query = parse_qs(urlparse(self.path).query)
            limit_raw = (query.get("limit") or ["10"])[0]
            try:
                limit = max(1, min(int(limit_raw), 50))
            except ValueError:
                limit = 10
            items = load_verdict_history(limit=limit)
            self._write_json({"ok": True, "count": len(items), "items": items})
            return True
        if path == "/api/telegram/config" and self.command == "GET":
            self._write_json(config_payload(TELEGRAM_SERVICE))
            return True
        if path == "/api/telegram/session" and self.command == "GET":
            query = parse_qs(urlparse(self.path).query)
            session_id = (query.get("session_id") or [""])[0]
            self._write_json(session_status(TELEGRAM_SERVICE, session_id))
            return True
        if path == "/api/telegram/link-session" and self.command == "POST":
            payload = self._read_json_body()
            self._write_json(create_link_session(TELEGRAM_SERVICE, payload))
            return True
        if path == "/api/telegram/test-message" and self.command == "POST":
            payload = self._read_json_body()
            self._write_json(test_message(TELEGRAM_SERVICE, payload))
            return True
        if path == "/api/telegram/unlink" and self.command == "POST":
            payload = self._read_json_body()
            self._write_json(unlink_session(TELEGRAM_SERVICE, payload))
            return True
        if path == "/api/telegram/webhook" and self.command == "POST":
            if SETTINGS.telegram_webhook_secret:
                secret = self.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
                if secret != SETTINGS.telegram_webhook_secret:
                    self._write_json({"ok": False, "reason": "unauthorized"}, 401)
                    return True
            payload = self._read_json_body()
            result = TELEGRAM_SERVICE.handle_webhook_update(payload)
            self._write_json(result)
            return True
        if path == "/api/access/catalog" and self.command == "GET":
            self._write_json(access_catalog_payload(ACCESS_SERVICE))
            return True
        if path == "/api/access/me" and self.command == "GET":
            context = self._resolve_account_id(create=True)
            payload = access_me_payload(ACCESS_SERVICE, context["account_id"])
            self._record_usage(context["account_id"], path, event_type="access-me")
            headers = {}
            if context["account_id"]:
                headers["Set-Cookie"] = f"proptrex_account_id={context['account_id']}; Path=/; SameSite=Lax"
            self._write_json(payload, extra_headers=headers)
            return True
        if path == "/api/billing/provider" and self.command == "GET":
            self._write_json(provider_payload(BILLING_SERVICE))
            return True
        if path == "/api/billing/checkout" and self.command == "POST":
            payload = self._read_json_body()
            context = self._resolve_account_id(create=True)
            payload.setdefault("account_id", context["account_id"])
            self._write_json(checkout_payload(BILLING_SERVICE, payload))
            return True
        if path == "/api/billing/portal" and self.command == "POST":
            payload = self._read_json_body()
            context = self._resolve_account_id(create=True)
            payload.setdefault("account_id", context["account_id"])
            self._write_json(portal_payload(BILLING_SERVICE, payload))
            return True
        if path == "/api/billing/webhook/stripe" and self.command == "POST":
            headers = {key: value for key, value in self.headers.items()}
            result = BILLING_SERVICE.process_webhook(headers, self._read_body_bytes())
            status = 200 if result.get("ok") else int(result.get("status_code") or 400)
            self._write_json(result, status=status)
            return True
        if path == "/api/billing/webhook/paddle" and self.command == "POST":
            headers = {key: value for key, value in self.headers.items()}
            result = BILLING_SERVICE.process_webhook(headers, self._read_body_bytes())
            status = 200 if result.get("ok") else int(result.get("status_code") or 400)
            self._write_json(result, status=status)
            return True
        return False

    def do_GET(self):
        if self._handle_api():
            return
        if self._control_route_guard():
            return
        if self._access_route_guard():
            return
        self._rewrite_static_route()
        return super().do_GET()

    def do_HEAD(self):
        if self._handle_api():
            return
        if self._control_route_guard():
            return
        if self._access_route_guard():
            return
        self._rewrite_static_route()
        return super().do_HEAD()

    def do_POST(self):
        if self._handle_api():
            return
        self.send_error(404)


def main() -> None:
    server = ThreadingHTTPServer((SETTINGS.host, SETTINGS.port), RadarHTTPRequestHandler)
    print(f"PROPTREX Radar running on http://{SETTINGS.host}:{SETTINGS.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

