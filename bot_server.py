import asyncio
import time
from datetime import datetime
from collections import deque
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
import os
import requests
import tweepy
import websockets
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost", "https://proptrex.hllcvk.cloud"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CATEGORIES = ["PRE-PUMP CANDIDATES", "TRIGGERED NOW", "ACTIVE RUN", "EXHAUSTION / EXIT"]

CONFIG_FILE = "bot_config.json"

market_state = {}

# Fiyat geçmişi: Her coin için son 5 dakikalık fiyat kayıtları (m1/m3/m5 için)
price_history = {}  # {sym_key: deque([(timestamp, price), ...], maxlen=300)}

# Volume tracking: Anlık volume spike oranını doğru hesaplamak için
volume_history = {}  # {sym_key: deque([(timestamp, cumulative_vol), ...], maxlen=120)}


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

class BotConfig(BaseModel):
    admin_password: str = "proptrex2026"
    tg_token: str = ""
    tg_chat_id: str = ""
    tg_enabled: bool = False
    tg_template: str = "T1"
    tw_api_key: str = ""
    tw_api_secret: str = ""
    tw_access_token: str = ""
    tw_access_secret: str = ""
    tw_enabled: bool = False
    tw_template: str = "T1"
    ref_binance: str = "https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00WPSCQYZA&utm_source=electron"
    ref_mexc: str = "https://promote.mexc.fm/r/KVaJdo8ook"
    ref_gate: str = "https://app.mbm06.com/referral/earn-together/invite/U1dNV1pe?ref=U1dNV1pe&ref_type=103&utm_cmp=rXJBDjtJ&activity_id=1772462196891"
    platform_url: str = "https://panel.proptrex.com.tr"
    promo_link: str = "https://proptrex.com.tr"
    promo_enabled: bool = True

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Config yükleme hatasi: {e}")
    return BotConfig().dict()

def save_config(config_data):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config_data, f, indent=4)

@app.get("/api/config")
async def get_config():
    return load_config()

@app.post("/api/config")
async def update_config(config: BotConfig):
    save_config(config.dict())
    return {"status": "success"}

class LoginRequest(BaseModel):
    password: str

@app.post("/api/login")
async def login(req: LoginRequest):
    config = load_config()
    if req.password == config.get("admin_password", "proptrex2026"):
        return {"status": "success"}
    return {"status": "error", "message": "Geçersiz şifre"}

def send_telegram(config, message):
    if not config.get("tg_enabled") or not config.get("tg_token") or not config.get("tg_chat_id"):
        return
    try:
        url = f"https://api.telegram.org/bot{config['tg_token']}/sendMessage"
        requests.post(url, data={"chat_id": config['tg_chat_id'], "text": message})
        print("Telegram mesaji gönderildi!")
    except Exception as e:
        print(f"Telegram hatasi: {e}")

def send_twitter(config, message):
    if not config.get("tw_enabled") or not config.get("tw_api_key"):
        return
    try:
        client = tweepy.Client(
            consumer_key=config['tw_api_key'],
            consumer_secret=config['tw_api_secret'],
            access_token=config['tw_access_token'],
            access_token_secret=config['tw_access_secret']
        )
        client.create_tweet(text=message)
        print("Tweet gönderildi!")
    except Exception as e:
        print(f"Twitter hatasi: {e}")

def trigger_social_alerts(sym, price, volx, score, exchange="BIN", market_type="Futures", direction="LONG"):
    config = load_config()

    ref_link = ""
    exchange_name = ""
    if exchange == "BIN":
        ref_link = config.get('ref_binance', '')
        exchange_name = "Binance"
    elif exchange == "MEXC":
        ref_link = config.get('ref_mexc', '')
        exchange_name = "MEXC"
    elif exchange == "GATE" or exchange == "GATEIO":
        ref_link = config.get('ref_gate', '')
        exchange_name = "Gate.io"

    ref_links = f"\nTrade via our partner link:\n{exchange_name}: {ref_link}\n" if ref_link else ""
    promo_text = f"\n🤖 Register/Access Proptrex:\n👉 {config.get('promo_link', '')}\n" if config.get("promo_enabled") else ""
    
    sym_clean = sym.replace("USDT", "").strip()
    chart_link = f"📈 View on TradingView: https://www.tradingview.com/symbols/{sym_clean}USDT/"
    
    dir_icon = "🟢" if direction == "LONG" else "🔴"

    templates = {
        "T1": f"🚀 PROPTREX RADAR DETECTED! 🚀\n\n📌 Coin: #{sym}\n{dir_icon} Signal: {direction}\n📊 Market: {market_type}\n\n💲 Current Price: ${price:.4f}\n⚡️ Volume Burst: {volx:.1f}x\n🔥 AI Score: {score}/100\n\n🎯 Recommended TP1: ${price*1.03 if direction == 'LONG' else price*0.97:.3f}\n🛡 Manage Your Risk/Reward.\n\n{chart_link}\n" + promo_text + ref_links
    }

    if config.get("tg_enabled"):
        send_telegram(config, templates["T1"])
    if config.get("tw_enabled"):
        send_twitter(config, templates["T1"])


# ── Yardımcı: Geçmiş fiyatı bul ──
def get_historical_price(sym_key, seconds_ago):
    """Belirtilen saniye önceki fiyatı price_history'den bulur"""
    if sym_key not in price_history or len(price_history[sym_key]) == 0:
        return None
    now = time.time()
    target_time = now - seconds_ago
    closest = None
    for ts, px in price_history[sym_key]:
        if ts <= target_time:
            closest = px
    return closest


# ── Yardımcı: Volume spike oranı (coin bazlı normalize) ──
def calc_volume_rate(sym_key, current_vol):
    """
    Anlık volume hızını ortalama hıza bölerek spike oranı hesaplar.
    Binance q alanı 24h kümülatif → farkı zamana bölerek $/sn hızı buluruz.
    BTC'de $50K normal, altcoin'de devasa → bu fonksiyon her coin'i kendi bazında ölçer.
    """
    if sym_key not in volume_history:
        volume_history[sym_key] = deque(maxlen=120)

    now = time.time()
    volume_history[sym_key].append((now, current_vol))

    hist = volume_history[sym_key]
    if len(hist) < 5:
        return 1.0

    # Son 5 saniyelik volume hızı (anlık)
    recent = [(t, v) for t, v in hist if now - t <= 5]
    if len(recent) < 2:
        return 1.0
    recent_rate = (recent[-1][1] - recent[0][1]) / max(0.1, recent[-1][0] - recent[0][0])

    # Son 60 saniyelik ortalama volume hızı (baseline)
    baseline = [(t, v) for t, v in hist if now - t <= 60]
    if len(baseline) < 2:
        return 1.0
    baseline_rate = (baseline[-1][1] - baseline[0][1]) / max(0.1, baseline[-1][0] - baseline[0][0])

    if baseline_rate <= 0:
        return 1.0

    return max(1.0, recent_rate / baseline_rate)


def process_ticker(ticker_data, market_type="Futures"):
    sym = ticker_data['s']
    if not sym.endswith("USDT"):
        return None

    unique_sym_key = f"{market_type}_{sym}"

    price = float(ticker_data['c'])
    vol_quote = float(ticker_data['q'])
    price_change_pct = float(ticker_data['P'])
    now = time.time()

    # Fiyat geçmişine kaydet (m1/m3/m5 için)
    if unique_sym_key not in price_history:
        price_history[unique_sym_key] = deque(maxlen=300)
    price_history[unique_sym_key].append((now, price))

    if unique_sym_key not in market_state:
        market_state[unique_sym_key] = {
            "last_price": price,
            "last_vol": vol_quote,
            "last_time": now,
            "pump_score": 0,
            "phase": "Squeeze",
            "category": "PRE-PUMP CANDIDATES",
            "last_alert_time": 0,
            "direction": "LONG",
        }
        return None

    prev = market_state[unique_sym_key]
    time_diff = now - prev["last_time"]
    if time_diff < 1.0:
        return None

    # Volume spike oranı — coin bazlı normalize
    volx = calc_volume_rate(unique_sym_key, vol_quote)

    price_diff_pct = ((price - prev["last_price"]) / prev["last_price"]) * 100 if prev["last_price"] > 0 else 0

    # Score hesaplama — normalize volume spike ile
    score_increase = 0
    if volx >= 2.0:
        score_increase += 5
    if volx >= 3.5:
        score_increase += 10
    if volx >= 5.0:
        score_increase += 15
    if volx >= 8.0:
        score_increase += 15

    abs_price_diff = abs(price_diff_pct)
    if abs_price_diff > 0.1:
        score_increase += 5
    if abs_price_diff > 0.3:
        score_increase += 10
    if abs_price_diff > 0.7:
        score_increase += 10

    # FIX: Direction — fiyat yükseliyorsa LONG, düşüyorsa SHORT
    direction = "LONG" if price_diff_pct >= 0 else "SHORT"

    current_score = prev["pump_score"]
    # Score decay: saniyede 2.0 puan (eskisi 0.5 idi, çok yavaştı)
    if score_increase == 0:
        current_score = max(0, current_score - (time_diff * 2.0))
    else:
        current_score = min(100, current_score + score_increase)

    cat = "PRE-PUMP CANDIDATES"
    status = "Watching"
    phase = "Squeeze"

    if current_score >= 85:
        cat = "TRIGGERED NOW"
        status = "Alert"
        phase = "Trigger"
    elif current_score > 60:
        cat = "ACTIVE RUN"
        status = "Confirmed"
        phase = "Running"
    elif current_score < 40 and prev["pump_score"] > 60:
        cat = "EXHAUSTION / EXIT"
        status = "Exit"
        phase = "Exhausted"
    elif current_score < 50:
        cat = "PRE-PUMP CANDIDATES"
        status = "Watching"
        phase = "Squeeze"

    market_state[unique_sym_key].update({
        "last_price": price,
        "last_vol": vol_quote,
        "last_time": now,
        "pump_score": current_score,
        "phase": phase,
        "category": cat,
        "direction": direction,
    })

    if score_increase == 0 and current_score < 50:
        return None

    # m1/m3/m5 gerçek fiyat geçmişinden
    m1_price = get_historical_price(unique_sym_key, 60)
    m3_price = get_historical_price(unique_sym_key, 180)
    m5_price = get_historical_price(unique_sym_key, 300)
    m1_pct = ((price - m1_price) / m1_price) * 100 if m1_price and m1_price > 0 else 0
    m3_pct = ((price - m3_price) / m3_price) * 100 if m3_price and m3_price > 0 else 0
    m5_pct = ((price - m5_price) / m5_price) * 100 if m5_price and m5_price > 0 else 0

    tp1 = price * 1.03 if direction == "LONG" else price * 0.97
    buy_pct_calc = 75 if direction == "LONG" else 25

    item = {
        "symbol": f"{sym} ({'SPOT' if 'Spot' in market_type else 'PERP'})",
        "exchange": "BIN",
        "type": "SPOT" if "Spot" in market_type else "PERP",
        "score": int(current_score),
        "direction": direction,
        "phase": phase,
        "price": f"{price:.4f}",
        "m1": f"{m1_pct:+.1f}",
        "m3": f"{m3_pct:+.1f}",
        "m5": f"{m5_pct:+.1f}",
        "volx": f"{volx:.1f}x",
        "buy_pct": buy_pct_calc,
        "obi": "—",
        "cvd": "↑" if direction == "LONG" else "↓",
        "spread": "—",
        "ask_sweep": "—",
        "bid_stack": "—",
        "oi_delta": f"{price_change_pct:+.1f}%",
        "trigger": f"Vol {volx:.1f}x" if volx >= 3.0 else ("Price Move" if abs_price_diff > 0.3 else "Building"),
        "entry_band": f"{price*0.99:.3f}-{price*1.01:.3f}" if cat != "ACTIVE RUN" else "Trail Active",
        "tp_sl": f"TP1 {tp1:.3f} / SL" if cat in ["PRE-PUMP CANDIDATES", "TRIGGERED NOW"] else ("TP2 open" if cat == "ACTIVE RUN" else "TP hit / exit"),
        "status": status,
        "time": datetime.now().strftime("%H:%M:%S"),
        "category": cat,
    }

    if cat == "TRIGGERED NOW" and current_score > 88:
        if now - prev["last_alert_time"] > 300:
            market_state[unique_sym_key]["last_alert_time"] = now
            trigger_social_alerts(sym, price, volx, int(current_score), "BIN", market_type, direction)

    return item


# ── Sayfa Endpoint'leri ──

@app.get("/")
async def get_index():
    return FileResponse("index.html")

@app.get("/platform")
async def get_platform():
    return FileResponse("platform.html")

@app.get("/signal/{symbol}")
async def get_signal_panel(symbol: str):
    sym_clean = symbol.upper().replace("USDT", "")
    tv_symbol = f"BINANCE:{sym_clean}USDT.P"
    config = load_config()
    platform_url = config.get("platform_url", "https://panel.proptrex.com.tr")
    promo_link = config.get("promo_link", "https://proptrex.com.tr")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="robots" content="noindex,nofollow"/>
<title>{sym_clean}USDT — PROPTREX Signal</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#0b0e11;color:#eaecef;font-family:'Inter',system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column}}
.topbar{{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:#1e2329;border-bottom:1px solid #2b3139}}
.topbar .brand{{display:flex;align-items:center;gap:10px}}
.topbar .brand span{{font-weight:800;font-size:15px;color:#f0b90b;letter-spacing:1px}}
.topbar .brand small{{font-size:10px;color:#848e9c;letter-spacing:2px}}
.topbar .links{{display:flex;gap:12px}}
.topbar .links a{{color:#848e9c;text-decoration:none;font-size:12px;font-weight:600;padding:6px 14px;border-radius:6px;transition:.2s}}
.topbar .links a:hover{{color:#eaecef;background:rgba(240,185,11,.1)}}
.topbar .links a.primary{{background:#f0b90b;color:#1e2329;border-radius:6px}}
.topbar .links a.primary:hover{{background:#d4a50a}}
.sym-bar{{display:flex;align-items:center;gap:16px;padding:12px 20px;background:#16191e;border-bottom:1px solid #2b3139;flex-wrap:wrap}}
.sym-bar .coin{{font-size:20px;font-weight:800;color:#f0b90b}}
.sym-bar .badge{{font-size:11px;padding:3px 10px;border-radius:10px;font-weight:600}}
.sym-bar .badge.long{{background:rgba(14,203,129,.15);color:#0ecb81}}
.sym-bar .badge.short{{background:rgba(246,70,93,.15);color:#f6465d}}
.sym-bar .meta{{font-size:11px;color:#848e9c}}
.chart-wrap{{flex:1;min-height:0}}
.chart-wrap iframe{{width:100%;height:100%;border:none}}
.bottom-bar{{display:flex;align-items:center;justify-content:center;gap:20px;padding:10px 20px;background:#1e2329;border-top:1px solid #2b3139;flex-wrap:wrap}}
.bottom-bar a{{color:#f0b90b;text-decoration:none;font-size:12px;font-weight:600}}
.bottom-bar span{{color:#848e9c;font-size:11px}}
</style>
</head>
<body>

<div class="topbar">
  <div class="brand">
    <span>PROPTREX</span>
    <small>SIGNAL INTELLIGENCE</small>
  </div>
  <div class="links">
    <a href="{platform_url}" target="_blank">Live Scanner</a>
    <a href="{promo_link}" target="_blank" class="primary">Register</a>
  </div>
</div>

<div class="sym-bar">
  <span class="coin">{sym_clean}USDT</span>
  <span class="badge" id="dirBadge">—</span>
  <span class="meta" id="metaInfo">Loading signal data...</span>
</div>

<div class="chart-wrap">
  <!-- TradingView Advanced Chart Widget -->
  <div id="tv_chart" style="width:100%;height:100%"></div>
  <script src="https://s3.tradingview.com/tv.js"></script>
  <script>
  new TradingView.widget({{
    "autosize": true,
    "symbol": "{tv_symbol}",
    "interval": "5",
    "timezone": "Europe/Istanbul",
    "theme": "dark",
    "style": "1",
    "locale": "en",
    "toolbar_bg": "#1e2329",
    "enable_publishing": false,
    "hide_top_toolbar": false,
    "hide_legend": false,
    "save_image": false,
    "container_id": "tv_chart",
    "studies": ["RSI@tv-basicstudies","MACD@tv-basicstudies","Volume@tv-basicstudies"],
    "show_popup_button": true,
    "popup_width": "1000",
    "popup_height": "650"
  }});
  </script>
</div>

<div class="bottom-bar">
  <span>Powered by PROPTREX AI Signal Engine</span>
  <a href="{platform_url}" target="_blank">Open Full Platform →</a>
</div>

<script>
(async()=>{{
  try{{
    const r=await fetch('/api/coin/{symbol.upper()}');
    const d=await r.json();
    if(d.coin){{
      const c=d.coin;
      const db=document.getElementById('dirBadge');
      db.textContent=c.direction;
      db.className='badge '+(c.direction==='LONG'?'long':'short');
      document.getElementById('metaInfo').textContent=
        'Score: '+c.score+'/100 | Phase: '+c.phase+' | Price: $'+c.price+' | m1: '+c.m1+'% | m5: '+c.m5+'%';
    }}
  }}catch(e){{console.warn(e)}}
}})();
</script>

</body>
</html>"""
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


# ── Coin API Endpoint ──

@app.get("/api/coin/{symbol}")
async def get_coin_data(symbol: str):
    symbol = symbol.upper()
    config = load_config()
    items = []

    # FIX: Doğru market type key'leri (eskisi "Vadeli İşlemler (Futures)" hiç eşleşmiyordu)
    for market_type in ["Futures", "Spot Market"]:
        key = f"{market_type}_{symbol}"
        if key in market_state:
            state = market_state[key]
            price = state["last_price"]
            cat = state["category"]
            phase = state["phase"]
            current_score = state["pump_score"]
            is_spot = "Spot" in key
            direction = state.get("direction", "LONG")

            # Gerçek m1/m3/m5
            m1_price = get_historical_price(key, 60)
            m3_price = get_historical_price(key, 180)
            m5_price = get_historical_price(key, 300)
            m1_pct = ((price - m1_price) / m1_price) * 100 if m1_price and m1_price > 0 else 0
            m3_pct = ((price - m3_price) / m3_price) * 100 if m3_price and m3_price > 0 else 0
            m5_pct = ((price - m5_price) / m5_price) * 100 if m5_price and m5_price > 0 else 0

            tp1 = price * 1.03 if direction == "LONG" else price * 0.97

            items.append({
                "symbol": f"{symbol} ({'SPOT' if is_spot else 'PERP'})",
                "exchange": "BIN",
                "type": "SPOT" if is_spot else "PERP",
                "direction": direction,
                "score": int(current_score),
                "phase": phase,
                "price": f"{price:.4f}",
                "m1": f"{m1_pct:+.1f}",
                "m3": f"{m3_pct:+.1f}",
                "m5": f"{m5_pct:+.1f}",
                "volx": "—",
                "buy_pct": 75 if direction == "LONG" else 25,
                "obi": "—",
                "cvd": "↑" if direction == "LONG" else "↓",
                "spread": "—",
                "ask_sweep": "—",
                "bid_stack": "—",
                "oi_delta": "—",
                "trigger": "—",
                "entry_band": f"{price*0.99:.3f}-{price*1.01:.3f}",
                "tp_sl": f"TP1 {tp1:.3f}",
                "status": phase,
                "time": datetime.now().strftime("%H:%M:%S"),
                "category": cat,
            })

    if not items:
        return {"coin": None, "config": config, "error": "Coin verisi henüz yok, scanner başladıktan sonra tekrar deneyin."}

    return {"coin": items[0], "config": config}


# ── Snapshot Endpoint ──

@app.get("/snapshot")
async def get_snapshot():
    items = []
    for unique_sym_key, state in market_state.items():
        if state["pump_score"] > 20:
            price = state["last_price"]
            cat = state["category"]
            phase = state["phase"]
            current_score = state["pump_score"]
            is_spot = "Spot" in unique_sym_key
            sym_display = unique_sym_key.split("_")[1]
            direction = state.get("direction", "LONG")

            m1_price = get_historical_price(unique_sym_key, 60)
            m3_price = get_historical_price(unique_sym_key, 180)
            m5_price = get_historical_price(unique_sym_key, 300)
            m1_pct = ((price - m1_price) / m1_price) * 100 if m1_price and m1_price > 0 else 0
            m3_pct = ((price - m3_price) / m3_price) * 100 if m3_price and m3_price > 0 else 0
            m5_pct = ((price - m5_price) / m5_price) * 100 if m5_price and m5_price > 0 else 0

            tp1 = price * 1.03 if direction == "LONG" else price * 0.97

            items.append({
                "symbol": f"{sym_display} ({'SPOT' if is_spot else 'PERP'})",
                "exchange": "BIN",
                "direction": direction,
                "score": int(current_score),
                "phase": phase,
                "price": f"{price:.4f}",
                "m1": f"{m1_pct:+.1f}",
                "m3": f"{m3_pct:+.1f}",
                "m5": f"{m5_pct:+.1f}",
                "volx": "—",
                "buy_pct": 75 if direction == "LONG" else 25,
                "obi": "—",
                "cvd": "↑" if direction == "LONG" else "↓",
                "spread": "—",
                "ask_sweep": "—",
                "bid_stack": "—",
                "oi_delta": "—",
                "trigger": "—",
                "entry_band": f"{price*0.99:.3f}-{price*1.01:.3f}",
                "tp_sl": f"TP1 {tp1:.3f}",
                "status": phase,
                "time": datetime.now().strftime("%H:%M:%S"),
                "category": cat,
            })
    items = sorted(items, key=lambda x: x["score"], reverse=True)
    return {"items": items[:15], "count": len(items[:15])}


# ── WebSocket ──

@app.websocket("/ws/events")
async def ws_events(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "hello", "ts": int(time.time()*1000)})
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(binance_ws_loop())
    asyncio.create_task(binance_spot_ws_loop())

async def binance_ws_loop():
    uri = "wss://fstream.binance.com/ws/!ticker@arr"
    while True:
        try:
            async with websockets.connect(uri) as ws:
                print("Binance Futures WebSocket'e baglanildi.")
                while True:
                    data = await ws.recv()
                    payload = json.loads(data)
                    for ticker in payload:
                        item = process_ticker(ticker, "Futures")
                        if item:
                            await manager.broadcast({
                                "type": "scanner_update",
                                "ts_recv": int(time.time()*1000),
                                "data": item
                            })
        except Exception as e:
            print(f"Binance Futures WS Hatasi (Yeniden baglaniliyor...): {e}")
            await asyncio.sleep(5)

async def binance_spot_ws_loop():
    uri = "wss://stream.binance.com:9443/ws/!ticker@arr"
    while True:
        try:
            async with websockets.connect(uri) as ws:
                print("Binance Spot WebSocket'e baglanildi.")
                while True:
                    data = await ws.recv()
                    payload = json.loads(data)
                    for ticker in payload:
                        item = process_ticker(ticker, "Spot Market")
                        if item:
                            await manager.broadcast({
                                "type": "scanner_update",
                                "ts_recv": int(time.time()*1000),
                                "data": item
                            })
        except Exception as e:
            print(f"Binance Spot WS Hatasi (Yeniden baglaniliyor...): {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    uvicorn.run("bot_server:app", host="127.0.0.1", port=8000, reload=False)
