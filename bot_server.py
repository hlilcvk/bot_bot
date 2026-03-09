import asyncio
import time
from datetime import datetime
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

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

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

def trigger_social_alerts(sym, price, m1, score, exchange="BIN", market_type="Vadeli İşlemler (Futures)"):
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
        
    ref_links = f"\nİşlem yapmak için referansımız:\n{exchange_name}: {ref_link}\n" if ref_link else ""

    promo_text = f"\n🤖 Proptrex'e Kayıt/Erişim İçin:\n👉 {config.get('promo_link', '')}\n" if config.get("promo_enabled") else ""

    templates = {
        "T1": f"🚀 PROPTREX PUMP RADAR 🚀\n\n📌 Coin: #{sym}\n📊 Piyasa: {market_type}\n📈 Fiyat: ${price:.4f}\n⚡️ Hacim Patlamasi: {m1:.1f}x\n🔥 AI Skoru: {score}/100\n🎯 Öneri: TP1 ${price*1.03:.3f}\n" + promo_text + ref_links,
        "T2": f"🚨 BALINA ALARMI (PUMP) 🚨\n\nYapay zeka #{sym} coininde ani hacim artisi tespit etti!\n\n📊 Piyasa: {market_type}\n💰 Anlik: ${price:.4f}\n📈 Hacim Carpani: {m1:.1f}x\n" + promo_text + ref_links,
        "T3": f"🔥 GÜÇLÜ AL SINYALI! 🔥\n\nProptrex Algo #{sym} grafiginde direnc kirilimi tespit etti. (Skor: {score})\nFiyat su an ${price:.4f} civarinda ve hacim {m1:.1f}x artis gosterdi.\n\nRisk=Odul oraniniza dikkat ederek ({market_type}) degerlendirin.\n" + promo_text + ref_links,
        "T4": f"#{sym} Harekete Geciyor ({market_type})! 🚀\n\n🎯 AI Sinyal Skoru: {score}/100\n📈 Giris Bandi: ${price*0.99:.4f} - ${price*1.01:.4f}\n💡 Strateji: Momentum (Hacim {m1:.1f}x)\n" + promo_text + ref_links
    }
    
    price_tp = price * 1.03
    price_low = price * 0.99
    price_high = price * 1.01
    
    if config.get("tg_enabled"):
        t_key = config.get("tg_template", "T1")
        msg_tg = templates.get(t_key, templates["T1"]).format(sym=sym, price=price, m1=m1, score=score, price_tp=price_tp, price_low=price_low, price_high=price_high)
        send_telegram(config, msg_tg)
        
    if config.get("tw_enabled"):
        tw_key = config.get("tw_template", "T1")
        msg_tw = templates.get(tw_key, templates["T1"]).format(sym=sym, price=price, m1=m1, score=score, price_tp=price_tp, price_low=price_low, price_high=price_high)
        send_twitter(config, msg_tw)

def process_ticker(ticker_data, market_type="Vadeli İşlemler (Futures)"):
    sym = ticker_data['s']
    if not sym.endswith("USDT"): return None
    
    unique_sym_key = f"{market_type}_{sym}"
    
    price = float(ticker_data['c'])
    vol_quote = float(ticker_data['q'])
    price_change_pct = float(ticker_data['P'])
    now = time.time()
    
    if unique_sym_key not in market_state:
        market_state[unique_sym_key] = {"last_price": price, "last_vol": vol_quote, "last_time": now, "pump_score": 0, "phase": "Sıkışma", "category": "PRE-PUMP CANDIDATES", "last_alert_time": 0, "m1_price": price, "m3_price": price, "m5_price": price}
        return None
        
    prev = market_state[unique_sym_key]
    time_diff = now - prev["last_time"]
    if time_diff < 1.0: return None
        
    vol_diff = vol_quote - prev["last_vol"]
    price_diff_pct = ((price - prev["last_price"]) / prev["last_price"]) * 100 if prev["last_price"] > 0 else 0
    
    score_increase = 0
    volx = 1.0
    if vol_diff > 50000:
        volx = 1.5
        score_increase += 5
    if vol_diff > 150000:
        volx = 2.5
        score_increase += 15
    if vol_diff > 300000:
        volx = 4.0
        score_increase += 25
        
    if price_diff_pct > 0.1: score_increase += 5
    if price_diff_pct > 0.4: score_increase += 15
        
    current_score = prev["pump_score"]
    if score_increase == 0:
        current_score = max(0, current_score - (time_diff * 0.5))
    else:
        current_score = min(100, current_score + score_increase)
        
    cat = "PRE-PUMP CANDIDATES"
    status = "İzleme"
    phase = "Sıkışma"
    
    if current_score >= 85:
        cat = "TRIGGERED NOW"
        status = "Alarm"
        phase = "Trigger"
    elif current_score > 60:
        cat = "ACTIVE RUN"
        status = "Onay"
        phase = "Devam"
    elif current_score < 40 and prev["pump_score"] > 60:
        cat = "EXHAUSTION / EXIT"
        status = "Exit"
        phase = "Yorulma"
    elif current_score < 50:
        cat = "PRE-PUMP CANDIDATES"
        status = "İzleme"
        phase = "Sıkışma"

    market_state[unique_sym_key].update({"last_price": price, "last_vol": vol_quote, "last_time": now, "pump_score": current_score, "phase": phase, "category": cat})
    
    if score_increase == 0 and current_score < 50: return None
    
    # Simulate historical prices if missing
    m1_pct = ((price - prev.get("m1_price", price)) / prev.get("m1_price", price)) * 100 if prev.get("m1_price", price) > 0 else 0
    m3_pct = ((price - prev.get("m3_price", price)) / prev.get("m3_price", price)) * 100 if prev.get("m3_price", price) > 0 else 0
    m5_pct = ((price - prev.get("m5_price", price)) / prev.get("m5_price", price)) * 100 if prev.get("m5_price", price) > 0 else 0
        
    item = {
        "symbol": f"{sym} ({'SPOT' if 'Spot' in market_type else 'PERP'})", "exchange": "BIN", "type": "SPOT" if "Spot" in market_type else "PERP", "score": int(current_score),
        "phase": phase, "price": f"{price:.4f}", "m1": f"{m1_pct:+.1f}", "m3": f"{m3_pct:+.1f}",
        "m5": f"{m5_pct:+.1f}", "volx": f"{volx:.1f}x", "buy_pct": 75, "obi": "1.50", "cvd": "↑" if price_diff_pct > 0 else "↓",
        "spread": "Daraldı" if volx > 2.0 else "Stabil", "ask_sweep": "Süpürüyor" if volx > 3.0 else "İnceliyor", "bid_stack": "Güçlü", "oi_delta": f"{price_change_pct:+.1f}%",
        "trigger": "Volume Burst" if volx > 2.0 else "Micro BO",
        "entry_band": f"{price*0.99:.3f}-{price*1.01:.3f}" if cat != "ACTIVE RUN" else "Trail Active",
        "tp_sl": f"TP1 {price*1.03:.3f} / SL" if cat in ["PRE-PUMP CANDIDATES", "TRIGGERED NOW"] else ("TP2 açık" if cat == "ACTIVE RUN" else "TP hit / exit"),
        "status": status,
        "time": datetime.now().strftime("%H:%M:%S"), "category": cat
    }
    
    if cat == "TRIGGERED NOW" and current_score > 88:
        if now - prev["last_alert_time"] > 300:
            market_state[unique_sym_key]["last_alert_time"] = now
            trigger_social_alerts(sym, price, volx, int(current_score), "BIN", market_type)
            
    return item

@app.get("/")
async def get_index():
    return FileResponse("index.html")

@app.get("/platform")
async def get_platform():
    return FileResponse("platform.html")

@app.get("/snapshot")
async def get_snapshot():
    items = []
    for unique_sym_key, state in market_state.items():
        if state["pump_score"] > 20:
            price = state["last_price"]
            cat = state["category"]
            status = state["phase"]
            current_score = state["pump_score"]
            is_spot = "Spot" in unique_sym_key
            sym_display = unique_sym_key.split("_")[1]
            
            items.append({
                "symbol": f"{sym_display} ({'SPOT' if is_spot else 'PERP'})", "exchange": "BIN", "direction": "LONG", "score": int(current_score),
                "phase": status, "price": f"{price:.4f}", "m1": "1.0", "m3": "1.5", "m5": "2.0",
                "volx": "1.5x", "buy_pct": 75, "obi": "1.50", "cvd": "↑", "spread": "Stabil",
                "ask_sweep": "-", "bid_stack": "-", "oi_delta": "-", "trigger": "-",
                "entry_band": f"{price*0.99:.3f}-{price*1.01:.3f}", "tp_sl": f"TP1 {price*1.03:.3f}",
                "status": status, "time": datetime.now().strftime("%H:%M:%S"), "category": cat
            })
    items = sorted(items, key=lambda x: x["score"], reverse=True)
    return {"items": items[:15], "count": len(items[:15])}

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
                        item = process_ticker(ticker, "Vadeli İşlemler (Futures)")
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
                        item = process_ticker(ticker, "Spot Piyasası")
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
