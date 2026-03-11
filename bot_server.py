"""
PROPTREX Signal Bot — FastAPI + WebSocket Server
Replaces the old Binance pump bot with the proptrex multi-exchange scoring engine.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional

import requests
import tweepy
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ── proptrex engine imports ──────────────────────────────────────────────────
_BOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_BOT_DIR, "proptrex_bot"))

from adapters.exchanges import MultiExchangeScanner  # noqa: E402
from charting import render_signal_chart             # noqa: E402
from open_positions import OpenPositionBook          # noqa: E402
from orderbook_engine import OrderbookEngine         # noqa: E402
from portfolio_manager import PortfolioManager       # noqa: E402
from scoring import (                                # noqa: E402
    build_signal,
    classify_structure,
    compute_indicators,
)
from signal_lifecycle import SignalLifecycle         # noqa: E402
from social_engine import SocialEngine               # noqa: E402
from square_adapter import BinanceSquareAdapter      # noqa: E402
from state_store import JsonStateStore               # noqa: E402
from x_adapter import XAdapter                       # noqa: E402

# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_FILE = os.path.join(_BOT_DIR, "bot_config.json")
PROPTREX_CONFIG_FILE = os.path.join(_BOT_DIR, "proptrex_bot", "config.example.yaml")

# In-memory signal store (last 50 signals)
recent_signals: List[dict] = []

# Signal counter for referral frequency tracking
_signal_counter = 0


# ── Connection Manager ───────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for conn in list(self.active_connections):
            try:
                await conn.send_json(message)
            except Exception:
                self.disconnect(conn)


manager = ConnectionManager()


# ── Config Model ─────────────────────────────────────────────────────────────

class BotConfig(BaseModel):
    admin_password: str = "proptrex2026"
    # Telegram
    tg_token: str = ""
    tg_chat_id: str = ""
    tg_enabled: bool = False
    # Twitter / X
    tw_api_key: str = ""
    tw_api_secret: str = ""
    tw_access_token: str = ""
    tw_access_secret: str = ""
    tw_enabled: bool = False
    # Referral links
    ref_binance: str = "https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00WPSCQYZA&utm_source=electron"
    ref_mexc: str = "https://promote.mexc.fm/r/KVaJdo8ook"
    ref_gate: str = "https://app.mbm06.com/referral/earn-together/invite/U1dNV1pe?ref=U1dNV1pe&ref_type=103&utm_cmp=rXJBDjtJ&activity_id=1772462196891"
    ref_kucoin: str = "https://www.kucoin.com"
    ref_okx: str = "https://www.okx.com"
    # Referral toggle + frequency
    ref_enabled: bool = True
    ref_every_n_signals: int = 3     # add referral block every N signals (0 = disabled)
    # Platform / promo
    platform_url: str = "https://panel.proptrex.com.tr"
    promo_link: str = "https://proptrex.com.tr"
    promo_enabled: bool = True
    # Scanner runtime (overrides proptrex config)
    scan_interval_seconds: int = 60
    min_volume_usd: float = 250000
    dynamic_scan: bool = True
    top_n_symbols: int = 100
    exchanges: str = "binance,mexc,gateio,kucoin,okx"
    square_enabled: bool = True


def load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"[config] load error: {e}")
    return BotConfig().model_dump()


def save_config(data: dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=4)


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/config")
async def get_config():
    return load_config()


@app.post("/api/config")
async def update_config(config: BotConfig):
    save_config(config.model_dump())
    return {"status": "success"}


class LoginRequest(BaseModel):
    password: str


@app.post("/api/login")
async def login(req: LoginRequest):
    cfg = load_config()
    if req.password == cfg.get("admin_password", "proptrex2026"):
        return {"status": "success"}
    return {"status": "error", "message": "Geçersiz şifre"}


@app.get("/api/signals")
async def get_signals():
    return {"signals": recent_signals, "count": len(recent_signals)}


@app.get("/")
async def get_index():
    return FileResponse(os.path.join(_BOT_DIR, "index.html"))


@app.get("/platform")
async def get_platform():
    return FileResponse(os.path.join(_BOT_DIR, "platform.html"))


# ── Notification helpers ──────────────────────────────────────────────────────

def _sync_send_telegram(cfg: dict, text: str, photo_path: Optional[str]):
    token = cfg["tg_token"]
    chat_id = cfg["tg_chat_id"]
    if photo_path and os.path.exists(photo_path):
        url = f"https://api.telegram.org/bot{token}/sendPhoto"
        with open(photo_path, "rb") as img:
            requests.post(
                url,
                data={"chat_id": chat_id, "caption": text[:1024], "parse_mode": ""},
                files={"photo": img},
                timeout=15,
            )
    else:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        requests.post(
            url,
            data={"chat_id": chat_id, "text": text[:4096]},
            timeout=15,
        )
    print("[telegram] message sent")


async def send_telegram_raw(cfg: dict, text: str, photo_path: Optional[str] = None):
    """Send a Telegram message without blocking the asyncio event loop."""
    if not cfg.get("tg_enabled") or not cfg.get("tg_token") or not cfg.get("tg_chat_id"):
        return
    try:
        await asyncio.to_thread(_sync_send_telegram, cfg, text, photo_path)
    except Exception as e:
        print(f"[telegram] error: {e}")


def _sync_send_twitter(cfg: dict, text: str):
    client = tweepy.Client(
        consumer_key=cfg["tw_api_key"],
        consumer_secret=cfg["tw_api_secret"],
        access_token=cfg["tw_access_token"],
        access_token_secret=cfg["tw_access_secret"],
    )
    client.create_tweet(text=text[:280])
    print("[twitter] tweet sent")


async def send_twitter(cfg: dict, text: str):
    """Post a tweet without blocking the asyncio event loop."""
    if not cfg.get("tw_enabled") or not cfg.get("tw_api_key"):
        return
    try:
        await asyncio.to_thread(_sync_send_twitter, cfg, text)
    except Exception as e:
        print(f"[twitter] error: {e}")


def build_referral_block(cfg: dict) -> str:
    """Build the referral links footer block."""
    lines = ["", "Trade via our partner exchanges:"]
    for key, label in [
        ("ref_binance", "Binance"),
        ("ref_mexc", "MEXC"),
        ("ref_gate", "Gate.io"),
        ("ref_kucoin", "KuCoin"),
        ("ref_okx", "OKX"),
    ]:
        link = cfg.get(key, "")
        if link:
            lines.append(f"  {label}: {link}")
    if cfg.get("promo_enabled") and cfg.get("promo_link"):
        lines.append(f"\nPowered by PROPTREX: {cfg['promo_link']}")
    return "\n".join(lines)


def should_add_referral(cfg: dict) -> bool:
    """Check if the current signal should carry the referral block."""
    if not cfg.get("ref_enabled", True):
        return False
    n = int(cfg.get("ref_every_n_signals", 3))
    if n <= 0:
        return False
    return (_signal_counter % n) == 0


def build_caption(signal, social=None, portfolio_lines=None, orderbook=None) -> str:
    why_lines = "\n".join([f"• {x}" for x in signal.why_lines])
    invalidation_lines = "\n".join([f"• {x}" for x in signal.invalidation_lines])

    social_block = ""
    if social is not None:
        social_why = "\n".join([f"• {x}" for x in social.why_lines])
        social_block = (
            f"SOCIAL\n"
            f"X: {social.x_sentiment} | Square: {social.square_bias}\n"
            f"Conviction: {social.social_conviction:.1f}/100 | Hype Risk: {social.hype_risk:.1f}/100\n"
            f"{social_why}\n\n"
        )

    ob_block = ""
    if orderbook is not None:
        ob_block = (
            f"ORDERBOOK\n"
            f"Dominant: {orderbook.dominant_side} | Imbalance: {orderbook.bid_ask_imbalance:.1f}%\n"
            f"Score: {orderbook.score:.1f}/100 | Spread: {orderbook.spread_pct:.4f}%\n\n"
        )

    pm_block = ""
    if portfolio_lines:
        pm_block = "POSITION PLAN\n" + "\n".join([f"• {x}" for x in portfolio_lines]) + "\n\n"

    caption = (
        f"🚀 PROPTREX | {signal.symbol} | {signal.side} | {signal.status}\n\n"
        f"Exchange: {signal.exchange} | TF: {signal.timeframe}\n"
        f"Opp Score: {signal.opportunity_score:.1f} | Why Score: {signal.why_enter_score:.1f}\n\n"
        f"ENTRY ZONE\n{signal.entry_low} – {signal.entry_high}\n\n"
        f"STOP LOSS\n{signal.stop_loss}\n\n"
        f"TARGETS\n"
        f"TP1: {signal.tp1} [{signal.tp1_tf}]\n"
        f"TP2: {signal.tp2} [{signal.tp2_tf}]\n"
        f"TP3: {signal.tp3} [{signal.tp3_tf}]\n\n"
        f"ENTRY QUALITY: {signal.entry_freshness}\n"
        f"HOLD: {signal.expected_hold} | Expiry: {signal.expiry_minutes}min\n\n"
        f"WHY THIS TRADE?\n{why_lines}\n\n"
        f"FLOW\n"
        f"Buyers: {signal.buyer_dominance:.1f}% | Sellers: {signal.seller_pressure:.1f}%\n"
        f"Whale: {signal.meta.get('whale_action','NONE')} ({signal.whale_strength:.1f}/100)\n\n"
        f"STRUCTURE: {signal.structure_bias} | {signal.high_type}/{signal.low_type}\n\n"
        f"{social_block}"
        f"{ob_block}"
        f"{pm_block}"
        f"INVALIDATION\n{invalidation_lines}"
    )
    return caption


def classify_context(data) -> str:
    df = compute_indicators(data.df)
    if len(df) < 220:
        return "NEUTRAL"
    bias, _, _ = classify_structure(df)
    if bias == "BULLISH":
        return "BULLISH"
    if bias == "BEARISH":
        return "BEARISH"
    return "NEUTRAL"


# ── Shared engine state ───────────────────────────────────────────────────────

_engine: Optional[Dict] = None  # initialized on startup


def _build_engine(cfg: dict) -> dict:
    exchanges = [e.strip() for e in cfg.get("exchanges", "binance,mexc,gateio,kucoin,okx").split(",") if e.strip()]
    scanner = MultiExchangeScanner(exchanges=exchanges)
    store = JsonStateStore(path=os.path.join(_BOT_DIR, "signal_state.json"))
    position_book = OpenPositionBook()
    lifecycle = SignalLifecycle()
    social_engine = SocialEngine()
    pm = PortfolioManager(account_size=10000, risk_per_trade_pct=1.0)
    x_adapter = XAdapter(bearer_token="")
    square_adapter = BinanceSquareAdapter()

    ob_engines: Dict[str, OrderbookEngine] = {}
    for ex in exchanges:
        try:
            ob_engines[ex] = OrderbookEngine(exchange_name=ex)
        except Exception:
            pass

    return {
        "scanner": scanner,
        "store": store,
        "position_book": position_book,
        "lifecycle": lifecycle,
        "social_engine": social_engine,
        "pm": pm,
        "x_adapter": x_adapter,
        "square_adapter": square_adapter,
        "ob_engines": ob_engines,
        "exchanges": exchanges,
    }


# ── Lifecycle update checker ─────────────────────────────────────────────────

async def send_lifecycle_updates(engine: dict, cfg: dict):
    scanner: MultiExchangeScanner = engine["scanner"]
    position_book: OpenPositionBook = engine["position_book"]
    lifecycle: SignalLifecycle = engine["lifecycle"]

    for symbol, pos in list(position_book.positions.items()):
        if pos.status in ("TP3_HIT", "INVALIDATED"):
            position_book.close(symbol)
            continue

        data = scanner.fetch_first_available(symbol, timeframe="1m", limit=300)
        if data is None or data.df.empty:
            continue

        current_price = float(data.df.iloc[-1]["close"])
        update = lifecycle.evaluate(
            side=pos.side,
            current_price=current_price,
            entry_low=pos.entry_low,
            entry_high=pos.entry_high,
            stop_loss=pos.stop_loss,
            tp1=pos.tp1,
            tp2=pos.tp2,
            tp3=pos.tp3,
        )

        if update.status != "ACTIVE" and update.status != pos.status:
            pos.status = update.status
            detail = "\n".join([f"• {x}" for x in update.lines])
            msg = (
                f"📊 LIFECYCLE UPDATE | {symbol}\n\n"
                f"Status: {update.status}\n"
                f"Action: {update.action}\n\n"
                f"{detail}\n\n"
                f"Current Price: {current_price}"
            )
            await send_telegram_raw(cfg, msg)
            await manager.broadcast({
                "type": "lifecycle_update",
                "symbol": symbol,
                "status": update.status,
                "action": update.action,
                "price": current_price,
                "ts": int(time.time() * 1000),
            })
            if update.status in ("TP3_HIT", "INVALIDATED"):
                position_book.close(symbol)


# ── Main scan loop ────────────────────────────────────────────────────────────

async def scan_loop():
    global _engine, _signal_counter

    # Small delay on startup to let FastAPI finish
    await asyncio.sleep(5)

    cfg = load_config()
    _engine = _build_engine(cfg)
    print(f"[scanner] engine started — exchanges: {_engine['exchanges']}")

    while True:
        cfg = load_config()  # re-read each cycle so admin changes take effect

        try:
            await _do_scan(cfg)
        except Exception as e:
            print(f"[scanner] error: {e}")

        interval = int(cfg.get("scan_interval_seconds", 60))
        await asyncio.sleep(interval)


async def _do_scan(cfg: dict):
    global _signal_counter, _engine

    engine = _engine
    scanner: MultiExchangeScanner = engine["scanner"]
    store = engine["store"]
    position_book: OpenPositionBook = engine["position_book"]
    social_engine: SocialEngine = engine["social_engine"]
    pm: PortfolioManager = engine["pm"]
    x_adapter: XAdapter = engine["x_adapter"]
    square_adapter: BinanceSquareAdapter = engine["square_adapter"]
    ob_engines: Dict[str, OrderbookEngine] = engine["ob_engines"]

    timeframe = "1m"
    candle_limit = 300
    chart_bars = 140
    min_volume_usd = float(cfg.get("min_volume_usd", 250000))
    dynamic_scan = bool(cfg.get("dynamic_scan", True))
    top_n = int(cfg.get("top_n_symbols", 100))
    dynamic_min_vol = 500000

    context_symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT"]

    # Lifecycle checks
    await send_lifecycle_updates(engine, cfg)

    # Macro context
    context_map: Dict[str, str] = {}
    for s in context_symbols:
        cdata = scanner.fetch_first_available(s, timeframe=timeframe, limit=candle_limit)
        if cdata is None:
            continue
        context_map[s] = classify_context(cdata)

    # Universe
    if dynamic_scan:
        universe_pre = scanner.fetch_universe_dynamic(
            timeframe=timeframe,
            limit=candle_limit,
            min_volume_usd=dynamic_min_vol,
            top_n=top_n,
        )
    else:
        default_symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", "DOGE/USDT",
                           "AVAX/USDT", "OP/USDT", "LINK/USDT", "ADA/USDT", "WIF/USDT"]
        universe_pre = scanner.fetch_universe(default_symbols, timeframe=timeframe, limit=candle_limit)

    # Enrich context_map with coin-level bias
    for item in universe_pre:
        if item.symbol not in context_map:
            context_map[item.symbol] = classify_context(item)

    ranked = []
    for item in universe_pre:
        if item.df.empty:
            continue
        vol_avg = float((item.df["close"] * item.df["volume"]).tail(10).mean())
        if vol_avg < min_volume_usd:
            continue
        signal = build_signal(
            symbol=item.symbol,
            exchange=item.exchange,
            timeframe=item.timeframe,
            df=item.df,
            context_map=context_map,
        )
        if signal is None:
            continue
        if signal.status != "TRADEABLE":
            continue
        ranked.append((signal.opportunity_score, signal, item.df))

    ranked.sort(key=lambda x: x[0], reverse=True)
    top = ranked[:3]

    for _, signal, df in top:
        key = f"{signal.exchange}:{signal.symbol}:{signal.side}:{signal.status}"

        x_posts = x_adapter.texts_for_symbol(signal.symbol, limit=20) if x_adapter.is_enabled() else []
        square_enabled = bool(cfg.get("square_enabled", True))
        square_posts = square_adapter.texts_for_symbol(signal.symbol, limit=20) if square_enabled else []

        social = social_engine.analyze(
            symbol=signal.symbol,
            x_posts=x_posts,
            square_posts=square_posts,
            historical_x_count=max(10, len(x_posts)),
            historical_square_count=max(10, len(square_posts)),
        )

        ob_signal = None
        ob_engine = ob_engines.get(signal.exchange)
        if ob_engine is not None:
            ob_signal = ob_engine.analyze(signal.symbol, depth=20)

        plan = pm.build_plan(
            symbol=signal.symbol,
            side=signal.side,
            entry_low=signal.entry_low,
            entry_high=signal.entry_high,
            stop_loss=signal.stop_loss,
            tp1=signal.tp1,
            tp2=signal.tp2,
            tp3=signal.tp3,
        )
        portfolio_lines = pm.plan_to_lines(plan)

        payload_hash = hashlib.md5(
            (
                f"{signal.symbol}|{signal.side}|{signal.status}|"
                f"{signal.entry_low}|{signal.entry_high}|{signal.stop_loss}|"
                f"{signal.tp1}|{signal.tp2}|{signal.tp3}|"
                f"{signal.opportunity_score:.2f}|{signal.why_enter_score:.2f}|"
                f"{social.social_conviction:.2f}|"
                f"{ob_signal.score if ob_signal else 0.0}"
            ).encode("utf-8")
        ).hexdigest()

        dedup_minutes = 45
        if not store.allow(key, payload_hash, cooldown_minutes=dedup_minutes):
            continue

        # Track position
        position_book.open_from_signal(signal)
        _signal_counter += 1

        # Build caption
        caption = build_caption(
            signal,
            social=social,
            portfolio_lines=portfolio_lines,
            orderbook=ob_signal,
        )

        # Append referral block conditionally
        add_ref = should_add_referral(cfg)
        if add_ref:
            ref_block = build_referral_block(cfg)
            full_caption = caption + "\n" + ref_block
        else:
            full_caption = caption

        # Chart
        chart_path = None
        try:
            chart_path = render_signal_chart(
                df=df,
                signal=signal,
                title=f"{signal.symbol} | {signal.side} | {signal.opportunity_score:.1f}",
                bars=chart_bars,
            )
        except Exception as e:
            print(f"[chart] error: {e}")

        # Send notifications (non-blocking)
        await send_telegram_raw(cfg, full_caption, photo_path=chart_path)
        await send_twitter(cfg, full_caption[:280])

        # Cleanup chart file
        if chart_path and os.path.exists(chart_path):
            try:
                os.remove(chart_path)
            except Exception:
                pass

        # Build WebSocket payload
        signal_payload = {
            "type": "signal",
            "ts": int(time.time() * 1000),
            "time": datetime.now().strftime("%H:%M:%S"),
            "symbol": signal.symbol,
            "exchange": signal.exchange,
            "side": signal.side,
            "status": signal.status,
            "opportunity_score": round(signal.opportunity_score, 1),
            "why_enter_score": round(signal.why_enter_score, 1),
            "entry_low": signal.entry_low,
            "entry_high": signal.entry_high,
            "stop_loss": signal.stop_loss,
            "tp1": signal.tp1,
            "tp2": signal.tp2,
            "tp3": signal.tp3,
            "tp1_tf": signal.tp1_tf,
            "tp2_tf": signal.tp2_tf,
            "tp3_tf": signal.tp3_tf,
            "timeframe": signal.timeframe,
            "structure_bias": signal.structure_bias,
            "buyer_dominance": round(signal.buyer_dominance, 1),
            "seller_pressure": round(signal.seller_pressure, 1),
            "whale_strength": round(signal.whale_strength, 1),
            "entry_freshness": signal.entry_freshness,
            "expected_hold": signal.expected_hold,
            "social_conviction": round(social.social_conviction, 1) if social else 0,
            "x_sentiment": social.x_sentiment if social else "N/A",
            "ob_score": round(ob_signal.score, 1) if ob_signal else 0,
            "ob_dominant": ob_signal.dominant_side if ob_signal else "N/A",
            "why_lines": signal.why_lines,
            "signal_number": _signal_counter,
            "has_referral": add_ref,
        }

        # Store in recent signals (capped at 50)
        recent_signals.insert(0, signal_payload)
        if len(recent_signals) > 50:
            recent_signals.pop()

        # Broadcast to all connected browsers
        await manager.broadcast(signal_payload)

        print(f"[signal #{_signal_counter}] {signal.symbol} {signal.side} score={signal.opportunity_score:.1f} ref={add_ref}")


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws/events")
async def ws_events(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send recent signals on connect
        await websocket.send_json({
            "type": "hello",
            "ts": int(time.time() * 1000),
            "recent_signals": recent_signals[:20],
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(scan_loop())


if __name__ == "__main__":
    uvicorn.run("bot_server:app", host="0.0.0.0", port=8000, reload=False)
