/* ═══════════════════════════════════════════════════════════
           PROPTREX FUTURES INTELLIGENCE PLATFORM V2.0
           https://proptrex.hllcvk.cloud/platform/futures/
           © 2024-2026 PropTrex.com — All Rights Reserved
           
           Streams:
           - !ticker@arr (24h stats)
           - !markPrice@arr@1s (mark price + funding rate)
           - per-symbol aggTrade (whale detection)
           - /fapi/v1/openInterest (OI delta engine)
           ═══════════════════════════════════════════════════════════ */

        'use strict';

        console.log('%c PROPTREX %c Futures Intelligence Platform V2.0 %c © PropTrex.com ', 'background:#111827;color:#2563eb;font-weight:900;font-size:14px;padding:4px 8px', 'background:#2563eb;color:#fff;font-weight:700;font-size:14px;padding:4px 8px', 'background:#f3f4f6;color:#6b7280;font-size:10px;padding:4px 8px');

        /* ═══ i18n LANGUAGE SYSTEM ═══ */
        const LANGS = {
            en: {
                liveScanning: 'LIVE SCANNING', scanned: 'Scanned', alerts: 'Alerts', newListing: 'New Listing', whaleTx: 'Whale TX',
                favorites: '☆ Favorites', trades: 'Trades', topMovers: 'Top Movers',
                all: 'All', newListingCat: 'New Listing', rise: 'Rise', fall: 'Fall', pullback: 'Pullback', rally: 'Rally',
                newHigh: 'New High', newLow: 'New Low', volUp: 'High Vol Up', volDn: 'High Vol Down', whaleActivity: '🐋 Whale Activity',
                taSignals: 'TA Signals', search: '🔍 Search',
                chartTab: 'Chart', technicalTab: 'Technical', whaleTab: 'Whale', newsTab: 'News',
                marketData: 'Market Data', aiIntelligence: 'AI Intelligence', riskModel: 'Risk Model', links: 'Links',
                volume24h: 'Day Volume', funding: 'Funding', change24h: 'Day Change', longShort: 'Long/Short', buySell: 'Buy/Sell',
                signal: 'Signal', confidence: 'Confidence', dipScore: 'DIP Score', entry: 'Entry', stopLoss: 'Stop Loss',
                risk: 'Risk', leverage: 'Leverage', liqProximity: 'Liq. Proximity', trend: 'Trend',
                copy: '📋 Copy', copied: '✅ Copied',
                whaleBuy: 'Buy Volume', whaleSell: 'Sell Volume', transactions: 'transactions',
                noWhaleData: 'No whale transactions for {sym} in this period.', whaleNote: 'Whale data comes from Binance aggTrade stream (top 40 volume coins).',
                technicalIndicators: 'Technical Indicators', coinFundamentals: 'Coin Fundamentals',
                marketCap: 'Market Cap', circulatingSupply: 'Circulating Supply', maxSupply: 'Max Supply', launchDate: 'Launch Date',
                newsHeadline: 'News & Events', upcomingEvents: 'Upcoming Events', recentAlerts: 'Recent Alerts',
                socialNews: 'Social & News', noNewsData: 'No news found for this token.', loadingNews: 'Scanning news sources…',
                hotDeals: '🔥 HOT DEALS', low: 'Low', medium: 'Medium', high: 'High',
                langLabel: '🌐'
            },
            tr: {
                liveScanning: 'CANLI TARAMA', scanned: 'Taranan', alerts: 'Uyarı', newListing: 'Yeni Liste', whaleTx: 'Balina TX',
                favorites: '☆ Favoriler', trades: 'İşlemler', topMovers: 'Top Movers',
                all: 'Tümü', newListingCat: 'New Listing', rise: 'Yükseliş', fall: 'Düşüş', pullback: 'Pullback', rally: 'Rally',
                newHigh: 'Yeni Zirve', newLow: 'Yeni Dip', volUp: 'Hacim+Yükseliş', volDn: 'Hacim+Düşüş', whaleActivity: '🐋 Balina',
                taSignals: 'TA Sinyalleri', search: '🔍 Ara',
                chartTab: 'Grafik', technicalTab: 'Teknik', whaleTab: 'Balina', newsTab: 'Haberler',
                marketData: 'Piyasa Verisi', aiIntelligence: 'AI Zeka', riskModel: 'Risk Modeli', links: 'Bağlantılar',
                volume24h: 'Günlük Hacim', funding: 'Fonlama', change24h: 'Günlük Değişim', longShort: 'Long/Short', buySell: 'Al/Sat',
                signal: 'Sinyal', confidence: 'Güven', dipScore: 'DIP Skor', entry: 'Giriş', stopLoss: 'Zarar Kes',
                risk: 'Risk', leverage: 'Kaldıraç', liqProximity: 'Lik. Yakınlık', trend: 'Trend',
                copy: '📋 Kopyala', copied: '✅ Kopyalandı',
                whaleBuy: 'Alım Hacmi', whaleSell: 'Satış Hacmi', transactions: 'işlem',
                noWhaleData: '{sym} için bu zaman aralığında balina işlemi yok.', whaleNote: 'Balina verisi Binance aggTrade akışından gelir (hacim bazlı ilk 40 coin).',
                technicalIndicators: 'Teknik Göstergeler', coinFundamentals: 'Coin Temel Bilgileri',
                marketCap: 'Piyasa Değeri', circulatingSupply: 'Dolaşımdaki Arz', maxSupply: 'Maks Arz', launchDate: 'Lansman Tarihi',
                newsHeadline: 'Haberler & Etkinlikler', upcomingEvents: 'Yaklaşan Etkinlikler', recentAlerts: 'Son Uyarılar',
                socialNews: 'Sosyal & Haberler', noNewsData: 'Bu token için haber bulunamadı.', loadingNews: 'Haber kaynakları taranıyor…',
                hotDeals: '🔥 HOT DEALS', low: 'Düşük', medium: 'Orta', high: 'Yüksek',
                langLabel: '🌐'
            }
        };
        let LANG = localStorage.getItem('proptrex_lang') || ((navigator.language || 'en').startsWith('tr') ? 'tr' : 'en');
        let L = LANGS[LANG];
        function setLang(code) { LANG = code; L = LANGS[code] || LANGS.en; localStorage.setItem('proptrex_lang', code); document.documentElement.lang = code; applyLangUI(); }
        function applyLangUI() {
            const ll = document.getElementById('langBtn');
            if (ll) ll.textContent = LANG.toUpperCase();
            const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
            s('hdrLive', L.liveScanning); s('hdrScanned', L.scanned); s('hdrAlerts', L.alerts);
            s('hdrNew', L.newListing); s('hdrWh', L.whaleTx);
            s('lbl-ta-signals', L.taSignals); s('lbl-upcoming', L.upcomingEvents);
            s('lbl-whale-btn', L.whaleActivity.replace('🐋 ', ''));
        }

        /* ---------- Small utils ---------- */
        const R = (a, b) => Math.random() * (b - a) + a;
        const RI = (a, b) => Math.floor(R(a, b));
        const pick = a => a[RI(0, a.length)];
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const now = () => Date.now();
        function ensureAdminToggleButton() {
            let btn = document.getElementById('pxAdminOpen');
            if (!btn) {
                btn = document.createElement('button');
                btn.className = 'px-filter-pill px-admin-open';
                btn.id = 'pxAdminOpen';
                btn.innerHTML = '⚙ Settings';
            }
            return btn;
        }

        /* ---------- Binance endpoints ---------- */
        const HTTP_CONTEXT = /^https?:$/i.test(window.location.protocol);
        const SAME_ORIGIN = HTTP_CONTEXT ? window.location.origin : '';
        const SAME_ORIGIN_WS = HTTP_CONTEXT ? (((window.location.protocol === 'https:') ? 'wss://' : 'ws://') + window.location.host) : '';
        const DIRECT_FAPI_REST = 'https://fapi.binance.com';
        const DIRECT_FAPI_WS_BASE = 'wss://fstream.binance.com/stream?streams=';
        const DIRECT_DAPI_REST = 'https://dapi.binance.com';
        const DIRECT_DAPI_WS_BASE = 'wss://dstream.binance.com/stream?streams=';

        /*
          HTTP/HTTPS altında reverse proxy varsa same-origin kullan.
          Dosya olarak (file://) açıldığında direct Binance endpoint'e düş.
        */
        const FAPI_REST = DIRECT_FAPI_REST;
        const FAPI_WS_BASE = DIRECT_FAPI_WS_BASE;

        const DAPI_REST = DIRECT_DAPI_REST;
        const DAPI_WS_BASE = DIRECT_DAPI_WS_BASE;

        // active endpoints (switchable)
        function apiBase() {
            let cfg = null;
            try { cfg = JSON.parse(localStorage.getItem('proptrex_admin_cfg_v1') || '{}'); } catch { cfg = {}; }
            const usdmRest = cfg && cfg.restUsdm ? String(cfg.restUsdm).trim() : FAPI_REST;
            const usdmWs = cfg && cfg.wsUsdm ? String(cfg.wsUsdm).trim() : FAPI_WS_BASE;
            const coinmRest = cfg && cfg.restCoinm ? String(cfg.restCoinm).trim() : DAPI_REST;
            const coinmWs = cfg && cfg.wsCoinm ? String(cfg.wsCoinm).trim() : DAPI_WS_BASE;
            return (Z.market === 'coinm') ? { REST: coinmRest, WS: coinmWs, kind: 'COIN-M' } : { REST: usdmRest, WS: usdmWs, kind: 'USDⓈ-M' };
        }

        /* ---------- App state ---------- */
        const Z = {
            market: 'usdm', // 'usdm' | 'coinm'
            view: 'movers', // 'movers' | 'trades'
            t: 0,
            fg: 55,         // Fear/Greed reference (optional external API)
            wv: 0,          // whale volume reference (optional)
            cat: 'all',
            mv: 'all',
            sig: null,
            q: '',
            ai: 1,
            wi: 1,
            alerts: [],
            whales: [],
            tokens: [],
            bySym: new Map(),     // "BTCUSDT" -> token
            fav: new Set(),
            ws: null,
            ws2: null,
            lastRender: 0,
            renderTimer: null,
            sessionTz: 'UTC',
            sessionResetHour: 0,
            sessionStoreKey: 'px_daily_session_v1',
            sessionDirty: false,
            sessionLastPersist: 0,
            sessionSeenKey: ''
        };

        function botDefaultExchangeMap() {
            return {
                binance_spot: true, binance_futures: true,
                mexc_spot: true, mexc_futures: true,
                gate_spot: true, gate_futures: true,
                kucoin_spot: true, kucoin_futures: true
            };
        }

        function botPageOriginBase() {
            try {
                return /^https?:$/i.test(window.location.protocol) ? window.location.origin.replace(/\/+$/, '') : '';
            } catch {
                return '';
            }
        }

        function botParseUrlSafe(v) {
            try {
                return new URL(v, window.location.href);
            } catch {
                return null;
            }
        }

        function botIsLoopbackUrl(v) {
            const u = botParseUrlSafe(v);
            if (!u) return false;
            const h = String(u.hostname || '').toLowerCase();
            return h === '127.0.0.1' || h === 'localhost' || h === '0.0.0.0' || h === '::1';
        }

        function botGuessBaseUrl() {
            try {
                const q = new URLSearchParams(window.location.search || '');
                const qp = (q.get('botBaseUrl') || q.get('bot') || '').trim();
                if (qp) return qp.replace(/\/+$/, '');
            } catch { }
            try {
                const injected = String(window.PROPTREX_BOT_BASE_URL || window.__BOT_BASE_URL || '').trim();
                if (injected) return injected.replace(/\/+$/, '');
            } catch { }
            return botPageOriginBase();
        }

        function botNormalizeBaseUrl(v) {
            const raw = String(v || '').trim();
            if (!raw) return botGuessBaseUrl();
            if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
            if (/^wss?:\/\//i.test(raw)) {
                const proto = raw.startsWith('wss://') ? 'https://' : 'http://';
                const stripped = raw.replace(/^wss?:\/\//i, '').replace(/\/ws\/events.*$/i, '').replace(/\/+$/, '');
                return proto + stripped;
            }
            try {
                const base = botPageOriginBase() || window.location.href;
                return new URL(raw, base).href.replace(/\/+$/, '');
            } catch {
                return raw.replace(/\/+$/, '');
            }
        }

        function botBuildWsUrl(baseUrl, explicitWs) {
            const rawWs = String(explicitWs || '').trim();
            if (rawWs) {
                if (/^wss?:\/\//i.test(rawWs)) return rawWs;
                try {
                    const pageBase = botPageOriginBase() || window.location.href;
                    const abs = new URL(rawWs, pageBase).href;
                    return abs.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://');
                } catch { }
            }
            const base = botNormalizeBaseUrl(baseUrl);
            if (!base) return '';
            if (/^https:\/\//i.test(base)) return 'wss://' + base.slice(8) + '/ws/events';
            if (/^http:\/\//i.test(base)) return 'ws://' + base.slice(7) + '/ws/events';
            return '';
        }

        function botBuildEndpoint(baseUrl, suffix) {
            const base = botNormalizeBaseUrl(baseUrl);
            return base ? (base + suffix) : '';
        }

        function botContextIsLocal() {
            try {
                if (!/^https?:$/i.test(window.location.protocol)) return false;
                return botIsLoopbackUrl(window.location.href);
            } catch {
                return false;
            }
        }

        function botShouldReplaceLoopback(v) {
            if (!botIsLoopbackUrl(v)) return false;
            return !botContextIsLocal();
        }

        const BOT_DEFAULT_BASE_URL = botGuessBaseUrl();
        const BOT_DEFAULT_WS_URL = botBuildWsUrl(BOT_DEFAULT_BASE_URL);

        Z.bot = {
            baseUrl: BOT_DEFAULT_BASE_URL,
            wsUrl: BOT_DEFAULT_WS_URL,
            snapshotUrl: botBuildEndpoint(BOT_DEFAULT_BASE_URL, '/snapshot'),
            healthUrl: botBuildEndpoint(BOT_DEFAULT_BASE_URL, '/health'),
            socket: null,
            connected: false,
            eventCount: 0,
            snapshotCount: 0,
            lastEventTs: 0,
            activeSymbols: new Set(),
            activeChannels: new Set(),
            exchanges: botDefaultExchangeMap(),
            minNotional: 25000,
            minConfidence: 70,
            cooldownSec: 45,
            profile: 'aggressive',
            minVolMult: 2.5,
            minPriceMove1m: 0.8,
            minBuyRatio: 54,
            minOBI: 0.12,
            minOIDeltaPct: 0.4,
            minHotScore: 65,
            persistenceSec: 75,
            autoReconnect: true,
            reconnectDelayMs: 2500,
            reconnectTimer: null,
            lastHealth: 'unknown',
            lastHealthTs: 0,
            lastHealthLatency: 0,
            hotMoneyCount: 0,
            inflowUsd: 0,
            prePumpCount: 0,
            activeRunCount: 0,
            exhaustionCount: 0,
            avgScore: 0,
            log: [],
            scannerItems: new Map(),
            restState: 'idle',
            wsState: 'idle'
        };

        /* ---------- Modal + Chart state ---------- */
        Z.sel = null;
        Z.chart = null;
        Z.candle = null;
        Z.volume = null;
        Z.levelLines = [];
        Z.ro = null;
        Z.mtab = 'chart'; // active modal tab

        function el(id) { return document.getElementById(id); }

        function setModalOpen(open) {
            const m = el('modal');
            const o = el('movl');
            if (!m || !o) return;
            if (open) {
                m.classList.add('on'); o.classList.add('on');
                document.body.style.overflow = 'hidden';
            } else {
                m.classList.remove('on'); o.classList.remove('on');
                document.body.style.overflow = '';
                // cleanup chart on close
                if (Z.chart) {
                    try { Z.chart.remove(); } catch { }
                    Z.chart = null; Z.candle = null; Z.volume = null; Z.levelLines = [];
                    if (Z.priceLine) { Z.priceLine = null; }
                    const cn = el('mChart');
                    if (cn) cn.innerHTML = '';
                }
                closeKlineWS();
            }
        }
        // backward compat
        function setDrawerOpen(open) { setModalOpen(open); }

        function switchModalTab(tab) {
            Z.mtab = tab;
            document.querySelectorAll('.mtab').forEach(t => t.classList.toggle('on', t.getAttribute('data-mtab') === tab));
            document.querySelectorAll('.mtab-content').forEach(c => c.classList.remove('on'));
            const tc = el('mtc-' + tab);
            if (tc) tc.classList.add('on');
            // lazy-load tab content
            if (tab === 'chart') { ensureChart(); refreshDrawerChart(); }
            if (tab === 'technical') renderTechnicalTab();
            if (tab === 'whale') renderWhaleTab();
            if (tab === 'news') renderNewsTab();
        }

        function ensureChart() {
            const node = el('mChart');
            if (!node) return;
            if (Z.chart) return;
            if (!window.LightweightCharts) return;
            const { createChart } = window.LightweightCharts;

            Z.chart = createChart(node, {
                layout: {
                    background: { color: '#ffffff' },
                    textColor: '#111827',
                    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
                },
                grid: {
                    vertLines: { visible: true, color: 'rgba(17, 24, 39, 0.06)' },
                    horzLines: { visible: true, color: 'rgba(17, 24, 39, 0.06)' }
                },
                rightPriceScale: { borderVisible: false },
                timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
                crosshair: { vertLine: { visible: true, color: 'rgba(17,24,39,0.3)' }, horzLine: { visible: true, color: 'rgba(17,24,39,0.3)' } },
                handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
                handleScale: { mouseWheel: true, pinch: true }
            });

            Z.candle = Z.chart.addCandlestickSeries({
                upColor: '#16a34a', downColor: '#ef4444',
                wickUpColor: '#16a34a', wickDownColor: '#ef4444',
                borderVisible: false
            });
            Z.volume = Z.chart.addHistogramSeries({
                priceFormat: { type: 'volume' },
                priceScaleId: '',
                scaleMargins: { top: 0.8, bottom: 0 },
            });

            const resize = () => {
                const r = node.getBoundingClientRect();
                if (r.width < 10 || r.height < 10) return;
                Z.chart.applyOptions({ width: Math.floor(r.width), height: Math.floor(r.height) });
                Z.chart.timeScale().fitContent();
            };
            resize();
            Z.ro = new ResizeObserver(resize);
            Z.ro.observe(node);
        }

        function rsiState(v) {
            if (!isFinite(v)) return '—';
            if (v >= 70) return 'Overbought';
            if (v <= 30) return 'Oversold';
            return 'Neutral';
        }
        function histState(v) {
            if (!isFinite(v)) return '—';
            return v >= 0 ? 'Bullish' : 'Bearish';
        }
        function clearLevels() {
            if (Z.levelLines) {
                try { Z.levelLines.forEach(pl => { try { Z.candle.removePriceLine(pl); } catch { } }); } catch { }
            }
            Z.levelLines = [];
        }
        function computeLevels(candles, signal) {
            const slice = candles.slice(-220);
            const highs = slice.map(c => c.high);
            const lows = slice.map(c => c.low);
            const hi = Math.max(...highs);
            const lo = Math.min(...lows);
            const last = slice[slice.length - 1]?.close || lo;
            const rng = hi - lo || 1;
            // Signal-aware: LONG→ entry zone at supports (bottom), SHORT→ entry zone at resistances (top)
            if (signal === 'SHORT') {
                // Resistance zone prominent — entry from top
                return {
                    R: [hi - rng * 0.02, hi - rng * 0.08, hi - rng * 0.15],
                    S: [lo + rng * 0.06, lo + rng * 0.18]
                };
            } else if (signal === 'LONG') {
                // Support zone prominent — entry from bottom
                return {
                    R: [hi - rng * 0.06, hi - rng * 0.18],
                    S: [lo + rng * 0.02, lo + rng * 0.08, lo + rng * 0.15, lo + rng * 0.28]
                };
            }
            // HOLD — balanced
            return {
                R: [hi - rng * 0.04, hi - rng * 0.12],
                S: [lo + rng * 0.04, lo + rng * 0.12, lo + rng * 0.22, lo + rng * 0.34]
            };
        }
        function applyLevels(levels) {
            clearLevels();
            const mk = (price, title, color, width) => Z.candle.createPriceLine({
                price, color, lineWidth: width, lineStyle: 0, axisLabelVisible: true, title
            });
            const lines = [];
            if (levels && levels.R) levels.R.forEach((p, i) => { lines.push(mk(p, `R${i + 1}`, '#ef4444', 2)); });
            if (levels && levels.S) levels.S.forEach((p, i) => { lines.push(mk(p, `S${i + 1}`, '#16a34a', 1)); });
            Z.levelLines = lines;
        }

        /* ---------- Kline (candles) ---------- */
        Z.iv = '1m';
        Z.kws = null;

        async function loadCandles(sym, interval) {
            const base = apiBase();
            const url = `${base.REST}${(Z.market === 'coinm') ? '/dapi/v1/klines' : '/fapi/v1/klines'}?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(interval)}&limit=500`;
            const arr = await fetchJSON(url);
            return arr.map(k => ({
                time: Math.floor(Number(k[0]) / 1000),
                open: Number(k[1]), high: Number(k[2]), low: Number(k[3]), close: Number(k[4]),
                volume: Number(k[5])
            }));
        }

        function closeKlineWS() {
            if (Z.kws) { try { Z.kws.onclose = null; Z.kws.close(); } catch { } Z.kws = null; }
        }

        function openKlineWS(sym, interval) {
            closeKlineWS();
            const host = (Z.market === 'coinm') ? 'wss://dstream.binance.com/ws/' : 'wss://fstream.binance.com/ws/';
            const ws = new WebSocket(`${host}${sym.toLowerCase()}@kline_${interval}`);
            Z.kws = ws;
            ws.onmessage = (ev) => {
                let msg; try { msg = JSON.parse(ev.data); } catch { return; }
                const k = msg.k;
                if (!k || !Z.candle || !Z.volume) return;
                const c = { time: Math.floor(Number(k.t) / 1000), open: Number(k.o), high: Number(k.h), low: Number(k.l), close: Number(k.c) };
                Z.candle.update(c);
                Z.volume.update({ time: c.time, value: Number(k.v), color: (c.close >= c.open) ? 'rgba(22,163,74,0.35)' : 'rgba(239,68,68,0.35)' });
                // update price line
                if (Z.priceLine && isFinite(c.close) && c.close > 0) {
                    try {
                        const t2 = Z.bySym.get(sym);
                        const ch2 = t2 && isFinite(t2.ch) ? t2.ch : 0;
                        const lc = ch2 >= 0 ? '#16a34a' : '#ef4444';
                        Z.priceLine.applyOptions({
                            price: c.close,
                            color: lc,
                            title: '$' + fp(c.close) + (ch2 >= 0 ? ' ▲' : ' ▼') + ch2.toFixed(2) + '%'
                        });
                    } catch {}
                }
                // update dashboard
                const t = Z.bySym.get(sym);
                if (t) {
                    upHist(t, c.close);
                    updateChartDash(t, interval);
                }
            };
            ws.onclose = () => { };
        }

        function updateChartDash(t, iv) {
            const de = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
            const dh = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
            dh('dashTitle', `${t.s} / USDT — ${iv}`);
            de('dashRSI', `${isFinite(t.rsi) ? t.rsi.toFixed(1) : '—'} • ${rsiState(t.rsi)}`);
            de('dashMACD', `L ${t.macd.m.toFixed(3)} / S ${t.macd.s.toFixed(3)}`);
            de('dashHIST', `${t.macd.h.toFixed(3)} • ${histState(t.macd.h)}`);
            de('dashTF', iv);
        }

        async function refreshDrawerChart() {
            if (!Z.sel || !Z.candle || !Z.volume) return;
            try {
                const candles = await loadCandles(Z.sel, Z.iv);
                Z.candle.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
                Z.volume.setData(candles.map(c => ({
                    time: c.time, value: c.volume,
                    color: (c.close >= c.open) ? 'rgba(22,163,74,0.35)' : 'rgba(239,68,68,0.35)'
                })));
                const closes = candles.map(c => c.close).filter(Number.isFinite);
                const t = Z.bySym.get(Z.sel);
                if (t) {
                    t.rsi = calcRSI(closes, 14);
                    t.macd = calcMACD(closes, 12, 26, 9);
                    updateChartDash(t, Z.iv);
                }
                applyLevels(computeLevels(candles, t && t.rsi > 70 ? 'SHORT' : t && t.rsi < 30 ? 'LONG' : 'HOLD'));

                // ── Current price line ──
                if (Z.priceLine) { try { Z.candle.removePriceLine(Z.priceLine); } catch {} Z.priceLine = null; }
                if (t && isFinite(t.price) && t.price > 0) {
                    const ch = isFinite(t.ch) ? t.ch : 0;
                    const lineColor = ch >= 0 ? '#16a34a' : '#ef4444';
                    Z.priceLine = Z.candle.createPriceLine({
                        price: t.price,
                        color: lineColor,
                        lineWidth: 2,
                        lineStyle: 2, // dashed
                        axisLabelVisible: true,
                        title: '$' + fp(t.price) + (ch >= 0 ? ' ▲' : ' ▼') + ch.toFixed(2) + '%'
                    });
                }

                Z.chart.timeScale().fitContent();
                openKlineWS(Z.sel, Z.iv);
            } catch (e) { console.warn('Chart load error:', e); }
        }

        function openToken(sym, extra) {
            const t = Z.bySym.get(sym);
            if (!t) return;
            Z.sel = sym;
            Z.mtab = 'chart';
            setModalOpen(true);
            updateModal(extra);
            switchModalTab('chart');
            // highlight row
            const tbl = el('tbl');
            if (tbl) {
                tbl.querySelectorAll('tr').forEach(tr => tr.classList.remove('sel'));
        const tr = tbl.querySelector(`tr[data-sym="${sym}"]`);
        if (tr) tr.classList.add('sel');
      }
      renderSignalHistory();
    }

        function updateModal(extra) {
            if (!Z.sel) return;
            const t = Z.bySym.get(Z.sel);
            if (!t) return;

            // Header
            el('mSym').textContent = `${t.s} / USDT`;
            el('mSub').textContent = extra?.sub || `Futures Perpetual • ${(t.c || 'all').toUpperCase()}${t.wh && t.wh.on ? ' • WHALE' : ''}`;
            el('mPrice').textContent = `$${fp(t.price)}`;
            const ch = isFinite(t.ch) ? t.ch : 0;
            const chEl = el('mChg');
            chEl.textContent = `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`;
            chEl.className = `mhdr-chg ${ch > 0 ? 'up' : ch < 0 ? 'dn' : 'nt'}`;

            // i18n labels
            const tabMap = { chart: L.chartTab, technical: L.technicalTab, whale: L.whaleTab, news: L.newsTab };
            document.querySelectorAll('.mtab[data-mtab]').forEach(tab => {
                const txt = tab.querySelector('.mtab-txt');
                if (txt) txt.textContent = tabMap[tab.getAttribute('data-mtab')] || '';
            });
            const s = (id, v) => { const e = el(id); if (e) e.textContent = v; };
            s('mch1', L.marketData); s('mch2', L.aiIntelligence); s('mch3', L.riskModel); s('mch4', L.links);
            s('mck-vol', L.volume24h); s('mck-fund', L.funding); s('mck-24h', L.change24h);
            s('mck-ls', L.longShort); s('mck-bs', L.buySell); s('mck-sig', L.signal); s('mck-conf', L.confidence);
            s('mck-risk', L.risk); s('mck-lev', L.leverage); s('mck-entry', L.entry); s('mck-sl', L.stopLoss); s('mck-trend', L.trend);
            s('mck-liq', L.liqProximity); s('mck-dip', L.dipScore);
            const copyEl = el('mlCopy'); if (copyEl) copyEl.textContent = L.copy;

            // Side panel: Market Data
            el('mcVol').textContent = `$${fmt(t.vol || 0, 2)}`;
            el('mcFund').innerHTML = fundH(t.fund);
            el('mc24h').innerHTML = `<span class="${ch >= 0 ? 'cg' : 'cr'} fw">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</span>`;
            el('mcRsi').innerHTML = rsiH(t.rsi);

            // Fetch ratios async
            (async () => {
                const period = Z.iv === '1m' ? '5m' : Z.iv === '5m' ? '15m' : '15m';
                const r = await fetchRatios(t.sym, period);
                if (r && r.ls) {
                    el('mcLS').innerHTML = `<span class="cg fw">${r.ls.long.toFixed(1)}%</span> / <span class="cr fw">${r.ls.short.toFixed(1)}%</span>`;
                    el('mcHeat').style.width = `${clamp(r.ls.long, 0, 100)}%`;
                    el('mcHeatL').textContent = `Long ${r.ls.long.toFixed(1)}%`;
                    el('mcHeatR').textContent = `Short ${r.ls.short.toFixed(1)}%`;
                } else { el('mcLS').textContent = '—'; }
                if (r && r.bs) {
                    el('mcBS').innerHTML = `<span class="cg fw">${r.bs.buy.toFixed(1)}%</span> / <span class="cr fw">${r.bs.sell.toFixed(1)}%</span>`;
                } else { el('mcBS').textContent = '—'; }
            })();

            // AI Intelligence card — V2 enhanced, use proptrex signal if available
            const _sig = t.signal;
            const rsi = isFinite(t.rsi) ? t.rsi : 50;
            const macdH2 = t.macd ? t.macd.h : 0;
            const signal = _sig ? _sig.direction : (rsi > 70 ? 'SHORT' : rsi < 30 ? 'LONG' : 'HOLD');
            const conf = _sig ? Math.round(_sig.opportunity_score || 50) : (t.confidence || clamp(Math.abs(rsi - 50) * 2, 0, 100));
            const sigEl = el('mcSignal');
            sigEl.textContent = signal;
            sigEl.className = `msig msig-${signal.toLowerCase()}`;
            el('mcConf').textContent = `${conf.toFixed(0)}%`;
            const dipScore = t.dip_v2 || clamp(100 - Math.abs(ch) * 5 - (rsi > 50 ? (rsi - 50) : 0), 0, 100);
            el('mcDip').style.width = `${dipScore}%`;
            el('mcDip').style.background = dipScore > 60 ? '#16a34a' : dipScore > 30 ? '#f59e0b' : '#ef4444';

            // Entry/SL/TP — use signal engine data when available
            const price = t.price;
            const atr = price * 0.012;
            const isLong = signal === 'LONG';
            if (_sig && isFinite(_sig.entry_low) && _sig.entry_low > 0) {
                el('mcEntry').textContent = `${fp(_sig.entry_low)}–${fp(_sig.entry_high)}`;
                el('mcSL').textContent = `$${fp(_sig.stop_loss)}`;
                const m = _sig.tp_matrix && _sig.tp_matrix[_sig.primary_tf];
                el('mcTP1').textContent = m ? `$${fp(m.tp1)}` : '—';
                el('mcTP2').textContent = m ? `$${fp(m.tp2)}` : '—';
                const rr = _sig.stop_loss > 0 && m && m.tp1 > 0
                    ? Math.abs(m.tp1 - price) / Math.abs(price - _sig.stop_loss)
                    : 2 / 1.5;
                el('mcRR').textContent = `1:${rr.toFixed(1)}`;
            } else {
                el('mcEntry').textContent = `$${fp(price)}`;
                el('mcSL').textContent = `$${fp(isLong ? price - atr * 1.5 : price + atr * 1.5)}`;
                el('mcTP1').textContent = `$${fp(isLong ? price + atr * 2 : price - atr * 2)}`;
                el('mcTP2').textContent = `$${fp(isLong ? price + atr * 3.5 : price - atr * 3.5)}`;
                el('mcRR').textContent = `1:${(2 / 1.5).toFixed(1)}`;
            }
            const trend = _sig ? _sig.__structure && _sig.__structure.trend || 'NEUTRAL'
                : (rsi > 55 ? (macdH2 > 0 ? 'Bullish' : 'Neutral') : (rsi < 45 ? (macdH2 < 0 ? 'Bearish' : 'Neutral') : 'Neutral'));
            const trendLabel = typeof trend === 'string' ? (trend.charAt(0).toUpperCase() + trend.slice(1).toLowerCase()) : trend;
            el('mcTrend').innerHTML = `<span class="${trendLabel === 'Bullish' ? 'cg' : trendLabel === 'Bearish' ? 'cr' : ''}">${trendLabel}</span>`;

            // Risk card
            const volat = Math.abs(ch);
            const riskLabel = volat > 5 ? L.high : volat > 2 ? L.medium : L.low;
            const riskColor = volat > 5 ? '#ef4444' : volat > 2 ? '#f59e0b' : '#16a34a';
            el('mcRisk').textContent = riskLabel;
            el('mcRisk').style.color = riskColor;
            const sugLev = volat > 8 ? '1-2x' : volat > 4 ? '3-5x' : volat > 2 ? '5-10x' : '10-20x';
            el('mcLev').textContent = sugLev;
            const liqDist = clamp(100 - volat * 8, 10, 95);
            el('mcLiq').style.width = `${liqDist}%`;

            // Links
            el('mlBinance').href = EXCHANGE_REF.BINANCE.trade(t.sym);
            el('mlTV').href = `https://www.tradingview.com/symbols/${t.s}USDT/`;
            el('mlCG').href = `https://www.coingecko.com/en/coins/${t.s.toLowerCase()}`;
            el('mlCMC').href = `https://coinmarketcap.com/currencies/${t.s.toLowerCase()}/`;

            // Alert reason
            const aw = el('mAlertWrap');
            const ar = el('mAlertReason');
            if (extra && extra.reason) { aw.style.display = 'block'; ar.textContent = extra.reason; }
            else { aw.style.display = 'none'; }

            // V2: Signal Breakdown + Why/Invalidate
            renderSigBreakdown(t);
            // V2: Prop Firm calculator
            updatePropFirm(t);
        }

        /* ---------- Tab renderers ---------- */
        function renderTechnicalTab() {
            if (!Z.sel) return;
            const t = Z.bySym.get(Z.sel);
            if (!t) return;
            const rsi = isFinite(t.rsi) ? t.rsi : 50;
            const macd = t.macd || { m: 0, s: 0, h: 0 };
            const bullBear = (v, inv) => { const b = inv ? (v < 0) : (v > 0); return `<span class="mta-badge ${b ? 'bull' : 'bear'}">${b ? 'Bullish' : 'Bearish'}</span>`; };

            let html = `<div style="font-weight:700;font-size:14px;margin-bottom:10px">${L.technicalIndicators}</div>
    <div class="mta-row"><span class="mta-label">RSI(14)</span><span class="mta-val">${rsi.toFixed(1)} ${rsi > 70 ? '<span style="color:#ef4444">Overbought</span>' : rsi < 30 ? '<span style="color:#16a34a">Oversold</span>' : 'Neutral'}</span></div>
    <div class="mta-row"><span class="mta-label">MACD Line</span><span class="mta-val">${macd.m.toFixed(4)}</span></div>
    <div class="mta-row"><span class="mta-label">MACD Signal</span><span class="mta-val">${macd.s.toFixed(4)}</span></div>
    <div class="mta-row"><span class="mta-label">Histogram</span><span class="mta-val">${macd.h.toFixed(4)} ${bullBear(macd.h)}</span></div>
    <div class="mta-row"><span class="mta-label">Funding Rate</span><span class="mta-val">${fundH(t.fund)}</span></div>
    <div class="mta-row"><span class="mta-label">${L.change24h}</span><span class="mta-val"><span class="${(t.ch || 0) >= 0 ? 'cg' : 'cr'} fw">${(t.ch || 0) >= 0 ? '+' : ''}${(t.ch || 0).toFixed(2)}%</span></span></div>
    <div class="mta-row"><span class="mta-label">${L.volume24h}</span><span class="mta-val">$${fmt(t.vol || 0, 2)}</span></div>
    <div class="mta-row"><span class="mta-label">Fib Level</span><span class="mta-val">${fibH(t)}</span></div>
    <div class="mta-row"><span class="mta-label">Whale</span><span class="mta-val">${whaleTagH(t)}</span></div>
    <div class="mta-row"><span class="mta-label">${L.signal}</span><span class="mta-val">${bullBear(macd.h)}</span></div>`;

            // Coin Fundamentals section
            html += `<div style="font-weight:700;font-size:14px;margin:18px 0 10px;padding-top:14px;border-top:1px solid rgba(17,24,39,0.08)">${L.coinFundamentals}</div>
    <div id="mFundamentals"><div style="color:rgba(17,24,39,0.35);font-size:12px">Loading...</div></div>`;

            el('mTAList').innerHTML = html;

            // Fetch fundamentals from CoinGecko
            fetchCoinFundamentals(t.s.toLowerCase());
        }

        /* Coin fundamentals cache */
        Z.fundCache = Z.fundCache || new Map();

        async function fetchCoinFundamentals(symbol) {
            const cached = Z.fundCache.get(symbol);
            if (cached && Date.now() - cached.ts < 300000) { renderFundamentals(cached.data); return; }
            try {
                // CoinGecko search to get coin id
                const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
                const searchRes = await fetchJSON(searchUrl);
                const coin = searchRes?.coins?.[0];
                if (!coin) { renderFundamentals(null); return; }

                const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=true&developer_data=false&sparkline=false`;
                const data = await fetchJSON(detailUrl);
                Z.fundCache.set(symbol, { data, ts: Date.now() });
                renderFundamentals(data);
            } catch (e) {
                console.warn('Fundamentals fetch error:', e);
                // Fallback data on 429
                const t = Z.bySym.get(symbol.toUpperCase() + 'USDT');
                const fallbackMcap = t ? (t.vol || 100000) * 15 : 1000000;
                renderFundamentals({
                    market_data: { market_cap: { usd: fallbackMcap }, circulating_supply: fallbackMcap / 2, max_supply: fallbackMcap },
                    id: symbol.toLowerCase()
                });
            }
        }

        function renderFundamentals(data) {
            const box = el('mFundamentals');
            if (!box) return;
            if (!data) { box.innerHTML = '<div style="color:rgba(17,24,39,0.35);font-size:12px">Data unavailable</div>'; return; }
            const md = data.market_data || {};
            const mcap = md.market_cap?.usd || 0;
            const circ = md.circulating_supply || 0;
            const maxS = md.max_supply || md.total_supply || 0;
            const ath = md.ath?.usd || 0;
            const athDate = md.ath_date?.usd ? new Date(md.ath_date.usd).toLocaleDateString() : '—';
            const athChg = md.ath_change_percentage?.usd || 0;
            const rank = data.market_cap_rank || '—';
            const genesis = data.genesis_date || '—';
            const cats = (data.categories || []).filter(c => c).slice(0, 3).join(', ') || '—';
            const h1 = md.price_change_percentage_1h_in_currency?.usd;
            const d7 = md.price_change_percentage_7d_in_currency?.usd;
            const d30 = md.price_change_percentage_30d_in_currency?.usd;

            // Update CMC link with proper slug
            const slug = data.links?.homepage?.[0] ? data.id : data.id;
            const cmcEl = el('mlCMC');
            if (cmcEl && data.id) cmcEl.href = `https://coinmarketcap.com/currencies/${data.id}/`;
            const cgEl = el('mlCG');
            if (cgEl && data.id) cgEl.href = `https://www.coingecko.com/en/coins/${data.id}`;

            // Add social links
            const tw = data.links?.twitter_screen_name;
            const rd = data.links?.subreddit_url;
            const web = data.links?.homepage?.[0];

            const chgH = (v) => !isFinite(v) ? '—' : `<span class="${v >= 0 ? 'cg' : 'cr'} fw">${v >= 0 ? '+' : ''}${v.toFixed(2)}%</span>`;

            box.innerHTML = `
    <div class="mta-row"><span class="mta-label">Rank</span><span class="mta-val">#${rank}</span></div>
    <div class="mta-row"><span class="mta-label">${L.marketCap}</span><span class="mta-val">$${fmt(mcap, 2)}</span></div>
    <div class="mta-row"><span class="mta-label">${L.circulatingSupply}</span><span class="mta-val">${fmt(circ, 2)}</span></div>
    <div class="mta-row"><span class="mta-label">${L.maxSupply}</span><span class="mta-val">${maxS ? fmt(maxS, 2) : '∞'}</span></div>
    <div class="mta-row"><span class="mta-label">ATH</span><span class="mta-val">$${fp(ath)} <span style="font-size:10px;color:rgba(17,24,39,0.45)">(${athDate})</span></span></div>
    <div class="mta-row"><span class="mta-label">ATH Δ</span><span class="mta-val">${chgH(athChg)}</span></div>
    <div class="mta-row"><span class="mta-label">1h / 7d / 30d</span><span class="mta-val">${chgH(h1)} / ${chgH(d7)} / ${chgH(d30)}</span></div>
    <div class="mta-row"><span class="mta-label">${L.launchDate}</span><span class="mta-val">${genesis}</span></div>
    <div class="mta-row"><span class="mta-label">Category</span><span class="mta-val" style="font-size:11px">${cats}</span></div>
    ${tw ? `<div class="mta-row"><span class="mta-label">Twitter</span><span class="mta-val"><a href="https://twitter.com/${tw}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:none">@${tw}</a></span></div>` : ''}
    ${rd ? `<div class="mta-row"><span class="mta-label">Reddit</span><span class="mta-val"><a href="${rd}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:none">Subreddit</a></span></div>` : ''}
    ${web ? `<div class="mta-row"><span class="mta-label">Website</span><span class="mta-val"><a href="${web}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:none;font-size:11px;word-break:break-all">${web.replace(/^https?:\/\//, '').slice(0, 30)}</a></span></div>` : ''}
  `;
        }

        function renderWhaleTab() {
            if (!Z.sel) return;
            const sym = Z.sel;
            const t = Z.bySym.get(sym);
            const base = t ? t.s : sym.replace('USDT', '');
            const filterMin = Number(el('mWhaleFilter')?.value || 60);
            const cutoff = Date.now() - filterMin * 60 * 1000;
            const items = Z.whales.filter(w => w.sym === sym && w.tm.getTime() > cutoff);

            let html = '';
            if (items.length) {
                // Summary
                const totalBuy = items.filter(w => w.side === 'buy').reduce((s, w) => s + w.usd, 0);
                const totalSell = items.filter(w => w.side === 'sell').reduce((s, w) => s + w.usd, 0);
                html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:rgba(22,163,74,0.06);border:1px solid rgba(22,163,74,0.15);border-radius:10px;padding:8px 10px">
        <div style="font-size:11px;color:#16a34a;font-weight:600">${L.whaleBuy}</div>
        <div style="font-size:15px;font-weight:800;color:#16a34a;font-family:'IBM Plex Mono',monospace">$${fmt(totalBuy, 2)}</div>
        <div style="font-size:11px;color:rgba(17,24,39,0.45)">${items.filter(w => w.side === 'buy').length} ${L.transactions}</div>
      </div>
      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:8px 10px">
        <div style="font-size:11px;color:#ef4444;font-weight:600">${L.whaleSell}</div>
        <div style="font-size:15px;font-weight:800;color:#ef4444;font-family:'IBM Plex Mono',monospace">$${fmt(totalSell, 2)}</div>
        <div style="font-size:11px;color:rgba(17,24,39,0.45)">${items.filter(w => w.side === 'sell').length} ${L.transactions}</div>
      </div>
    </div>`;
                html += items.map(whaleItemHTML).join('');
            } else {
                html = `<div style="color:rgba(17,24,39,0.45);font-size:13px;padding:30px 0;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">🐋</div>
      ${L.noWhaleData.replace('{sym}', base)}<br>
      <span style="font-size:11px">${L.whaleNote}</span>
    </div>`;
            }
            el('mWhaleList').innerHTML = html;
        }
        function whaleItemHTML(w) {
            const sideC = w.side === 'buy' ? '#16a34a' : '#ef4444';
            const tm = `${String(w.tm.getHours()).padStart(2, '0')}:${String(w.tm.getMinutes()).padStart(2, '0')}:${String(w.tm.getSeconds()).padStart(2, '0')}`;
            return `<div class="mwhale-item">
    <div class="mwhale-icon">🐋</div>
    <div class="mwhale-info">
      <div class="mwhale-sym">${w.s}/USDT <span style="color:${sideC};font-weight:700">${w.side.toUpperCase()}</span></div>
      <div class="mwhale-detail">Qty ${w.qty?.toFixed(4) || '—'} @ $${fp(w.px)} • AggTrade #${w.aggId || w.aid || ''}</div>
    </div>
    <div class="mwhale-amt"><div class="mwhale-usd" style="color:${sideC}">$${fmt(w.usd, 2)}</div><div class="mwhale-time">${tm}</div></div>
  </div>`;
        }

        function renderNewsTab() {
            if (!Z.sel) return;
            const t = Z.bySym.get(Z.sel);
            const base = t ? t.s : Z.sel.replace('USDT', '');

            // Show loading + existing alerts immediately
            const relevantAlerts = Z.alerts.filter(a => a.sym === Z.sel || (a.ds || '').includes(base)).slice(0, 10);
            let html = `<div style="font-weight:700;font-size:14px;margin-bottom:10px">${L.newsHeadline} — ${base}</div>`;
            html += `<div id="mNewsLive"><div style="color:rgba(17,24,39,0.35);font-size:12px;padding:8px 0">${L.loadingNews}</div></div>`;

            if (relevantAlerts.length) {
                html += `<div style="font-weight:600;font-size:13px;margin:14px 0 6px;color:rgba(17,24,39,0.55)">${L.recentAlerts}</div>`;
                html += relevantAlerts.map(a => {
                    const tm = `${String(a.tm.getHours()).padStart(2, '0')}:${String(a.tm.getMinutes()).padStart(2, '0')}`;
                    return `<div class="mnews-item"><div class="mnews-title">${a.ti}</div><div class="mnews-meta">${a.ds} • ${tm}</div></div>`;
                }).join('');
            }
            el('mNewsList').innerHTML = html;

            // Fetch real news
            fetchCryptoNews(base);
        }

        Z.newsCache = Z.newsCache || new Map();

        async function fetchCryptoNews(symbol) {
            const cached = Z.newsCache.get(symbol);
            if (cached && Date.now() - cached.ts < 120000) { renderNewsItems(cached.items); return; }

            try {
                // CryptoCompare News API (free, no key for basic)
                const url = `https://min-api.cryptocompare.com/data/v2/news/?categories=${encodeURIComponent(symbol)}&extraParams=proptrex`;
                const res = await fetchJSON(url);
                const items = (res?.Data || []).slice(0, 20).map(n => ({
                    title: n.title,
                    source: n.source_info?.name || n.source || '',
                    url: n.url,
                    time: n.published_on ? new Date(n.published_on * 1000) : new Date(),
                    img: n.imageurl,
                    body: (n.body || '').slice(0, 200),
                    categories: n.categories || ''
                }));
                Z.newsCache.set(symbol, { items, ts: Date.now() });
                renderNewsItems(items);
            } catch (e) {
                console.warn('News fetch error:', e);
                // Try alternate: CoinGecko status updates
                try {
                    const cgCache = Z.fundCache?.get(symbol.toLowerCase());
                    const coinId = cgCache?.data?.id || symbol.toLowerCase();
                    const url2 = `https://api.coingecko.com/api/v3/coins/${coinId}/status_updates`;
                    const res2 = await fetchJSON(url2);
                    const items = (res2?.status_updates || []).slice(0, 10).map(s => ({
                        title: s.description?.slice(0, 100) || 'Update',
                        source: s.project?.name || '',
                        url: '',
                        time: new Date(s.created_at),
                        body: s.description?.slice(0, 200) || ''
                    }));
                    renderNewsItems(items);
                } catch {
                    renderNewsItems([]);
                }
            }
        }

        function renderNewsItems(items) {
            const box = el('mNewsLive');
            if (!box) return;
            if (!items.length) {
                box.innerHTML = `<div style="color:rgba(17,24,39,0.35);font-size:12px;padding:8px 0">${L.noNewsData}</div>`;
                return;
            }
            box.innerHTML = items.map(n => {
                const ago = timeAgo(n.time);
                const link = n.url ? ` onclick="window.open('${n.url}','_blank')" style="cursor:pointer"` : '';
                return `<div class="mnews-item"${link}>
      <div class="mnews-title">${escH(n.title)}</div>
      <div class="mnews-meta">${escH(n.source)} • ${ago}${n.categories ? ' • <span style="color:#2563eb;font-size:10px">' + escH(n.categories.split('|').slice(0, 2).join(', ')) + '</span>' : ''}</div>
    </div>`;
            }).join('');
        }

        function timeAgo(d) {
            if (!d) return '';
            const s = Math.floor((Date.now() - d.getTime()) / 1000);
            if (s < 60) return s + 's';
            if (s < 3600) return Math.floor(s / 60) + 'm';
            if (s < 86400) return Math.floor(s / 3600) + 'h';
            return Math.floor(s / 86400) + 'd';
        }
        function escH(s) { return (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

        function initDrawerUI() {
            // Close button + overlay
            el('mClose')?.addEventListener('click', () => setModalOpen(false), { passive: true });
            el('movl')?.addEventListener('click', () => setModalOpen(false), { passive: true });
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') setModalOpen(false);
                // Arrow keys for tab switching
                if (el('modal')?.classList.contains('on')) {
                    const tabOrder = ['chart', 'technical', 'whale', 'news'];
                    const ci = tabOrder.indexOf(Z.mtab);
                    if (e.key === 'ArrowRight' && ci < tabOrder.length - 1) { e.preventDefault(); switchModalTab(tabOrder[ci + 1]); }
                    if (e.key === 'ArrowLeft' && ci > 0) { e.preventDefault(); switchModalTab(tabOrder[ci - 1]); }
                }
            });

            // Tab bar
            el('mTabBar')?.addEventListener('click', (e) => {
                const tab = e.target?.closest?.('[data-mtab]');
                if (!tab) return;
                switchModalTab(tab.getAttribute('data-mtab'));
            }, { passive: true });

            // Timeframe buttons
            el('mTfRow')?.addEventListener('click', (e) => {
                const btn = e.target?.closest?.('[data-iv]');
                if (!btn) return;
                Z.iv = btn.getAttribute('data-iv');
                el('mTfRow').querySelectorAll('.mchart-tfb').forEach(b => b.classList.toggle('on', b.getAttribute('data-iv') === Z.iv));
                // destroy + recreate chart for clean state
                if (Z.chart) { try { Z.chart.remove(); } catch { } Z.chart = null; Z.candle = null; Z.volume = null; Z.levelLines = []; el('mChart').innerHTML = ''; }
                ensureChart();
                refreshDrawerChart();
            }, { passive: true });

            // Copy button
            el('mlCopy')?.addEventListener('click', (e) => {
                e.preventDefault();
                if (!Z.sel) return;
                const t = Z.bySym.get(Z.sel);
                const txt = `${t.sym}  Price:$${fp(t.price)}  24h:${(t.ch || 0).toFixed(2)}%  Vol:$${fmt(t.vol || 0, 2)}  Funding:${isFinite(t.fund) ? (t.fund * 100).toFixed(4) + '%' : '--'}`;
                navigator.clipboard?.writeText(txt).catch(() => { });
                e.target.textContent = L.copied;
                setTimeout(() => { e.target.textContent = L.copy; }, 1500);
            });

            // Whale filter
            el('mWhaleFilter')?.addEventListener('change', () => renderWhaleTab());

            // Mobile swipe-to-close
            let touchY = 0;
            const modal = el('modal');
            modal?.addEventListener('touchstart', (e) => { touchY = e.touches[0]?.clientY || 0; }, { passive: true });
            modal?.addEventListener('touchend', (e) => {
                const dy = (e.changedTouches[0]?.clientY || 0) - touchY;
                if (dy > 100) setModalOpen(false);
            }, { passive: true });
        }

        // Keep updateDrawer as alias — only update if modal is visible
        function updateDrawer(extra) { if (el('modal')?.classList.contains('on')) updateModal(extra); }


        /* ---------- Formatting helpers (existing UI expects these) ---------- */
        function ts() {
            const d = new Date();
            const p = n => String(n).padStart(2, '0');
            return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        }
        function fp(n) {
            if (!isFinite(n)) return '--';
            const abs = Math.abs(n);
            if (abs >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            if (abs >= 1) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
            return n.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
        }
        function fmt(n, dp = 2) {
            if (!isFinite(n)) return '--';
            const abs = Math.abs(n);
            if (abs >= 1e12) return (n / 1e12).toFixed(dp) + 'T';
            if (abs >= 1e9) return (n / 1e9).toFixed(dp) + 'B';
            if (abs >= 1e6) return (n / 1e6).toFixed(dp) + 'M';
            if (abs >= 1e3) return (n / 1e3).toFixed(dp) + 'K';
            return n.toFixed(dp);
        }

        /* ---------- Category tag helper (keep your existing look) ---------- */
        function catH(c) {
            if (!c || c === 'all') return '<span style="color:var(--t4)">—</span>';
            const m = {
                defi: 'tg-defi', ai: 'tg-ai', l1: 'tg-l1', l2: 'tg-l2', gaming: 'tg-gaming', rwa: 'tg-rwa',
                meme: 'tg-meme', infra: 'tg-infra', etf: 'tg-l2', alpha: 'tg-hot', tradfi: 'tg-l1', usdc: 'tg-new',
                chinese: 'tg-hot', premarket: 'tg-new', meta: 'tg-defi', new: 'tg-new'
            };
            const cls = m[c] || 'tg-new';
            return ` <span class="tg ${cls}">${c}</span>`;
        }

        /* ---------- Technical indicators (fast, approximate) ---------- */
        function calcRSI(closes, period = 14) {
            if (!closes || closes.length < period + 1) return 50;
            let gains = 0, losses = 0;
            for (let i = closes.length - period; i < closes.length; i++) {
                const diff = closes[i] - closes[i - 1];
                if (diff >= 0) gains += diff; else losses -= diff;
            }
            const avgGain = gains / period;
            const avgLoss = losses / period;
            if (avgLoss === 0) return 100;
            const rs = avgGain / avgLoss;
            return 100 - (100 / (1 + rs));
        }
        function ema(values, period) {
            if (!values || values.length === 0) return 0;
            const k = 2 / (period + 1);
            let e = values[0];
            for (let i = 1; i < values.length; i++) {
                e = values[i] * k + e * (1 - k);
            }
            return e;
        }
        function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
            if (!closes || closes.length < slow + signal) return { m: 0, s: 0, h: 0 };
            const fastE = ema(closes.slice(-Math.max(200, slow + signal + 5)), fast);
            const slowE = ema(closes.slice(-Math.max(200, slow + signal + 5)), slow);
            const macd = fastE - slowE;

            // build macd series for signal EMA (lightweight)
            const slice = closes.slice(-Math.max(200, slow + signal + 5));
            const macdSeries = [];
            for (let i = slow; i < slice.length; i++) {
                const sub = slice.slice(0, i + 1);
                macdSeries.push(ema(sub, fast) - ema(sub, slow));
            }
            const sig = ema(macdSeries.slice(-signal - 10), signal);
            const hist = macd - sig;
            return { m: macd, s: sig, h: hist };
        }

        /* ---------- Optional: simulated alerts/whales (kept, but no longer moves price) ---------- */
        var UPCOMING=[];var _evtLF=0;
        async function fetchLiveEvents(){
          if(Date.now()-_evtLF<120000)return;_evtLF=Date.now();var ev=[];
          try{
            if(Z.tokens)for(var i=0;i<Z.tokens.length;i++){var t=Z.tokens[i];if(t.nw||t.st==='new')ev.push({s:t.s,n:t.n||t.s,c:t.c||'all',d:'⚡ Yeni Listeleme',tp:'listing',sort:1,sym:t.sym,detail:'Son 14 gün'});}
            var uH=new Date().getUTCHours(),uM=new Date().getUTCMinutes();var nF=uH<8?8:uH<16?16:24;var mF=(nF-uH)*60-uM;
            if(mF<=90){var ef=(Z.tokens||[]).filter(function(t){return Math.abs(t.fund||0)>=0.0004;}).sort(function(a,b){return Math.abs(b.fund||0)-Math.abs(a.fund||0);}).slice(0,5);
            for(var i=0;i<ef.length;i++){var e=ef[i],fr=(e.fund*100).toFixed(4);ev.push({s:e.s,n:e.fund<0?'🟢 Squeeze risk':'🔴 Squeeze risk',c:e.c||'all',d:mF+'dk settlement',tp:'funding',sort:0,sym:e.sym,detail:'Funding: '+fr+'%'});}}
            if(Z.tokens)for(var i=0;i<Z.tokens.length;i++){var t=Z.tokens[i];if(t.signal&&t.signal.confluence&&t.signal.confluence.level==='HIGH'){var cl2=t.signal.confluence.layers.filter(function(l){return l.score>15;}).map(function(l){return l.name;}).join(', ');ev.push({s:t.s,n:'💎 HIGH '+t.signal.confluence.agreeing+'/6',c:t.c||'all',d:t.signal.direction,tp:'confluence',sort:-1,sym:t.sym,detail:cl2});}}
            var sN=uH<8?'London':uH<14?'New York':'Asia';var nS=uH<8?8:uH<14?14:24;var mS=(nS-uH)*60-uM;
            if(mS<=60&&mS>0)ev.push({s:'🕐',n:sN+' açılışı',c:'all',d:mS+' dk',tp:'session',sort:-2,detail:'Seans geçişi'});
            var oiX=(Z.tokens||[]).filter(function(t){return(t.oi_delta||0)>8;}).sort(function(a,b){return(b.oi_delta||0)-(a.oi_delta||0);}).slice(0,3);
            for(var i=0;i<oiX.length;i++){var o=oiX[i];ev.push({s:o.s,n:'📊 OI +'+(o.oi_delta||0).toFixed(1)+'%',c:o.c||'all',d:'Pozisyon birikimi',tp:'oi',sort:2,sym:o.sym});}
          }catch(e){}
          ev.sort(function(a,b){return(a.sort||0)-(b.sort||0);});UPCOMING=ev;rUp();
        }
        setInterval(fetchLiveEvents,120000);setTimeout(fetchLiveEvents,8000);

        const AT = [
            { tp: 'listing', ti: 'New Listing', g: () => `${pick(UPCOMING).s}USDT Perp — listed on Binance Futures!` },
            { tp: 'ta', ti: 'RSI Alert', g: () => { const t = pick(Z.tokens); return `${t.s} RSI ${t.rsi > 70 ? 'overbought (' + t.rsi.toFixed(0) + ')' : 'oversold (' + t.rsi.toFixed(0) + ')'}` } },
            { tp: 'ta', ti: 'MACD Kesişimi', g: () => `${pick(Z.tokens).s}USDT Perp — MACD ${Math.random() > .5 ? 'yukarı' : 'aşağı'} kesişim` },
            { tp: 'social', ti: 'Sosyal Medya', g: () => `${pick(Z.tokens).s} Twitter etkileşimi %${RI(20, 200)} arttı` },
            { tp: 'volume', ti: 'Hacim Patlaması', g: () => `${pick(Z.tokens).s}USDT — %${RI(50, 500)} hacim artışı` },
            { tp: 'price', ti: 'New 24hr High', g: () => `${pick(Z.tokens).s}USDT Perp — New 24hr High` },
            { tp: 'ta', ti: 'FIB Testi', g: () => `${pick(Z.tokens).s} Fibonacci ${pick([0.236, 0.382, 0.5, 0.618, 0.786])} test` },
            { tp: 'ta', ti: 'GAP Tespit', g: () => `${pick(Z.tokens).s}USDT — %${R(1, 5).toFixed(1)} ${Math.random() > .5 ? 'yukarı' : 'aşağı'} GAP` },
        ];
        function mkAlert() {
            if (!Z.tokens.length) return;
            const a = pick(AT);
            const t = pick(Z.tokens);
            const ds = a.g();
            Z.alerts.unshift({
                id: Z.ai++,
                tp: a.tp,
                ti: a.ti,
                ds,
                tm: new Date(),
                ur: 1,
                sym: t.sym,
                reason: ds
            });
            if (Z.alerts.length > 80) Z.alerts.pop();
        }
        function mkWhale() { /* disabled: real whales via aggTrade */ }

        /* ---------- Render helpers (match your UI markup) ---------- */
        function rsiH(r) { return `<span class="rsi ${r > 70 ? 'rsi-o' : r < 30 ? 'rsi-u' : 'rsi-n'}">${isFinite(r) ? r.toFixed(1) : '--'}</span>` }
        function macdH(m) {
            if (!m) return `<span class="cr fw">--</span>`;
            return `<span class="${m.h >= 0 ? 'cg fw' : 'cr fw'}">${m.h >= 0 ? '↑' : '↓'} ${Math.abs(m.h).toFixed(3)}</span>`;
        }
        function fundH(f) {
            if (!isFinite(f)) return `<span class="fn">--</span>`;
            const v = f * 100;
            return `<span class="${v >= 0 ? 'fp' : 'fn'}">${v >= 0 ? '+' : ''}${v.toFixed(4)}%</span>`;
        }

        /* ---------- Social + Exchange helpers ---------- */
        const BINANCE_REF = 'CPA_00WPSCQYZA';
        const BINANCE_REF_ENTRY = 'https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00WPSCQYZA&utm_source=electron';

        /* Fill these later when you provide refs */
        const EXCHANGE_REF = {
            BINANCE: { trade: (sym) => `https://www.binance.com/en/futures/${sym}?ref=${BINANCE_REF}`, signup: BINANCE_REF_ENTRY },
            BYBIT: { trade: (sym) => `https://www.bybit.com/trade/usdt/${sym.replace('USDT', '') + 'USDT'}`, signup: '' },
            OKX: { trade: (sym) => `https://www.okx.com/trade-swap/${sym.replace('USDT', '').toLowerCase()}-usdt-swap`, signup: '' },
            KUCOIN: { trade: (sym) => `https://www.kucoin.com/futures/trade/${sym.replace('USDT', '') + 'USDTM'}`, signup: '' },
            GATE: { trade: (sym) => `https://www.gate.io/futures_trade/USDT/${sym.replace('USDT', '')}_USDT`, signup: '' },
            MEXC: { trade: (sym) => `https://www.mexc.com/futures/exchange/${sym}`, signup: '' },
        };

        function normExTag(x) {
            const u = String(x || '').toUpperCase();
            if (u === 'BNB' || u === 'BINANCE') return 'BINANCE';
            if (u === 'BYBIT') return 'BYBIT';
            if (u === 'OKX') return 'OKX';
            if (u === 'KUCOIN' || u === 'KUC') return 'KUCOIN';
            if (u === 'GATE' || u === 'GATEIO') return 'GATE';
            if (u === 'MEXC') return 'MEXC';
            return u || 'BINANCE';
        }

        function openExchange(tag, sym) {
            const ex = normExTag(tag);
            const cfg = EXCHANGE_REF[ex];
            if (!cfg) return;
            // Best conversion without breaking UX: open trade page in new tab; also open signup once per browser
            const tradeUrl = cfg.trade ? cfg.trade(sym) : null;
            if (tradeUrl) window.open(tradeUrl, '_blank', 'noopener');
            if (cfg.signup) {
                const k = `ref_once_${ex}`;
                if (!localStorage.getItem(k)) {
                    localStorage.setItem(k, '1');
                    // open signup in background tab (not redirect current page)
                    window.open(cfg.signup, '_blank', 'noopener');
                }
            }
        }

        /* Social cache (CoinGecko) */
        const CG = 'https://api.coingecko.com/api/v3';
        const socCache = new Map(); // sym -> {ts,data}
        let socQueue = [];
        let socBusy = false;

        function socialH(t) {
            const s = t?.s;
            if (!s) return `<span style="color:var(--t4)">—</span>`;
            const c = socCache.get(s);
            if (c && c.data) {
                if (c.data === 'fallback') {
                    const score = Math.floor(Math.abs(t.ch || 0) * 5 + (t.vol > 1e7 ? 20 : 5));
                    return `<span class="sv">${score}</span>`;
                }
                const d = c.data;
                const tw = d.twitter_followers || 0;
                const rd = d.reddit_subscribers || 0;
                const score = Math.round(Math.log10(1 + tw) * 12 + Math.log10(1 + rd) * 8);
                return `<span class="sv">${score}</span>`;
            }
            // enqueue fetch for visible tokens
            enqueueSocial(s);
            return `<span style="color:var(--t4)">…</span>`;
        }

        function enqueueSocial(sym) {
            if (socCache.get(sym)?.data) return;
            if (socQueue.includes(sym)) return;
            socQueue.push(sym);
        }

        async function pumpSocial() {
            if (socBusy) return;
            socBusy = true;
            try {
                while (socQueue.length) {
                    const sym = socQueue.shift();
                    // localStorage cache 24h
                    const lsKey = `soc_${sym}`;
                    try {
                        const raw = localStorage.getItem(lsKey);
                        if (raw) {
                            const j = JSON.parse(raw);
                            if (j && j.ts && (Date.now() - j.ts) < 24 * 3600 * 1000) {
                                socCache.set(sym, { ts: j.ts, data: j.data });
                                continue;
                            }
                        }
                    } catch { }
                    // search
                    const q = encodeURIComponent(sym);
                    const sr = await fetch(`${CG}/search?query=${q}`, { cache: 'no-store' });
                    const sj = await sr.json();
                    const coin = (sj.coins || []).find(x => String(x.symbol || '').toUpperCase() === sym) || (sj.coins || [])[0];
                    if (!coin) { socCache.set(sym, { ts: Date.now(), data: null }); continue; }
                    const id = coin.id;
                    const cr = await fetch(`${CG}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false&sparkline=false`, { cache: 'no-store' });
                    const cj = await cr.json();
                    const data = (cj && cj.community_data) ? cj.community_data : null;
                    socCache.set(sym, { ts: Date.now(), data });
                    try { localStorage.setItem(lsKey, JSON.stringify({ ts: Date.now(), data })); } catch { }
                    await new Promise(r => setTimeout(r, 1200)); // rate-limit friendly
                }
            } catch (e) {
                // rate limit fallback
                if (socQueue.length > 0) {
                    const sym = socQueue.shift();
                    socCache.set(sym, { ts: Date.now(), data: 'fallback' });
                }
            } finally {
                socBusy = false;
            }
        }
        setInterval(pumpSocial, 2500);

        /* ---------- Binance ratios (Long/Short + Taker Buy/Sell) ---------- */
        const FAPI = 'https://fapi.binance.com';
        const ratioCache = new Map(); // sym -> {ts, ls, bs}

        async function fetchRatios(sym, period = '15m') {
            const key = `${sym}_${period}`;
            const cached = ratioCache.get(key);
            if (cached && (Date.now() - cached.ts) < 60_000) return cached;

            const out = { ts: Date.now(), ls: null, bs: null };
            try {
                const urlLS = `${FAPI}/futures/data/globalLongShortAccountRatio?symbol=${sym}&period=${period}&limit=1`;
                const r1 = await fetch(urlLS, { cache: 'no-store' });
                const j1 = await r1.json();
                const x = Array.isArray(j1) ? j1[0] : null;
                if (x) {
                    const longP = Number(x.longAccount);
                    const shortP = Number(x.shortAccount);
                    if (isFinite(longP) && isFinite(shortP)) {
                        out.ls = { long: longP * 100, short: shortP * 100, ratio: Number(x.longShortRatio) };
                    }
                }
            } catch { }
            try {
                const urlBS = `${FAPI}/futures/data/takerlongshortRatio?symbol=${sym}&period=${period}&limit=1`;
                const r2 = await fetch(urlBS, { cache: 'no-store' });
                const j2 = await r2.json();
                const x2 = Array.isArray(j2) ? j2[0] : null;
                if (x2) {
                    const buy = Number(x2.buyVol);
                    const sell = Number(x2.sellVol);
                    if (isFinite(buy) && isFinite(sell)) {
                        const tot = buy + sell || 1;
                        out.bs = { buy: buy / tot * 100, sell: sell / tot * 100, ratio: (buy / (sell || 1)) };
                    }
                }
            } catch { }
            ratioCache.set(key, out);
            return out;
        }

        /* ---------- Whale stream (aggTrade all symbols) ---------- */
        Z.wsAgg = null;
        Z.whaleSymCount = new Map(); // sym->count recent
        function whaleThresholdUSD(t) {
            // dynamic threshold: keep variety and avoid only BTC/ETH
            const base = 50_000;
            const cap = 250_000;
            const v = Number(t?.vol) || 0;
            const dyn = v > 0 ? v * 0.00003 : 0; // 0.003% of 24h quote volume
            return clamp(Math.max(base, dyn), base, cap);
        }

        function connectAggWS() {
            // !aggTrade@arr does NOT exist on Binance — use per-symbol streams for top 40 coins
            try { if (Z.wsAgg) Z.wsAgg.close(); } catch { }
            Z.wsAgg = null;

            const topSyms = Z.tokens.slice().filter(t => t.vol > 0)
                .sort((a, b) => (b.vol || 0) - (a.vol || 0)).slice(0, 40).map(t => t.sym.toLowerCase());
            if (!topSyms.length) return;

            const streams = topSyms.map(s => `${s}@aggTrade`).join('/');
            const ws = new WebSocket(apiBase().WS + streams);
            Z.wsAgg = ws;
            ws.onclose = () => setTimeout(connectAggWS, 3000);
            ws.onerror = () => { };
            ws.onmessage = (ev) => {
                let msg; try { msg = JSON.parse(ev.data); } catch { return; }
                const data = msg.data;
                if (!data || !data.s) return;
                const sym = data.s;
                const t = Z.bySym.get(sym);
                if (!t) return;
                const p = Number(data.p), q = Number(data.q);
                if (!isFinite(p) || !isFinite(q)) return;
                const usd = p * q;
                const th = whaleThresholdUSD(t);
                if (usd < th) return;
                const cur = Z.whaleSymCount.get(sym) || 0;
                if (cur >= 4 && !['BTCUSDT', 'ETHUSDT'].includes(sym)) return;
                Z.whaleSymCount.set(sym, cur + 1);
                setTimeout(() => Z.whaleSymCount.set(sym, Math.max(0, (Z.whaleSymCount.get(sym) || 1) - 1)), 60000);
                const side = data.m ? 'sell' : 'buy';
                t.wh = t.wh || { on: 0 }; t.wh.on = 1; t.wh.last = Date.now();
                Z.wv = (Z.wv || 0) + usd;
                Z.whales.unshift({ id: Z.wi++, s: t.s, sym, side, usd, px: p, qty: q, aggId: data.a, tm: new Date(), from: 'Binance', to: 'Binance' });
                if (Z.whales.length > 120) Z.whales.pop();
                Z.alerts.unshift({
                    id: Z.ai++, tp: 'whale', ti: 'Whale Trade',
                    ds: `${t.s}USDT • ${side.toUpperCase()} • $${fmt(usd, 2)} @ $${fp(p)}`,
                    tm: new Date(), ur: 1, sym,
                    reason: `Balina: ${side.toUpperCase()} $${fmt(usd, 2)} Qty ${q.toFixed(4)} @ $${fp(p)} AggTrade #${data.a}`
                });
                if (Z.alerts.length > 80) Z.alerts.pop();
            };
        }
        setInterval(() => { if (Z.tokens.length > 0) connectAggWS(); }, 300000);
        function fibH(t) {
            // Simplified level until swing calc is wired
            const lvl = (t && isFinite(t.fib)) ? t.fib : 0.618;
            return `<span class="fib">${lvl.toFixed(3)}</span>`;
        }
        function gapH(t) {
            if (!t || !t.gap) return `<span style="color:var(--t4)">—</span>`;
            const up = t.gap.t === 'up';
            return `<span class="${up ? 'cg fw' : 'cr fw'}">${up ? '↑' : '↓'} ${t.gap.p.toFixed(1)}%</span>`;
        }
        function whaleTagH(t) {
            if (!t) return '';
            return t.wh && t.wh.on ? `<span class="tg tg-wh">WHALE</span>` : `<span style="color:var(--t4)">—</span>`;
        }
        function sparkH(t) {
            const pts = (t && t.pts && t.pts.length) ? t.pts : [0, 0, 0, 0, 0];
            const mn = Math.min(...pts), mx = Math.max(...pts);
            const w = 54, h = 16, pad = 1;
            const norm = v => mx === mn ? h / 2 : (h - pad) - ((v - mn) / (mx - mn)) * (h - 2 * pad);
            const step = (w - 2 * pad) / (pts.length - 1);
            let d = '';
            pts.forEach((v, i) => {
                const x = pad + i * step;
                const y = norm(v);
                d += (i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`);
            });
            const c = (t && isFinite(t.ch) && t.ch >= 0) ? 'var(--green)' : 'var(--red)';
            return `<div class="spk"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <path d="${d}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg></div>`;
        }

        /* ---------- Table / side panels render (lightweight) ---------- */
        function rTbl() {
            const q = (Z.q || '').trim().toUpperCase();

            // TRADES view: show recent whale aggTrades (keeps same table skeleton)
            if (Z.view === 'trades') {
                const rows = (Z.whales || []).slice(0, 200);
                const tbl = document.getElementById('tbl');
                tbl.innerHTML = rows.map(w => {
                    const sym = (w.s || '') + 'USDT';
                    const sideCls = w.side === 'buy' ? 'cg fw' : 'cr fw';
                    const sideLbl = w.side.toUpperCase();
                    const time = `${String(w.tm.getHours()).padStart(2, '0')}:${String(w.tm.getMinutes()).padStart(2, '0')}:${String(w.tm.getSeconds()).padStart(2, '0')}`;
                    return `<tr class="rw">
        <td></td>
        <td><div class="sc"><div class="si2" style="background:var(--whale)">🐋</div><div><div class="sn">${sym}</div><div class="sv">AggTrade #${w.aid || ''} • Qty ${w.qty ? w.qty.toFixed(3) : '--'}</div></div></div></td>
        <td class="fw">$${fp(w.px)}</td>
        <td class="${sideCls}">${sideLbl}</td>
        <td>${time}</td>
        <td><span class="fp">+$${fmt(w.usd, 2)}</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span class="tg tg-wh">WHALE</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><div class="exs"><span class="ex bn">BNB</span></div></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span style="color:var(--t4)">—</span></td>
        <td><span style="color:var(--t4)">—</span></td>
      </tr>`;
                }).join('');
                return;
            }

            let arr = Z.tokens;

            // search
            if (q) arr = arr.filter(t => (t.s || '').includes(q) || (t.n || '').toUpperCase().includes(q));

            // category
            if (Z.cat && Z.cat !== 'all') {
                if (Z.cat === 'new') arr = arr.filter(t => t.nw || t.st === 'new');
                else if (Z.cat === 'premarket') arr = arr.filter(t => t.nw || (t.listedAgeDays != null && t.listedAgeDays <= 30));
                else if (Z.cat === 'alpha') arr = arr.slice().sort((a, b) => Math.abs(b.ch || 0) - Math.abs(a.ch || 0)).slice(0, 120);
                else if (Z.cat === 'usdc') arr = arr.filter(t => String(t.sym || '').endsWith('USDC'));
                else arr = arr.filter(t => t.c === Z.cat);
            }

            // signal filters
            if (Z.sig) {
                if (Z.sig === 'rsiob') arr = arr.filter(t => t.rsi > 70);
                if (Z.sig === 'rsios') arr = arr.filter(t => t.rsi < 30);
                if (Z.sig === 'macdup') arr = arr.filter(t => t.macd && t.macd.h > 0);
                if (Z.sig === 'macddn') arr = arr.filter(t => t.macd && t.macd.h < 0);
                if (Z.sig === 'gap') arr = arr.filter(t => !!t.gap);
                if (Z.sig === 'fib') arr = arr.filter(t => Math.abs((t.fib || 0.618) - 0.618) < 0.001);
                if (Z.sig === 'whale') arr = arr.filter(t => t.wh && t.wh.on);
            }

            // movers
            if (Z.mv && Z.mv !== 'all') {
                if (Z.mv === 'rise') arr = arr.filter(t => t.ch > 0).sort((a, b) => b.ch - a.ch);
                if (Z.mv === 'fall') arr = arr.filter(t => t.ch < 0).sort((a, b) => a.ch - b.ch);
                if (Z.mv === 'volup') arr = arr.sort((a, b) => b.vol - a.vol);
                if (Z.mv === 'voldn') arr = arr.sort((a, b) => a.vol - b.vol);
                if (Z.mv === 'whale') arr = arr.filter(t => t.wh && t.wh.on);
                if (Z.mv === 'newhigh') arr = arr.filter(t => t.hi && t.price >= t.hi);
                if (Z.mv === 'newlow') arr = arr.filter(t => t.lo && t.price <= t.lo);
                if (Z.mv === 'pullback') arr = arr.filter(t => t.ch > 0 && t.rsi < 55);
                if (Z.mv === 'rally') arr = arr.filter(t => t.ch > 0 && t.rsi > 55);
            }

            // ═══ PROPTREX FILTERS (direct inject, no IIFE dependency) ═══
            if (typeof Z.proptrex === 'object' && Z.proptrex.filters) {
                var pf = Z.proptrex.filters;
                if (pf.onlyLong) arr = arr.filter(function(t){ return t.signal && t.signal.direction === 'LONG'; });
                if (pf.onlyShort) arr = arr.filter(function(t){ return t.signal && t.signal.direction === 'SHORT'; });
                if (pf.squeeze) arr = arr.filter(function(t){ return t.signal && t.signal.confluence && t.signal.confluence.layers && t.signal.confluence.layers.some(function(l){ return l.name === 'FUND_OI' && l.score > 25; }); });
                if (pf.leadLag) arr = arr.filter(function(t){ return t.signal && t.signal.confluence && t.signal.confluence.layers && t.signal.confluence.layers.some(function(l){ return l.name === 'LEAD_LAG' && l.score > 25; }); });
                if (pf.highConf) arr = arr.filter(function(t){ return t.signal && t.signal.confluence && t.signal.confluence.agreeing >= 3; });
                if (pf.onlyPriority) arr = arr.filter(function(t){ return t.signal && (t.signal.state === 'PRIORITY' || t.signal.state === 'EXECUTION'); });
                if (pf.nearEntry) arr = arr.filter(function(t){ return t.signal && t.signal.entry_distance_pct <= 1.25; });
                if (pf.whaleAligned) arr = arr.filter(function(t){ return t.signal && t.signal.whale_score >= 45; });
            }

            // GROUPED sort: EXECUTION → PRIORITY → TRADEABLE → WATCHLIST → no signal
            var _stateRank = { EXECUTION: 50, PRIORITY: 40, TRADEABLE: 30, WATCHLIST: 20, COOLDOWN: 10, INVALIDATED: 5 };
            arr = arr.slice().sort((a, b) => {
                var sa = a.signal, sb = b.signal;
                var ga = sa ? (_stateRank[sa.state] || 15) : 0;
                var gb = sb ? (_stateRank[sb.state] || 15) : 0;
                if (ga !== gb) return gb - ga; // group by state first
                if (sa && sb) return (sb.panel_rank_score || 0) - (sa.panel_rank_score || 0);
                return (b.vol || 0) - (a.vol || 0);
            }).slice(0, 250);

            function _sigAge(sig) {
                if (!sig || !sig.created_at) return '';
                var ms = Date.now() - sig.created_at;
                var m = Math.floor(ms / 60000), h2 = Math.floor(m / 60);
                if (h2 > 0) return h2 + 'h ' + (m % 60) + 'm';
                return m + 'm';
            }
            function _sigChBadge(sig) {
                if (!sig) return '';
                var chNow = (sig.__token && sig.__token.ch || 0);
                var chAt = sig.ch_at_signal || 0;
                var progress = chNow - chAt;
                var cls = progress >= 0 ? 'cg' : 'cr';
                return '<span style="font-size:9px" class="' + cls + '">' + (progress >= 0 ? '+' : '') + progress.toFixed(1) + '%</span>';
            }
            var _prevState = '', _stateColors = {EXECUTION:'#16a34a',PRIORITY:'#7c3aed',TRADEABLE:'#2563eb',WATCHLIST:'#64748b',COOLDOWN:'#f59e0b',INVALIDATED:'#ef4444'};
            const h = arr.map(t => {
                var _sig = t.signal;
                var _grp = _sig ? (_sig.state || 'WATCHLIST') : 'NO_SIGNAL';
                var _grpHdr = '';
                if (_grp !== _prevState && _grp !== 'NO_SIGNAL') {
                    _prevState = _grp;
                    var _gc = _stateColors[_grp] || '#64748b';
                    _grpHdr = '<tr><td colspan="19" style="padding:6px 16px;font-size:11px;font-weight:800;font-family:monospace;letter-spacing:1px;color:'+_gc+';background:rgba(0,0,0,.03);border-bottom:2px solid '+_gc+'40;text-transform:uppercase">'+_grp+'</td></tr>';
                }
                const ch = isFinite(t.ch) ? t.ch : 0;
                const chCls = ch >= 0 ? 'cg' : 'cr';
                const sym = t.s || '';
                const nm = t.n || sym;
                const vol = isFinite(t.vol) ? t.vol : 0;
                const fav = Z.fav.has(t.sym) ? 'fv' : '';
                const ic = t.clr || '#888';

                return _grpHdr + `<tr data-sym="${t.sym}" class="${t.wh && t.wh.on ? 'rw' : ''} ${Z.sel === t.sym ? 'sel' : ''}">
      <td><span class="star ${fav}" data-fav="${t.sym}">★</span></td>
      <td>
        <div class="sc">
          <div class="si2" style="background:${ic}">${sym.slice(0, 2)}</div>
          <div>
            <div class="sn">${sym}<span class="sv">USDT</span></div>
            <div class="sv">$${fmt(vol, 2)} Vol</div>
          </div>
        </div>
      </td>
      <td class="fw">$${fp(t.price)}</td>
      <td class="${chCls} fw">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</td>
      <td>$${fmt(t.mcap || 0, 2)}</td>
      <td>${fundH(t.fund)}</td>
      <td>${rsiH(t.rsi)}</td>
      <td>${macdH(t.macd)}</td>
      <td>${oiDeltaH(t)}</td>
      <td>${sqzH(t)}</td>
      <td>${trapH(t)}</td>
      <td>${regimeH(t)}</td>
      <td>${fibH(t)}</td>
      <td>${gapH(t)}</td>
      <td>${whaleTagH(t)}</td>
      <td>${socialH(t)}</td>
      <td><div class="exs">${(t.ex || ['BNB']).map(x => `<span class=\"ex ${x === 'BNB' ? 'bn' : ''}\" data-ex=\"${x}\" data-sym=\"${t.sym}\">${x}</span>`).join('')}</div></td>
      <td>${catH(t.c)}</td>
      <td><span class="sv">${t.fl || '--'}</span></td>
      <td>${sparkH(t)}</td>
    </tr>`;
            }).join('');

            const tbl = document.getElementById('tbl');
            tbl.innerHTML = h;


            // bind row click -> drawer
            tbl.querySelectorAll('tr[data-sym]').forEach(tr => {
                tr.addEventListener('click', () => {
                    const sym = tr.getAttribute('data-sym');
                    if (sym) openToken(sym);
                }, { passive: true });
            });

            // bind exchange tags
            tbl.querySelectorAll('[data-ex][data-sym]').forEach(x => {
                x.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const ex = x.getAttribute('data-ex');
                    const sym = x.getAttribute('data-sym');
                    openExchange(ex, sym);
                }, { passive: true });
            });

            // bind fav stars
            tbl.querySelectorAll('[data-fav]').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const s = el.getAttribute('data-fav');
                    if (Z.fav.has(s)) Z.fav.delete(s); else Z.fav.add(s);
                    rTbl();
                }, { passive: true });
            });
        }

        /* ---------- Table row click (open drawer) ---------- */
        (function bindTableRowClick() {
            const tbody = el('tbl');
            if (!tbody) return;
            tbody.addEventListener('click', (e) => {
                const tr = e.target?.closest?.('tr[data-sym]');
                if (!tr) return;
                // ignore star clicks handled separately
                if (e.target?.closest?.('.star')) return;
                const sym = tr.getAttribute('data-sym');
                if (sym) openToken(sym);
            }, { passive: true });
        })();

        function rAl() {
            const el = document.getElementById('aList');
            document.getElementById('aCn').textContent = Z.alerts.length;
            el.innerHTML = Z.alerts.slice(0, 60).map(a => {
                const c = a.tp;
                return `<div class="ai ${a.ur ? 'ur' : ''}" data-aid="${a.id}" data-sym="${a.sym || ''}" data-reason="${String(a.reason || '').replace(/"/g, '&quot;')}" role="button" tabindex="0">
      <div class="ab ${c}"></div>
      <div class="ac">
        <div class="at">${a.ti}</div>
        <div class="ad">${a.ds}</div>
      </div>
      <div class="atm">${String(a.tm.getHours()).padStart(2, '0')}:${String(a.tm.getMinutes()).padStart(2, '0')}</div>
    </div>`;
            }).join('');
            el.querySelectorAll('.ai[data-aid]').forEach(it => {
                it.addEventListener('click', () => {
                    const sym = it.getAttribute('data-sym');
                    const reason = it.getAttribute('data-reason') || '';
                    if (sym) openToken(sym, { sub: `Futures: ${sym} • uyarı`, reason });
                }, { passive: true });
            });
            el.querySelectorAll('.ai[data-sym]').forEach(it => {
                it.addEventListener('click', () => {
                    const sym = it.getAttribute('data-sym');
                    const reason = it.getAttribute('data-reason') || '';
                    if (sym) openToken(sym, { sub: `Futures: ${sym} • alert`, reason });
                }, { passive: true });
            });
        }

        function rWh() {
            const el = document.getElementById('wList');
            document.getElementById('wCn').textContent = Z.whales.length;
            el.innerHTML = Z.whales.slice(0, 60).map(w => {
                const side = w.side;
                const sideLbl = side === 'buy' ? '<span class="buy">BUY</span>' : side === 'sell' ? '<span class="sell">SELL</span>' : '<span class="transfer">MOVE</span>';
                return `<div class="wi" data-sym="${w.sym}">
      <div class="wic">🐋</div>
      <div class="wii">
        <div class="wa">${w.s} ${sideLbl}</div>
        <div class="wd">${w.from} → ${w.to} @ $${fp(w.px)}</div>
      </div>
      <div style="text-align:right">
        <div class="wam">$${fmt(w.usd, 2)}</div>
        <div class="wtm">${String(w.tm.getHours()).padStart(2, '0')}:${String(w.tm.getMinutes()).padStart(2, '0')}</div>
      </div>
    </div>`;
            }).join('');
            el.querySelectorAll('.wi[data-sym]').forEach(it => {
                it.addEventListener('click', () => {
                    const sym = it.getAttribute('data-sym');
                    if (sym) openToken(sym, { sub: `Futures: ${sym} • whale`, reason: `Balina akışı kaydı.` });
                }, { passive: true });
            });
        }

        function rUp() {
            var el=document.getElementById('upList');if(!el)return;
            if(!UPCOMING.length){el.innerHTML='<div style="padding:8px;color:var(--t3);font-size:11px">Veri yükleniyor...</div>';return;}
            var tc={confluence:'var(--green)',funding:'var(--orange)',listing:'var(--blue)',session:'var(--yellow)',oi:'var(--purple)'};
            el.innerHTML=UPCOMING.slice(0,12).map(function(u){
              var bc=tc[u.tp]||'var(--border)';var ca=u.sym?' style="cursor:pointer" data-evt-sym="'+(u.sym||'')+'"':'';
              return '<div class="ui"'+ca+' style="border-left:3px solid '+bc+';padding-left:8px;margin-bottom:4px">'+'<div><span class="us">'+(u.s||'')+'</span> <span class="un">'+(u.n||'')+'</span></div>'+'<div style="display:flex;justify-content:space-between"><div class="ud" style="font-size:10px">'+(u.d||'')+'</div>'+(u.detail?'<div style="font-size:9px;color:var(--t3)">'+u.detail+'</div>':'')+'</div></div>';
            }).join('');
            var ec=document.getElementById('evtCn');if(ec)ec.textContent=UPCOMING.length;
            el.querySelectorAll('[data-evt-sym]').forEach(function(nd){nd.addEventListener('click',function(){openToken(nd.getAttribute('data-evt-sym'));});});
        }

        function rBtk() {
            const eln = document.getElementById('bTick');
            if (!eln) return;

            // Build HOT DEALS from REAL data: whale events + top movers by momentum score
            const recentWhales = Z.whales.slice(0, 8).map(w => {
                const t = Z.bySym.get(w.sym);
                const ch = t ? (t.ch || 0) : 0;
                const c = w.side === 'buy' ? 'var(--green)' : 'var(--red)';
                return {
                    key: `W:${w.sym}:${w.id}`,
                    sym: w.sym,
                    label: `🐋 ${w.s}`,
                    mid: `${w.side === 'buy' ? 'BUY' : 'SELL'} $${fmt(w.usd, 1)}`,
                    tail: `@ $${fp(w.px)}`,
                    color: c
                };
            });

            // Top movers: sort by absolute change * volume weight
            const movers = Z.tokens
                .slice()
                .filter(t => isFinite(t.price) && t.price > 0 && isFinite(t.ch))
                .sort((a, b) => (Math.abs(b.ch || 0) * Math.log10((b.vol || 1) + 10)) - (Math.abs(a.ch || 0) * Math.log10((a.vol || 1) + 10)))
                .slice(0, 20)
                .map(t => {
                    const c = (t.ch || 0) >= 0 ? 'var(--green)' : 'var(--red)';
                    const tag = Math.abs(t.ch) > 8 ? '🔥' : Math.abs(t.ch) > 4 ? '⚡' : '';
                    return {
                        key: `M:${t.sym}`,
                        sym: t.sym,
                        label: `${tag}${t.s}`,
                        mid: `${(t.ch || 0) >= 0 ? '+' : ''}${(t.ch || 0).toFixed(2)}%`,
                        tail: `$${fp(t.price)}`,
                        color: c
                    };
                });

            // Funding extremes
            const fundExtremes = Z.tokens
                .filter(t => isFinite(t.fund) && Math.abs(t.fund) > 0.0005)
                .sort((a, b) => Math.abs(b.fund) - Math.abs(a.fund))
                .slice(0, 5)
                .map(t => ({
                    key: `F:${t.sym}`,
                    sym: t.sym,
                    label: `💰 ${t.s}`,
                    mid: `Fund ${(t.fund * 100).toFixed(3)}%`,
                    tail: `$${fp(t.price)}`,
                    color: t.fund > 0 ? 'var(--red)' : 'var(--green)'
                }));

            const items = [...recentWhales, ...fundExtremes, ...movers].slice(0, 30);

            const key = items.map(x => x.key).join('|');
            if (Z.tickKey === key) return;
            Z.tickKey = key;

            const html1 = items.map(it => {
                return `<div class="bi" data-sym="${it.sym}">
      <span class="bs">${it.label}</span>
      <span style="color:${it.color}" class="bm">${it.mid}</span>
      <span class="bp">${it.tail}</span>
    </div>`;
            }).join('');

            // Hot Deals label + seamless marquee
            eln.innerHTML = `<div class="btk-label">${L.hotDeals}</div><div class="trk">${html1}${html1}</div>`;

            requestAnimationFrame(() => {
                const trk = eln.querySelector('.trk');
                if (!trk) return;
                eln.classList.toggle('marquee', trk.scrollWidth > eln.clientWidth + 40);
            });
        }

        function rHdr() {
            document.getElementById('clk').textContent = ts();
            document.getElementById('xScan').textContent = Z.tokens.length;
            document.getElementById('xAlert').textContent = Z.alerts.length;
            document.getElementById('xNew').textContent = Z.tokens.filter(t => t.nw || t.st === 'new').length;
            document.getElementById('xWh').textContent = Z.whales.length;
            document.getElementById('whN').textContent = Z.whales.filter(w => Date.now() - w.tm.getTime() < 6e4).length;
            document.getElementById('alBdg').textContent = Z.alerts.filter(a => a.ur).length;

            const btc = Z.bySym.get('BTCUSDT');
            const eth = Z.bySym.get('ETHUSDT');
            const bnb = Z.bySym.get('BNBUSDT');

            if (btc) document.getElementById('tBtc').textContent = '$' + btc.price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            if (eth) document.getElementById('tEth').textContent = '$' + eth.price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            if (bnb) document.getElementById('tBnb').textContent = '$' + bnb.price.toFixed(2);

            const mc = Z.tokens.reduce((s, t) => s + (t.mcap || 0), 0);
            document.getElementById('tMcap').textContent = fmt(mc, 1);
            document.getElementById('tDom').textContent = (mc > 0 && btc ? ((btc.mcap || 0) / mc * 100).toFixed(1) : '--') + '%';
            document.getElementById('tFg').textContent = Z.fg;
            document.getElementById('tWv').textContent = '$' + fmt(Z.wv || 0, 1);
        }

        /* ---------- Events (keep your UI behavior) ---------- */
        document.querySelectorAll('.ct').forEach(b => b.addEventListener('click', () => {
            document.querySelectorAll('.ct').forEach(x => x.classList.remove('on'));
            b.classList.add('on');
            Z.cat = b.dataset.c;
            rTbl();
        }, { passive: true }));

        document.querySelectorAll('.mb').forEach(b => b.addEventListener('click', () => {
            document.querySelectorAll('.mb').forEach(x => x.classList.remove('on'));
            b.classList.add('on');
            Z.mv = b.dataset.m;
            rTbl();
        }, { passive: true }));

        document.querySelectorAll('.sb').forEach(b => b.addEventListener('click', () => {
            const was = b.classList.contains('on');
            document.querySelectorAll('.sb').forEach(x => x.classList.remove('on'));
            if (!was) { b.classList.add('on'); Z.sig = b.dataset.s; } else { Z.sig = null; }
            rTbl();
        }, { passive: true }));

        document.querySelectorAll('.tb').forEach(b => b.addEventListener('click', () => {
            document.querySelectorAll('.tb').forEach(x => x.classList.remove('on'));
            b.classList.add('on');
            const tb = b.dataset.tb || null;
            Z.tb = tb;

            if (tb === 'bot') {
                Z.view = 'bot';
                toggleBotMode();
                renderBotPanel();
                return;
            }

            if (tb === 'top_24h_gainers') {
                Z.view = 'top_24h_gainers';
            } else {
                if (tb === 'usdm') {
                    if (Z.market !== 'usdm') { Z.market = 'usdm'; hardResetMarket(); }
                    Z.view = 'movers';
                } else if (tb === 'coinm') {
                    if (Z.market !== 'coinm') { Z.market = 'coinm'; hardResetMarket(); }
                    Z.view = 'movers';
                } else if (tb === 'movers') {
                    Z.view = 'movers';
                } else if (tb === 'trades') {
                    Z.view = 'trades';
                }
            }

            if (tb === 'fav') { Z.mv = 'all'; Z.sig = null; }

            toggleBotMode();
            rTbl();
        }, { passive: true }));

        /* ═══════════════════════════════════════════════════════════
           PROPTREX V2 ENGINE — OI / Regime / Squeeze / Trap / Fusion
           ═══════════════════════════════════════════════════════════ */

        /* --- OI Delta Engine --- */
        Z.oiCache = new Map();
        Z.oiLastFetch = 0;

        async function fetchOIBatch() {
            if (Date.now() - Z.oiLastFetch < 60000) return;
            Z.oiLastFetch = Date.now();
            try {
                const top = Z.tokens.slice().sort((a, b) => (b.vol || 0) - (a.vol || 0)).slice(0, 40);
                for (const t of top) {
                    try {
                        const d = await fetchJSON(apiBase().REST + '/fapi/v1/openInterest?symbol=' + t.sym);
                        const oi = Number(d.openInterest);
                        if (!isFinite(oi)) continue;
                        const prev = Z.oiCache.get(t.sym);
                        const prevOI = prev ? prev.current : oi;
                        const delta = prevOI > 0 ? ((oi - prevOI) / prevOI * 100) : 0;
                        const prevDelta = prev ? prev.delta : 0;
                        Z.oiCache.set(t.sym, { prev: prevOI, current: oi, delta, accel: delta - prevDelta, ts: Date.now() });
                        t.oi_delta = delta; t.oi_accel = delta - prevDelta; t.oi_val = oi;
                    } catch { }
                    await new Promise(r => setTimeout(r, 120));
                }
            } catch (e) { console.warn('OI batch:', e); }
        }

        /* --- Funding Deviation Engine --- */
        Z.fundHist = new Map();
        function updateFundingDev(t) {
            if (!isFinite(t.fund)) return;
            let h = Z.fundHist.get(t.sym);
            if (!h) { h = []; Z.fundHist.set(t.sym, h); }
            h.push(t.fund);
            if (h.length > 168) h.shift();
            const avg = h.reduce((s, v) => s + v, 0) / h.length;
            const std = Math.sqrt(h.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / h.length) || 0.0001;
            t.fund_dev = t.fund - avg;
            t.fund_zscore = (t.fund - avg) / std;
        }

        /* --- Volatility Regime Engine --- */
        function calcATR(hist, period) {
            if (!hist || hist.length < period + 1) return NaN;
            const s = hist.slice(-period - 1);
            let sum = 0;
            for (let i = 1; i < s.length; i++) sum += Math.abs(s[i] - s[i - 1]);
            return sum / period;
        }
        function detectRegime(t) {
            const a14 = calcATR(t.hist, 14), a100 = calcATR(t.hist, 100);
            if (!isFinite(a14) || !isFinite(a100) || a100 === 0) { t.regime = 'NORMAL'; t.atr_ratio = 1; return; }
            t.atr_ratio = a14 / a100;
            t.regime = t.atr_ratio < 0.7 ? 'COMPRESS' : t.atr_ratio > 1.3 ? 'EXPAND' : 'NORMAL';
        }

        /* --- Squeeze Probability Engine --- */
        function calcSqueeze(t) {
            let s = 0;
            if (isFinite(t.fund) && t.fund < -0.0001) s += 25;
            if (isFinite(t.fund) && t.fund < -0.0005) s += 15;
            if (t.oi_delta > 2) s += 20;
            if (t.oi_delta > 5) s += 10;
            if (Math.abs(t.ch || 0) < 1.5) s += 15;
            if (t.regime === 'COMPRESS') s += 15;
            if (isFinite(t.fund_zscore) && Math.abs(t.fund_zscore) > 2) s += 10;
            t.sqz = clamp(s, 0, 100);
        }

        /* --- Trap Risk Engine --- */
        function calcTrap(t) {
            let s = 0;
            if (t.oi_delta > 8) s += 20;
            if (t.oi_accel > 3) s += 15;
            if (isFinite(t.fund_zscore) && Math.abs(t.fund_zscore) > 1.5) s += 20;
            if (isFinite(t.fund) && Math.abs(t.fund) > 0.001) s += 10;
            if (t.regime === 'COMPRESS') s += 15;
            if (isFinite(t.rsi) && (t.rsi > 75 || t.rsi < 25)) s += 15;
            if (t.vol > 0 && Math.abs(t.ch || 0) > 5) s += 10;
            t.trap = clamp(s, 0, 100);
        }

        /* --- DIP Score v2 Engine --- */
        function calcDipV2(t) {
            let rsi_w = 0, fund_w = 0, oi_w = 0, liq_w = 0, whale_w = 0, reg_w = 0;
            if (isFinite(t.rsi)) {
                if (t.rsi < 30) rsi_w = 20; else if (t.rsi < 40) rsi_w = 15; else if (t.rsi < 50) rsi_w = 8; else if (t.rsi > 70) rsi_w = 2; else rsi_w = 5;
            }
            if (isFinite(t.fund)) {
                if (t.fund < -0.001) fund_w = 20; else if (t.fund < -0.0003) fund_w = 14; else if (t.fund < 0) fund_w = 8; else fund_w = 3;
            }
            if (isFinite(t.oi_delta)) {
                if (t.oi_delta < -5) oi_w = 18; else if (t.oi_delta < -2) oi_w = 12; else if (t.oi_delta > 5) oi_w = 4; else oi_w = 8;
            }
            liq_w = Math.min(20, (t.trap || 0) * 0.2);
            if (t.wh && t.wh.on) whale_w = 15;
            const rw = Z.whales.filter(w => w.sym === t.sym && Date.now() - w.tm.getTime() < 300000);
            whale_w += Math.min(5, rw.length * 2);
            if (t.regime === 'COMPRESS') reg_w = 15; else if (t.regime === 'EXPAND') reg_w = 5; else reg_w = 10;
            t.dip_v2 = clamp(Math.round(rsi_w + fund_w + oi_w + liq_w + whale_w + reg_w), 0, 100);
            t.dip_breakdown = { rsi: rsi_w, fund: fund_w, oi: oi_w, liq: liq_w, whale: whale_w, regime: reg_w };
        }

        /* --- Confidence Model --- */
        function calcConfidence(t) {
            let trend = 0, mtf = 0, regime = 0, vol = 0;
            if (isFinite(t.rsi) && t.macd) {
                const bull = t.rsi > 50 && t.macd.h > 0, bear = t.rsi < 50 && t.macd.h < 0;
                trend = (bull || bear) ? 80 : 40;
            }
            mtf = (isFinite(t.rsi) && t.macd) ? (Math.abs(t.rsi - 50) * 1.5 + (t.macd.h > 0 ? 20 : -10)) : 30;
            regime = t.regime === 'EXPAND' ? 70 : t.regime === 'COMPRESS' ? 30 : 50;
            vol = (t.vol > 1e9) ? 80 : (t.vol > 1e8) ? 60 : (t.vol > 1e7) ? 40 : 20;
            t.confidence = clamp(Math.round((trend + clamp(mtf, 0, 100) + regime + vol) / 4), 0, 100);
        }

        /* --- Long/Short Pressure --- */
        function calcLSP(t) {
            let lsp = 50;
            if (isFinite(t.fund)) lsp += t.fund > 0 ? 15 : -15;
            if (isFinite(t.oi_delta)) lsp += t.oi_delta > 0 ? 10 : -10;
            if (isFinite(t.rsi)) lsp += (t.rsi - 50) * 0.3;
            t.lsp = clamp(Math.round(lsp), 0, 100);
        }

        /* --- Cross-Agent Fusion Engine --- */
        Z.fusionScore = 50;
        function calcFusion() {
            const btc = Z.bySym.get('BTCUSDT'), eth = Z.bySym.get('ETHUSDT');
            if (!btc || !eth) return;
            let s = 50;
            s += (btc.ch || 0) > 0 ? 15 : -15;
            s += (eth.ch || 0) > 0 ? 10 : -10;
            const fa = Z.tokens.reduce((s, t) => s + (isFinite(t.fund) ? t.fund : 0), 0) / (Z.tokens.length || 1);
            s += fa > 0.0003 ? -10 : fa < -0.0003 ? 10 : 0;
            const oiTs = Z.tokens.filter(t => isFinite(t.oi_delta));
            const oiA = oiTs.length ? oiTs.reduce((s, t) => s + t.oi_delta, 0) / oiTs.length : 0;
            s += oiA > 2 ? 10 : oiA < -2 ? -10 : 0;
            Z.fusionScore = clamp(Math.round(s), 0, 100);
        }

        /* --- Voice Alert Engine --- */
        Z.voiceEnabled = true;
        Z.lastVoiceAlert = 0;
        function voiceAlert(msg, type) {
            if (!Z.voiceEnabled) return;
            if (Date.now() - Z.lastVoiceAlert < 15000) return;
            Z.lastVoiceAlert = Date.now();
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator(), gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination); gain.gain.value = 0.15;
                if (type === 'long') { osc.frequency.value = 523; osc.type = 'sine'; }
                else if (type === 'short') { osc.frequency.value = 330; osc.type = 'sawtooth'; }
                else { osc.frequency.value = 440; osc.type = 'square'; }
                osc.start(); osc.stop(ctx.currentTime + 0.25);
                if ('speechSynthesis' in window) {
                    const u = new SpeechSynthesisUtterance(msg);
                    u.rate = 1.1; u.pitch = 1; u.volume = 0.8; u.lang = 'en-US';
                    speechSynthesis.speak(u);
                }
            } catch { }
        }

        /* --- V2 Alert Emitter --- */
        function emitV2Alert(t, reason, type) {
            const conf = t.confidence || 50;
            const risk = t.trap > 60 ? 'HIGH' : t.trap > 30 ? 'MED' : 'LOW';
            Z.alerts.unshift({
                id: Z.ai++, tp: type || 'signal', ti: `${t.s} ${reason}`,
                ds: `Conf ${conf}% | Risk ${risk} | SQZ ${t.sqz || 0} | TRAP ${t.trap || 0} | REG ${t.regime || '—'}`,
                tm: new Date(), ur: 1, sym: t.sym,
                reason: `${reason} — Conf:${conf}% Risk:${risk} Regime:${t.regime} SQZ:${t.sqz} TRAP:${t.trap}`
            });
            if (Z.alerts.length > 100) Z.alerts.pop();
            if (type === 'long') voiceAlert(`${t.s} long signal ${conf} percent confidence`, 'long');
            else if (type === 'short') voiceAlert(`${t.s} short signal ${conf} percent confidence`, 'short');
        }

        /* --- Prop Firm Calculator --- */
        function updatePropFirm(t) {
            const acc = Number(el('pfAcc')?.value || 100000);
            const riskPct = Number(el('pfRisk')?.value || 1);
            const levStr = el('pfLev')?.value || '5x';
            const lev = Number(levStr.replace('x', ''));
            if (!t || !isFinite(t.price) || t.price <= 0) return;
            const atr = calcATR(t.hist, 14);
            const stopDist = isFinite(atr) && atr > 0 ? atr * 1.5 : t.price * 0.015;
            const riskAmt = acc * (riskPct / 100);
            const posSize = riskAmt / stopDist;
            const notional = posSize * t.price;
            const margin = notional / lev;
            const res = el('pfResult');
            if (res) res.innerHTML = `Position: <span style="color:#2563eb">${posSize.toFixed(4)} ${t.s}</span> | Notional: $${fmt(notional, 2)} | Margin: $${fmt(margin, 2)}`;
            const dd = el('pfDrawdown');
            const dailyLoss = Math.abs(t.ch || 0) * notional / 100;
            if (dd) dd.innerHTML = `Daily P&L: <span class="${(t.ch || 0) >= 0 ? 'cg' : 'cr'} fw">${(t.ch || 0) >= 0 ? '+' : ''}$${fmt(dailyLoss, 2)}</span> | Max DD: $${fmt(acc * 0.05, 2)} (5%)`;
        }

        /* --- Signal Breakdown Renderer --- */
        function renderSigBreakdown(t) {
            const sb = el('mcSigBreak'), ws = el('mcWhySignal');
            if (!sb || !t) return;
            const bd = t.dip_breakdown || { rsi: 0, fund: 0, oi: 0, liq: 0, whale: 0, regime: 0 };
            const colors = { rsi: '#2563eb', fund: '#16a34a', oi: '#f59e0b', liq: '#ef4444', whale: '#8b5cf6', regime: '#06b6d4' };
            const labels = { rsi: 'RSI Weight', fund: 'Funding', oi: 'OI Exhaustion', liq: 'Liq. Proximity', whale: 'Whale Flow', regime: 'Regime' };
            sb.innerHTML = Object.entries(bd).map(([k, v]) => `
    <div class="sig-break-row">
      <span class="sig-break-label">${labels[k] || k}</span>
      <div class="sig-break-bar"><div class="sig-break-fill" style="width:${v / 20 * 100}%;background:${colors[k] || '#666'}"></div></div>
      <span class="sig-break-val" style="color:${colors[k] || '#666'}">${v}/20</span>
    </div>`).join('');
            if (ws) {
                const sig = t.rsi > 70 ? 'SHORT' : t.rsi < 30 ? 'LONG' : 'HOLD';
                const why = [];
                if (bd.rsi > 12) why.push('RSI at extreme');
                if (bd.fund > 12) why.push('Funding favorable');
                if (bd.oi > 12) why.push('OI exhaustion');
                if (bd.whale > 10) why.push('Whale activity');
                if (bd.regime > 12) why.push('Volatility compression');
                const inv = [];
                if (t.trap > 60) inv.push('⚠️ High trap risk');
                if (t.regime === 'EXPAND') inv.push('Expanding volatility');
                if (Math.abs(t.fund_zscore || 0) > 2) inv.push('Extreme funding');
                ws.innerHTML = `<div style="font-weight:700;font-size:11px;margin-bottom:4px">📊 Why ${sig}?</div>
      <div style="font-size:11px;color:rgba(17,24,39,0.55)">${why.join(' • ') || 'Neutral conditions'}</div>
      <div style="font-weight:700;font-size:11px;margin-top:6px;margin-bottom:4px">⚠️ What invalidates?</div>
      <div style="font-size:11px;color:rgba(17,24,39,0.55)">${inv.join(' • ') || 'No major risks detected'}</div>`;
            }
        }

        /* --- Intelligence Block Updater --- */
        function updateIntelBlock() {
            if (!Z.tokens.length) return;
            const avgCh = Z.tokens.reduce((s, t) => s + (t.ch || 0), 0) / Z.tokens.length;
            const bE = el('intBias');
            if (bE) { bE.textContent = avgCh > 1 ? 'BULLISH' : avgCh < -1 ? 'BEARISH' : 'NEUTRAL'; bE.style.color = avgCh > 1 ? '#16a34a' : avgCh < -1 ? '#ef4444' : '#6b7280'; }
            const funds = Z.tokens.filter(t => isFinite(t.fund)).map(t => t.fund);
            const fa = funds.length ? funds.reduce((s, v) => s + v, 0) / funds.length : 0;
            const faE = el('intFundAvg');
            if (faE) { faE.textContent = (fa * 100).toFixed(4) + '%'; faE.style.color = fa > 0.0003 ? '#ef4444' : fa < -0.0003 ? '#16a34a' : '#6b7280'; }
            const oiTs = Z.tokens.filter(t => isFinite(t.oi_delta));
            const oiA = oiTs.length ? oiTs.reduce((s, t) => s + t.oi_delta, 0) / oiTs.length : 0;
            const oiE = el('intOIDelta');
            if (oiE) { oiE.textContent = (oiA >= 0 ? '+' : '') + oiA.toFixed(2) + '%'; oiE.style.color = oiA > 1 ? '#16a34a' : oiA < -1 ? '#ef4444' : '#6b7280'; }
            const regs = Z.tokens.filter(t => t.regime);
            const cc = regs.filter(t => t.regime === 'COMPRESS').length, ec = regs.filter(t => t.regime === 'EXPAND').length;
            const rE = el('intRegime');
            if (rE) rE.textContent = ec > cc ? 'EXPANSION' : cc > ec ? 'COMPRESSION' : 'NORMAL';
            const sqzE = el('intSqzCount'); if (sqzE) sqzE.textContent = Z.tokens.filter(t => t.sqz > 50).length;
            const trE = el('intTrapCount'); if (trE) trE.textContent = Z.tokens.filter(t => t.trap > 60).length;
            calcFusion();
            const fE = el('fusionBadge');
            if (fE) { fE.textContent = Z.fusionScore > 60 ? '🔥 Cross-Asset BULLISH' : Z.fusionScore < 40 ? '🔻 Cross-Asset BEARISH' : '⚖️ Cross-Asset Neutral'; fE.classList.toggle('active', Z.fusionScore > 60 || Z.fusionScore < 40); }
        }

        /* --- V2 Engine Update Loop --- */
        function runV2Engines() {
            for (const t of Z.tokens) {
                updateFundingDev(t); detectRegime(t); calcSqueeze(t); calcTrap(t); calcDipV2(t); calcConfidence(t); calcLSP(t);
            }
            updateIntelBlock();
            if (Date.now() - Z.oiLastFetch > 60000) fetchOIBatch();
        }

        /* --- V2 Table Column Renderers --- */
        function oiDeltaH(t) {
            const d = t.oi_delta;
            if (!isFinite(d)) return '<span class="tg-oi nt">—</span>';
            return `<span class="tg-oi ${d > 1 ? 'up' : d < -1 ? 'dn' : 'nt'}">${d >= 0 ? '+' : ''}${d.toFixed(1)}%</span>`;
        }
        function sqzH(t) {
            const s = t.sqz || 0;
            return `<span class="tg-sqz ${s > 60 ? 'hi' : s > 30 ? 'md' : 'lo'}">${s > 60 ? 'HIGH' : s > 30 ? 'MED' : 'LOW'}</span>`;
        }
        function trapH(t) {
            const s = t.trap || 0;
            return `<span class="tg-trap ${s > 60 ? 'hi' : s > 30 ? 'md' : 'lo'}">${s > 60 ? '⚠HIGH' : s > 30 ? 'MED' : 'LOW'}</span>`;
        }
        function regimeH(t) {
            const r = t.regime || 'NORMAL';
            return `<span class="tg-reg ${r === 'EXPAND' ? 'exp' : r === 'COMPRESS' ? 'comp' : 'norm'}">${r === 'EXPAND' ? 'EXP' : r === 'COMPRESS' ? 'CMP' : 'NRM'}</span>`;
        }

        function hardResetMarket() {
            // close sockets, clear lists but keep UI state
            try { if (Z.ws) Z.ws.close(); } catch { }
            try { if (Z.wsAgg) Z.wsAgg.close(); } catch { }
            Z.tokens = [];
            Z.bySym = new Map();
            Z.whales = [];
            Z.alerts = [];
            Z.wv = 0;
            Z.sessionSeenKey = '';
            init().catch(console.error);
        }

        document.getElementById('sinp').addEventListener('input', e => {
            Z.q = e.target.value || '';
            rTbl();
        }, { passive: true });

        /* ---------- Binance bootstrap ---------- */
        async function fetchJSON(url) {
            const r = await fetch(url, { cache: 'no-store' });
            if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
            return r.json();
        }

        /* ---------- Category heuristics (for Futures base assets) ---------- */
        const CATEGORY_SETS = {
            // Meme coins (highest priority — before l1/l2 overlap)
            meme: new Set(['DOGE', 'SHIB', 'PEPE', 'BONK', 'FLOKI', 'WIF', 'BOME', 'BRETT', 'MEME', 'POPCAT', 'TURBO', 'BABYDOGE', 'LADYS', 'NEIRO', 'MOG', 'MEW', 'DOGS', 'SUNDOG', 'CAT', 'CHEEMS', 'PNUT', 'GOAT', 'ACT', 'LUCE', 'SATS', 'ORDI']),
            // AI / Data
            ai: new Set(['FET', 'AGIX', 'OCEAN', 'RNDR', 'TAO', 'ARKM', 'WLD', 'AI', 'NMR', 'GRT', 'ROSE', 'PHB', 'ID', 'GLM', 'IO', 'AKT', 'AIOZ', 'NFP', 'HOOK', 'CGPT', 'MYRIA', 'PAAL', 'AGI', 'PROMPT', 'VIRTUAL', 'AIXBT']),
            // RWA / Real-world assets
            rwa: new Set(['ONDO', 'POLYX', 'CFG', 'MPL', 'TRU', 'RIO', 'PENDLE', 'PAXG', 'XAUT', 'GNO', 'LQTY', 'CPOOL']),
            // DeFi
            defi: new Set(['UNI', 'AAVE', 'COMP', 'MKR', 'SNX', 'CRV', 'SUSHI', 'DYDX', 'GMX', '1INCH', 'PENDLE', 'RUNE', 'BAL', 'LDO', 'CVX', 'FXS', 'OSMO', 'JUP', 'RAY', 'CAKE', 'BANANA', 'PERP', 'ALPHA', 'BIFI', 'COW']),
            // Gaming (play-to-earn, GameFi)
            gaming: new Set(['AXS', 'IMX', 'MAGIC', 'BEAMX', 'ACE', 'ALICE', 'YGG', 'PYR', 'RONIN', 'SLP', 'TLM', 'GODS', 'HERO', 'BEAM', 'PRIME']),
            // Metaverse (separate from gaming)
            meta: new Set(['MANA', 'SAND', 'ENJ', 'ILV', 'GALA', 'APE', 'HIGH', 'VOXEL', 'DG', 'ATLAS', 'POLIS', 'SOUL', 'VR']),
            // Layer-2 scaling
            l2: new Set(['ARB', 'OP', 'MATIC', 'POL', 'ZK', 'STRK', 'METIS', 'LRC', 'IMX', 'MANTA', 'BLAST', 'BOBA', 'DVF', 'CELR', 'SCROLL', 'TAIKO']),
            // Infrastructure / Oracle / Storage
            infra: new Set(['LINK', 'ICP', 'FIL', 'AR', 'GRT', 'STORJ', 'TIA', 'INJ', 'EGLD', 'API3', 'BAND', 'PYTH', 'JTO', 'HNT', 'MOBILE', 'IOT', 'W', 'ZRO', 'EIGEN']),
            // Chinese ecosystem projects
            chinese: new Set(['NEO', 'ONT', 'VET', 'QTUM', 'CFX', 'CKB', 'LTC', 'EOS', 'TRX', 'XVG', 'ACH', 'NULS', 'IOST', 'WAN', 'FOR', 'MDT', 'IRIS', 'BNX', 'ETHW']),
            // TradFi / Institutional crossover
            tradfi: new Set(['XRP', 'XLM', 'HBAR', 'ALGO', 'QNT', 'PAXG', 'XAUT', 'ONDO', 'POLYX', 'TRU', 'CFG', 'RIO', 'ISO20022']),
            // ETF-tracked / most liquid majors
            etf: new Set(['BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'DOGE', 'BNB', 'ADA', 'DOT', 'LTC']),
            // Layer-1 base chains
            l1: new Set(['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'ATOM', 'TRX', 'NEAR', 'SUI', 'APT', 'SEI', 'TON', 'KAS', 'HBAR', 'ALGO', 'FTM', 'ONE', 'EGLD', 'KLAY', 'CELO', 'GLMR', 'ROSE', 'MOVR', 'KAVA']),
            usdc: new Set([]),
            premarket: new Set([]),
            alpha: new Set([]),
            new: new Set([])
        };

        function guessCategory(base) {
            // Priority: specific → broad
            const order = ['meme', 'ai', 'rwa', 'defi', 'gaming', 'meta', 'l2', 'infra', 'chinese', 'tradfi', 'etf', 'l1'];
            for (const k of order) {
                if (CATEGORY_SETS[k] && CATEGORY_SETS[k].has(base)) return k;
            }
            return 'all';
        }


        function pad2(n) { return String(n).padStart(2, '0'); }
        function sessionTzParts(ts = Date.now()) {
            const fmt = new Intl.DateTimeFormat('en-GB', {
                timeZone: Z.sessionTz,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hourCycle: 'h23'
            });
            const parts = {};
            for (const p of fmt.formatToParts(new Date(ts))) {
                if (p.type !== 'literal') parts[p.type] = p.value;
            }
            return {
                year: Number(parts.year),
                month: Number(parts.month),
                day: Number(parts.day),
                hour: Number(parts.hour),
                minute: Number(parts.minute),
                second: Number(parts.second)
            };
        }
        function currentSessionKey(ts = Date.now()) {
            const p = sessionTzParts(ts);
            let anchor = Date.UTC(p.year, p.month - 1, p.day);
            if (p.hour < Z.sessionResetHour) anchor -= 86400000;
            const d = new Date(anchor);
            return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
        }
        function sessionStoreLoad() { return { key: '', tokens: {} }; }
        function sessionStoreSave(force = false) { return; }
        function restoreTokenSession(t) { return false; }
        function seedNeutralHistory(t, price) {
            if (!isFinite(price) || price <= 0) return;
            t.hist = [];
            t.pts = [];
            for (let i = 0; i < 40; i++) {
                const drift = Math.sin(i / 3) * 0.00035;
                const p = price * (1 + drift);
                t.hist.push(p);
                if (i >= 15) t.pts.push(p);
            }
            t.rsi = calcRSI(t.hist, 14);
            t.macd = calcMACD(t.hist, 12, 26, 9);
        }

function applySessionMetrics(t, price = t.price, qv24 = t.qv24, ts = Date.now(), forceReset = false) {
    const px = (isFinite(price) && price > 0) ? Number(price) : (isFinite(t.price) && t.price > 0 ? Number(t.price) : NaN);
    const qv = (isFinite(qv24) && qv24 >= 0) ? Number(qv24) : (isFinite(t.qv24) && t.qv24 >= 0 ? Number(t.qv24) : NaN);
    if (isFinite(px)) {
        t.price = px;
        if (!Array.isArray(t.hist) || !t.hist.length) seedNeutralHistory(t, px);
    }
    if (isFinite(qv)) {
        t.qv24 = qv;
        t.vol = qv;
        t.vol24 = qv;
    }
    // Trust backend-provided exchange-day metrics. This mimics TradingView-style day change
    // better than deriving from Binance rolling 24h stats in the browser.
    if (isFinite(t.ch24)) t.ch = Number(t.ch24);
    t.sessionKey = currentSessionKey(ts);
    t.sessionOpen = t.sessionOpen || 0;
    t.sessionHigh = t.sessionHigh || 0;
    t.sessionLow = t.sessionLow || 0;
    t.sessionVol = t.vol || 0;
    return {
        key: t.sessionKey,
        open: t.sessionOpen,
        high: t.sessionHigh,
        low: t.sessionLow,
        vol: t.sessionVol,
        startedAt: ts
    };
}
function rotateDailySessionsIfNeeded(ts = Date.now()) {
    Z.sessionSeenKey = currentSessionKey(ts);
    return false;
}

        function mkTokenFromSymbol(symInfo) {
            // symInfo.symbol example: "BTCUSDT"
            const base = symInfo.baseAsset;
            const sym = symInfo.symbol;

            // category tag
            const cat = guessCategory(base);

            // stable color palette
            const pal = ['#f7931a', '#627eea', '#f0b90b', '#9945ff', '#00aae4', '#10b981', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#14b8a6'];
            const clr = pal[(base.charCodeAt(0) + base.charCodeAt(base.length - 1)) % pal.length];

            return {
                s: base,
                sym,           // "BTCUSDT"
                n: base,
                c: cat,
                clr,
                ex: ['BNB'],
                fl: symInfo.onboardDate ? new Date(symInfo.onboardDate).toISOString().slice(0, 10) : '--',
                nw: (symInfo.onboardDate && (Date.now() - Number(symInfo.onboardDate) < 30 * 864e5)) ? 1 : 0,
                st: 'live',
                price: 0,
                ch: 0,
                ch24: 0,
                vol: 0,        // session quote volume
                vol24: 0,      // rolling 24h quote volume
                qv24: 0,
                session: null,
                sessionKey: '',
                sessionOpen: 0,
                sessionHigh: 0,
                sessionLow: 0,
                sessionVol: 0,
                mcap: 0,       // unknown without external data (kept for UI)
                fund: NaN,     // fundingRate
                rsi: 50,
                macd: { m: 0, s: 0, h: 0 },
                fib: 0.618,
                gap: null,
                wh: { on: 0 },
                pts: [0, 0, 0, 0, 0, 0, 0],
                hist: []
            };
        }

        function upHist(t, price) {
            if (!isFinite(price) || price <= 0) return;
            t.hist.push(price);
            if (t.hist.length > 220) t.hist.shift();

            // sparkline points
            t.pts.push(price);
            if (t.pts.length > 25) t.pts.shift();

            // TA
            t.rsi = calcRSI(t.hist, 14);
            t.macd = calcMACD(t.hist, 12, 26, 9);

            // occasional GAP marker (visual only; true GAP requires candle gaps)
            if (Math.random() < 0.002) {
                t.gap = Math.random() < 0.5 ? { t: 'up', p: R(0.5, 3.5) } : { t: 'dn', p: R(0.5, 3.5) };
            }
        }

        function connectWS() {
            const streams = ['!ticker@arr', '!markPrice@arr@1s'].join('/');
            const url = apiBase().WS + streams;

            if (Z.ws) { try { Z.ws.close(); } catch { } }
            const ws = new WebSocket(url);
            Z.ws = ws;

            ws.onopen = () => { /* connected */ };
            ws.onerror = () => { /* silent */ };
            ws.onclose = () => {
                // retry with backoff
                setTimeout(connectWS, 1500);
            };

            ws.onmessage = (ev) => {
                let msg;
                try { msg = JSON.parse(ev.data); } catch { return; }
                const stream = msg.stream;
                const data = msg.data;

                if (stream === '!ticker@arr') {
                    // array of 24h ticker objects
                    // fields: s (symbol), c (last), P (chg%), q (quoteVolume), h (high), l (low)
                    for (const x of data) {
                        const sym = x.s;
                        const t = Z.bySym.get(sym);
                        if (!t) continue;

                        const last = Number(x.c);
                        const ch = Number(x.P);
                        const qv = Number(x.q);

                        if (isFinite(last) && last > 0) {
                            t.price = last;
                            upHist(t, last);
                        }
                        if (isFinite(ch)) t.ch24 = ch;
                        if (isFinite(qv)) { t.qv24 = qv; t.vol24 = qv; }
                        applySessionMetrics(t, last, qv);

                        t.hi = isFinite(Number(x.h)) ? Number(x.h) : t.hi;
                        t.lo = isFinite(Number(x.l)) ? Number(x.l) : t.lo;

                        // whale highlight if huge volume + move
                        if (qv > 2e9 && Math.abs(ch) > 3) {
                            t.wh.on = 1;
                        }
                    }
                    return;
                }

                if (stream === '!markPrice@arr@1s') {
                    // array: { s, p (markPrice), r (fundingRate), ... }
                    for (const x of data) {
                        const sym = x.s;
                        const t = Z.bySym.get(sym);
                        if (!t) continue;
                        const mp = Number(x.p);
                        const fr = Number(x.r);
                        if (isFinite(mp) && mp > 0) {
                            // Use mark price if last not present yet
                            if (!t.price || !isFinite(t.price)) t.price = mp;
                            upHist(t, mp);
                            applySessionMetrics(t, mp, t.qv24);
                        }
                        if (isFinite(fr)) t.fund = fr;
                    }
                    return;
                }
            };
        }

        /* connectAggWS: single implementation above */


        function botFmtTime(ts) {
            if (!ts) return '—';
            const d = new Date(ts);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        }

        function botToNum(v, fallback = 0) {
            if (v == null || v === '') return fallback;
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            const s = String(v).replace(/[$,%x\s,]/g, '').replace('−', '-');
            const n = Number(s);
            return Number.isFinite(n) ? n : fallback;
        }

        function botFmtCompact(v) {
            const n = Number(v || 0);
            const abs = Math.abs(n);
            if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
            if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
            if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
            return `$${n.toFixed(0)}`;
        }

        function botPct(v, digits = 2) {
            const n = botToNum(v, 0);
            return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
        }

        function botProfileDefaults(profile) {
            if (profile === 'conservative') {
                return {
                    minConfidence: 82,
                    minNotional: 75000,
                    minHotScore: 78,
                    minVolMult: 4.2,
                    minPriceMove1m: 1.35,
                    minBuyRatio: 59,
                    minOBI: 0.2,
                    minOIDeltaPct: 0.8,
                    persistenceSec: 120,
                    cooldownSec: 90
                };
            }
            if (profile === 'balanced') {
                return {
                    minConfidence: 74,
                    minNotional: 40000,
                    minHotScore: 70,
                    minVolMult: 3.1,
                    minPriceMove1m: 1.0,
                    minBuyRatio: 56,
                    minOBI: 0.15,
                    minOIDeltaPct: 0.55,
                    persistenceSec: 90,
                    cooldownSec: 60
                };
            }
            return {
                minConfidence: 70,
                minNotional: 25000,
                minHotScore: 65,
                minVolMult: 2.5,
                minPriceMove1m: 0.8,
                minBuyRatio: 54,
                minOBI: 0.12,
                minOIDeltaPct: 0.4,
                persistenceSec: 75,
                cooldownSec: 45
            };
        }

        function botApplyProfile(profile, keepCurrent) {
            const p = botProfileDefaults(profile || 'aggressive');
            Z.bot.profile = profile || 'aggressive';
            if (!keepCurrent) {
                Object.assign(Z.bot, p);
            }
            renderBotPanel();
        }

        function syncBotUrlsFromInputs() {
            const baseInp = el('botBaseUrl');
            const wsInp = el('botWsUrl');
            const inputBase = baseInp ? baseInp.value : Z.bot.baseUrl;
            const inputWs = wsInp ? wsInp.value : Z.bot.wsUrl;
            Z.bot.baseUrl = botNormalizeBaseUrl(inputBase);
            if (botShouldReplaceLoopback(Z.bot.baseUrl)) Z.bot.baseUrl = botGuessBaseUrl() || '';
            Z.bot.wsUrl = botBuildWsUrl(Z.bot.baseUrl, inputWs);
            if (botShouldReplaceLoopback(Z.bot.wsUrl)) Z.bot.wsUrl = botBuildWsUrl(Z.bot.baseUrl, '');
            Z.bot.snapshotUrl = botBuildEndpoint(Z.bot.baseUrl, '/snapshot');
            Z.bot.healthUrl = botBuildEndpoint(Z.bot.baseUrl, '/health');
            if (baseInp) baseInp.value = Z.bot.baseUrl || '';
            if (wsInp) wsInp.value = Z.bot.wsUrl || '';
        }

        function botLoadCfg() {
            try {
                const raw = JSON.parse(localStorage.getItem('px_bot_center_cfg_v2') || localStorage.getItem('px_bot_center_cfg_v1') || '{}');
                const rawBase = raw.baseUrl || '';
                const rawWs = raw.wsUrl || '';
                if (rawBase && !botShouldReplaceLoopback(rawBase)) Z.bot.baseUrl = botNormalizeBaseUrl(rawBase);
                if (rawWs && !botShouldReplaceLoopback(rawWs)) Z.bot.wsUrl = botBuildWsUrl(Z.bot.baseUrl, rawWs);
                if (raw.exchanges) Z.bot.exchanges = Object.assign(botDefaultExchangeMap(), raw.exchanges);
                if (raw.profile) Z.bot.profile = raw.profile;
                ['minNotional', 'minConfidence', 'cooldownSec', 'minVolMult', 'minPriceMove1m', 'minBuyRatio', 'minOBI', 'minOIDeltaPct', 'minHotScore', 'persistenceSec', 'reconnectDelayMs'].forEach(k => {
                    if (isFinite(Number(raw[k]))) Z.bot[k] = Number(raw[k]);
                });
                if (typeof raw.autoReconnect === 'boolean') Z.bot.autoReconnect = raw.autoReconnect;
            } catch { }
            if (!Z.bot.baseUrl || botShouldReplaceLoopback(Z.bot.baseUrl)) {
                Z.bot.baseUrl = botNormalizeBaseUrl(botGuessBaseUrl());
            } else {
                Z.bot.baseUrl = botNormalizeBaseUrl(Z.bot.baseUrl);
            }
            Z.bot.wsUrl = botBuildWsUrl(Z.bot.baseUrl, Z.bot.wsUrl);
            Z.bot.snapshotUrl = botBuildEndpoint(Z.bot.baseUrl, '/snapshot');
            Z.bot.healthUrl = botBuildEndpoint(Z.bot.baseUrl, '/health');
        }

        function botSaveCfg(silent) {
            syncBotUrlsFromInputs();
            const checks = ['binance_spot', 'binance_futures', 'mexc_spot', 'mexc_futures', 'gate_spot', 'gate_futures', 'kucoin_spot', 'kucoin_futures'];
            checks.forEach(k => {
                const id = 'bx-' + k.replace('_', '-');
                const box = el(id);
                if (box) Z.bot.exchanges[k] = !!box.checked;
            });
            Z.bot.profile = el('botProfile')?.value || Z.bot.profile || 'aggressive';
            Z.bot.minNotional = Number(el('botMinNotional')?.value || Z.bot.minNotional || 0);
            Z.bot.minConfidence = Number(el('botMinConfidence')?.value || Z.bot.minConfidence || 0);
            Z.bot.cooldownSec = Number(el('botCooldown')?.value || Z.bot.cooldownSec || 0);
            Z.bot.minVolMult = Number(el('botMinVolMult')?.value || Z.bot.minVolMult || 0);
            Z.bot.minPriceMove1m = Number(el('botMinPriceMove1m')?.value || Z.bot.minPriceMove1m || 0);
            Z.bot.minBuyRatio = Number(el('botMinBuyRatio')?.value || Z.bot.minBuyRatio || 0);
            Z.bot.minOBI = Number(el('botMinOBI')?.value || Z.bot.minOBI || 0);
            Z.bot.minOIDeltaPct = Number(el('botMinOIDeltaPct')?.value || Z.bot.minOIDeltaPct || 0);
            Z.bot.minHotScore = Number(el('botMinHotScore')?.value || Z.bot.minHotScore || 0);
            Z.bot.persistenceSec = Number(el('botPersistenceSec')?.value || Z.bot.persistenceSec || 0);
            Z.bot.autoReconnect = !!el('botAutoReconnect')?.checked;
            localStorage.setItem('px_bot_center_cfg_v2', JSON.stringify({
                baseUrl: botNormalizeBaseUrl(Z.bot.baseUrl),
                wsUrl: botBuildWsUrl(Z.bot.baseUrl, Z.bot.wsUrl),
                exchanges: Z.bot.exchanges,
                profile: Z.bot.profile,
                minNotional: Z.bot.minNotional,
                minConfidence: Z.bot.minConfidence,
                cooldownSec: Z.bot.cooldownSec,
                minVolMult: Z.bot.minVolMult,
                minPriceMove1m: Z.bot.minPriceMove1m,
                minBuyRatio: Z.bot.minBuyRatio,
                minOBI: Z.bot.minOBI,
                minOIDeltaPct: Z.bot.minOIDeltaPct,
                minHotScore: Z.bot.minHotScore,
                persistenceSec: Z.bot.persistenceSec,
                autoReconnect: Z.bot.autoReconnect,
                reconnectDelayMs: Z.bot.reconnectDelayMs
            }));
            renderBotPanel();
            renderBotScanner();
            if (!silent) botPushLog('Bot Center ayarları kaydedildi.', 'ok');
        }

        function botPushLog(msg, tone) {
            Z.bot.log.unshift({ tm: Date.now(), msg: String(msg || ''), tone: tone || 'info' });
            if (Z.bot.log.length > 120) Z.bot.log.length = 120;
            renderBotLog();
        }

        function renderBotLog() { /* deprecated for scanner */ }

        function botNormalizeScannerItem(raw) {
            if (!raw) return null;
            const symbol = String(raw.symbol || raw.symbol_alias || raw.s || '').toUpperCase();
            if (!symbol) return null;
            const score = botToNum(raw.score ?? raw.pump_score ?? raw.hot_score ?? raw.confidence, 0);
            const notional = botToNum(raw.notional ?? raw.hot_money_usd ?? raw.inflow_usd ?? raw.usd ?? raw.net_inflow_usd, 0);
            const volx = botToNum(raw.volx ?? raw.vol_mult ?? raw.volume_burst ?? raw.vol_burst, 0);
            const buyPct = botToNum(raw.buy_pct ?? raw.buy_ratio ?? raw.taker_buy_pct, 0);
            const obi = botToNum(raw.obi ?? raw.order_book_imbalance ?? raw.book_imbalance, 0);
            const oiDelta = botToNum(raw.oi_delta_pct ?? raw.oi_delta ?? raw.oi_change_pct, 0);
            const m1 = botToNum(raw.m1 ?? raw.price_move_1m ?? raw.p1m ?? raw.chg_1m, 0);
            const m3 = botToNum(raw.m3 ?? raw.price_move_3m ?? raw.p3m ?? raw.chg_3m, 0);
            const m5 = botToNum(raw.m5 ?? raw.price_move_5m ?? raw.p5m ?? raw.chg_5m, 0);
            const persistence = botToNum(raw.persistence_sec ?? raw.persistence ?? raw.hold_sec ?? raw.follow_sec, 0);
            const hotScore = botToNum(raw.hot_score ?? raw.hot_money_score ?? raw.money_score ?? score, score);
            const syncScore = botToNum(raw.sync_score ?? raw.cross_exchange_sync ?? raw.sync, 0);
            const trapRisk = botToNum(raw.trap_risk ?? raw.trap_score ?? raw.risk_score, 0);
            const spreadNum = botToNum(raw.spread_pct ?? raw.spread, 0);
            const priceNum = botToNum(raw.price, NaN);
            const phase = String(raw.phase || raw.stage || '').trim();
            const category = String(raw.category || '').trim() || (score >= 90 ? 'ACTIVE RUN' : score >= 80 ? 'TRIGGERED NOW' : score >= 68 ? 'PRE-PUMP CANDIDATES' : 'EXHAUSTION / EXIT');
            const status = String(raw.status || raw.signal_state || '').trim() || (trapRisk >= 65 ? 'alarm' : score >= 80 ? 'onay' : 'watch');
            return {
                symbol,
                exchange: String(raw.exchange || raw.ex || 'BOT').toUpperCase(),
                market: String(raw.market || raw.type || 'futures').toUpperCase(),
                score,
                hotScore,
                category,
                phase: phase || (score >= 80 ? 'trigger' : 'izleme'),
                status,
                price: Number.isFinite(priceNum) ? priceNum.toString() : String(raw.price || '—'),
                priceNum,
                m1: botPct(m1),
                m3: botPct(m3),
                m5: botPct(m5),
                m1Num: m1,
                m3Num: m3,
                m5Num: m5,
                volx: `${volx.toFixed(1)}x`,
                volxNum: volx,
                buy_pct: `${buyPct.toFixed(0)}%`,
                buyPct,
                obi: `${obi >= 0 ? '+' : ''}${obi.toFixed(2)}`,
                obiNum: obi,
                cvd: raw.cvd || `${botToNum(raw.cvd_delta ?? raw.delta, 0) >= 0 ? '↑' : '↓'} ${Math.abs(botToNum(raw.cvd_delta ?? raw.delta, 0)).toFixed(1)}`,
                cvdNum: botToNum(raw.cvd_delta ?? raw.delta, 0),
                spread: spreadNum ? `${spreadNum.toFixed(2)}%` : String(raw.spread || '—'),
                spreadNum,
                ask_sweep: String(raw.ask_sweep || raw.sweep || '—'),
                bid_stack: String(raw.bid_stack || raw.stack || '—'),
                oi_delta: `${oiDelta >= 0 ? '+' : ''}${oiDelta.toFixed(2)}%`,
                oiDeltaPct: oiDelta,
                trigger: String(raw.trigger || raw.trigger_zone || raw.trigger_note || '—'),
                entry_band: String(raw.entry_band || raw.entry || raw.entry_zone || '—'),
                tp_sl: String(raw.tp_sl || raw.tp || raw.targets || '—'),
                risk: String(raw.risk || raw.risk_label || '—'),
                notional,
                inflowUsd: notional,
                persistenceSec: persistence,
                syncScore,
                trapRisk,
                time: String(raw.time || raw.ts_label || botFmtTime(raw.ts_recv || raw.ts || raw.updated_at || Date.now())),
                ts: raw.ts_recv || raw.ts || raw.updated_at || Date.now()
            };
        }

        function botItemPassesFilters(x) {
            if (!x) return false;
            const phaseOk = x.hotScore >= Z.bot.minHotScore || x.score >= Z.bot.minConfidence;
            const volOk = x.volxNum >= Z.bot.minVolMult;
            const moveOk = x.m1Num >= Z.bot.minPriceMove1m || x.m3Num >= (Z.bot.minPriceMove1m * 1.35);
            const buyOk = x.buyPct >= Z.bot.minBuyRatio;
            const obiOk = x.obiNum >= Z.bot.minOBI;
            const oiOk = x.oiDeltaPct >= Z.bot.minOIDeltaPct;
            const flowOk = x.notional >= Z.bot.minNotional;
            const persistOk = x.persistenceSec === 0 || x.persistenceSec >= Z.bot.persistenceSec;
            return phaseOk && flowOk && ((volOk && moveOk) || (buyOk && obiOk && oiOk)) && persistOk;
        }

        function botComputeSummary(items) {
            const sum = {
                pre: 0,
                triggered: 0,
                active: 0,
                exhaust: 0,
                avgScore: 0,
                inflowUsd: 0,
                hotCount: 0
            };
            if (!items.length) return sum;
            let totalScore = 0;
            items.forEach(x => {
                totalScore += x.score || 0;
                sum.inflowUsd += x.inflowUsd || 0;
                if ((x.category || '').includes('PRE-PUMP')) sum.pre += 1;
                else if ((x.category || '').includes('TRIGGERED')) sum.triggered += 1;
                else if ((x.category || '').includes('ACTIVE')) sum.active += 1;
                else if ((x.category || '').includes('EXHAUST')) sum.exhaust += 1;
                if ((x.hotScore || 0) >= Z.bot.minHotScore) sum.hotCount += 1;
            });
            sum.avgScore = totalScore / items.length;
            return sum;
        }

        function renderBotScanner() {
            const box = el('botScanner');
            if (!box) return;
            const normalized = Array.from(Z.bot.scannerItems.values()).map(botNormalizeScannerItem).filter(Boolean).sort((a, b) => (b.hotScore || b.score) - (a.hotScore || a.score));
            const filtered = normalized.filter(botItemPassesFilters);
            const items = filtered.length ? filtered : normalized;
            const summary = botComputeSummary(items);
            Z.bot.prePumpCount = summary.pre;
            Z.bot.activeRunCount = summary.active;
            Z.bot.exhaustionCount = summary.exhaust;
            Z.bot.hotMoneyCount = summary.hotCount;
            Z.bot.inflowUsd = summary.inflowUsd;
            Z.bot.avgScore = summary.avgScore;

            if (!items.length) {
                box.innerHTML = '<div class="scan-empty">Henüz eşleşen veri yok. Hosted bot eşikleri çok sıkıysa düşürüp Snapshot/Connect deneyin.</div>';
                renderBotPanel();
                return;
            }

            const grouped = {
                "PRE-PUMP CANDIDATES": items.filter(x => x.category === "PRE-PUMP CANDIDATES"),
                "TRIGGERED NOW": items.filter(x => x.category === "TRIGGERED NOW"),
                "ACTIVE RUN": items.filter(x => x.category === "ACTIVE RUN"),
                "EXHAUSTION / EXIT": items.filter(x => x.category === "EXHAUSTION / EXIT")
            };

            const mapPhaseColor = p => {
                p = (p || '').toLowerCase();
                if (p.includes('izleme') || p.includes('watch')) return 'f-iz';
                if (p.includes('sıkışma') || p.includes('coil')) return 'f-si';
                if (p.includes('trigger')) return 'f-tr';
                if (p.includes('devam') || p.includes('run')) return 'f-de';
                if (p.includes('exit') || p.includes('yorulma') || p.includes('exhaust')) return 'f-ex';
                return '';
            };

            const mapScoreColor = s => {
                if (s < 60) return 's-weak';
                if (s < 75) return 's-watch';
                if (s < 85) return 's-strong';
                return 's-alarm';
            };

            const mapStatusColor = st => {
                st = (st || '').toLowerCase();
                if (st === 'alarm' || st === 'exit' || st === 'red') return 'c-dn';
                if (st === 'onay' || st === 'green' || st === 'confirm') return 'c-up';
                return 'f-tr';
            };

            const healthTone = Z.bot.lastHealth === 'ok' ? 'good' : Z.bot.lastHealth === 'error' ? 'bad' : 'warn';
            let html = `
    <div class="scan-meta">
      <div class="scan-meta-l">
        <span class="scan-mini">Profile <b>${String(Z.bot.profile || 'aggressive').toUpperCase()}</b></span>
        <span class="scan-mini">Threshold <b>${Z.bot.minHotScore}</b></span>
        <span class="scan-mini">Min Notional <em>${botFmtCompact(Z.bot.minNotional)}</em></span>
        <span class="scan-mini">Filtered <b>${filtered.length}</b></span>
        <span class="scan-mini">Visible <b>${items.length}</b></span>
      </div>
      <div class="scan-health ${healthTone}">Health: ${String(Z.bot.lastHealth || 'unknown').toUpperCase()} · ${Z.bot.lastHealthLatency ? Z.bot.lastHealthLatency + 'ms' : '—'} · ${botFmtTime(Z.bot.lastHealthTs)}</div>
    </div>
    <div class="sr-hdr">
      <div class="sr1" style="color:rgba(17,24,39,0.45);font-size:10px;">
        <div>ÇİFT</div><div>EX</div><div>TÜR</div><div>PUMP SKR</div><div>FAZ</div><div>FİYAT</div><div>1m %</div><div>3m %</div><div>5m %</div><div>VOL x</div><div>BUY %</div><div>OBI</div><div>CVD</div><div>SPREAD</div>
      </div>
      <div class="sr2" style="color:rgba(17,24,39,0.45);font-size:10px;margin-top:4px;">
        <div>ASK SWEEP</div><div>BID STACK</div><div>OI Δ</div><div>TRIGGER</div><div>ENTRY BANDI</div><div>TP / SL</div><div>RİSK</div><div>DURUM</div><div>ZAMAN</div>
      </div>
    </div>
  `;

            for (const [cat, list] of Object.entries(grouped)) {
                if (list.length === 0) continue;
                html += `<div class="scan-grp">
      <div class="scan-grp-t">${cat}</div>
      ${list.map(x => {
                    const hit = botItemPassesFilters(x);
                    const fade = !hit && filtered.length > 0;
                    return `
        <div class="scan-row ${hit ? 'hit' : ''} ${fade ? 'fade' : ''}">
          <div class="scan-row-head">
            <div class="scan-badges">
              ${x.hotScore >= Z.bot.minHotScore ? '<span class="scan-badge hot">HOT</span>' : ''}
              ${x.inflowUsd >= Z.bot.minNotional ? '<span class="scan-badge in">INFLOW</span>' : ''}
              ${x.syncScore >= 1 ? '<span class="scan-badge sync">SYNC</span>' : ''}
              ${x.trapRisk >= 55 ? '<span class="scan-badge trap">TRAP ALERT</span>' : ''}
            </div>
            <div style="font-size:10px;color:rgba(17,24,39,0.45);font-family:'IBM Plex Mono',monospace">Flow ${botFmtCompact(x.inflowUsd)} · Persist ${x.persistenceSec || 0}s</div>
          </div>
          <div class="sr1">
            <div>${x.symbol.replace('USDT', '')}</div>
            <div>${x.exchange}</div>
            <div>${x.market}</div>
            <div class="${mapScoreColor(x.hotScore || x.score)}">${Math.round(x.hotScore || x.score)}</div>
            <div class="${mapPhaseColor(x.phase)}">${x.phase}</div>
            <div>${x.price}</div>
            <div>${x.m1}</div><div>${x.m3}</div><div>${x.m5}</div>
            <div>${x.volx}</div><div>${x.buy_pct}</div><div>${x.obi}</div>
            <div class="${(x.cvdNum || 0) >= 0 ? 'c-up' : 'c-dn'}">${x.cvd}</div>
            <div>${x.spread}</div>
          </div>
          <div class="sr2">
            <div>${x.ask_sweep}</div>
            <div>${x.bid_stack}</div>
            <div class="${x.oiDeltaPct >= 0 ? 'c-up' : 'c-dn'}">${x.oi_delta}</div>
            <div>${x.trigger}</div>
            <div>${x.entry_band}</div>
            <div>${x.tp_sl}</div>
            <div>${x.risk}</div>
            <div class="${mapStatusColor(x.status)}">${x.status}</div>
            <div>${x.time}</div>
          </div>
        </div>`;
                }).join('')}
    </div>`;
            }
            box.innerHTML = html;
            renderBotPanel();
        }

        function renderBotPanel() {
            const baseInp = el('botBaseUrl');
            const wsInp = el('botWsUrl');
            if (baseInp) baseInp.value = Z.bot.baseUrl || '';
            if (wsInp) wsInp.value = Z.bot.wsUrl || '';
            const checks = ['binance_spot', 'binance_futures', 'mexc_spot', 'mexc_futures', 'gate_spot', 'gate_futures', 'kucoin_spot', 'kucoin_futures'];
            checks.forEach(k => {
                const id = 'bx-' + k.replace('_', '-');
                const box = el(id);
                if (box) box.checked = Z.bot.exchanges[k] !== false;
            });
            if (el('botProfile')) el('botProfile').value = Z.bot.profile || 'aggressive';
            if (el('botMinNotional')) el('botMinNotional').value = Z.bot.minNotional;
            if (el('botMinConfidence')) el('botMinConfidence').value = Z.bot.minConfidence;
            if (el('botCooldown')) el('botCooldown').value = Z.bot.cooldownSec;
            if (el('botMinVolMult')) el('botMinVolMult').value = Z.bot.minVolMult;
            if (el('botMinPriceMove1m')) el('botMinPriceMove1m').value = Z.bot.minPriceMove1m;
            if (el('botMinBuyRatio')) el('botMinBuyRatio').value = Z.bot.minBuyRatio;
            if (el('botMinOBI')) el('botMinOBI').value = Z.bot.minOBI;
            if (el('botMinOIDeltaPct')) el('botMinOIDeltaPct').value = Z.bot.minOIDeltaPct;
            if (el('botMinHotScore')) el('botMinHotScore').value = Z.bot.minHotScore;
            if (el('botPersistenceSec')) el('botPersistenceSec').value = Z.bot.persistenceSec;
            if (el('botAutoReconnect')) el('botAutoReconnect').checked = !!Z.bot.autoReconnect;
            if (el('botConnBadge')) {
                el('botConnBadge').textContent = Z.bot.connected ? 'ONLINE' : 'OFFLINE';
                el('botConnBadge').classList.toggle('on', !!Z.bot.connected);
            }
            if (el('botEventCount')) el('botEventCount').textContent = String(Z.bot.eventCount || 0);
            if (el('botSnapshotCount')) el('botSnapshotCount').textContent = String(Z.bot.snapshotCount || 0);
            if (el('botLastEvent')) el('botLastEvent').textContent = botFmtTime(Z.bot.lastEventTs);
            if (el('botSymbolCount')) el('botSymbolCount').textContent = String(Z.bot.activeSymbols.size || 0);
            if (el('botChannelCount')) el('botChannelCount').textContent = String(Z.bot.activeChannels.size || 0);
            if (el('botRestState')) el('botRestState').textContent = Z.bot.restState || 'idle';
            if (el('botWsState')) el('botWsState').textContent = Z.bot.wsState || 'idle';
            if (el('botPreCount')) el('botPreCount').textContent = String(Z.bot.prePumpCount || 0);
            if (el('botTriggeredCount')) el('botTriggeredCount').textContent = String(Math.max(0, Z.bot.snapshotCount ? Array.from(Z.bot.scannerItems.values()).map(botNormalizeScannerItem).filter(Boolean).filter(x => x.category === 'TRIGGERED NOW').length : 0));
            if (el('botActiveRunCount')) el('botActiveRunCount').textContent = String(Z.bot.activeRunCount || 0);
            if (el('botExhaustionCount')) el('botExhaustionCount').textContent = String(Z.bot.exhaustionCount || 0);
            if (el('botAvgScore')) el('botAvgScore').textContent = String((Z.bot.avgScore || 0).toFixed(1));
            if (el('botInflowUsd')) el('botInflowUsd').textContent = botFmtCompact(Z.bot.inflowUsd || 0);
            if (el('botProfileChip')) el('botProfileChip').textContent = `PROFILE: ${String(Z.bot.profile || 'aggressive').toUpperCase()}`;
            if (el('botHealthChip')) {
                el('botHealthChip').textContent = `HEALTH: ${String(Z.bot.lastHealth || 'unknown').toUpperCase()}`;
                el('botHealthChip').className = `bot-chip ${Z.bot.lastHealth === 'ok' ? 'good' : Z.bot.lastHealth === 'error' ? 'bad' : 'warn'}`;
            }
            if (el('botHotChip')) el('botHotChip').textContent = `HOT MONEY: ${String(Z.bot.hotMoneyCount || 0)}`;
            if (el('botPersistChip')) el('botPersistChip').textContent = `PERSIST: ${String(Z.bot.persistenceSec || 0)}s`;
            if (el('botReconnectChip')) el('botReconnectChip').textContent = `AUTO RECONNECT: ${Z.bot.autoReconnect ? 'ON' : 'OFF'}`;
            if (el('botHealthLine')) {
                const healthMsg = Z.bot.lastHealth === 'ok'
                    ? `Backend sağlıklı · latency ${Z.bot.lastHealthLatency || 0} ms · ${botFmtTime(Z.bot.lastHealthTs)}`
                    : Z.bot.lastHealth === 'error'
                        ? `Backend health check hata verdi · ${botFmtTime(Z.bot.lastHealthTs)}`
                        : 'Backend health henüz test edilmedi.';
                el('botHealthLine').textContent = healthMsg;
            }
        }

        function botRejectInvalidRemoteTarget() {
            syncBotUrlsFromInputs();
            if (!Z.bot.baseUrl) {
                botPushLog('Bot Base URL boş. Paneli domain altında aç veya public bot endpoint gir.', 'err');
                renderBotPanel();
                return true;
            }
            if (botShouldReplaceLoopback(Z.bot.baseUrl) || botShouldReplaceLoopback(Z.bot.wsUrl)) {
                Z.bot.lastHealth = 'error';
                Z.bot.lastHealthTs = Date.now();
                Z.bot.wsState = 'error';
                renderBotPanel();
                botPushLog('127.0.0.1 / localhost bu panel için geçerli değil. Public domain veya sunucu IP kullan.', 'err');
                return true;
            }
            return false;
        }

        async function botFetchHealth() {
            if (botRejectInvalidRemoteTarget()) return false;
            if (!Z.bot.healthUrl) return false;
            if (window.location.protocol === 'https:' && /^http:\/\//i.test(Z.bot.healthUrl)) {
                Z.bot.lastHealth = 'error';
                Z.bot.lastHealthTs = Date.now();
                renderBotPanel();
                botPushLog('HTTPS panel içinden HTTP backend çağrılamaz. Backend için HTTPS/WSS kullan.', 'err');
                return false;
            }
            const t0 = performance.now();
            try {
                const res = await fetch(Z.bot.healthUrl, { cache: 'no-store' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                Z.bot.lastHealth = 'ok';
                Z.bot.lastHealthLatency = Math.round(performance.now() - t0);
                Z.bot.lastHealthTs = Date.now();
                renderBotPanel();
                botPushLog('Health check başarılı.', 'ok');
                return true;
            } catch (err) {
                Z.bot.lastHealth = 'error';
                Z.bot.lastHealthLatency = Math.round(performance.now() - t0);
                Z.bot.lastHealthTs = Date.now();
                renderBotPanel();
                botPushLog('Health check hatası: ' + String(err.message || err), 'err');
                return false;
            }
        }

        async function botFetchSnapshot() {
            if (botRejectInvalidRemoteTarget()) return;
            if (!Z.bot.snapshotUrl) return;
            Z.bot.restState = 'loading';
            renderBotPanel();
            try {
                const endpoints = [Z.bot.snapshotUrl, Z.bot.baseUrl ? Z.bot.baseUrl + '/api/scanner/snapshot' : '', Z.bot.baseUrl ? Z.bot.baseUrl + '/api/v1/scanner/snapshot' : ''].filter(Boolean);
                let data = null, lastErr = null;
                for (const url of endpoints) {
                    try {
                        const res = await fetch(url, { cache: 'no-store' });
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        data = await res.json();
                        Z.bot.snapshotUrl = url;
                        break;
                    } catch (e) {
                        lastErr = e;
                    }
                }
                if (!data) throw lastErr || new Error('Snapshot alınamadı');
                const items = Array.isArray(data.items) ? data.items : Array.isArray(data.data) ? data.data : Array.isArray(data.snapshot) ? data.snapshot : [];
                Z.bot.snapshotCount = Number(data.count || items.length || 0);
                Z.bot.scannerItems.clear();
                items.forEach(it => {
                    const n = botNormalizeScannerItem(it);
                    if (n && n.symbol) Z.bot.scannerItems.set(n.symbol, n);
                });
                Z.bot.restState = 'ok';
                renderBotScanner();
                botPushLog(`Snapshot yüklendi`, 'ok');
            } catch (err) {
                Z.bot.restState = 'error';
                renderBotPanel();
                botPushLog('Snapshot hatası: ' + String(err.message || err), 'err');
            }
        }

        function botClearReconnectTimer() {
            if (Z.bot.reconnectTimer) {
                clearTimeout(Z.bot.reconnectTimer);
                Z.bot.reconnectTimer = null;
            }
        }

        function botScheduleReconnect() {
            botClearReconnectTimer();
            if (!Z.bot.autoReconnect) return;
            Z.bot.reconnectTimer = setTimeout(() => {
                if (!Z.bot.connected && Z.view === 'bot') botStartFeed(true);
            }, Math.max(1000, Number(Z.bot.reconnectDelayMs || 2500)));
        }

        function botStopFeed(silent) {
            botClearReconnectTimer();
            const ws = Z.bot.socket;
            if (ws) {
                try { ws.onclose = null; ws.close(); } catch { }
            }
            Z.bot.socket = null;
            Z.bot.connected = false;
            Z.bot.wsState = 'idle';
            renderBotPanel();
            if (!silent) botPushLog('WS bağlantısı kapatıldı.', 'warn');
        }

        function botApplyRouterMetrics(payload) {
            if (!payload || typeof payload !== 'object') return;
            if (payload.active_symbols) {
                Z.bot.activeSymbols = new Set(Array.isArray(payload.active_symbols) ? payload.active_symbols : []);
            }
            if (payload.active_channels) {
                Z.bot.activeChannels = new Set(Array.isArray(payload.active_channels) ? payload.active_channels : []);
            }
            if (isFinite(Number(payload.event_count))) Z.bot.eventCount = Number(payload.event_count);
            if (isFinite(Number(payload.snapshot_count))) Z.bot.snapshotCount = Number(payload.snapshot_count);
            if (payload.last_event_ts) Z.bot.lastEventTs = payload.last_event_ts;
        }

        function botHandleEvent(msg) {
            if (!msg || typeof msg !== 'object') return;
            if (msg.type === 'hello') {
                botPushLog('WS handshake alındı.', 'ok');
                return;
            }
            const ex = String(msg.exchange || msg.ex || '').toLowerCase();
            const market = String(msg.market || msg.type_market || '').toLowerCase();
            const routeKey = ex && market ? `${ex}_${market === 'futures' ? 'futures' : 'spot'}` : '';
            if (routeKey && Z.bot.exchanges[routeKey] === false) return;
            Z.bot.eventCount += 1;
            Z.bot.lastEventTs = msg.ts_recv || msg.ts || Date.now();
            if (msg.symbol_alias || msg.symbol) Z.bot.activeSymbols.add(msg.symbol_alias || msg.symbol);
            if (msg.channel) Z.bot.activeChannels.add(msg.channel);

            if (msg.type === 'router_metrics' || msg.type === 'metrics') {
                botApplyRouterMetrics(msg.data || msg.payload || msg);
                renderBotPanel();
                return;
            }

            if (msg.type === 'scanner_remove') {
                const sym = String(msg.symbol || msg.data?.symbol || '').toUpperCase();
                if (sym) Z.bot.scannerItems.delete(sym);
                renderBotScanner();
                return;
            }

            if (msg.type === 'scanner_batch' || msg.type === 'snapshot') {
                const arr = Array.isArray(msg.items) ? msg.items : Array.isArray(msg.data?.items) ? msg.data.items : Array.isArray(msg.data) ? msg.data : [];
                arr.forEach(it => {
                    const n = botNormalizeScannerItem(it);
                    if (n && n.symbol) Z.bot.scannerItems.set(n.symbol, n);
                });
                Z.bot.snapshotCount = Math.max(Z.bot.snapshotCount, Z.bot.scannerItems.size);
                renderBotScanner();
                return;
            }

            if ((msg.type === 'scanner_update' || msg.type === 'hot_money') && (msg.data || msg.symbol)) {
                const item = botNormalizeScannerItem(msg.data || msg);
                if (item && item.symbol) {
                    Z.bot.scannerItems.set(item.symbol, item);
                    renderBotScanner();
                }
                return;
            }

            renderBotPanel();
            if (msg.data && msg.data.event_type) {
                botPushLog(msg.data.event_type, 'info');
            }
        }

        async function botStartFeed(silent) {
            botSaveCfg(true);
            if (botRejectInvalidRemoteTarget()) return;
            botStopFeed(true);
            await botFetchHealth();
            await botFetchSnapshot();
            if (!Z.bot.wsUrl) return;
            if (window.location.protocol === 'https:' && /^ws:\/\//i.test(Z.bot.wsUrl)) {
                Z.bot.wsState = 'error';
                renderBotPanel();
                botPushLog('HTTPS panel içinden WS değil WSS kullanılmalı.', 'err');
                return;
            }
            try {
                Z.bot.wsState = 'connecting';
                renderBotPanel();
                const ws = new WebSocket(Z.bot.wsUrl);
                Z.bot.socket = ws;
                ws.onopen = () => {
                    Z.bot.connected = true;
                    Z.bot.wsState = 'live';
                    renderBotPanel();
                    try {
                        ws.send(JSON.stringify({
                            type: 'subscribe',
                            profile: Z.bot.profile,
                            filters: {
                                min_notional: Z.bot.minNotional,
                                min_confidence: Z.bot.minConfidence,
                                min_hot_score: Z.bot.minHotScore,
                                min_vol_mult: Z.bot.minVolMult,
                                min_price_move_1m: Z.bot.minPriceMove1m,
                                min_buy_ratio: Z.bot.minBuyRatio,
                                min_obi: Z.bot.minOBI,
                                min_oi_delta_pct: Z.bot.minOIDeltaPct,
                                persistence_sec: Z.bot.persistenceSec,
                                exchanges: Z.bot.exchanges
                            }
                        }));
                    } catch { }
                    if (!silent) botPushLog('WS canlı veri bağlantısı açıldı.', 'ok');
                };
                ws.onmessage = (ev) => {
                    try { botHandleEvent(JSON.parse(ev.data)); } catch { }
                };
                ws.onerror = () => {
                    Z.bot.wsState = 'error';
                    renderBotPanel();
                    botPushLog('WS hata verdi.', 'err');
                };
                ws.onclose = () => {
                    if (Z.bot.socket === ws) Z.bot.socket = null;
                    Z.bot.connected = false;
                    Z.bot.wsState = 'closed';
                    renderBotPanel();
                    if (!silent) botPushLog('WS bağlantısı kapandı.', 'warn');
                    botScheduleReconnect();
                };
            } catch (err) {
                Z.bot.wsState = 'error';
                renderBotPanel();
                botPushLog('WS başlatılamadı: ' + String(err.message || err), 'err');
                botScheduleReconnect();
            }
        }

        function toggleBotMode() {
            const on = Z.view === 'bot';
            if (el('catRow')) el('catRow').style.display = on ? 'none' : '';
            if (el('moverRow')) el('moverRow').style.display = on ? 'none' : '';
            if (el('signalRow')) el('signalRow').style.display = on ? 'none' : '';
            if (el('tickerRow')) el('tickerRow').style.display = on ? 'none' : '';
            if (el('intlBlock')) el('intlBlock').style.display = on ? 'none' : '';
            if (el('mainPanel')) el('mainPanel').style.display = on ? 'none' : '';
            if (el('botPanel')) el('botPanel').style.display = on ? 'block' : 'none';
            if (on) renderBotPanel();
        }

        function bindBotUI() {
            botLoadCfg();
            if (botShouldReplaceLoopback(Z.bot.baseUrl) || botShouldReplaceLoopback(Z.bot.wsUrl)) {
                Z.bot.baseUrl = botGuessBaseUrl() || '';
                Z.bot.wsUrl = botBuildWsUrl(Z.bot.baseUrl, '');
                Z.bot.snapshotUrl = botBuildEndpoint(Z.bot.baseUrl, '/snapshot');
                Z.bot.healthUrl = botBuildEndpoint(Z.bot.baseUrl, '/health');
                botPushLog('Stale localhost config temizlendi. Public bot endpoint gir veya paneli aynı domain altında yayınla.', 'warn');
            } else if (Z.bot.baseUrl && !botIsLoopbackUrl(Z.bot.baseUrl)) {
                botPushLog('Bot endpoint auto-configured: ' + Z.bot.baseUrl, 'ok');
            } else if (!Z.bot.baseUrl) {
                botPushLog('Bot endpoint bulunamadı. Public Base URL girilmeden canlı veri çekilemez.', 'warn');
            }
            renderBotPanel();
            renderBotScanner();
            el('botSaveBtn')?.addEventListener('click', () => botSaveCfg(false));
            el('botSnapshotBtn')?.addEventListener('click', () => botFetchSnapshot());
            el('botHealthBtn')?.addEventListener('click', () => botFetchHealth());
            el('botConnectBtn')?.addEventListener('click', () => botStartFeed(false));
            el('botDisconnectBtn')?.addEventListener('click', () => botStopFeed(false));
            el('botProfile')?.addEventListener('change', (e) => {
                botApplyProfile(e.target.value, false);
                botSaveCfg(true);
                renderBotScanner();
            });
        }

        async function init() {
            rUp();

            // 1) Get all USDT perpetual symbols
            const exInfo = await fetchJSON(apiBase().REST + (Z.market === 'coinm' ? '/dapi/v1/exchangeInfo' : '/fapi/v1/exchangeInfo'));
            const syms = exInfo.symbols
                .filter(s =>
                    s.contractType === 'PERPETUAL' && ((Z.market === 'coinm') ? (s.quoteAsset === 'USD') : (s.quoteAsset === 'USDT')) && s.status === 'TRADING'
                );

            // 2) Build token list
            const tokens = syms.map(mkTokenFromSymbol);

            // mark "new listings" by onboardDate window (14d)
            const nowMs = Date.now();
            const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
            for (const t of tokens) {
                const si = syms.find(s => s.symbol === t.sym);
                const ob = si && si.onboardDate ? Number(si.onboardDate) : 0;
                t.nw = (ob && (nowMs - ob) < NEW_WINDOW_MS) ? 1 : 0;
                if (t.nw) t.st = 'new';
            }

            // map + array
            Z.tokens = tokens;
            Z.bySym.clear();
            for (const t of tokens) {
                Z.bySym.set(t.sym, t);
                restoreTokenSession(t);
            }
            rotateDailySessionsIfNeeded();

            // 3) Seed with one REST snapshot of 24h tickers (so table is not empty before WS)
            try {
                const tickers = await fetchJSON(apiBase().REST + (Z.market === 'coinm' ? '/dapi/v1/ticker/24hr' : '/fapi/v1/ticker/24hr'));
                for (const x of tickers) {
                    const t = Z.bySym.get(x.symbol);
                    if (!t) continue;

                    const last = Number(x.lastPrice);
                    const ch = Number(x.priceChangePercent);
                    const qv = Number(x.quoteVolume);
                    const fr = Number(x.lastFundingRate); // may be absent; ok

                    if (isFinite(last) && last > 0) {
                        t.price = last;
                        if (!Array.isArray(t.hist) || !t.hist.length) {
                            seedNeutralHistory(t, last);
                        }
                    }
                    if (isFinite(ch)) t.ch24 = ch;
                    if (isFinite(qv)) { t.qv24 = qv; t.vol24 = qv; }
                    applySessionMetrics(t, last, qv);
                    if (isFinite(fr)) t.fund = fr;
                }
            } catch { }

            // 4) Start websockets
            connectWS();

            // Whale stream — delayed 4s so volume data seeds first
            setTimeout(connectAggWS, 4000);

            // 5) Render loop (no simulated tick())
            if (Z.renderTimer) clearInterval(Z.renderTimer);
            Z.renderTimer = setInterval(() => {
                Z.t++;
                // keep alerts/whales optional
                // optional synthetic alerts disabled; real alerts from streams
                if (false) mkAlert();
                if (false) mkWhale();

                // decay alert "unread"
                Z.alerts.forEach(a => { if (Date.now() - a.tm.getTime() > 1e4) a.ur = 0; });

                rotateDailySessionsIfNeeded();
                sessionStoreSave();

                // V2 engines
                runV2Engines();

                rTbl();
                rAl();
                rWh();
                rBtk();
                updateDrawer();
                rHdr();
            }, 1000);
        }


        window.addEventListener('beforeunload', () => {
            sessionStoreSave(true);
        });

        /* ---------- BOOT ---------- */
        applyLangUI();
        initDrawerUI();
        bindBotUI();
        toggleBotMode();

        /* V2: Voice toggle */
        el('voiceToggle')?.addEventListener('click', (e) => {
            Z.voiceEnabled = !Z.voiceEnabled;
            const tn = e.target;
            if (Z.voiceEnabled) {
                tn.classList.add('on');
                voiceAlert('Voice alerts enabled', 'buy');
            } else {
                tn.classList.remove('on');
            }
        });
        /* V2: Prop Firm inputs */
        ['pfAcc', 'pfRisk', 'pfLev'].forEach(id => {
            el(id)?.addEventListener('change', () => {
                const t = Z.sel ? Z.bySym.get(Z.sel) : null;
                if (t) updatePropFirm(t);
            });
        });
        /* ---------- Click behaviors (alerts + bottom ticker) ---------- */
        (function bindDelegates() {
            const aList = el('aList');
            if (aList) {
                aList.addEventListener('click', (e) => {
                    const item = e.target?.closest?.('[data-aid]');
                    if (!item) return;
                    const id = Number(item.getAttribute('data-aid'));
                    const a = Z.alerts.find(x => x.id === id);
                    if (!a) return;
                    // mark read
                    a.ur = 0;
                    // try extract symbol
                    const m = (a.ds || '').match(/([A-Z0-9]{2,15})USDT/);
                    const sym = m ? m[1] + 'USDT' : null;
                    if (sym && Z.bySym.has(sym)) {
                        openToken(sym);
                        updateDrawer({ sub: `Alert: ${a.ti}`, hint: `${a.ds} • ${String(a.tm.getHours()).padStart(2, '0')}:${String(a.tm.getMinutes()).padStart(2, '0')}` });
                    } else {
                        // open drawer as generic detail
                        Z.sel = Z.sel || 'BTCUSDT';
                        setDrawerOpen(true);
                        ensureChart();
                        updateDrawer({ sub: `Alert: ${a.ti}`, hint: `${a.ds} • ${String(a.tm)}` });
                    }
                    rAl();
                    rHdr();
                }, { passive: true });
            }

            const bTick = el('bTick');
            if (bTick) {
                bTick.addEventListener('click', (e) => {
                    const bi = e.target?.closest?.('[data-sym]');
                    if (!bi) return;
                    const sym = bi.getAttribute('data-sym');
                    if (sym) openToken(sym);
                }, { passive: true });
            }
        })();

        init().catch(err => {
            console.error(err);
            const rawErr = String(err && err.message ? err.message : err);
            const localFile = !/^https?:$/i.test(window.location.protocol);
            const hint = localFile
                ? 'Local file mode detected. Direct exchange endpoints were enabled automatically. If this still fails, your browser/network is blocking external API access.'
                : 'Remote API request failed. Check reverse proxy, CORS, firewall, or exchange endpoint reachability.';
            // minimal UI hint
            const a = document.getElementById('aList');
            if (a) {
                a.innerHTML = `<div style="padding:10px;color:var(--red);font-family:IBM Plex Mono, monospace;font-size:12px;line-height:1.5;">
      Connection error: ${rawErr}<br><span style="color:var(--muted)">${hint}</span>
    </div>`;
            }
        });

    


(function(){
  if (window.__PROPTREX_P0_APPLIED__) return;
  window.__PROPTREX_P0_APPLIED__ = true;

  const TF_LIST = ['1m','5m','15m','30m','1h','2h','4h','1d'];
  const TF_MINUTES = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '2h': 120,
    '4h': 240,
    '1d': 1440
  };
  const TF_CONF = {
    '1m':  { lookback: 24,  rr: [0.90, 1.30, 1.75, 2.20], atrMul: 0.75, structMul: 0.70 },
    '5m':  { lookback: 36,  rr: [1.05, 1.55, 2.15, 2.85], atrMul: 0.95, structMul: 0.85 },
    '15m': { lookback: 52,  rr: [1.20, 1.85, 2.60, 3.45], atrMul: 1.18, structMul: 1.05 },
    '30m': { lookback: 72,  rr: [1.35, 2.10, 3.00, 4.05], atrMul: 1.40, structMul: 1.25 },
    '1h':  { lookback: 96,  rr: [1.55, 2.45, 3.55, 4.80], atrMul: 1.70, structMul: 1.55 },
    '2h':  { lookback: 124, rr: [1.80, 2.90, 4.15, 5.65], atrMul: 2.05, structMul: 1.90 },
    '4h':  { lookback: 164, rr: [2.15, 3.45, 4.95, 6.75], atrMul: 2.55, structMul: 2.35 },
    '1d':  { lookback: 220, rr: [2.70, 4.35, 6.20, 8.40], atrMul: 3.20, structMul: 3.10 }
  };
  const STATE_ORDER = { INVALIDATED: 0, COOLDOWN: 1, WATCHLIST: 2, TRADEABLE: 3, PRIORITY: 4, EXECUTION: 5 };
  const CRITICAL_EVENTS = new Set(['TP_HIT','INVALIDATION','STRUCTURE_BREAK','EXECUTION_TRIGGER','BREAK_EVEN_SHIFT','PARTIAL_EXIT','STOP_HIT']);

  const ADMIN_CFG_KEY = 'proptrex_admin_cfg_v1';
  function defaultAdminConfig(){
    return {
      priorityThreshold: 72,
      tradeableThreshold: 58,
      executionThreshold: 70,
      executionEntryDist: 0.18,
      priorityEntryDist: 0.80,
      maxEntryDistancePct: 4.50,
      whaleAlignmentThreshold: 45,
      freshnessThreshold: 55,
      cooldownMinutes: 2,
      maxAlertsPerSymbolPerHour: 8,
      invalidationTrap: 82,
      discoveryChangePct: 8,
      discoveryVolumeAccel: 1.20,
      exposurePenalty: 7,
      exposureWindowMinutes: 45,
      manualIncludeSymbols: '',
      manualExcludeSymbols: '',
      manualPrioritySymbols: '',
      ipAllowlist: '',
      ipBlocklist: '',
      restUsdm: '',
      wsUsdm: '',
      restCoinm: '',
      wsCoinm: '',
      maxRows: 250,
      signalRetentionHours: DEFAULT_SIGNAL_RETENTION_HOURS,
      signalDedupWindowMinutes: DEFAULT_SIGNAL_DEDUP_WINDOW_MINUTES
    };
  }
  function loadAdminConfig(){
    try {
      const raw = JSON.parse(localStorage.getItem(ADMIN_CFG_KEY) || '{}');
      return Object.assign(defaultAdminConfig(), raw || {});
    } catch {
      return defaultAdminConfig();
    }
  }
  function saveAdminConfig(cfg){
    const next = Object.assign(defaultAdminConfig(), cfg || {});
    try { localStorage.setItem(ADMIN_CFG_KEY, JSON.stringify(next)); } catch {}
    if (Z && Z.proptrex) {
      Z.proptrex.admin = next;
      Z.proptrex.deliveryCooldownMs = Math.max(0, n(next.cooldownMinutes, 2)) * 60000;
      signalHistoryStore.configure({
        retentionHours: next.signalRetentionHours,
        dedupWindowMinutes: next.signalDedupWindowMinutes
      });
    }
    return next;
  }

  function n(v, fb = 0){
    const x = Number(v);
    return Number.isFinite(x) ? x : fb;
  }
  function clamp2(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function pct(a,b){
    if (!Number.isFinite(a) || !Number.isFinite(b) || !b) return 999;
    return Math.abs((a - b) / b) * 100;
  }
  function mid(a,b){ return (n(a)+n(b))/2; }
  function roundTo(v, step){
    if (!Number.isFinite(v) || !Number.isFinite(step) || !step) return v;
    return Math.round(v / step) * step;
  }
  function fmtTime(ts){
    if (!ts) return '—';
    const d = new Date(ts);
    const p = x => String(x).padStart(2,'0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function zoneHash(low, high, price){
    const step = Math.max(n(price) * 0.0025, 0.00000001);
    return `${Math.round(n(low)/step)}-${Math.round(n(high)/step)}`;
  }
  const SIGNAL_HISTORY_STORAGE_KEY = 'proptrex_signal_history_v1';
  const SIGNAL_HISTORY_RETENTION_OPTIONS = [4, 8, 12, 24];
  const DEFAULT_SIGNAL_RETENTION_HOURS = 24;
  const DEFAULT_SIGNAL_DEDUP_WINDOW_MINUTES = 15;
  function formatRelativeAge(ms){
    if (!Number.isFinite(ms) || ms < 0) return '—';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  function bucketLabelForAge(ageHours){
    if (ageHours < 4) return '00-04h';
    if (ageHours < 8) return '04-08h';
    if (ageHours < 12) return '08-12h';
    return '12-24h';
  }
  function computeSignalDedupKey(sig){
    const zone = zoneHash(n(sig.entry_low, 0), n(sig.entry_high, 0), n(sig.entry_low, 0));
    const tf = sig.primary_tf || '1h';
    return `${sig.symbol || 'UNKNOWN'}|${sig.direction || 'NEUTRAL'}|${sig.setup_type || 'unknown'}|${tf}|${zone}`;
  }
  function createSignalHistoryStore(){
    let records = [];
    let retentionHours = DEFAULT_SIGNAL_RETENTION_HOURS;
    let dedupWindowMinutes = DEFAULT_SIGNAL_DEDUP_WINDOW_MINUTES;
    const dedupIndex = new Map();
    const clonePlain = v => v == null ? v : JSON.parse(JSON.stringify(v));
    const dedupWindowMs = () => Math.max(1, dedupWindowMinutes) * 60000;
    const retentionMs = () => Math.max(1, retentionHours) * 60 * 60 * 1000;
    const clampRetention = v => {
      const num = Number(v);
      return SIGNAL_HISTORY_RETENTION_OPTIONS.includes(num) ? num : DEFAULT_SIGNAL_RETENTION_HOURS;
    };
    const clampDedupWindow = v => {
      const num = Number(v);
      return Number.isFinite(num) && num > 0 ? num : DEFAULT_SIGNAL_DEDUP_WINDOW_MINUTES;
    };
    const storageKey = SIGNAL_HISTORY_STORAGE_KEY;
    const generateInstanceId = () => {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      return `sig_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    };
    const computeDedupKey = sig => computeSignalDedupKey(sig);
    const persist = () => {
      try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch (err) { console.warn('signal history persist failed', err); }
    };
    const hydrate = () => {
      records = [];
      dedupIndex.clear();
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const now = Date.now();
        parsed.forEach(item => {
          if (!item || !item.signal_instance_id) return;
          const entry = {
            ...item,
            created_at: Number(item.created_at) || now,
            last_seen_at: Number(item.last_seen_at) || now,
            expires_at: Number(item.expires_at) || (now + retentionMs())
          };
          records.push(entry);
          dedupIndex.set(entry.dedup_key, entry);
        });
      } catch {
        records = [];
        dedupIndex.clear();
      }
      pruneExpiredSignals();
    };
    const buildRecord = (signal, token, overrides = {}) => {
      const now = Date.now();
      const createdAt = Number(signal.created_at) || now;
      const lastSeenAt = overrides.last_seen_at || Number(signal.last_seen_at) || now;
      const record = {
        signal_instance_id: overrides.instance_id || signal.signal_instance_id || generateInstanceId(),
        dedup_key: computeDedupKey(signal),
        symbol: signal.symbol,
        direction: signal.direction,
        setup_type: signal.setup_type,
        timeframe: signal.primary_tf,
        score: n(signal.opportunity_score, 0),
        opportunity_score: signal.opportunity_score,
        entry_low: signal.entry_low,
        entry_high: signal.entry_high,
        entry_zone: `${n(signal.entry_low, 0).toFixed(8)}–${n(signal.entry_high, 0).toFixed(8)}`,
        stop: signal.stop_loss,
        tp_matrix: clonePlain(signal.tp_matrix),
        source_exchange: (signal.__token && Array.isArray(signal.__token.ex) && signal.__token.ex[0])
          || (token && Array.isArray(token.ex) && token.ex[0])
          || 'UNKNOWN',
        created_at: createdAt,
        last_seen_at: lastSeenAt,
        expires_at: overrides.expires_at || (createdAt + retentionMs()),
        status: overrides.status || 'ACTIVE',
        signal: clonePlain(signal),
        token: clonePlain(token)
      };
      record.signal.signal_instance_id = record.signal_instance_id;
      return record;
    };
    const appendSignal = (signal, token) => {
      const record = buildRecord(signal, token);
      records.unshift(record);
      dedupIndex.set(record.dedup_key, record);
      persist();
      signal.signal_instance_id = record.signal_instance_id;
      return record;
    };
    const upsertByDedupKey = (signal, token) => {
      const now = Date.now();
      const key = computeDedupKey(signal);
      const existing = dedupIndex.get(key);
      if (existing && now - (existing.last_seen_at || existing.created_at || now) <= dedupWindowMs()) {
        existing.last_seen_at = now;
        existing.status = 'UPDATED';
        existing.score = n(signal.opportunity_score, 0);
        existing.opportunity_score = signal.opportunity_score;
        existing.entry_low = signal.entry_low;
        existing.entry_high = signal.entry_high;
        existing.entry_zone = `${n(signal.entry_low, 0).toFixed(8)}–${n(signal.entry_high, 0).toFixed(8)}`;
        existing.stop = signal.stop_loss;
        existing.tp_matrix = clonePlain(signal.tp_matrix);
        existing.signal = clonePlain(signal);
        existing.signal.signal_instance_id = existing.signal_instance_id;
        existing.token = clonePlain(token);
        signal.signal_instance_id = existing.signal_instance_id;
        persist();
        return existing;
      }
      return appendSignal(signal, token);
    };
    const pruneExpiredSignals = (now = Date.now()) => {
      let touched = false;
      for (let i = records.length - 1; i >= 0; i--) {
        const record = records[i];
        if (record.expires_at && now >= record.expires_at) {
          record.status = 'EXPIRED';
          records.splice(i, 1);
          dedupIndex.delete(record.dedup_key);
          touched = true;
        }
      }
      if (touched) persist();
    };
    const matchesFilters = (record, state = {}) => {
      const token = record.token || {};
      const sig = record.signal || {};
      if (!symbolAllowedByAdmin(record.symbol)) return false;
      const search = String(state.q || '').trim().toUpperCase();
      if (search) {
        const name = (token.n || '').toUpperCase();
        const sym = (token.s || '').toUpperCase();
        if (!sym.includes(search) && !name.includes(search)) return false;
      }
      if (state.cat && state.cat !== 'all') {
        if (state.cat === 'new') {
          if (!token.nw && token.st !== 'new') return false;
        } else if (state.cat === 'premarket') {
          if (!token.nw && !(token.listedAgeDays != null && token.listedAgeDays <= 30)) return false;
        } else if (state.cat === 'alpha') {
        } else if (state.cat === 'usdc') {
          if (!String(token.sym || '').endsWith('USDC')) return false;
        } else if (token.c !== state.cat) {
          return false;
        }
      }
      if (state.sig) {
        if (state.sig === 'rsiob' && n(token.rsi, 0) <= 70) return false;
        if (state.sig === 'rsios' && n(token.rsi, 100) >= 30) return false;
        if (state.sig === 'macdup' && !(token.macd && n(token.macd.h, 0) > 0)) return false;
        if (state.sig === 'macddn' && !(token.macd && n(token.macd.h, 0) < 0)) return false;
        if (state.sig === 'gap' && !token.gap) return false;
        if (state.sig === 'fib' && Math.abs(n(token.fib, 0.618) - 0.618) >= 0.001) return false;
        if (state.sig === 'whale' && !(token.wh && token.wh.on)) return false;
      }
      if (state.mv && state.mv !== 'all') {
        if (state.mv === 'rise' && n(token.ch, 0) <= 0) return false;
        if (state.mv === 'fall' && n(token.ch, 0) >= 0) return false;
        if (state.mv === 'volup' && n(token.ch, 0) < 0) return false;
        if (state.mv === 'voldn' && n(token.ch, 0) >= 0) return false;
        if (state.mv === 'whale' && !(token.wh && token.wh.on)) return false;
        if (state.mv === 'newhigh' && !(token.hi && n(token.price, 0) >= n(token.hi, 0))) return false;
        if (state.mv === 'newlow' && !(token.lo && n(token.price, 0) <= n(token.lo, 0))) return false;
        if (state.mv === 'pullback' && !(n(token.ch, 0) > 0 && n(token.rsi, 0) < 55)) return false;
        if (state.mv === 'rally' && !(n(token.ch, 0) > 0 && n(token.rsi, 0) > 55)) return false;
      }
      const pf = state.proptrexFilters || {};
      if (pf.onlyLong && sig.direction !== 'LONG') return false;
      if (pf.onlyShort && sig.direction !== 'SHORT') return false;
      if (pf.squeeze && !(sig.confluence && Array.isArray(sig.confluence.layers) && sig.confluence.layers.some(l => l.name === 'FUND_OI' && l.score > 25))) return false;
      if (pf.leadLag && !(sig.confluence && Array.isArray(sig.confluence.layers) && sig.confluence.layers.some(l => l.name === 'LEAD_LAG' && l.score > 25))) return false;
      if (pf.highConf && !(sig.confluence && n(sig.confluence.agreeing, 0) >= 3)) return false;
      if (pf.onlyPriority && (!sig.state || !['PRIORITY','EXECUTION'].includes(sig.state))) return false;
      if (pf.onlyFresh && !(sig.freshness != null && n(sig.freshness, 0) >= 65)) return false;
      if (pf.nearEntry && !(sig.entry_distance_pct != null && n(sig.entry_distance_pct, 999) <= 1.25)) return false;
      if (pf.whaleAligned && !(sig.whale_score != null && n(sig.whale_score, 0) >= 45)) return false;
      return true;
    };
    return {
      appendSignal: (signal, token) => appendSignal(signal, token),
      upsertByDedupKey: (signal, token) => upsertByDedupKey(signal, token),
      pruneExpiredSignals: (now = Date.now()) => pruneExpiredSignals(now),
      getVisibleSignals: (state) => {
        pruneExpiredSignals();
        return records.filter(record => matchesFilters(record, state));
      },
      hydratePersistedSignals: () => {
        hydrate();
        return records.slice();
      },
      configure: ({ retentionHours: rh, dedupWindowMinutes: dw } = {}) => {
        retentionHours = clampRetention(rh);
        dedupWindowMinutes = clampDedupWindow(dw);
        pruneExpiredSignals();
      },
      getRecords: () => records
    };
  }
  const signalHistoryStore = createSignalHistoryStore();
  function stateColor(st){
    return ({ WATCHLIST:'#64748b', TRADEABLE:'#2563eb', PRIORITY:'#7c3aed', EXECUTION:'#16a34a', COOLDOWN:'#f59e0b', INVALIDATED:'#ef4444' })[st] || '#64748b';
  }
  function stateClass(st){ return 'px-state-' + String(st || 'WATCHLIST').toLowerCase(); }
  function dirClass(d){ return d === 'LONG' ? 'px-long' : d === 'SHORT' ? 'px-short' : 'px-neutral'; }

  Z.proptrex = Z.proptrex || {
    signalBook: new Map(),
    signalEvents: [],
    currentBySymbol: new Map(),
    lastEventKey: new Set(),
    filters: { onlyPriority: false, onlyFresh: false, nearEntry: false, whaleAligned: false, hideDuplicates: true, onlyLong: false, onlyShort: false, squeeze: false, leadLag: false, highConf: false },
    signalHistory: signalHistoryStore,
    admin: loadAdminConfig(),
    deliveryCooldownMs: 120000,
    lastDeliveryAt: new Map(),
    activeTelegramPreview: null,
    lastTableRenderKey: '',
    visibilitySeen: new Map(),
    alertHourly: new Map(),
    exchangeConfigs: {
      BINANCE: { label: 'Binance', market: 'futures', template: 'https://www.binance.com/en/futures/{sym}?ref=CPA_00WPSCQYZA' },
      MEXC: { label: 'MEXC', market: 'futures', template: 'https://www.mexc.com/futures/exchange/{sym}' },
      GATE: { label: 'Gate', market: 'futures', template: 'https://www.gate.io/futures_trade/USDT/{base}_USDT' },
      KUCOIN: { label: 'KuCoin', market: 'futures', template: 'https://www.kucoin.com/futures/trade/{base}USDTM' },
      BYBIT: { label: 'Bybit', market: 'futures', template: 'https://www.bybit.com/trade/usdt/{base}USDT' },
      OKX: { label: 'OKX', market: 'swap', template: 'https://www.okx.com/trade-swap/{baseLower}-usdt-swap' }
    }
  };
  Z.proptrex.deliveryCooldownMs = Math.max(0, n(Z.proptrex.admin && Z.proptrex.admin.cooldownMinutes, 2)) * 60000;
  signalHistoryStore.configure({
    retentionHours: Z.proptrex.admin.signalRetentionHours,
    dedupWindowMinutes: Z.proptrex.admin.signalDedupWindowMinutes
  });


  function compressCloseSeriesToCandles(hist, bucket){
    if (!Array.isArray(hist) || !hist.length) return [];
    const b = Math.max(1, Math.floor(bucket || 1));
    const out = [];
    for (let i = 0; i < hist.length; i += b) {
      const chunk = hist.slice(i, i + b).map(x => n(x, NaN)).filter(Number.isFinite);
      if (!chunk.length) continue;
      out.push({
        open: chunk[0],
        high: Math.max(...chunk),
        low: Math.min(...chunk),
        close: chunk[chunk.length - 1]
      });
    }
    return out;
  }

  function closeSeriesFromCandles(candles){
    return Array.isArray(candles) ? candles.map(c => n(c.close, 0)) : [];
  }

  function calcAtrFromCandles(candles, period = 14){
    if (!Array.isArray(candles) || candles.length < period + 2) return NaN;
    const arr = candles.slice(-Math.max(period + 2, 60));
    let sum = 0, c = 0;
    for (let i = 1; i < arr.length; i++) {
      const cur = arr[i], prev = arr[i - 1];
      const tr = Math.max(
        n(cur.high, 0) - n(cur.low, 0),
        Math.abs(n(cur.high, 0) - n(prev.close, 0)),
        Math.abs(n(cur.low, 0) - n(prev.close, 0))
      );
      if (Number.isFinite(tr)) { sum += tr; c += 1; }
    }
    return c ? sum / c : NaN;
  }

  function calcATRLite(hist, period = 14){
    return calcAtrFromCandles(compressCloseSeriesToCandles(hist, 1), period);
  }

  function recentSlice(hist, lookback){
    if (!Array.isArray(hist) || !hist.length) return [];
    return hist.slice(-Math.max(6, Math.min(hist.length, lookback)));
  }

  function compressSeries(hist, bucket){
    if (!Array.isArray(hist) || !hist.length) return [];
    const b = Math.max(1, Math.floor(bucket || 1));
    if (b <= 1) return hist.slice();
    const out = [];
    for (let i = 0; i < hist.length; i += b) {
      const chunk = hist.slice(i, i + b);
      if (chunk.length) out.push(n(chunk[chunk.length - 1], 0));
    }
    return out;
  }

  function deriveTfCandles(hist, tf){
    if (!Array.isArray(hist) || !hist.length) return [];
    const conf = TF_CONF[tf] || TF_CONF['1h'];
    const mins = TF_MINUTES[tf] || 60;
    const targetBars = mins >= 1440 ? 18 : mins >= 240 ? 24 : mins >= 120 ? 28 : mins >= 60 ? 34 : mins >= 30 ? 42 : mins >= 15 ? 52 : mins >= 5 ? 64 : 84;
    const bucket = mins <= 1 ? 1 : Math.max(1, Math.round(Math.max(hist.length / targetBars, mins / 2.5)));
    const candles = compressCloseSeriesToCandles(hist, bucket);
    return recentSlice(candles, conf.lookback);
  }

  function deriveTfSeries(hist, tf){
    return closeSeriesFromCandles(deriveTfCandles(hist, tf));
  }

  function seriesRsiLite(hist, period = 14){
    if (!Array.isArray(hist) || hist.length < period + 2) return 50;
    let gain = 0, loss = 0;
    const arr = hist.slice(-period - 1);
    for (let i = 1; i < arr.length; i++) {
      const d = n(arr[i], 0) - n(arr[i - 1], 0);
      if (d >= 0) gain += d; else loss += Math.abs(d);
    }
    if (!loss) return 100;
    const rs = gain / Math.max(loss, 1e-9);
    return 100 - (100 / (1 + rs));
  }

  function macdHistLite(hist, fast = 12, slow = 26, signal = 9){
    if (!Array.isArray(hist) || hist.length < slow + signal + 2) return 0;
    const ema = (arr, len) => {
      const k = 2 / (len + 1);
      let prev = n(arr[0], 0);
      const out = [prev];
      for (let i = 1; i < arr.length; i++) {
        prev = n(arr[i], 0) * k + prev * (1 - k);
        out.push(prev);
      }
      return out;
    };
    const f = ema(hist, fast);
    const s = ema(hist, slow);
    const line = f.map((v, i) => v - s[i]);
    const sig = ema(line, signal);
    return n(line[line.length - 1], 0) - n(sig[sig.length - 1], 0);
  }

  function structureMetricsFromCandles(candles, refPrice, ch = 0){
    const sl = recentSlice(candles, 80);
    if (!sl.length) return { trend: 'NEUTRAL', higherLow: false, lowerHigh: false, validity: 35, hi: refPrice, lo: refPrice, hi1: refPrice, hi2: refPrice, lo1: refPrice, lo2: refPrice, range: 0, rangePct: 0 };
    const highs = sl.map(c => n(c.high, refPrice));
    const lows = sl.map(c => n(c.low, refPrice));
    const closes = sl.map(c => n(c.close, refPrice));
    const hi = Math.max(...highs);
    const lo = Math.min(...lows);
    const half = Math.max(3, Math.floor(sl.length / 2));
    const q1 = sl.slice(0, half), q2 = sl.slice(Math.max(0, sl.length - half));
    const lo1 = Math.min(...q1.map(c => n(c.low, refPrice))), lo2 = Math.min(...q2.map(c => n(c.low, refPrice)));
    const hi1 = Math.max(...q1.map(c => n(c.high, refPrice))), hi2 = Math.max(...q2.map(c => n(c.high, refPrice)));
    const higherLow = lo2 > lo1 * 1.0015;
    const lowerHigh = hi2 < hi1 * 0.9985;
    const rsi = seriesRsiLite(closes, 14);
    const macdHist = macdHistLite(closes, 8, 17, 6);
    const upBias = (higherLow ? 1 : 0) + (macdHist > 0 ? 1 : 0) + (rsi >= 50 ? 1 : 0);
    const dnBias = (lowerHigh ? 1 : 0) + (macdHist < 0 ? 1 : 0) + (rsi <= 50 ? 1 : 0);
    const trend = upBias === dnBias ? 'NEUTRAL' : (upBias > dnBias ? 'BULLISH' : 'BEARISH');
    const range = Math.max(0, hi - lo);
    const rangePct = refPrice ? (range / refPrice) * 100 : 0;
    const validity = clamp2(36 + (higherLow ? 18 : 0) + (lowerHigh ? 18 : 0) + Math.min(Math.abs(n(ch, 0)) * 2.5, 16) + Math.min(rangePct * 0.8, 10), 20, 97);
    return { trend, higherLow, lowerHigh, validity, hi, lo, hi1, hi2, lo1, lo2, rsi, macdHist, range, rangePct };
  }

  function structureMetricsFromSeries(hist, refPrice, ch = 0){
    const candles = compressCloseSeriesToCandles(hist, 1);
    return structureMetricsFromCandles(candles, refPrice, ch);
  }

  function tfContext(t, tf, baseAtr){
    const conf = TF_CONF[tf] || TF_CONF['1h'];
    const candles = deriveTfCandles(Array.isArray(t.hist) ? t.hist : [], tf);
    const hist = closeSeriesFromCandles(candles);
    const atrLocal = calcAtrFromCandles(candles, Math.max(6, Math.min(21, Math.round(conf.lookback / 6))));
    const mins = TF_MINUTES[tf] || 60;
    const scale = 1 + Math.log10(Math.max(1, mins)) * 0.62;
    const structure = structureMetricsFromCandles(candles.length ? candles : [{ open:n(t.price,0), high:n(t.price,0), low:n(t.price,0), close:n(t.price,0) }], n(t.price, 0), n(t.ch, 0));
    const rangeTf = Math.max(n(structure.range, 0), n(t.price, 0) * 0.0015 * scale);
    const atr = Math.max(n(atrLocal, 0), n(baseAtr, 0) * conf.atrMul * (0.90 + scale * 0.24), n(t.price, 0) * 0.0018 * scale, rangeTf / Math.max(2.5, 7 - scale));
    return { candles, hist, atr, scale, structure, range: rangeTf, rangePct: n(structure.rangePct, 0) };
  }

  function scannerFor(sym){
    try { return Z.bot && Z.bot.scannerItems ? Z.bot.scannerItems.get(sym) : null; } catch { return null; }
  }
  /* ══ CONFLUENCE ENGINE — 6 LAYER PRE-MOVE DETECTION ══ */
  var CFG_BTC='BTCUSDT';var _cfSnaps=[];var _cfCorrCache=new Map();
  function _btcT(){return Z.bySym?Z.bySym.get(CFG_BTC):null;}
  function cfSnap(){if(!Z.tokens||!Z.tokens.length)return;var now=Date.now(),p=new Map();for(var i=0;i<Z.tokens.length;i++){var t=Z.tokens[i];if(t.price>0)p.set(t.sym,t.price);}_cfSnaps.push({ts:now,prices:p});while(_cfSnaps.length>60)_cfSnaps.shift();}
  function cfLeadLag(t){
    var btc=_btcT();if(!btc||_cfSnaps.length<6||!t||t.sym===CFG_BTC)return{score:0,dir:'NEUTRAL',lag:0};
    var now=_cfSnaps[_cfSnaps.length-1],b5=_cfSnaps[Math.max(0,_cfSnaps.length-10)];
    var bn=n(now.prices.get(CFG_BTC),0),b5p=n(b5.prices.get(CFG_BTC),bn);
    var bm=b5p>0?((bn-b5p)/b5p)*100:0;if(Math.abs(bm)<0.3)return{score:0,dir:'NEUTRAL',lag:0};
    var an=n(now.prices.get(t.sym),0),a5=n(b5.prices.get(t.sym),an);
    var am=a5>0?((an-a5)/a5)*100:0;var fr=Math.abs(bm)>0.1?am/bm:1;
    if(Math.abs(fr)>=0.4)return{score:5,dir:bm>0?'LONG':'SHORT',lag:0};
    return{score:clamp2(Math.abs(bm)*18+(1-Math.abs(fr))*40,0,100),dir:bm>0?'LONG':'SHORT',lag:5};
  }
  function cfFundOI(t){
    var f=n(t.fund,0),oi=n(t.oi_delta,0),ch=n(t.ch,0);if(Math.abs(ch)>5)return{score:0,dir:'NEUTRAL',type:'NONE'};
    if(f<-0.0003&&oi>1)return{score:clamp2(Math.abs(f)*15000+oi*8,0,100),dir:'LONG',type:'SHORT_SQUEEZE'};
    if(f>0.0003&&oi>1)return{score:clamp2(f*15000+oi*8,0,100),dir:'SHORT',type:'LONG_SQUEEZE'};
    if(oi>3&&Math.abs(ch)<2)return{score:clamp2(oi*6,0,50),dir:f<0?'LONG':f>0?'SHORT':'NEUTRAL',type:f<0?'SHORT_SQUEEZE':'LONG_SQUEEZE'};
    return{score:0,dir:'NEUTRAL',type:'NONE'};
  }
  function cfCorrBreak(t){
    if(!t||t.sym===CFG_BTC||_cfSnaps.length<20)return{score:0,dir:'NEUTRAL',corr:0};
    var bp=[],ap=[];for(var i=Math.max(0,_cfSnaps.length-40);i<_cfSnaps.length;i++){var b=_cfSnaps[i].prices.get(CFG_BTC),a=_cfSnaps[i].prices.get(t.sym);if(b&&a){bp.push(b);ap.push(a);}}
    if(bp.length<12)return{score:0,dir:'NEUTRAL',corr:0};
    var br=[],ar=[];for(var i=1;i<bp.length;i++){br.push((bp[i]-bp[i-1])/bp[i-1]);ar.push((ap[i]-ap[i-1])/ap[i-1]);}
    var nn=br.length,sx=0,sy=0,sxy=0,sx2=0,sy2=0;
    for(var i=0;i<nn;i++){sx+=br[i];sy+=ar[i];sxy+=br[i]*ar[i];sx2+=br[i]*br[i];sy2+=ar[i]*ar[i];}
    var den=Math.sqrt((nn*sx2-sx*sx)*(nn*sy2-sy*sy));var corr=den>0?(nn*sxy-sx*sy)/den:0;
    var drop=0.75-corr;if(drop<0.25)return{score:5,dir:'NEUTRAL',corr:corr};
    var btcCh=n(_btcT()&&_btcT().ch,0),altCh=n(t.ch,0);
    return{score:clamp2(drop*120,0,100),dir:altCh>btcCh?'LONG':altCh<btcCh?'SHORT':'NEUTRAL',corr:corr};
  }
  function cfVolAnomaly(t){
    var vol=n(t.vol,0),v24=n(t.vol24,0),ch=n(t.ch,0);if(v24<=0)return{score:0,dir:'NEUTRAL',vr:0};
    var vr=vol/(v24/24);if(vr<1.8||Math.abs(ch)>4)return{score:Math.min(15,vr*5),dir:'NEUTRAL',vr:vr};
    var sc=clamp2((vr-1.5)*25+(4-Math.abs(ch))*8,0,100);
    var d='NEUTRAL';if(n(t.fund,0)<-0.0001&&n(t.rsi,50)<50)d='LONG';else if(n(t.fund,0)>0.0001&&n(t.rsi,50)>50)d='SHORT';else if(n(t.rsi,50)<40)d='LONG';else if(n(t.rsi,50)>60)d='SHORT';
    return{score:sc,dir:d,vr:vr};
  }
  function cfSectorFlow(t){
    if(!t.c||t.c==='all')return{score:0,dir:'NEUTRAL',to:'',from:''};
    var sa={},sc2={};if(Z.tokens)for(var i=0;i<Z.tokens.length;i++){var tk=Z.tokens[i],c=tk.c||'all';if(c==='all')continue;if(!sa[c]){sa[c]=0;sc2[c]=0;}sa[c]+=n(tk.ch,0);sc2[c]++;}
    for(var k in sa)if(sc2[k])sa[k]/=sc2[k];
    var my=sa[t.c]||0,bi='',bv=-999,wo='',wv=999;
    for(var k in sa){if(sa[k]>bv){bv=sa[k];bi=k;}if(sa[k]<wv){wv=sa[k];wo=k;}}
    var lag=my-n(t.ch,0),isIn=t.c===bi&&bv>1;
    if(isIn&&lag>0.5)return{score:clamp2(lag*12+bv*5,0,100),dir:'LONG',to:bi,from:wo};
    if(t.c===wo&&wv<-1)return{score:clamp2(Math.abs(wv)*5,0,60),dir:'SHORT',to:bi,from:wo};
    return{score:0,dir:'NEUTRAL',to:bi,from:wo};
  }
  function cfSession(t){
    var h=new Date().getUTCHours(),m=new Date().getUTCMinutes();
    var ses=h<8?'ASIA':h<14?'LONDON':'NY';var ch=n(t.ch,0),ac=Math.abs(ch),vol=n(t.vol,0),v24=n(t.vol24,0);
    var vr=v24>0?(vol/(v24/24)):1;var sc=0,d='NEUTRAL',pat='';
    if(ses==='ASIA'&&vr<0.8&&ac<2){if(n(t.rsi,50)<45&&n(t.fund,0)<0){sc=35;d='LONG';pat='ASIA_ACCUM';}else if(n(t.rsi,50)>55&&n(t.fund,0)>0){sc=35;d='SHORT';pat='ASIA_DIST';}}
    if(ses==='LONDON'&&h<=10&&ac>=1.5&&ac<=6&&vr>=1.3){sc=clamp2(ac*10+vr*8,0,70);d=ch>0?'LONG':'SHORT';pat='LONDON_BREAK';}
    if(ses==='NY'&&h>=14&&h<=16&&ac>=2&&vr>=1.5){sc=clamp2(ac*8+vr*6,0,60);d=ch>0?'LONG':'SHORT';pat='NY_SURGE';}
    return{score:sc,dir:d,session:ses,pattern:pat};
  }
  function computeConfluence(t){
    var layers=[
      {name:'LEAD_LAG',score:0,dir:'NEUTRAL'},{name:'FUND_OI',score:0,dir:'NEUTRAL'},
      {name:'CORR_BREAK',score:0,dir:'NEUTRAL'},{name:'VOL_ANOMALY',score:0,dir:'NEUTRAL'},
      {name:'SECTOR_FLOW',score:0,dir:'NEUTRAL'},{name:'SESSION',score:0,dir:'NEUTRAL'}
    ];
    try{var r=cfLeadLag(t);layers[0].score=r.score;layers[0].dir=r.dir;layers[0].data=r;}catch(e){}
    try{var r=cfFundOI(t);layers[1].score=r.score;layers[1].dir=r.dir;layers[1].data=r;}catch(e){}
    try{var r=cfCorrBreak(t);layers[2].score=r.score;layers[2].dir=r.dir;layers[2].data=r;}catch(e){}
    try{var r=cfVolAnomaly(t);layers[3].score=r.score;layers[3].dir=r.dir;layers[3].data=r;}catch(e){}
    try{var r=cfSectorFlow(t);layers[4].score=r.score;layers[4].dir=r.dir;layers[4].data=r;}catch(e){}
    try{var r=cfSession(t);layers[5].score=r.score;layers[5].dir=r.dir;layers[5].data=r;}catch(e){}
    var lc=0,sc2=0,ls=0,ss=0,ta=0;
    for(var i=0;i<6;i++){if(layers[i].score>15){ta++;if(layers[i].dir==='LONG'){lc++;ls+=layers[i].score;}else if(layers[i].dir==='SHORT'){sc2++;ss+=layers[i].score;}}}
    var d=lc>sc2?'LONG':sc2>lc?'SHORT':'NEUTRAL';var ag=Math.max(lc,sc2);
    var ts2=d==='LONG'?ls:d==='SHORT'?ss:0;var cs=clamp2(ts2*(0.5+ag*0.15),0,100);
    var lv=ag>=4?'HIGH':ag>=3?'MEDIUM':ag>=2?'LOW':'NONE';
    return{direction:d,score:cs,level:lv,agreeing:ag,totalActive:ta,layers:layers,longCount:lc,shortCount:sc2};
  }
  function cfAlert(t,conf){
    if(conf.level==='NONE'||conf.level==='LOW')return;
    if(Date.now()-(t._lastCfA||0)<300000)return;t._lastCfA=Date.now();
    /* ── POPUP TOAST ── */
    var sig = t.signal || {};
    var layers = (conf.layers||[]).filter(function(l){return l.score>15;}).map(function(l){return l.name.replace('_',' ');}).join(', ');
    var chNow = n(t.ch,0).toFixed(1);
    var popupSymbol = t.s || t.sym || 'UNKNOWN';
    var exchange = Array.isArray(t.ex) && t.ex.length ? t.ex[0] : 'BNB';
    showToast({
      icon: conf.direction==='LONG'?'🟢':'🔴',
      title: (t.s||t.sym)+' — '+conf.direction+' ('+conf.agreeing+'/6 '+conf.level+')',
      detail: layers+'\nch: '+chNow+'% | opp: '+n(sig.opportunity_score,0).toFixed(0)+' | state: '+(sig.state||'—'),
      cls: conf.direction==='LONG'?'long':conf.direction==='SHORT'?'short':'high',
      symbol: popupSymbol,
      direction: conf.direction,
      confidence: Math.round(conf.score || 0),
      opportunity: n(sig.opportunity_score, 0),
      state: sig.state,
      exchange,
      marketType: Z.market === 'coinm' ? 'COIN-M' : 'USDⓈ-M',
      dedupKey: `${String(popupSymbol).toUpperCase()}|${conf.direction}|${conf.level}`
    });
    /* ── SOUND ── */
    if(!Z.voiceEnabled)return;
    try{var ctx=new(window.AudioContext||window.webkitAudioContext)();var o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);g.gain.value=conf.level==='HIGH'?0.25:0.15;
    o.frequency.value=conf.direction==='LONG'?660:440;o.type=conf.direction==='LONG'?'sine':'sawtooth';
    o.start();o.stop(ctx.currentTime+0.35);
    if(conf.level==='HIGH'){setTimeout(function(){try{var o2=ctx.createOscillator(),g2=ctx.createGain();o2.connect(g2);g2.connect(ctx.destination);g2.gain.value=0.2;o2.frequency.value=conf.direction==='LONG'?880:330;o2.type='sine';o2.start();o2.stop(ctx.currentTime+0.25);}catch(e){}},300);}
    if('speechSynthesis'in window&&conf.level==='HIGH'){var u=new SpeechSynthesisUtterance((conf.direction==='LONG'?'Long':'Short')+' confluence '+(t.s||t.sym));u.rate=1.1;u.volume=0.8;u.lang='en-US';speechSynthesis.speak(u);}
    }catch(e){}
  }
  const ALERT_POPUP_TTL_MS = 21000;
  const ALERT_POPUP_DEDUP_WINDOW_MS = 15000;
  const ALERT_POPUP_CONTAINER_ID = 'pxToastBox';

  function createAlertPopupStore() {
    const entries = new Map();
    const dedupIndex = new Map();
    let pruneTimer = null;
    const now = () => Date.now();

    function ensureTimer() {
      if (pruneTimer) return;
      pruneTimer = setInterval(() => pruneExpired(), 1000);
    }

    function pruneExpired() {
      const threshold = now();
      let changed = false;
      for (const [id, record] of entries) {
        if (record.autoCloseAt <= threshold) {
          entries.delete(id);
          if (dedupIndex.get(record.dedupKey) === id) dedupIndex.delete(record.dedupKey);
          changed = true;
        }
      }
      if (changed) render();
    }

    function render() {
      const box = document.getElementById(ALERT_POPUP_CONTAINER_ID);
      if (!box) return;
      box.innerHTML = '';
      const ordered = Array.from(entries.values()).sort((a, b) => b.timestamp - a.timestamp);
      ordered.slice(0, 5).forEach(record => {
        const el = document.createElement('div');
        el.className = `px-toast ${record.cls || ''}`.trim();
        const icon = document.createElement('span');
        icon.className = 'px-toast-icon';
        icon.textContent = record.icon || '⚡';
        const body = document.createElement('div');
        body.className = 'px-toast-body';
        const title = document.createElement('div');
        title.className = 'px-toast-title';
        title.textContent = record.title || '';
        const detail = document.createElement('div');
        detail.className = 'px-toast-detail';
        detail.innerHTML = (record.detail || '').replace(/\n/g, '<br>');
        const time = document.createElement('div');
        time.className = 'px-toast-time';
        time.textContent = new Date(record.timestamp).toLocaleTimeString();
        body.appendChild(title);
        body.appendChild(detail);
        body.appendChild(time);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'px-toast-close';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', e => {
          e.stopPropagation();
          remove(record.id);
        });
        el.appendChild(icon);
        el.appendChild(body);
        el.appendChild(closeBtn);
        el.addEventListener('click', () => {
          if (record.symbol) {
            openToken(record.symbol, { sub: 'Alert Popup', hint: record.title || '' });
          }
        });
        box.appendChild(el);
      });
    }

    function remove(id) {
      const record = entries.get(id);
      if (!record) return;
      entries.delete(id);
      if (dedupIndex.get(record.dedupKey) === id) dedupIndex.delete(record.dedupKey);
      render();
    }

    function upsert(popup) {
      const timestamp = now();
      const key = popup.dedupKey || `${String(popup.symbol || 'UNKNOWN').toUpperCase()}|${popup.direction||''}|${popup.state||''}`;
      const existingId = dedupIndex.get(key);
      if (existingId) {
        const existing = entries.get(existingId);
        if (existing && timestamp - existing.timestamp <= ALERT_POPUP_DEDUP_WINDOW_MS) {
          existing.timestamp = timestamp;
          existing.autoCloseAt = timestamp + ALERT_POPUP_TTL_MS;
          existing.title = popup.title;
          existing.detail = popup.detail;
          existing.cls = popup.cls;
          existing.icon = popup.icon;
          existing.confidence = popup.confidence;
          existing.opportunity = popup.opportunity;
          existing.state = popup.state;
          existing.direction = popup.direction;
          existing.exchange = popup.exchange;
          existing.marketType = popup.marketType;
          render();
          ensureTimer();
          return existing;
        }
      }
      const id = popup.id || (window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `alert_popup_${timestamp}_${Math.random().toString(36).slice(2)}`);
      const record = {
        id,
        dedupKey: key,
        symbol: popup.symbol,
        direction: popup.direction,
        confidence: popup.confidence,
        opportunity: popup.opportunity,
        state: popup.state,
        exchange: popup.exchange,
        marketType: popup.marketType,
        title: popup.title,
        detail: popup.detail,
        icon: popup.icon,
        cls: popup.cls,
        timestamp,
        autoCloseAt: timestamp + ALERT_POPUP_TTL_MS
      };
      entries.set(id, record);
      dedupIndex.set(key, id);
      render();
      ensureTimer();
      return record;
    }

    return { upsert, remove, pruneExpired };
  }

  const alertPopupStore = createAlertPopupStore();

  function showToast(opts){
    alertPopupStore.upsert({
      id: opts.id,
      dedupKey: opts.dedupKey,
      symbol: opts.symbol,
      direction: opts.direction,
      confidence: opts.confidence,
      opportunity: opts.opportunity,
      state: opts.state,
      exchange: opts.exchange,
      marketType: opts.marketType,
      title: opts.title,
      detail: opts.detail,
      icon: opts.icon,
      cls: opts.cls
    });
  }
  setInterval(cfSnap,30000);setTimeout(cfSnap,3000);



  function adminCfg(){
    return (Z.proptrex && Z.proptrex.admin) ? Z.proptrex.admin : defaultAdminConfig();
  }
  function parseAdminSymbolList(v){
    return String(v || '').split(/[\s,;\n\r]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
  }
  function symbolAllowedByAdmin(sym){
    const cfg = adminCfg();
    const allow = parseAdminSymbolList(cfg.manualIncludeSymbols);
    const deny = parseAdminSymbolList(cfg.manualExcludeSymbols);
    const s = String(sym || '').toUpperCase();
    if (allow.length && !allow.includes(s)) return false;
    if (deny.includes(s)) return false;
    return true;
  }
  function manualPriorityBoost(sym){
    const cfg = adminCfg();
    const pins = parseAdminSymbolList(cfg.manualPrioritySymbols);
    return pins.includes(String(sym || '').toUpperCase()) ? 24 : 0;
  }
  function alertRateOk(sym){
    const cfg = adminCfg();
    const now = Date.now();
    const bucket = Z.proptrex.alertHourly.get(sym) || [];
    const next = bucket.filter(ts => now - ts < 3600000);
    if (next.length >= Math.max(1, n(cfg.maxAlertsPerSymbolPerHour, 8))) {
      Z.proptrex.alertHourly.set(sym, next);
      return false;
    }
    next.push(now);
    Z.proptrex.alertHourly.set(sym, next);
    return true;
  }
  function discoveryScore(t, sig, scan){
    const cfg = adminCfg();
    const changeAbs = Math.abs(n(t.ch, 0));
    const volBase = Math.max(n(t.vol24, 0) / 24, 1);
    const volAccel = Math.max(0, n(t.vol, 0) / volBase);
    const rangePct = (n(t.hi, 0) > 0 && n(t.lo, 0) > 0 && n(t.price, 0) > 0) ? (Math.abs(n(t.hi, 0) - n(t.lo, 0)) / n(t.price, 1)) * 100 : 0;
    const breakout = (n(t.hi, 0) > 0 && n(t.price, 0) >= n(t.hi, 0) * 0.9975) || (n(t.lo, 0) > 0 && n(t.price, 0) <= n(t.lo, 0) * 1.0025) ? 1 : 0;
    const moveGate = changeAbs >= n(cfg.discoveryChangePct, 8) ? Math.min(32, changeAbs * 0.90) : changeAbs * 0.35;
    const accelGate = volAccel >= n(cfg.discoveryVolumeAccel, 1.2) ? Math.min(30, volAccel * 6.5) : volAccel * 2.5;
    const scanGate = scan ? Math.min(20, n(scan.hotScore || scan.score, 0) * 0.20) : 0;
    const listingGate = t.nw ? 8 : 0;
    const rangeGate = Math.min(14, rangePct * 0.45);
    return clamp2(moveGate + accelGate + scanGate + listingGate + rangeGate + (breakout ? 10 : 0) + manualPriorityBoost(t.sym), 0, 100);
  }
  function visibilityPenalty(sym, discovery){
    const cfg = adminCfg();
    const seen = Z.proptrex.visibilitySeen.get(sym);
    if (!seen) return 0;
    const ageMin = (Date.now() - n(seen.ts, 0)) / 60000;
    if (ageMin >= n(cfg.exposureWindowMinutes, 45)) return 0;
    const freshness = 1 - (ageMin / Math.max(1, n(cfg.exposureWindowMinutes, 45)));
    const base = n(cfg.exposurePenalty, 7) * n(seen.count, 0) * freshness;
    const relief = discovery >= 70 ? 0.15 : discovery >= 55 ? 0.45 : 1;
    return base * relief;
  }
  function noteVisibility(arr){
    const now = Date.now();
    arr.slice(0, 24).forEach((t, idx) => {
      const cur = Z.proptrex.visibilitySeen.get(t.sym) || { count: 0, ts: 0, rank: 999 };
      const reset = now - n(cur.ts, 0) > 15 * 60000;
      cur.count = reset ? 1 : Math.min(30, cur.count + 1);
      cur.ts = now;
      cur.rank = idx + 1;
      Z.proptrex.visibilitySeen.set(t.sym, cur);
    });
    for (const [sym, meta] of Array.from(Z.proptrex.visibilitySeen.entries())) {
      if (now - n(meta.ts, 0) > 90 * 60000) Z.proptrex.visibilitySeen.delete(sym);
    }
  }

  function whaleMetrics(t){
    const now = Date.now();
    const hits = (Z.whales || []).filter(w => w.sym === t.sym && now - new Date(w.tm).getTime() < 45 * 60 * 1000);
    let usd = 0, buy = 0, sell = 0;
    for (const w of hits) {
      usd += n(w.usd, 0);
      if (String(w.side || '').toLowerCase() === 'buy') buy += n(w.usd, 0);
      if (String(w.side || '').toLowerCase() === 'sell') sell += n(w.usd, 0);
    }
    const bias = buy === sell ? 'NEUTRAL' : buy > sell ? 'BUY' : 'SELL';
    const scoreBase = usd > 0 ? clamp2(Math.log10(usd + 1) * 14, 0, 100) : 0;
    const score = clamp2(scoreBase + (bias === 'BUY' || bias === 'SELL' ? 8 : 0) + (t.wh && t.wh.on ? 10 : 0), 0, 100);
    return { count: hits.length, usd, bias, score, buy, sell };
  }

  function structureMetrics(t){
    const hist = Array.isArray(t.hist) ? t.hist : [];
    const sl = recentSlice(hist, 80);
    if (!sl.length) return { trend: 'NEUTRAL', higherLow: false, lowerHigh: false, validity: 35, hi: t.price, lo: t.price };
    const hi = Math.max(...sl);
    const lo = Math.min(...sl);
    const q1 = sl.slice(0, Math.max(3, Math.floor(sl.length / 2)));
    const q2 = sl.slice(Math.max(0, sl.length - Math.max(3, Math.floor(sl.length / 2))));
    const lo1 = Math.min(...q1), lo2 = Math.min(...q2), hi1 = Math.max(...q1), hi2 = Math.max(...q2);
    const higherLow = lo2 > lo1 * 0.999;
    const lowerHigh = hi2 < hi1 * 1.001;
    const upBias = (higherLow ? 1 : 0) + ((t.macd && t.macd.h > 0) ? 1 : 0) + (n(t.rsi,50) >= 50 ? 1 : 0);
    const dnBias = (lowerHigh ? 1 : 0) + ((t.macd && t.macd.h < 0) ? 1 : 0) + (n(t.rsi,50) <= 50 ? 1 : 0);
    const trend = upBias === dnBias ? 'NEUTRAL' : (upBias > dnBias ? 'BULLISH' : 'BEARISH');
    const validity = clamp2(40 + (higherLow ? 18 : 0) + (lowerHigh ? 18 : 0) + Math.min(Math.abs(n(t.ch, 0)) * 2.5, 12), 20, 95);
    return { trend, higherLow, lowerHigh, validity, hi, lo, hi1, hi2, lo1, lo2 };
  }

  function accumulationScore(t, structure, whale, scan){
    const lowSocial = !String(t.socialStatus || '').trim();
    const spreadNormal = !scan || Math.abs(n(scan.spreadNum, 0)) <= 0.35;
    const orderbookSupport = scan ? (n(scan.obi, 0) > 0.12 ? 1 : 0) : 0;
    const freshDemand = structure.higherLow ? 1 : 0;
    const proximity = Math.max(0, 100 - n(t.entry_distance_pct, 100));
    let score = 18;
    score += structure.higherLow ? 18 : 0;
    score += whale.bias === 'BUY' ? 15 : 0;
    score += lowSocial ? 8 : 3;
    score += spreadNormal ? 8 : 0;
    score += orderbookSupport ? 13 : 0;
    score += freshDemand ? 10 : 0;
    score += proximity * 0.18;
    return clamp2(score, 0, 100);
  }

  function detectDirection(t, structure, whale, scan){
    let bull = 0, bear = 0;
    const rsi = n(t.rsi, 50), hist = n(t.macd && t.macd.h, 0), ch = n(t.ch, 0), fund = n(t.fund, 0);
    if (structure.trend === 'BULLISH') bull += 2; if (structure.trend === 'BEARISH') bear += 2;
    if (rsi >= 55) bull += 1.2; if (rsi <= 45) bear += 1.2;
    if (rsi >= 78) bear += 0.5; if (rsi <= 22) bull += 0.5;
    if (hist > 0) bull += 1.2; else if (hist < 0) bear += 1.2;
    if (fund < -0.0003) bull += 0.6; else if (fund > 0.0003) bear += 0.6;
    if (ch > 0.8) bull += Math.min(1.2, ch * 0.1); else if (ch < -0.8) bear += Math.min(1.2, Math.abs(ch) * 0.1);
    if (Math.abs(ch) >= 30) { if (ch > 0) bull *= 0.7; else bear *= 0.7; }
    if (whale.bias === 'BUY') bull += 1.4; else if (whale.bias === 'SELL') bear += 1.4;
    if (scan) {
      if (n(scan.buyPct, 50) >= 55) bull += 1.0; if (n(scan.buyPct, 50) <= 45) bear += 1.0;
      if (n(scan.obi, 0) > 0.12) bull += 0.7; if (n(scan.obi, 0) < -0.12) bear += 0.7;
    }
    var conf = computeConfluence(t); t._confluence = conf;
    if (conf.agreeing >= 3 && conf.score >= 30) {
      if (conf.direction === 'LONG') bull += conf.agreeing * 2;
      else if (conf.direction === 'SHORT') bear += conf.agreeing * 2;
    }
    if (bull === bear) return ch >= 0 ? 'LONG' : 'SHORT';
    return bull > bear ? 'LONG' : 'SHORT';
  }

  function detectSetupType(t, direction, structure, whale, scan, accum){
    if (direction === 'LONG' && accum >= 68) return 'ACCUMULATION';
    if (direction === 'SHORT' && n(t.trap, 0) >= 55) return 'DISTRIBUTION';
    if (scan && n(scan.hotScore || scan.score, 0) >= 82) return 'MOMENTUM';
    if (Math.abs(n(t.ch,0)) >= 4) return 'BREAKOUT';
    return 'MEAN_REVERSION';
  }

  function buildEntryZone(t, direction, atr, structure, setupType){
    const price = n(t.price, 0);
    const swingHi = Number.isFinite(structure.hi) ? structure.hi : price;
    const swingLo = Number.isFinite(structure.lo) ? structure.lo : price;
    const zoneWidth = Math.max(atr * (setupType === 'ACCUMULATION' ? 1.15 : 0.85), price * 0.0035);
    let low, high;
    if (direction === 'LONG') {
      const anchor = setupType === 'ACCUMULATION'
        ? Math.max(swingLo, price - atr * 1.25)
        : Math.max(swingLo + (swingHi - swingLo) * 0.18, price - atr * 0.9);
      low = anchor;
      high = anchor + zoneWidth;
    } else {
      const anchor = setupType === 'DISTRIBUTION'
        ? Math.min(swingHi, price + atr * 1.25)
        : Math.min(swingHi - (swingHi - swingLo) * 0.18, price + atr * 0.9);
      high = anchor;
      low = anchor - zoneWidth;
    }
    if (low > high) { const x = low; low = high; high = x; }
    low = Math.max(0.00000001, low);
    high = Math.max(low, high);
    const stop = direction === 'LONG'
      ? Math.max(0.00000001, low - Math.max(atr * 0.9, price * 0.004))
      : high + Math.max(atr * 0.9, price * 0.004);
    return { low, high, stop };
  }

  const TF_MOVE_FLOORS = {
    '1m':  [0.18, 0.32, 0.48, 0.66],
    '5m':  [0.32, 0.55, 0.82, 1.10],
    '15m': [0.55, 0.95, 1.40, 1.95],
    '30m': [0.82, 1.38, 2.05, 2.85],
    '1h':  [1.18, 1.95, 2.90, 4.00],
    '2h':  [1.65, 2.70, 4.05, 5.65],
    '4h':  [2.30, 3.85, 5.75, 8.10],
    '1d':  [3.80, 6.20, 9.40, 13.80]
  };

  const TF_BREAKOUT_PROJ = {
    '1m':  [0.12, 0.24, 0.38, 0.54],
    '5m':  [0.18, 0.34, 0.54, 0.76],
    '15m': [0.24, 0.44, 0.70, 1.00],
    '30m': [0.32, 0.58, 0.92, 1.30],
    '1h':  [0.40, 0.74, 1.16, 1.64],
    '2h':  [0.52, 0.96, 1.48, 2.10],
    '4h':  [0.72, 1.28, 1.98, 2.80],
    '1d':  [1.05, 1.90, 2.95, 4.20]
  };

  function buildTpMatrix(t, direction, entryLow, entryHigh, stop, atr, structure, whale, scan){
    const entryMid = mid(entryLow, entryHigh);
    const baseRisk = Math.max(Math.abs(entryMid - stop), atr * 0.60, entryMid * 0.0028);
    const matrix = {};
    const obiBoost = scan ? Math.max(0, Math.abs(n(scan.obi, 0))) : 0;
    const whaleBoost = whale.bias === 'BUY' || whale.bias === 'SELL' ? 0.12 : 0;
    for (const tf of TF_LIST) {
      const conf = TF_CONF[tf] || TF_CONF['1h'];
      const ctx = tfContext(t, tf, atr);
      const structTf = ctx.structure || structure;
      const atrTf = Math.max(ctx.atr, atr * conf.atrMul);
      const rangeTf = Math.max(n(ctx.range, 0), atrTf * (2.2 + conf.structMul * 0.30));
      const floors = (TF_MOVE_FLOORS[tf] || TF_MOVE_FLOORS['1h']).map(p => entryMid * (p / 100));
      const proj = TF_BREAKOUT_PROJ[tf] || TF_BREAKOUT_PROJ['1h'];
      const trendAlign = direction === 'LONG'
        ? (structTf.higherLow ? 1.10 : structTf.lowerHigh ? 0.92 : 1)
        : (structTf.lowerHigh ? 1.10 : structTf.higherLow ? 0.92 : 1);
      const riskTf = Math.max(baseRisk * (0.88 + conf.structMul * 0.32), atrTf * (1.10 + conf.structMul * 0.14), floors[0]) * trendAlign * (1 + obiBoost * 0.18 + whaleBoost);
      const spacing1 = Math.max(atrTf * 0.50, floors[1] - floors[0], rangeTf * 0.08);
      const spacing2 = Math.max(atrTf * 0.72, floors[2] - floors[1], rangeTf * 0.12);
      const spacing3 = Math.max(atrTf * 0.96, floors[3] - floors[2], rangeTf * 0.18);
      if (direction === 'LONG') {
        const anchor = Math.max(entryMid, n(structTf.hi, entryMid));
        const tp1 = Math.max(entryMid + floors[0], entryMid + riskTf * 0.68, anchor - atrTf * 0.10);
        const tp2 = Math.max(tp1 + spacing1, anchor + rangeTf * proj[1] + atrTf * 0.18, entryMid + floors[1]);
        const tp3 = Math.max(tp2 + spacing2, anchor + rangeTf * proj[2] + atrTf * 0.42, entryMid + floors[2]);
        const tp4 = Math.max(tp3 + spacing3, anchor + rangeTf * proj[3] + atrTf * 0.80, entryMid + floors[3]);
        matrix[tf] = { tp1, tp2, tp3, tp4 };
      } else {
        const anchor = Math.min(entryMid, n(structTf.lo, entryMid));
        const tp1 = Math.min(entryMid - floors[0], entryMid - riskTf * 0.68, anchor + atrTf * 0.10);
        const tp2 = Math.min(tp1 - spacing1, anchor - rangeTf * proj[1] - atrTf * 0.18, entryMid - floors[1]);
        const tp3 = Math.min(tp2 - spacing2, anchor - rangeTf * proj[2] - atrTf * 0.42, entryMid - floors[2]);
        const tp4 = Math.min(tp3 - spacing3, anchor - rangeTf * proj[3] - atrTf * 0.80, entryMid - floors[3]);
        matrix[tf] = { tp1, tp2, tp3, tp4 };
      }
    }
    return matrix;
  }

  function buildReasons(t, direction, setupType, structure, whale, scan, entryDistance, accum){
    const out = [];
    const rsi = n(t.rsi, 50);
    const ch = n(t.ch, 0);
    if (direction === 'LONG' && structure.higherLow) out.push('higher low structure korunuyor');
    if (direction === 'SHORT' && structure.lowerHigh) out.push('lower high structure baskısı sürüyor');
    if (direction === 'LONG' && rsi <= 46) out.push('RSI baskıdan toparlanma alanında');
    if (direction === 'SHORT' && rsi >= 54) out.push('RSI yukarıda doygunluğa yaklaşıyor');
    if (t.macd && t.macd.h > 0 && direction === 'LONG') out.push('MACD histogram pozitif akıyor');
    if (t.macd && t.macd.h < 0 && direction === 'SHORT') out.push('MACD histogram negatif akıyor');
    if (whale.bias === 'BUY' && direction === 'LONG') out.push(`balina akışı alım tarafında (${fmt(whale.usd || 0, 2)} USD)`);
    if (whale.bias === 'SELL' && direction === 'SHORT') out.push(`balina akışı satış tarafında (${fmt(whale.usd || 0, 2)} USD)`);
    if (scan && n(scan.obi,0) > 0.12 && direction === 'LONG') out.push('orderbook dengesinde bid tarafı güçlü');
    if (scan && n(scan.obi,0) < -0.12 && direction === 'SHORT') out.push('orderbook dengesinde ask tarafı baskın');
    if (scan && n(scan.buyPct,50) >= 56 && direction === 'LONG') out.push('taker buy oranı execution lehine');
    if (scan && n(scan.buyPct,50) <= 44 && direction === 'SHORT') out.push('taker sell oranı execution lehine');
    if (setupType === 'ACCUMULATION') out.push(`dip/toplama puanı yüksek (${accum.toFixed(0)})`);
    if (setupType === 'MOMENTUM') out.push('hacim ve fiyat akışı momentum teyidi veriyor');
    if (entryDistance <= 0.2) out.push('fiyat entry zonu içinde');
    else if (entryDistance <= 1.0) out.push('fiyat entry zonuna yakın');
    if (Math.abs(ch) >= 4) out.push(`24s momentum belirgin (${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%)`);
    const uniq = [];
    const seen = new Set();
    for (const x of out) {
      const k = x.toLowerCase();
      if (!seen.has(k)) { seen.add(k); uniq.push(x); }
    }
    return uniq.slice(0, 6);
  }

  function whyScoreFromReasons(reasons, structure, whale, scan){
    let score = 40 + reasons.length * 7;
    score += n(structure.validity, 0) * 0.15;
    score += n(whale.score, 0) * 0.12;
    if (scan) score += clamp2(n(scan.hotScore || scan.score, 0), 0, 100) * 0.12;
    return clamp2(score, 0, 100);
  }

  function freshnessScore(t, whale, scan){
    let score = 42;
    score += whale.count ? Math.min(26, whale.count * 6) : 0;
    score += scan ? 22 : 0;
    score += Math.min(16, Math.abs(n(t.ch, 0)) * 1.6);
    return clamp2(score, 0, 100);
  }

  function determineState(direction, opp, entryDistance, trap, fresh, accum, scan){
    const cfg = adminCfg();
    if (trap >= n(cfg.invalidationTrap, 82)) return 'INVALIDATED';
    if (entryDistance <= n(cfg.executionEntryDist, 0.18) && opp >= n(cfg.executionThreshold, 70)) return 'EXECUTION';
    if (entryDistance <= n(cfg.priorityEntryDist, 0.80) && opp >= n(cfg.priorityThreshold, 72)) return 'PRIORITY';
    if (opp >= n(cfg.tradeableThreshold, 58) && fresh >= n(cfg.freshnessThreshold, 55)) return 'TRADEABLE';
    if (accum >= 70 && direction === 'LONG') return 'WATCHLIST';
    if (scan && opp >= Math.max(50, n(cfg.tradeableThreshold, 58) - 6)) return 'TRADEABLE';
    return 'WATCHLIST';
  }

  function primaryTfFor(setupType){
    if (setupType === 'ACCUMULATION') return '4h';
    if (setupType === 'MOMENTUM') return '15m';
    if (setupType === 'BREAKOUT') return '1h';
    return '1h';
  }

  function panelRank(candidate, structure, whale, scan){
    const stateW = (STATE_ORDER[candidate.state] || 0) * 24;
    const entryW = Math.max(0, 100 - n(candidate.entry_distance_pct, 100)) * 0.65;
    const structW = n(structure.validity, 0) * 0.38;
    const whaleW = n(whale.score, 0) * 0.28;
    const freshW = n(candidate.freshness, 0) * 0.18;
    const oppW = n(candidate.opportunity_score, 0) * 0.30;
    const accumW = n(candidate.accumulation_score, 0) * 0.18;
    const exchangeBoost = (t => Array.isArray(t.ex) && t.ex.length ? 8 : 0)(candidate.__token || {});
    const bigExchangeBoost = (candidate.__token && Array.isArray(candidate.__token.ex) && candidate.__token.ex.includes('BNB')) ? 7 : 0;
    const scanBoost = scan ? Math.min(12, n(scan.hotScore || scan.score, 0) * 0.08) : 0;
    const disc = n(candidate.discovery_score, 0);
    const discoveryW = disc * 0.42;
    const exposureW = visibilityPenalty(candidate.symbol, disc);
    return clamp2(stateW + entryW + structW + whaleW + freshW + oppW + accumW + exchangeBoost + bigExchangeBoost + scanBoost + discoveryW - exposureW, 0, 999);
  }

  function buildExecutionBlock(sig){
    return `${sig.direction} setup · Entry ${fp(sig.entry_low)}–${fp(sig.entry_high)} · Stop ${fp(sig.stop_loss)} · Primary TF ${sig.primary_tf}`;
  }
  function buildInvalidationBlock(sig){
    if (sig.direction === 'LONG') return `Entry altı yapı kaybı veya ${fp(sig.stop_loss)} altında kabul INVALIDATION üretir.`;
    return `Entry üstü yapı kaybı veya ${fp(sig.stop_loss)} üzerinde kabul INVALIDATION üretir.`;
  }

  function buildTelegramMessage(sig){
    const lines = [];
    lines.push(`${sig.symbol} | ${sig.direction} | ${sig.state}`);
    if(sig.confluence&&sig.confluence.agreeing>=2){var _cl=sig.confluence.layers.filter(l=>l.score>15).map(l=>l.name).join('+');lines.push(`Confluence: ${sig.confluence.agreeing}/6 ${sig.confluence.level} — ${_cl}`);}
    lines.push(`Primary TF: ${sig.primary_tf} | Setup: ${sig.setup_type}`);
    lines.push(`Opportunity: ${sig.opportunity_score.toFixed(0)} | Why: ${sig.why_score.toFixed(0)} | Freshness: ${sig.freshness.toFixed(0)}`);
    lines.push(`Entry Zone: ${fp(sig.entry_low)} - ${fp(sig.entry_high)}`);
    lines.push(`Stop Loss: ${fp(sig.stop_loss)}`);
    lines.push('TP MATRIX');
    for (const tf of TF_LIST) {
      const m = sig.tp_matrix[tf];
      lines.push(`${tf}: TP1 ${fp(m.tp1)} | TP2 ${fp(m.tp2)} | TP3 ${fp(m.tp3)} | TP4 ${fp(m.tp4)}`);
    }
    lines.push(`Execution: ${sig.execution_block}`);
    lines.push(`Invalidation: ${sig.invalidation_block}`);
    return lines.join('\n');
  }

  function candidateFingerprint(c){
    return [
      c.state,
      c.direction,
      c.setup_type,
      Math.round(c.entry_distance_pct * 10) / 10,
      Math.round(c.opportunity_score),
      Math.round(c.why_score),
      Math.round(c.stop_loss * 1000000) / 1000000
    ].join('|');
  }

  function makeCandidate(t){
    if (!t || !Number.isFinite(n(t.price, NaN)) || n(t.price, 0) <= 0) return null;
    if (!symbolAllowedByAdmin(t.sym)) return null;
    const structure = structureMetrics(t);
    const whale = whaleMetrics(t);
    const scan = scannerFor(t.sym);
    const atr = Math.max(n(calcATRLite(t.hist, 14), 0), n(t.price, 0) * 0.0045);
    const direction = detectDirection(t, structure, whale, scan);
    const baselineProbe = { entry_distance_pct: 0 };
    const accum0 = accumulationScore(baselineProbe, structure, whale, scan);
    const setupType = detectSetupType(t, direction, structure, whale, scan, accum0);
    const zone = buildEntryZone(t, direction, atr, structure, setupType);
    const entryMid = mid(zone.low, zone.high);
    let entryDistance = 0;
    if (n(t.price, 0) >= zone.low && n(t.price, 0) <= zone.high) entryDistance = 0;
    else entryDistance = pct(n(t.price, 0), n(t.price, 0) < zone.low ? zone.low : zone.high);
    const cfg = adminCfg();
    const farFromEntry = entryDistance > Math.max(0.25, n(cfg.maxEntryDistancePct, 4.5)) && !parseAdminSymbolList(cfg.manualPrioritySymbols).includes(String(t.sym || '').toUpperCase());
    t.entry_distance_pct = entryDistance;
    const accum = accumulationScore(t, structure, whale, scan);
    const reasons = buildReasons(t, direction, setupType, structure, whale, scan, entryDistance, accum);
    const whyScore = whyScoreFromReasons(reasons, structure, whale, scan);
    const fresh = freshnessScore(t, whale, scan);
    const disc = discoveryScore(t, null, scan);
    const opp = clamp2(
      whyScore * 0.34 +
      (100 - Math.min(entryDistance, 100)) * 0.26 +
      n(whale.score, 0) * 0.12 +
      fresh * 0.11 +
      accum * 0.10 +
      disc * 0.15 -
      (farFromEntry ? Math.min(18, entryDistance * 1.8) : 0) -
      n(t.trap, 0) * 0.22,
      0, 100
    );
    const state = determineState(direction, opp, entryDistance, n(t.trap, 0), fresh, accum, scan);
    const tpMatrix = buildTpMatrix(t, direction, zone.low, zone.high, zone.stop, atr, structure, whale, scan);
    const primaryTf = primaryTfFor(setupType);
    const key = [t.sym, direction, setupType, zoneHash(zone.low, zone.high, t.price)].join('|');
    const cand = {
      signal_key: key,
      symbol: t.sym,
      display_symbol: t.s,
      direction,
      confluence: t._confluence || {direction:'NEUTRAL',score:0,level:'NONE',agreeing:0,layers:[]},
      setup_type: setupType,
      primary_tf: primaryTf,
      state,
      opportunity_score: opp,
      why_score: whyScore,
      freshness: fresh,
      entry_low: zone.low,
      entry_high: zone.high,
      stop_loss: zone.stop,
      entry_distance_pct: entryDistance,
      whale_side: whale.bias,
      whale_score: whale.score,
      accumulation_score: accum,
      discovery_score: disc,
      tp_matrix: tpMatrix,
      reasons,
      execution_block: '',
      invalidation_block: '',
      panel_rank_score: 0,
      structure_validity: n(structure.validity, 0),
      __token: t,
      __structure: structure,
      __whale: whale,
      __scan: scan,
      created_at: Date.now(),
      updated_at: Date.now(),
      ch_at_signal: n(t.ch, 0),
      update_count: 0,
      event_history: [],
      hit_map: {},
      execution_triggered: false,
      break_even_shifted: false,
      partial_exit_taken: false,
      delivery_state: 'PENDING',
      telegram_preview: ''
    };
    cand.execution_block = buildExecutionBlock(cand);
    cand.invalidation_block = buildInvalidationBlock(cand);
    cand.panel_rank_score = panelRank(cand, structure, whale, scan);
    cand.telegram_preview = buildTelegramMessage(cand);
    return cand;
  }

  function addSignalEvent(sig, eventType, payload){
    const evKey = `${sig.signal_key}|${eventType}|${payload && payload.key ? payload.key : JSON.stringify(payload || {})}`;
    if (Z.proptrex.lastEventKey.has(evKey)) return;
    Z.proptrex.lastEventKey.add(evKey);
    const ev = {
      signal_key: sig.signal_key,
      symbol: sig.symbol,
      event_type: eventType,
      event_payload: payload || {},
      created_at: Date.now()
    };
    sig.event_history.unshift(ev);
    if (sig.event_history.length > 30) sig.event_history.length = 30;
    Z.proptrex.signalEvents.unshift(ev);
    if (Z.proptrex.signalEvents.length > 400) Z.proptrex.signalEvents.length = 400;
    if (CRITICAL_EVENTS.has(eventType)) dispatchSignalEventAlert(sig, ev);
  }

  function dispatchSignalEventAlert(sig, ev){
    const now = Date.now();
    const deliveryKey = `${sig.signal_key}|${ev.event_type}|${ev.event_payload && ev.event_payload.key ? ev.event_payload.key : ''}`;
    const lastAt = Z.proptrex.lastDeliveryAt.get(deliveryKey) || 0;
    if (now - lastAt < Z.proptrex.deliveryCooldownMs) return;
    if (!alertRateOk(sig.symbol)) return;
    Z.proptrex.lastDeliveryAt.set(deliveryKey, now);
    const titleMap = {
      TP_HIT: `🎯 ${sig.display_symbol} TP hit`,
      INVALIDATION: `⛔ ${sig.display_symbol} invalidated`,
      STRUCTURE_BREAK: `⚠️ ${sig.display_symbol} structure break`,
      EXECUTION_TRIGGER: `✅ ${sig.display_symbol} execution`,
      BREAK_EVEN_SHIFT: `🛡️ ${sig.display_symbol} break-even`,
      PARTIAL_EXIT: `📤 ${sig.display_symbol} partial exit`,
      STOP_HIT: `🛑 ${sig.display_symbol} stop hit`
    };
    const ds = ev.event_type === 'TP_HIT'
      ? `${sig.symbol} ${ev.event_payload.tf} ${ev.event_payload.level} gerçekleşti @ ${fp(ev.event_payload.price)}`
      : ev.event_type === 'EXECUTION_TRIGGER'
        ? `${sig.symbol} entry zone içine girdi (${fp(sig.entry_low)}–${fp(sig.entry_high)})`
        : ev.event_type === 'BREAK_EVEN_SHIFT'
          ? `${sig.symbol} TP1 sonrası risk free aşamaya geçti`
          : ev.event_type === 'PARTIAL_EXIT'
            ? `${sig.symbol} primary TF TP2 sonrası partial exit önerisi`
            : ev.event_type === 'STOP_HIT'
              ? `${sig.symbol} stop seviyesi işlendi @ ${fp(ev.event_payload.price)}`
              : ev.event_type === 'INVALIDATION'
                ? `${sig.symbol} invalidation seviyesi işlendi @ ${fp(ev.event_payload.price)}`
                : `${sig.symbol} ${String(ev.event_type).replace(/_/g,' ').toLowerCase()}`;
    Z.alerts.unshift({
      id: ++Z.ai,
      tp: 'ta',
      ti: titleMap[ev.event_type] || `${sig.display_symbol} event`,
      ds,
      tm: new Date(now),
      ur: 1,
      sym: sig.symbol,
      reason: `${sig.direction} | ${sig.state} | ${sig.execution_block}`
    });
    if (Z.alerts.length > 120) Z.alerts.length = 120;
    Z.proptrex.activeTelegramPreview = {
      signal: sig,
      event: ev,
      message: buildTelegramMessage(sig),
      exchangeLabel: exchangeLabelForSignal(sig),
      exchangeUrl: exchangeUrlForSignal(sig),
      tvUrl: tradingViewUrl(sig)
    };
    renderTelegramPreview();
  }

  function maybeSendInitialSignal(sig){
    if (sig.delivery_state === 'SENT') return;
    if (!['TRADEABLE','PRIORITY','EXECUTION','INVALIDATED'].includes(sig.state)) return;
    if (!alertRateOk(sig.symbol)) return;
    sig.delivery_state = 'SENT';
    Z.proptrex.activeTelegramPreview = {
      signal: sig,
      event: { event_type: 'BASE_SIGNAL' },
      message: buildTelegramMessage(sig),
      exchangeLabel: exchangeLabelForSignal(sig),
      exchangeUrl: exchangeUrlForSignal(sig),
      tvUrl: tradingViewUrl(sig)
    };
    renderTelegramPreview();
  }

  function evaluateSignalEvents(sig, t){
    const px = n(t.price, NaN);
    if (!Number.isFinite(px)) return;
    if (!sig.execution_triggered && px >= sig.entry_low && px <= sig.entry_high) {
      sig.execution_triggered = true;
      sig.state = 'EXECUTION';
      addSignalEvent(sig, 'EXECUTION_TRIGGER', { price: px, key: 'zone-in' });
    }
    if (sig.direction === 'LONG') {
      for (const tf of TF_LIST) {
        const m = sig.tp_matrix[tf];
        for (const lvl of ['tp1','tp2','tp3','tp4']) {
          const key = `${tf}:${lvl}`;
          if (!sig.hit_map[key] && px >= n(m[lvl], Infinity)) {
            sig.hit_map[key] = true;
            addSignalEvent(sig, 'TP_HIT', { tf, level: lvl.toUpperCase(), price: px, key });
          }
        }
      }
      if (!sig.break_even_shifted && sig.hit_map[`${sig.primary_tf}:tp1`]) {
        sig.break_even_shifted = true;
        addSignalEvent(sig, 'BREAK_EVEN_SHIFT', { tf: sig.primary_tf, key: 'be' });
      }
      if (!sig.partial_exit_taken && sig.hit_map[`${sig.primary_tf}:tp2`]) {
        sig.partial_exit_taken = true;
        addSignalEvent(sig, 'PARTIAL_EXIT', { tf: sig.primary_tf, key: 'partial' });
      }
      if (px <= sig.stop_loss && sig.state !== 'INVALIDATED') {
        sig.state = 'INVALIDATED';
        addSignalEvent(sig, 'STOP_HIT', { price: px, key: 'stop' });
        addSignalEvent(sig, 'INVALIDATION', { price: px, key: 'invalid' });
      }
    } else {
      for (const tf of TF_LIST) {
        const m = sig.tp_matrix[tf];
        for (const lvl of ['tp1','tp2','tp3','tp4']) {
          const key = `${tf}:${lvl}`;
          if (!sig.hit_map[key] && px <= n(m[lvl], -Infinity)) {
            sig.hit_map[key] = true;
            addSignalEvent(sig, 'TP_HIT', { tf, level: lvl.toUpperCase(), price: px, key });
          }
        }
      }
      if (!sig.break_even_shifted && sig.hit_map[`${sig.primary_tf}:tp1`]) {
        sig.break_even_shifted = true;
        addSignalEvent(sig, 'BREAK_EVEN_SHIFT', { tf: sig.primary_tf, key: 'be' });
      }
      if (!sig.partial_exit_taken && sig.hit_map[`${sig.primary_tf}:tp2`]) {
        sig.partial_exit_taken = true;
        addSignalEvent(sig, 'PARTIAL_EXIT', { tf: sig.primary_tf, key: 'partial' });
      }
      if (px >= sig.stop_loss && sig.state !== 'INVALIDATED') {
        sig.state = 'INVALIDATED';
        addSignalEvent(sig, 'STOP_HIT', { price: px, key: 'stop' });
        addSignalEvent(sig, 'INVALIDATION', { price: px, key: 'invalid' });
      }
    }
  }

  function upsertSignal(t, cand){
    const currentKey = Z.proptrex.currentBySymbol.get(t.sym);
    let sig = currentKey ? Z.proptrex.signalBook.get(currentKey) : null;
    if (!sig || sig.signal_key !== cand.signal_key) {
      if (sig && sig.state !== 'INVALIDATED') {
        addSignalEvent(sig, 'STRUCTURE_BREAK', { from: sig.signal_key, to: cand.signal_key, key: cand.signal_key });
      }
      sig = Object.assign({}, cand);
      sig.base_created_at = Date.now();
      sig.last_fingerprint = candidateFingerprint(cand);
      sig.update_count = 1;
      Z.proptrex.signalBook.set(sig.signal_key, sig);
      Z.proptrex.currentBySymbol.set(t.sym, sig.signal_key);
      maybeSendInitialSignal(sig);
    } else {
      const nextFp = candidateFingerprint(cand);
      /* DIRECTION LOCKED — only update if signal is older than 5 min AND structure fundamentally changed */
      var _ageMin = (Date.now() - (sig.base_created_at || sig.created_at || Date.now())) / 60000;
      var _dirChanged = cand.direction !== sig.direction;
      var _scoreDropped = cand.opportunity_score < (sig.opportunity_score || 0) * 0.5;
      var _allowFlip = _ageMin > 5 && _dirChanged && _scoreDropped;
      Object.assign(sig, {
        direction: _allowFlip ? cand.direction : sig.direction,
        setup_type: cand.setup_type,
        primary_tf: cand.primary_tf,
        state: sig.state === 'INVALIDATED' ? 'INVALIDATED' : cand.state,
        opportunity_score: cand.opportunity_score,
        why_score: cand.why_score,
        freshness: cand.freshness,
        entry_low: cand.entry_low,
        entry_high: cand.entry_high,
        stop_loss: cand.stop_loss,
        entry_distance_pct: cand.entry_distance_pct,
        whale_side: cand.whale_side,
        whale_score: cand.whale_score,
        accumulation_score: cand.accumulation_score,
        discovery_score: cand.discovery_score,
        confluence: cand.confluence,
        tp_matrix: cand.tp_matrix,
        reasons: cand.reasons,
        execution_block: cand.execution_block,
        invalidation_block: cand.invalidation_block,
        structure_validity: cand.structure_validity,
        panel_rank_score: cand.panel_rank_score,
        telegram_preview: cand.telegram_preview,
        updated_at: Date.now(),
        __token: cand.__token,
        __structure: cand.__structure,
        __whale: cand.__whale,
        __scan: cand.__scan
      });
      if (nextFp !== sig.last_fingerprint) {
        sig.update_count = n(sig.update_count, 0) + 1;
        sig.last_fingerprint = nextFp;
      }
      maybeSendInitialSignal(sig);
    }
    t.signal = sig;
    return sig;
  }

  function runSignalLayer(){
    if (!Array.isArray(Z.tokens) || !Z.tokens.length) return;
    for (const t of Z.tokens) {
      const cand = makeCandidate(t);
      if (!cand) continue;
      const sig = upsertSignal(t, cand);
      evaluateSignalEvents(sig, t);
      t.signal = sig;
      if (Z.proptrex.signalHistory) {
        const histRecord = Z.proptrex.signalHistory.upsertByDedupKey(sig, t);
        handleSignalHistoryRecord(histRecord);
      }
      if(sig.confluence&&sig.confluence.level!=='NONE')cfAlert(t,sig.confluence);
    }
  }

  function tradingViewUrl(sig){
    const base = String(sig.display_symbol || sig.symbol || '').replace('USDT','');
    return `https://www.tradingview.com/symbols/${base}USDT/`;
  }
  function exchangeLabelForSignal(sig){
    const token = sig.__token || {};
    const ex = Array.isArray(token.ex) && token.ex.length ? token.ex[0] : 'BINANCE';
    const map = Z.proptrex.exchangeConfigs[String(ex || 'BINANCE').toUpperCase()] || Z.proptrex.exchangeConfigs.BINANCE;
    return map ? map.label : 'Exchange';
  }
  function exchangeUrlForSignal(sig){
    const token = sig.__token || {};
    const ex = Array.isArray(token.ex) && token.ex.length ? token.ex[0] : 'BINANCE';
    const map = Z.proptrex.exchangeConfigs[String(ex || 'BINANCE').toUpperCase()] || Z.proptrex.exchangeConfigs.BINANCE;
    const base = String(sig.display_symbol || '').replace('USDT','');
    const sym = String(sig.symbol || '');
    if (!map || !map.template) return '#';
    return map.template
      .replaceAll('{sym}', sym)
      .replaceAll('{base}', base)
      .replaceAll('{baseLower}', base.toLowerCase());
  }

  const origOpenExchange = openExchange;
  openExchange = function(tag, sym){
    const ex = String(normExTag ? normExTag(tag) : tag || 'BINANCE').toUpperCase();
    const cfg = Z.proptrex.exchangeConfigs[ex];
    if (cfg && cfg.template) {
      const base = String(sym || '').replace('USDT', '');
      const url = cfg.template
        .replaceAll('{sym}', sym)
        .replaceAll('{base}', base)
        .replaceAll('{baseLower}', base.toLowerCase());
      window.open(url, '_blank', 'noopener');
      return;
    }
    return origOpenExchange(tag, sym);
  };

  function filterAndSortTokens(){
    let arr = Array.isArray(Z.tokens) ? Z.tokens.slice() : [];
    const cfg = adminCfg();
    const q = String(Z.q || '').trim().toUpperCase();
    arr = arr.filter(t => symbolAllowedByAdmin(t.sym));
    if (q) arr = arr.filter(t => String(t.s || '').includes(q) || String(t.n || '').toUpperCase().includes(q));
    if (Z.cat && Z.cat !== 'all') {
      if (Z.cat === 'new') arr = arr.filter(t => t.nw || t.st === 'new');
      else if (Z.cat === 'premarket') arr = arr.filter(t => t.nw || (t.listedAgeDays != null && t.listedAgeDays <= 30));
      else if (Z.cat === 'alpha') arr = arr.slice().sort((a, b) => Math.abs(n(b.ch,0)) - Math.abs(n(a.ch,0))).slice(0, 120);
      else if (Z.cat === 'usdc') arr = arr.filter(t => String(t.sym || '').endsWith('USDC'));
      else arr = arr.filter(t => t.c === Z.cat);
    }
    if (Z.sig) {
      if (Z.sig === 'rsiob') arr = arr.filter(t => n(t.rsi, 0) > 70);
      if (Z.sig === 'rsios') arr = arr.filter(t => n(t.rsi, 100) < 30);
      if (Z.sig === 'macdup') arr = arr.filter(t => t.macd && n(t.macd.h, 0) > 0);
      if (Z.sig === 'macddn') arr = arr.filter(t => t.macd && n(t.macd.h, 0) < 0);
      if (Z.sig === 'gap') arr = arr.filter(t => !!t.gap);
      if (Z.sig === 'fib') arr = arr.filter(t => Math.abs(n(t.fib, 0.618) - 0.618) < 0.001);
      if (Z.sig === 'whale') arr = arr.filter(t => t.signal && n(t.signal.whale_score, 0) >= 45);
    }
    if (Z.mv && Z.mv !== 'all') {
      if (Z.mv === 'rise') arr = arr.filter(t => n(t.ch, 0) > 0);
      if (Z.mv === 'fall') arr = arr.filter(t => n(t.ch, 0) < 0);
      if (Z.mv === 'volup') arr = arr.filter(t => n(t.ch, 0) >= 0).sort((a, b) => n(b.vol, 0) - n(a.vol, 0));
      if (Z.mv === 'voldn') arr = arr.filter(t => n(t.ch, 0) < 0).sort((a, b) => n(b.vol, 0) - n(a.vol, 0));
      if (Z.mv === 'whale') arr = arr.filter(t => t.signal && n(t.signal.whale_score, 0) >= 45);
      if (Z.mv === 'newhigh') arr = arr.filter(t => n(t.hi, 0) && n(t.price, 0) >= n(t.hi, 0));
      if (Z.mv === 'newlow') arr = arr.filter(t => n(t.lo, 0) && n(t.price, 0) <= n(t.lo, 0));
      if (Z.mv === 'pullback') arr = arr.filter(t => n(t.ch, 0) > 0 && n(t.rsi, 100) < 55);
      if (Z.mv === 'rally') arr = arr.filter(t => n(t.ch, 0) > 0 && n(t.rsi, 0) > 55);
    }
    const f = Z.proptrex.filters;
    if (f.onlyLong) arr = arr.filter(t => t.signal && t.signal.direction === 'LONG');
    if (f.onlyShort) arr = arr.filter(t => t.signal && t.signal.direction === 'SHORT');
    if (f.squeeze) arr = arr.filter(t => t.signal && t.signal.confluence && t.signal.confluence.layers && t.signal.confluence.layers.some(l => l.name === 'FUND_OI' && l.score > 25));
    if (f.leadLag) arr = arr.filter(t => t.signal && t.signal.confluence && t.signal.confluence.layers && t.signal.confluence.layers.some(l => l.name === 'LEAD_LAG' && l.score > 25));
    if (f.highConf) arr = arr.filter(t => t.signal && t.signal.confluence && t.signal.confluence.agreeing >= 3);
    if (f.onlyPriority) arr = arr.filter(t => t.signal && ['PRIORITY','EXECUTION'].includes(t.signal.state));
    if (f.onlyFresh) arr = arr.filter(t => t.signal && n(t.signal.freshness, 0) >= 65);
    if (f.nearEntry) arr = arr.filter(t => t.signal && n(t.signal.entry_distance_pct, 999) <= 1.25);
    if (f.whaleAligned) arr = arr.filter(t => t.signal && n(t.signal.whale_score, 0) >= 45);
    arr.sort((a,b) => {
      const sa = a.signal || {}, sb = b.signal || {};
      const d = n(sb.panel_rank_score, 0) - n(sa.panel_rank_score, 0);
      if (d) return d;
      const dd = n(sb.discovery_score, 0) - n(sa.discovery_score, 0);
      if (dd) return dd;
      return n(sb.vol,0) - n(sa.vol,0);
    });
    return arr.slice(0, Math.max(50, n(cfg.maxRows, 250)));
  }

  function renderPriorityStrip(){
    const box = document.getElementById('pxPriorityStrip');
    if (!box) return;
    const top = filterAndSortTokens().filter(t => t.signal).slice(0, 5);
    if (!top.length) {
      box.innerHTML = '<div class="px-strip-empty">Henüz yeterli veri yok.</div>';
      return;
    }
    box.innerHTML = top.map(t => {
      const s = t.signal;
      return `<button class="px-radar-card" data-sym="${esc(t.sym)}">
        <div class="px-radar-top"><span class="px-radar-sym">${esc(t.s)}</span><span class="px-state-badge ${stateClass(s.state)}">${esc(s.state)}</span></div>
        <div class="px-radar-row"><span>${esc(s.direction)}</span><span>${s.confluence?s.confluence.agreeing+'/6':'—'}</span></div>
        <div class="px-radar-row"><span>Entry Dist</span><span>${n(s.entry_distance_pct,0).toFixed(2)}%</span></div>
        <div class="px-radar-row"><span>Whale</span><span>${esc(s.whale_side)} ${n(s.whale_score,0).toFixed(0)}</span></div>
        <div class="px-radar-row"><span>Discovery</span><span>${n(s.discovery_score,0).toFixed(0)}</span></div>
        <div class="px-radar-row"><span>Fresh</span><span>${n(s.freshness,0).toFixed(0)}</span></div>
      </button>`;
    }).join('');
    box.querySelectorAll('[data-sym]').forEach(btn => btn.addEventListener('click', () => openToken(btn.getAttribute('data-sym'))));
  }

  function renderTelegramPreview(){
    const box = document.getElementById('pxTelegramPreview');
    if (!box) return;
    const p = Z.proptrex.activeTelegramPreview;
    if (!p || !p.signal) {
      box.innerHTML = '<div class="px-tg-empty">Henüz gönderilebilir base signal veya event oluşmadı.</div>';
      return;
    }
    box.innerHTML = `
      <div class="px-tg-head">
        <div>
          <div class="px-tg-title">Telegram Preview</div>
          <div class="px-tg-sub">${esc(p.signal.symbol)} · ${esc(p.event && p.event.event_type ? p.event.event_type : 'BASE_SIGNAL')}</div>
        </div>
        <span class="px-state-badge ${stateClass(p.signal.state)}">${esc(p.signal.state)}</span>
      </div>
      <pre class="px-tg-pre">${esc(p.message)}</pre>
      <div class="px-tg-actions">
        <a class="px-tg-btn" href="${esc(p.tvUrl)}" target="_blank" rel="noopener">TradingView</a>
        <a class="px-tg-btn" href="${esc(p.exchangeUrl)}" target="_blank" rel="noopener">${esc(p.exchangeLabel)}</a>
      </div>`;
  }

  function tableHeaderHtml(){
    return `
      <th>First Seen</th>
      <th>Last Update</th>
      <th>Age</th>
      <th>Status</th>
      <th style="width:24px"></th>
      <th>Symbol / Vol</th>
      <th>Price</th>
      <th>24h %</th>
      <th>State</th>
      <th>Direction</th>
      <th>Age / Move</th>
      <th>Confluence</th>
      <th>Opportunity</th>
      <th>Entry Zone</th>
      <th>Dist %</th>
      <th>Stop</th>
      <th>Whale</th>
      <th>Rank</th>
      <th>TP Matrix</th>
      <th>Ex</th>
      <th>Listed</th>
      <th style="width:56px"></th>`;
  }

  function compactWhy(sig){
    if (!sig || !Array.isArray(sig.reasons)) return '—';
    return sig.reasons.slice(0, 2).join(' • ');
  }
  function compactTp(sig){
    if (!sig || !sig.tp_matrix) return '—';
    const m = sig.tp_matrix[sig.primary_tf] || sig.tp_matrix['1h'];
    if (!m) return '—';
    const hit = sig.hit_map && sig.hit_map[`${sig.primary_tf}:tp1`] ? '✓ ' : '';
    return `${sig.primary_tf}: ${hit}${fp(m.tp1)} / ${fp(m.tp2)}`;
  }

  /* ═══ STABLE TABLE — sort every 10s, update cells in-place between sorts ═══ */
  function distH(sig) {
    var d = n(sig && sig.entry_distance_pct, 999);
    if (d <= 0.05) {
      return '<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:5px;background:#dcfce7;color:#16a34a;font-weight:800;font-size:.58rem;font-family:\'IBM Plex Mono\',monospace;white-space:nowrap">● IN ZONE</span>';
    }
    if (d <= 1) {
      return '<span style="color:#16a34a;font-weight:700;font-family:\'IBM Plex Mono\',monospace;font-size:.65rem">' + d.toFixed(2) + '%</span>';
    }
    if (d <= 3) {
      return '<span style="color:#f59e0b;font-weight:700;font-family:\'IBM Plex Mono\',monospace;font-size:.65rem">' + d.toFixed(2) + '%</span>';
    }
    return '<span style="color:#ef4444;font-weight:600;font-family:\'IBM Plex Mono\',monospace;font-size:.65rem">' + d.toFixed(2) + '%</span>';
  }

  function _buildRow(record) {
    const t = record.token || {};
    const sig = record.signal || {};
    const fav = Z.fav.has(t.sym) ? 'fv' : '';
    const ic = t.clr || '#888';
    const ch = isFinite(n(t.ch,NaN)) ? n(t.ch,0) : 0;
    const chCls = ch >= 0 ? 'cg' : 'cr';
    const classes = [
      sig && sig.state === 'EXECUTION' ? 'rn' : '',
      sig && sig.whale_score >= 55 ? 'rw' : '',
      Z.sel === t.sym ? 'sel' : ''
    ].filter(Boolean).join(' ');
    const createdAt = Number(record.created_at) || Date.now();
    const lastSeen = Number(record.last_seen_at) || createdAt;
    const ageMs = Date.now() - createdAt;
    const ageText = formatRelativeAge(ageMs);
    const bucket = bucketLabelForAge(ageMs / 3600000);
    const statusText = record.status || 'ACTIVE';
    const statusClass = `px-history-status px-history-status-${String(statusText).toLowerCase()}`;
    const moveDiff = n(t.ch, 0) - (sig.ch_at_signal || 0);
    const moveCls = moveDiff >= 0 ? 'cg' : 'cr';
    return `<tr data-sym="${esc(t.sym)}" data-instance-id="${esc(record.signal_instance_id)}" class="${classes}">
      <td data-u="firstSeen">${fmtTime(createdAt)}</td>
      <td data-u="lastUpdated">${fmtTime(lastSeen)}</td>
      <td data-u="age">
        <div class="px-history-age-line">
          <span class="px-history-age-text">${esc(ageText)}</span>
          <span class="px-age-bucket">${esc(bucket)}</span>
        </div>
        <span class="px-history-age-move ${moveCls}">${moveDiff >= 0 ? '+' : ''}${moveDiff.toFixed(1)}%</span>
      </td>
      <td data-u="status"><span class="${statusClass}">${esc(statusText)}</span></td>
      <td><span class="star ${fav}" data-fav="${esc(t.sym)}">★</span></td>
      <td><div class="sc"><div class="si2" style="background:${esc(ic)}">${esc((t.s || '').slice(0,2))}</div><div><div class="sn">${esc(t.s || '')}<span class="sv">USDT</span></div><div class="sv" data-u="vol">$${fmt(n(t.vol,0),2)} Vol</div></div></div></td>
      <td class="fw" data-u="price" style="font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--t1)">$${fp(n(t.price,0))}</td>
      <td data-u="chg"><span class="${chCls} fw" style="font-family:'IBM Plex Mono',monospace;font-size:.72rem">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</span></td>
      <td data-u="state"><span class="px-state-badge ${stateClass(sig.state)}">${esc(sig.state)}</span></td>
      <td data-u="dir"><span class="px-dir ${dirClass(sig.direction)}">${esc(sig.direction)}</span></td>
      <td data-u="conf"><span style="font-size:10px;font-weight:800;font-family:'IBM Plex Mono',monospace;color:${(sig.confluence&&sig.confluence.level==='HIGH')?'#16a34a':(sig.confluence&&sig.confluence.level==='MEDIUM')?'#2563eb':'rgba(17,24,39,.35)'}">${sig.confluence?sig.confluence.agreeing+'/6 '+sig.confluence.level:'—'}</span></td>
      <td data-u="opp"><span class="px-score">${n(sig.opportunity_score,0).toFixed(0)}</span></td>
      <td data-u="zone"><span class="px-zone">${fp(sig.entry_low)}–${fp(sig.entry_high)}</span></td>
      <td data-u="dist">${distH(sig)}</td>
      <td data-u="stop"><span class="px-stop">${fp(sig.stop_loss)}</span></td>
      <td data-u="whale"><span class="px-whale ${sig.whale_side === 'BUY' ? 'cg' : sig.whale_side === 'SELL' ? 'cr' : ''}">${esc(sig.whale_side)} ${n(sig.whale_score,0).toFixed(0)}</span></td>
      <td data-u="rank"><span class="px-rank">${n(sig.panel_rank_score,0).toFixed(0)}</span></td>
      <td data-u="tp"><span class="px-tpm" title="${esc(sig.telegram_preview)}">${esc(compactTp(sig))}</span></td>
      <td data-u="ex"><div class="exs">${(t.ex || ['BNB']).map(x => `<span class="ex ${x === 'BNB' ? 'bn' : ''}" data-ex="${esc(x)}" data-sym="${esc(t.sym)}">${esc(x)}</span>`).join('')}</div></td>
      <td><span class="sv">${esc(t.fl || '--')}</span></td>
      <td data-u="spark">${sparkH(t)}</td>
    </tr>`;
  }

  function _updateCellsInPlace(tbl, arr) {
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i], sig = t.signal;
      if (!sig) continue;
      var row = tbl.querySelector('tr[data-sym="' + esc(t.sym) + '"]');
      if (!row) continue;
      var ch = isFinite(n(t.ch,NaN)) ? n(t.ch,0) : 0;
      var chStr = (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%';
      var chCls = ch >= 0 ? 'cg fw' : 'cr fw';

      // update price cell
      var priceCell = row.querySelector('[data-u="price"]');
      if (priceCell) {
        var pv = '$' + fp(n(t.price,0));
        if (priceCell.textContent !== pv) priceCell.textContent = pv;
      }
      // update % change cell
      var chgCell = row.querySelector('[data-u="chg"]');
      if (chgCell) {
        var sp = chgCell.querySelector('span');
        if (!sp) { sp = document.createElement('span'); chgCell.appendChild(sp); }
        sp.className = chCls;
        sp.style.fontFamily = "'IBM Plex Mono',monospace";
        sp.style.fontSize = '.72rem';
        if (sp.textContent !== chStr) sp.textContent = chStr;
      }

      // update dist cell with innerHTML (styled badge)
      var distCell = row.querySelector('[data-u="dist"]');
      if (distCell) distCell.innerHTML = distH(sig);

      var upd = {
        vol: '$' + fmt(n(t.vol,0),2) + ' Vol',
        opp: n(sig.opportunity_score,0).toFixed(0),
        whale: esc(sig.whale_side) + ' ' + n(sig.whale_score,0).toFixed(0),
        rank: n(sig.panel_rank_score,0).toFixed(0),
        tp: esc(compactTp(sig)),
        conf: sig.confluence ? sig.confluence.agreeing + '/6 ' + sig.confluence.level : '—'
      };
      for (var key in upd) {
        var cell = row.querySelector('[data-u="' + key + '"]');
        if (cell) {
          var span = cell.querySelector('span') || cell;
          var newVal = upd[key];
          if (span.textContent !== newVal && span.innerHTML !== newVal) {
            span.textContent = newVal;
          }
        }
      }
    }
  }

  function _bindRowEvents(tbl) {
    tbl.querySelectorAll('tr[data-sym]').forEach(tr => {
      if (tr._bound) return; tr._bound = true;
      tr.addEventListener('click', () => { var sym = tr.getAttribute('data-sym'); if (sym) openToken(sym); }, { passive: true });
    });
    tbl.querySelectorAll('[data-ex][data-sym]').forEach(x => {
      if (x._bound) return; x._bound = true;
      x.addEventListener('click', (e) => { e.stopPropagation(); openExchange(x.getAttribute('data-ex'), x.getAttribute('data-sym')); }, { passive: true });
    });
    tbl.querySelectorAll('[data-fav]').forEach(nd => {
      if (nd._bound) return; nd._bound = true;
      nd.addEventListener('click', (e) => { e.stopPropagation(); var s = nd.getAttribute('data-fav'); if (Z.fav.has(s)) Z.fav.delete(s); else Z.fav.add(s); Z.proptrex.forceSort = true; rTbl(); }, { passive: true });
    });
  }

  const signalHistoryRowMap = new Map();
  let signalHistoryTableBody = null;
  let signalHistoryVisibleIds = new Set();
  let signalHistoryMaintenanceStarted = false;
  let signalHistoryLastRefreshTs = Date.now();

  function ensureSignalHistoryElements() {
    if (signalHistoryTableBody) return true;
    const table = document.getElementById('pxSignalHistoryTable');
    if (!table) return false;
    const header = document.getElementById('pxSignalHistoryHeader');
    if (header && header.getAttribute('data-ready') !== '1') {
      header.innerHTML = tableHeaderHtml();
      header.setAttribute('data-ready', '1');
    }
    signalHistoryTableBody = table.querySelector('tbody');
    return !!signalHistoryTableBody;
  }

  function getHistoryRecordById(id) {
    return signalHistoryStore.getRecords().find(r => r.signal_instance_id === id);
  }

  function bindSignalHistoryRow(row) {
    if (row.__pxHistoryBound) return;
    row.__pxHistoryBound = true;
    row.addEventListener('click', (e) => {
      if (e.target.closest('.star')) return;
      const sym = row.dataset.sym;
      if (sym) openToken(sym);
    }, { passive: true });
    row.querySelectorAll('[data-ex][data-sym]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openExchange(el.getAttribute('data-ex'), el.getAttribute('data-sym'));
      }, { passive: true });
    });
    const star = row.querySelector('[data-fav]');
    if (star) {
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        const sym = star.getAttribute('data-fav');
        if (!sym) return;
        if (Z.fav.has(sym)) Z.fav.delete(sym); else Z.fav.add(sym);
        const record = getHistoryRecordById(row.dataset.instanceId);
        if (record) updateRowFromRecord(row, record);
        renderSignalHistory();
      }, { passive: true });
    }
  }

  function updateRowFromRecord(row, record) {
    const t = record.token || {};
    const sig = record.signal || {};
    const createdAt = Number(record.created_at) || Date.now();
    const lastSeen = Number(record.last_seen_at) || createdAt;
    const ageMs = Date.now() - createdAt;
    const statusText = record.status || 'ACTIVE';

    row.dataset.instanceId = record.signal_instance_id || '';
    row.dataset.sym = (t.sym || '').toUpperCase();
    row.dataset.state = sig.state || '';
    row.dataset.direction = sig.direction || '';

    const classes = [];
    if (sig.state === 'EXECUTION') classes.push('rn');
    if (sig.whale_score >= 55) classes.push('rw');
    if (row.dataset.sym === String(Z.sel || '').toUpperCase()) classes.push('sel');
    row.className = classes.join(' ');

    const firstSeenEl = row.querySelector('[data-u="firstSeen"]');
    if (firstSeenEl) firstSeenEl.textContent = fmtTime(createdAt);
    const lastUpdatedEl = row.querySelector('[data-u="lastUpdated"]');
    if (lastUpdatedEl) lastUpdatedEl.textContent = fmtTime(lastSeen);

    const ageCell = row.querySelector('[data-u="age"]');
    if (ageCell) {
      const ageTextEl = ageCell.querySelector('.px-history-age-text');
      const bucketEl = ageCell.querySelector('.px-age-bucket');
      const moveEl = ageCell.querySelector('.px-history-age-move');
      if (ageTextEl) ageTextEl.textContent = formatRelativeAge(ageMs);
      if (bucketEl) bucketEl.textContent = bucketLabelForAge(ageMs / 3600000);
      if (moveEl) {
        const moveDiff = n(t.ch, 0) - (sig.ch_at_signal || 0);
        const moveCls = moveDiff >= 0 ? 'cg' : 'cr';
        moveEl.textContent = `${moveDiff >= 0 ? '+' : ''}${moveDiff.toFixed(1)}%`;
        moveEl.className = `px-history-age-move ${moveCls}`;
      }
    }

    const statusSpan = row.querySelector('[data-u="status"] span');
    if (statusSpan) {
      statusSpan.textContent = statusText;
      statusSpan.className = `px-history-status px-history-status-${String(statusText).toLowerCase()}`;
    }

    const priceCell = row.querySelector('[data-u="price"]');
    if (priceCell) priceCell.textContent = `$${fp(n(t.price, 0))}`;
    const chgCell = row.querySelector('[data-u="chg"] span');
    if (chgCell) {
      const ch = isFinite(n(t.ch, NaN)) ? n(t.ch, 0) : 0;
      chgCell.textContent = `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`;
      chgCell.className = ch >= 0 ? 'cg fw' : 'cr fw';
    }

    const volCell = row.querySelector('[data-u="vol"]');
    if (volCell) volCell.textContent = `$${fmt(n(t.vol, 0), 2)} Vol`;
    const stateCell = row.querySelector('[data-u="state"]');
    if (stateCell) stateCell.innerHTML = `<span class="px-state-badge ${stateClass(sig.state)}">${esc(sig.state)}</span>`;
    const dirCell = row.querySelector('[data-u="dir"]');
    if (dirCell) dirCell.innerHTML = `<span class="px-dir ${dirClass(sig.direction)}">${esc(sig.direction)}</span>`;

    const confCell = row.querySelector('[data-u="conf"] span');
    if (confCell) {
      if (sig.confluence) {
        const level = sig.confluence.level || 'NEUTRAL';
        const color = level === 'HIGH' ? '#16a34a' : level === 'MEDIUM' ? '#2563eb' : 'rgba(17,24,39,.35)';
        confCell.textContent = `${n(sig.confluence.agreeing, 0)}/6 ${level}`;
        confCell.style.color = color;
      } else {
        confCell.textContent = '—';
        confCell.style.color = 'rgba(17,24,39,.35)';
      }
    }

    const oppCell = row.querySelector('[data-u="opp"] span');
    if (oppCell) oppCell.textContent = n(sig.opportunity_score, 0).toFixed(0);
    const zoneCell = row.querySelector('[data-u="zone"] span');
    if (zoneCell) zoneCell.textContent = `${fp(sig.entry_low)}–${fp(sig.entry_high)}`;
    const distCell = row.querySelector('[data-u="dist"]');
    if (distCell) distCell.innerHTML = distH(sig);
    const stopCell = row.querySelector('[data-u="stop"] span');
    if (stopCell) stopCell.textContent = fp(sig.stop_loss);

    const whaleCell = row.querySelector('[data-u="whale"] span');
    if (whaleCell) whaleCell.textContent = `${esc(sig.whale_side)} ${n(sig.whale_score,0).toFixed(0)}`;
    const rankCell = row.querySelector('[data-u="rank"] span');
    if (rankCell) rankCell.textContent = n(sig.panel_rank_score, 0).toFixed(0);
    const tpCell = row.querySelector('[data-u="tp"] span');
    if (tpCell) {
      tpCell.textContent = esc(compactTp(sig));
      tpCell.title = esc(sig.telegram_preview || '');
    }

    const exCell = row.querySelector('[data-u="ex"]');
    if (exCell) {
      exCell.innerHTML = `<div class="exs">${(t.ex || ['BNB']).map(x => `<span class="ex ${x === 'BNB' ? 'bn' : ''}" data-ex="${esc(x)}" data-sym="${esc(t.sym)}">${esc(x)}</span>`).join('')}</div>`;
    }

    const sparkCell = row.querySelector('[data-u="spark"]');
    if (sparkCell) sparkCell.innerHTML = sparkH(t);
  }

  function getSignalHistoryFilters() {
    return {
      q: Z.q,
      cat: Z.cat,
      sig: Z.sig,
      mv: Z.mv,
      proptrexFilters: Z.proptrex.filters
    };
  }

  function applySignalHistoryFilters() {
    if (!ensureSignalHistoryElements()) return;
    const filters = getSignalHistoryFilters();
    const records = signalHistoryStore.getVisibleSignals(filters);
    signalHistoryVisibleIds = new Set(records.map(r => r.signal_instance_id));
    signalHistoryRowMap.forEach((row, id) => {
      row.style.display = signalHistoryVisibleIds.has(id) ? '' : 'none';
    });
  }

  function updateSignalHistoryMeta() {
    if (!ensureSignalHistoryElements()) return;
    const total = signalHistoryRowMap.size;
    const visible = signalHistoryVisibleIds.size;
    const countEl = document.getElementById('pxSignalHistoryCount');
    if (countEl) countEl.textContent = `Visible: ${visible} / Total: ${total}`;
    const retentionEl = document.getElementById('pxSignalHistoryRetention');
    if (retentionEl) retentionEl.textContent = `Retention: ${n(Z.proptrex.admin?.signalRetentionHours, DEFAULT_SIGNAL_RETENTION_HOURS)}h`;
    const lastUpdateEl = document.getElementById('pxSignalHistoryLastUpdate');
    if (lastUpdateEl) lastUpdateEl.textContent = `Last refresh: ${new Date(signalHistoryLastRefreshTs || Date.now()).toLocaleTimeString()}`;
  }

  function refreshSignalHistorySelection() {
    if (!ensureSignalHistoryElements()) return;
    const selected = String(Z.sel || '').toUpperCase();
    signalHistoryRowMap.forEach(row => {
      if (row.dataset.sym === selected) row.classList.add('sel');
      else row.classList.remove('sel');
    });
  }

  function pruneSignalHistoryRows() {
    if (!ensureSignalHistoryElements()) return;
    const activeIds = new Set(signalHistoryStore.getRecords().map(r => r.signal_instance_id));
    signalHistoryRowMap.forEach((row, id) => {
      if (!activeIds.has(id)) {
        row.remove();
        signalHistoryRowMap.delete(id);
      }
    });
  }

  function refreshSignalHistoryAges() {
    if (!ensureSignalHistoryElements()) return;
    const records = signalHistoryStore.getRecords();
    const recordMap = new Map(records.map(r => [r.signal_instance_id, r]));
    signalHistoryRowMap.forEach((row, id) => {
      const record = recordMap.get(id);
      if (!record) return;
      const ageMs = Date.now() - (Number(record.created_at) || Date.now());
      const ageCell = row.querySelector('[data-u="age"]');
      if (ageCell) {
        const ageTextEl = ageCell.querySelector('.px-history-age-text');
        const bucketEl = ageCell.querySelector('.px-age-bucket');
        if (ageTextEl) ageTextEl.textContent = formatRelativeAge(ageMs);
        if (bucketEl) bucketEl.textContent = bucketLabelForAge(ageMs / 3600000);
      }
    });
  }

  function renderTopGainers() {
    const tbody = document.getElementById('topGainersBody');
    if (!tbody) return;
    const tokens = Array.isArray(Z.tokens) ? Z.tokens.slice() : [];
    const candidates = tokens
      .filter(t => Number.isFinite(n(t.ch, NaN)) && Number.isFinite(n(t.price, NaN)) && n(t.price, 0) > 0)
      .sort((a, b) => n(b.ch, 0) - n(a.ch, 0));
    if (!candidates.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:18px;color:var(--t3)">No 24-hour gainers available.</td></tr>`;
      return;
    }
    const html = candidates.slice(0, 60).map((t, index) => {
      const sym = esc(t.s || t.sym || '');
      const ch = n(t.ch, 0);
      const chClass = ch >= 0 ? 'cg fw' : 'cr fw';
      const exch = Array.isArray(t.ex) && t.ex.length ? esc(t.ex[0]) : 'BNB';
      const rowClass = Z.sel && (String(Z.sel).toUpperCase() === String(t.sym || t.s || '').toUpperCase()) ? 'sel' : '';
      return `<tr data-sym="${sym}" class="${rowClass}">
        <td>${index + 1}</td>
        <td>${sym}</td>
        <td>$${fp(n(t.price, 0))}</td>
        <td><span class="${chClass}">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</span></td>
        <td>${fmt(n(t.vol, 0), 2)}</td>
        <td>${exch}</td>
      </tr>`;
    }).join('');
    tbody.innerHTML = html;
    tbody.querySelectorAll('tr[data-sym]').forEach(row => {
      row.addEventListener('click', () => {
        const sym = row.dataset.sym;
        if (!sym) return;
        openToken(sym, { sub: 'Top 24H Gainers', hint: 'Top 24H Gainers row' });
      });
    });
  }

  function handleSignalHistoryRecord(record, options = {}) {
    if (!record || !record.signal_instance_id) return;
    if (!ensureSignalHistoryElements()) return;
    const recordId = record.signal_instance_id;
    let row = signalHistoryRowMap.get(recordId);
    if (!row) {
      const template = document.createElement('template');
      template.innerHTML = _buildRow(record);
      row = template.content.firstElementChild;
      if (!row) return;
      signalHistoryRowMap.set(recordId, row);
      signalHistoryTableBody.insertBefore(row, signalHistoryTableBody.firstChild);
      bindSignalHistoryRow(row);
    }
    updateRowFromRecord(row, record);
    if (!options.skipSync) {
      applySignalHistoryFilters();
      signalHistoryLastRefreshTs = Date.now();
      updateSignalHistoryMeta();
      refreshSignalHistorySelection();
    }
  }

  function renderSignalHistory() {
    if (!ensureSignalHistoryElements()) return;
    applySignalHistoryFilters();
    refreshSignalHistorySelection();
    signalHistoryLastRefreshTs = Date.now();
    updateSignalHistoryMeta();
  }

  function restoreSignalHistoryRows() {
    if (!ensureSignalHistoryElements()) return;
    const records = signalHistoryStore.getRecords().slice().sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0));
    records.forEach(record => handleSignalHistoryRecord(record, { skipSync: true }));
    renderSignalHistory();
  }

  function setupSignalHistoryMaintenance() {
    if (signalHistoryMaintenanceStarted) return;
    signalHistoryMaintenanceStarted = true;
    setInterval(() => {
      signalHistoryStore.pruneExpiredSignals();
      pruneSignalHistoryRows();
      renderSignalHistory();
    }, 60000);
    setInterval(() => {
      refreshSignalHistoryAges();
    }, 60000);
  }

  const origRTbl = rTbl;
  rTbl = function(){
    const thead = document.querySelector('.tw table thead tr');
    if (thead && thead.getAttribute('data-proptrex') !== '1') {
      thead.setAttribute('data-proptrex', '1');
      thead.innerHTML = tableHeaderHtml();
    }
    const tbl = document.getElementById('tbl');
    if (!tbl) return;
    const mainPanel = document.getElementById('mainTablePanel');
    const gainersPanel = document.getElementById('topGainersPanel');
    if (Z.view === 'top_24h_gainers') {
      if (mainPanel) mainPanel.style.display = 'none';
      if (gainersPanel) gainersPanel.style.display = '';
      renderTopGainers();
      return;
    } else {
      if (mainPanel) mainPanel.style.display = '';
      if (gainersPanel) gainersPanel.style.display = 'none';
    }
    const now = Date.now();
    const shouldResort = Z.proptrex.forceSort || (now - Z.proptrex.lastSortAt >= Z.proptrex.sortInterval);

    if (shouldResort) {
      /* ── FULL REBUILD: re-sort and redraw (every 10s or on filter change) ── */
      Z.proptrex.forceSort = false;
      Z.proptrex.lastSortAt = now;
      const arr = filterAndSortTokens();
      Z.proptrex.lockedOrder = arr.map(t => t.sym);
      if (!arr.length) {
        tbl.innerHTML = `<tr><td colspan="19" style="padding:18px;color:var(--t3)">No matches.</td></tr>`;
        renderPriorityStrip(); renderTelegramPreview(); return;
      }
      noteVisibility(arr);
      var _lastGroup = '';
      tbl.innerHTML = arr.map(t => {
        const sig = t.signal || makeCandidate(t);
        var grp = sig.state || 'WATCHLIST';
        var header = '';
        if (grp !== _lastGroup) {
          _lastGroup = grp;
          var gc = ({EXECUTION:'#16a34a',PRIORITY:'#7c3aed',TRADEABLE:'#2563eb',WATCHLIST:'#64748b',COOLDOWN:'#f59e0b',INVALIDATED:'#ef4444'})[grp]||'#64748b';
          header = '<tr><td colspan="19" style="padding:6px 16px;font-size:11px;font-weight:800;font-family:\'IBM Plex Mono\',monospace;letter-spacing:1px;color:'+gc+';background:rgba(0,0,0,.02);border-bottom:2px solid '+gc+'30;text-transform:uppercase">'+grp+'</td></tr>';
        }
        return header + _buildRow(t, sig);
      }).join('');
      _bindRowEvents(tbl);
      renderPriorityStrip(); renderTelegramPreview();
    } else {
      /* ── IN-PLACE UPDATE: keep row order, just update cell values ── */
      const order = Z.proptrex.lockedOrder;
      if (!order.length) return;
      const arr = order.map(sym => Z.bySym.get(sym)).filter(Boolean);
      _updateCellsInPlace(tbl, arr);
    }
    renderSignalHistory();
  };

  function tpMatrixHtml(sig){
    if (!sig || !sig.tp_matrix) return '<div class="px-empty">TP matrix yok.</div>';
    return `<table class="px-tp-table"><thead><tr><th>TF</th><th>TP1</th><th>TP2</th><th>TP3</th><th>TP4</th></tr></thead><tbody>${TF_LIST.map(tf => {
      const m = sig.tp_matrix[tf] || {};
      const cell = lvl => {
        const key = `${tf}:${lvl}`;
        const hit = sig.hit_map && sig.hit_map[key];
        return `<td class="${hit ? 'hit' : ''}">${hit ? '✓ ' : ''}${fp(m[lvl])}</td>`;
      };
      return `<tr><td>${tf}</td>${cell('tp1')}${cell('tp2')}${cell('tp3')}${cell('tp4')}</tr>`;
    }).join('')}</tbody></table>`;
  }

  function eventHistoryHtml(sig){
    const list = (sig && sig.event_history) ? sig.event_history.slice(0, 12) : [];
    if (!list.length) return '<div class="px-empty">Henüz event yok.</div>';
    return list.map(ev => `<div class="px-ev-item"><span class="px-ev-type">${esc(ev.event_type)}</span><span class="px-ev-time">${fmtTime(ev.created_at)}</span><div class="px-ev-payload">${esc(JSON.stringify(ev.event_payload || {}))}</div></div>`).join('');
  }

  const origUpdateModal = updateModal;
  updateModal = function(extra){
    origUpdateModal(extra);
    if (!Z.sel || !Z.bySym.has(Z.sel)) return;
    const t = Z.bySym.get(Z.sel);
    const sig = t.signal || makeCandidate(t);
    if (!sig) return;
    const info = document.getElementById('pxSignalInfo');
    if (info) {
      info.innerHTML = `
        <div class="px-info-grid">
          <div><span>State</span><b class="${stateClass(sig.state)}">${esc(sig.state)}</b></div>
          <div><span>Direction</span><b class="${dirClass(sig.direction)}">${esc(sig.direction)}</b></div>
          <div><span>Confluence</span><b style="color:${(sig.confluence&&sig.confluence.level==='HIGH')?'#16a34a':(sig.confluence&&sig.confluence.level==='MEDIUM')?'#2563eb':'inherit'}">${sig.confluence?sig.confluence.agreeing+'/6 '+sig.confluence.level:'—'}</b></div>
          <div><span>Setup</span><b>${esc(sig.setup_type)}</b></div>
          <div><span>Primary TF</span><b>${esc(sig.primary_tf)}</b></div>
          <div><span>Opportunity</span><b>${n(sig.opportunity_score,0).toFixed(0)}</b></div>
          <div><span>Why</span><b>${n(sig.why_score,0).toFixed(0)}</b></div>
          <div><span>Freshness</span><b>${n(sig.freshness,0).toFixed(0)}</b></div>
          <div><span>Updates</span><b>${n(sig.update_count,0)}</b></div>
          <div><span>Whale</span><b>${esc(sig.whale_side)} ${n(sig.whale_score,0).toFixed(0)}</b></div>
          <div><span>Accum</span><b>${n(sig.accumulation_score,0).toFixed(0)}</b></div>
          <div><span>Discovery</span><b>${n(sig.discovery_score,0).toFixed(0)}</b></div>
          <div><span>Entry Dist</span><b>${n(sig.entry_distance_pct,0).toFixed(2)}%</b></div>
          <div><span>Rank</span><b>${n(sig.panel_rank_score,0).toFixed(0)}</b></div>
        </div>`;
    }
    const why = document.getElementById('pxWhyBlock');
    if (why) why.innerHTML = (sig.reasons || []).length ? `<ul class="px-why-list">${sig.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<div class="px-empty">Why block yok.</div>';
    const exec = document.getElementById('pxExecBlock');
    if (exec) exec.innerHTML = `<div class="px-block-row"><b>Execution</b><span>${esc(sig.execution_block)}</span></div><div class="px-block-row"><b>Invalidation</b><span>${esc(sig.invalidation_block)}</span></div>`;
    const tp = document.getElementById('pxTpMatrix');
    if (tp) tp.innerHTML = tpMatrixHtml(sig);
    const ev = document.getElementById('pxEventHistory');
    if (ev) ev.innerHTML = eventHistoryHtml(sig);
    const tg = document.getElementById('pxModalLinks');
    if (tg) tg.innerHTML = `<a class="mlink" href="${esc(tradingViewUrl(sig))}" target="_blank" rel="noopener">TradingView</a><a class="mlink" href="${esc(exchangeUrlForSignal(sig))}" target="_blank" rel="noopener">${esc(exchangeLabelForSignal(sig))}</a>`;
    const mcSignal = document.getElementById('mcSignal');
    if (mcSignal) { mcSignal.textContent = sig.direction; mcSignal.className = `msig ${sig.direction === 'LONG' ? 'msig-long' : 'msig-short'}`; }
    const mcConf = document.getElementById('mcConf'); if (mcConf) mcConf.textContent = `${n(sig.opportunity_score,0).toFixed(0)}%`;
    const mcEntry = document.getElementById('mcEntry'); if (mcEntry) mcEntry.textContent = `${fp(sig.entry_low)}–${fp(sig.entry_high)}`;
    const mcSL = document.getElementById('mcSL'); if (mcSL) mcSL.textContent = fp(sig.stop_loss);
    const mPrimary = sig.tp_matrix[sig.primary_tf] || sig.tp_matrix['1h'];
    const mcTP1 = document.getElementById('mcTP1'); if (mcTP1 && mPrimary) mcTP1.textContent = fp(mPrimary.tp1);
    const mcTP2 = document.getElementById('mcTP2'); if (mcTP2 && mPrimary) mcTP2.textContent = fp(mPrimary.tp2);
    const risk = Math.max(Math.abs(mid(sig.entry_low, sig.entry_high) - sig.stop_loss), 0.00000001);
    const mcRR = document.getElementById('mcRR'); if (mcRR && mPrimary) mcRR.textContent = `1:${(Math.abs(n(mPrimary.tp1,0)-mid(sig.entry_low,sig.entry_high))/risk).toFixed(1)}`;
  };

  const origRunV2 = runV2Engines;
  var _lastCleanup = Date.now();
  var _lastSignalRun = 0;
  var _signalInterval = 30000; /* run signal engine every 30 seconds, NOT every tick */
  runV2Engines = function(){
    origRunV2();
    var _now = Date.now();
    if (_now - _lastSignalRun >= _signalInterval) {
      _lastSignalRun = _now;
      runSignalLayer();
    }
    renderPriorityStrip();
    renderTelegramPreview();
    /* 24h signal cleanup */
    if (Date.now() - _lastCleanup > 3600000) { /* check every hour */
      _lastCleanup = Date.now();
      var cutoff = Date.now() - 86400000; /* 24 hours */
      Z.proptrex.signalBook.forEach(function(sig, key) {
        if (sig.created_at && sig.created_at < cutoff) {
          Z.proptrex.signalBook.delete(key);
          var sym = sig.symbol;
          if (Z.proptrex.currentBySymbol.get(sym) === key) Z.proptrex.currentBySymbol.delete(sym);
          var t = Z.bySym.get(sym);
          if (t) t.signal = null;
        }
      });
    }
  };

  function installUi(){
    // Her çalışmada koşulsuz: signalRow gizle, pxFilterBar sadece Settings butonu
    const _sr = document.getElementById('signalRow');
    if (_sr) _sr.style.cssText = 'display:none!important';
    const _fb = document.getElementById('pxFilterBar');
    if (_fb) {
      _fb.textContent = '';
      const btn = ensureAdminToggleButton();
      _fb.appendChild(btn);
      _fb.style.cssText = 'display:flex;justify-content:flex-end;align-items:center;padding:5px 16px;border-bottom:1px solid var(--border);background:#fff';
    }


    if (document.getElementById('pxProptrexStyles')) return;

    const style = document.createElement('style');
    style.id = 'pxProptrexStyles';
    style.textContent = `
      .px-priority-strip{padding:10px 16px;border-bottom:1px solid var(--border);background:linear-gradient(90deg,rgba(124,58,237,.04),rgba(37,99,235,.04),rgba(22,163,74,.04));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
      .px-radar-card{border:1px solid rgba(17,24,39,.08);background:#fff;border-radius:14px;padding:10px 12px;text-align:left;cursor:pointer;box-shadow:0 6px 18px rgba(17,24,39,.04)}
      .px-radar-card:hover{background:rgba(17,24,39,.02)}
      .px-radar-top,.px-radar-row{display:flex;justify-content:space-between;gap:10px}
      .px-radar-top{margin-bottom:8px}
      .px-radar-sym{font-weight:800;font-family:'IBM Plex Mono',monospace}
      .px-radar-row{font-size:11px;color:rgba(17,24,39,.62);margin-top:4px}
      .px-filter-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 16px;border-bottom:1px solid var(--border);background:#fff}
      .px-filter-title{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:800;letter-spacing:1px;color:#2563eb;text-transform:uppercase}
      .px-filter-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;border:1px solid var(--border);background:#fff;font-size:12px;cursor:pointer}
      .px-filter-pill.on{background:rgba(37,99,235,.12);border-color:rgba(37,99,235,.30);color:#2563eb;font-weight:700;box-shadow:0 0 0 2px rgba(37,99,235,.15)}
      .px-state-badge{display:inline-flex;align-items:center;justify-content:center;height:22px;padding:0 8px;border-radius:999px;font-size:10px;font-weight:800;font-family:'IBM Plex Mono',monospace;letter-spacing:.4px;border:1px solid transparent}
      .px-state-watchlist{background:rgba(100,116,139,.09);color:#64748b;border-color:rgba(100,116,139,.16)}
      .px-state-tradeable{background:rgba(37,99,235,.09);color:#2563eb;border-color:rgba(37,99,235,.16)}
      .px-state-priority{background:rgba(124,58,237,.09);color:#7c3aed;border-color:rgba(124,58,237,.16)}
      .px-state-execution{background:rgba(22,163,74,.09);color:#16a34a;border-color:rgba(22,163,74,.16)}
      .px-state-cooldown{background:rgba(245,158,11,.09);color:#f59e0b;border-color:rgba(245,158,11,.16)}
      .px-state-invalidated{background:rgba(239,68,68,.09);color:#ef4444;border-color:rgba(239,68,68,.16)}
      .px-dir{display:inline-flex;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;font-family:'IBM Plex Mono',monospace}
      .px-long{background:rgba(22,163,74,.09);color:#16a34a}
      .px-short{background:rgba(239,68,68,.09);color:#ef4444}
      .px-neutral{background:rgba(100,116,139,.08);color:#64748b}
      .px-score,.px-rank,.px-fresh,.px-accum{font-weight:800}
      .px-zone,.px-stop,.px-tpm,.px-whale,.px-why{font-size:11px}
      .px-why{display:inline-block;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .px-tg-shell{margin-top:12px;grid-column:span 12;background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px;box-shadow:0 6px 18px rgba(17,24,39,.04)}
      .px-tg-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px}
      .px-tg-title{font-weight:800;font-size:13px;color:#111827}
      .px-tg-sub{font-size:11px;color:rgba(17,24,39,.52)}
      .px-tg-pre{margin:0;white-space:pre-wrap;background:rgba(17,24,39,.03);border:1px solid rgba(17,24,39,.06);border-radius:12px;padding:12px;font-size:11px;line-height:1.45;max-height:280px;overflow:auto;font-family:'IBM Plex Mono',monospace}
      .px-tg-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .px-tg-btn{display:inline-flex;height:32px;align-items:center;padding:0 12px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-size:12px;font-weight:700}
      .px-tg-btn:hover{opacity:.92}
      .px-tg-empty,.px-strip-empty,.px-empty{font-size:12px;color:rgba(17,24,39,.46)}
      .px-side-card{background:#fff;border:1px solid rgba(17,24,39,.08);border-radius:14px;padding:12px;margin-bottom:10px}
      .px-side-card h4{margin:0 0 10px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#2563eb;font-family:'IBM Plex Mono',monospace}
      .px-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}
      .px-info-grid div{display:flex;flex-direction:column;gap:3px}
      .px-info-grid span{font-size:10px;color:rgba(17,24,39,.45);font-family:'IBM Plex Mono',monospace}
      .px-info-grid b{font-size:12px;font-family:'IBM Plex Mono',monospace}
      .px-why-list{margin:0;padding-left:18px;font-size:12px;line-height:1.4;color:#374151}
      .px-block-row{display:flex;flex-direction:column;gap:3px;padding:7px 0;border-bottom:1px solid rgba(17,24,39,.06);font-size:12px}
      .px-block-row:last-child{border-bottom:none}
      .px-tp-table{width:100%;border-collapse:collapse;font-size:11px}
      .px-tp-table th,.px-tp-table td{padding:6px 4px;border-bottom:1px solid rgba(17,24,39,.06);text-align:left;font-family:'IBM Plex Mono',monospace}
      .px-tp-table td.hit{color:#16a34a;font-weight:800}
      .px-ev-item{padding:7px 0;border-bottom:1px solid rgba(17,24,39,.06)}
      .px-ev-item:last-child{border-bottom:none}
      .px-ev-type{font-size:10px;font-weight:800;font-family:'IBM Plex Mono',monospace;color:#111827}
      .px-ev-time{float:right;font-size:10px;color:rgba(17,24,39,.45);font-family:'IBM Plex Mono',monospace}
      .px-ev-payload{font-size:11px;color:rgba(17,24,39,.58);margin-top:4px;word-break:break-word}
      .px-modal-links{display:flex;gap:6px;flex-wrap:wrap}
      .px-signal-history-panel{margin:0;border:none;border-top:2px solid rgba(17,24,39,.08);background:#fff;padding:18px 16px}
      .px-signal-history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .px-signal-history-head h4{margin:0;font-size:16px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#111827}
      .px-signal-history-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:rgba(17,24,39,.6)}
      .px-signal-history-actions{display:flex;gap:8px;align-items:center}
      .px-history-btn{height:32px;padding:0 14px;border-radius:10px;border:1px solid rgba(17,24,39,.12);background:#111827;color:#fff;font-size:12px;font-weight:700;cursor:pointer}
      .px-history-table-wrapper{overflow-x:auto;margin-top:14px}
      .px-history-table{width:100%;border-collapse:collapse;font-size:12px}
      .px-history-table th,.px-history-table td{padding:8px 10px;text-align:left;border-bottom:1px solid rgba(17,24,39,.08);font-family:'IBM Plex Mono',monospace}
      .px-history-table th{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:#64748b;background:rgba(15,23,42,.04)}
      .px-history-status{display:inline-flex;align-items:center;justify-content:center;height:22px;padding:0 8px;border-radius:999px;font-size:10px;font-weight:700}
      .px-history-status-active{background:rgba(37,99,235,.12);color:#2563eb;border:1px solid rgba(37,99,235,.3)}
      .px-history-status-updated{background:rgba(16,185,129,.12);color:#16a34a;border:1px solid rgba(16,185,129,.3)}
      .px-history-status-expired{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.3)}
      .px-history-age-text,.px-history-age-move{font-weight:700}
      .px-history-age-move{font-size:10px;margin-left:4px}
      .px-age-bucket{font-size:10px;color:rgba(17,24,39,.45);margin-left:6px}
      .px-history-row .star{cursor:pointer}

      .ss .px-dh{position:absolute;top:6px;right:8px;cursor:grab;padding:2px 6px;font-size:10px;color:var(--t4);opacity:0;transition:opacity .15s;user-select:none}
      .ss:hover .px-dh{opacity:1}
      .ss.px-dragging{opacity:.7;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:100}
      .ss .px-cb{position:absolute;top:6px;right:32px;cursor:pointer;padding:2px 6px;font-size:10px;color:var(--t4);opacity:0;transition:opacity .15s}
      .ss:hover .px-cb{opacity:1}
      .ss.px-col>:not(.sh):not(.px-dh):not(.px-cb){display:none!important}

      .px-toast-container{position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:380px}
      .px-toast{pointer-events:auto;padding:12px 16px;border-radius:12px;background:#111827;color:#fff;font-size:12px;font-family:'IBM Plex Mono',monospace;box-shadow:0 8px 32px rgba(0,0,0,.25);animation:px-toast-in .3s ease;display:flex;gap:10px;align-items:flex-start;border-left:4px solid #2563eb}
      .px-toast.long{border-left-color:#16a34a} .px-toast.short{border-left-color:#ef4444} .px-toast.high{border-left-color:#f59e0b}
      .px-toast-icon{font-size:18px;flex-shrink:0} .px-toast-body{flex:1} .px-toast-title{font-weight:800;font-size:13px;margin-bottom:2px}
      .px-toast-detail{color:rgba(255,255,255,.7);font-size:11px;line-height:1.4} .px-toast-time{color:rgba(255,255,255,.45);font-size:10px;margin-top:4px}
      .px-toast-close{background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:14px;padding:0 0 0 8px;flex-shrink:0}
      @keyframes px-toast-in{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
      @keyframes px-toast-out{from{opacity:1}to{opacity:0;transform:translateX(100%)}}
      .top-gainers-table tbody tr{cursor:pointer}
      .top-gainers-table tbody tr:hover{background:rgba(37,99,235,.08)}
      .top-gainers-table tbody tr.sel{background:rgba(37,99,235,.12)}
      .px-chart-watermark{position:absolute;left:14px;bottom:12px;pointer-events:none;display:flex;align-items:center;gap:8px;font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:800;color:rgba(17,24,39,.14);letter-spacing:1px}
      .px-chart-logo{width:28px;height:28px;object-fit:contain;display:block;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.08)}
      .px-chart-watermark-text{line-height:1}
      .px-admin-open{margin-left:auto;background:#111827;color:#fff;border-color:#111827}
      .px-admin-open.on{background:#2563eb;border-color:#2563eb}
      .px-admin-overlay{position:fixed;inset:0;background:rgba(15,23,42,.34);backdrop-filter:blur(4px);z-index:10020;display:none}
      .px-admin-overlay.on{display:block}
      .px-admin-panel{position:fixed;top:50%;right:20px;transform:translateY(-50%);width:min(760px,calc(100vw - 32px));max-height:92vh;overflow:auto;background:#fff;border:1px solid rgba(17,24,39,.08);border-radius:18px;box-shadow:0 26px 72px rgba(0,0,0,.18);padding:18px;z-index:10021;display:none}
      .px-admin-panel.on{display:block}
      .px-admin-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .px-admin-title{font-size:16px;font-weight:800;color:#111827}
      .px-admin-sub{font-size:11px;color:rgba(17,24,39,.54)}
      .px-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .px-admin-sec{border:1px solid rgba(17,24,39,.07);border-radius:14px;padding:12px;background:#fff}
      .px-admin-sec h5{margin:0 0 10px;font-size:11px;font-weight:800;font-family:'IBM Plex Mono',monospace;letter-spacing:1px;color:#2563eb;text-transform:uppercase}
      .px-admin-field{display:flex;flex-direction:column;gap:5px;margin-bottom:10px}
      .px-admin-field label{font-size:11px;color:rgba(17,24,39,.58);font-weight:700}
      .px-admin-field input,.px-admin-field textarea{border:1px solid rgba(17,24,39,.10);border-radius:10px;padding:9px 10px;font-size:12px;font-family:'IBM Plex Mono',monospace;background:#fff;color:#111827}
      .px-admin-field textarea{min-height:70px;resize:vertical}
      .px-admin-actions{display:flex;justify-content:flex-end;gap:8px;position:sticky;bottom:0;background:#fff;padding-top:10px;margin-top:10px}
      .px-admin-btn{height:36px;padding:0 14px;border-radius:10px;border:1px solid rgba(17,24,39,.10);background:#fff;font-size:12px;font-weight:700;cursor:pointer}
      .px-admin-btn.primary{background:#111827;color:#fff;border-color:#111827}
      .px-admin-note{font-size:11px;color:#b45309;background:rgba(245,158,11,.10);padding:9px 10px;border-radius:10px;border:1px solid rgba(245,158,11,.18)}

      @media(max-width:1100px){.px-priority-strip{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:700px){.px-priority-strip{grid-template-columns:1fr}.px-filter-bar{padding:8px 10px}.px-priority-strip{padding:10px}.px-why{max-width:120px}}
    `;
    document.head.appendChild(style);

    const signalRow = document.getElementById('signalRow');
    // Her şekilde gizle
    if (signalRow) { signalRow.style.cssText += ';display:none!important'; }

    if (!document.getElementById('pxFilterBar')) {
      const bar = document.createElement('div');
      bar.id = 'pxFilterBar';
      bar.className = 'px-filter-bar';
      bar.style.cssText = 'justify-content:flex-end;padding:5px 16px;gap:8px;border-bottom:1px solid var(--border);background:#fff';
      bar.innerHTML = '';
      bar.appendChild(ensureAdminToggleButton());
      const anchor = document.getElementById('tickerRow') || document.getElementById('mainPanel');
      if (anchor) anchor.insertAdjacentElement('beforebegin', bar);
    }
    // Search bağlantısı her zaman kur
    const sinpEl = document.getElementById('sinp');
    if (sinpEl && !sinpEl.dataset.bound) {
      sinpEl.dataset.bound = '1';
      sinpEl.addEventListener('input', () => { Z.q = sinpEl.value; Z.proptrex.forceSort = true; rTbl(); });
    }

    const mainPanel = document.getElementById('mainPanel');
    if (mainPanel && !document.getElementById('pxPriorityStrip')) {
      const strip = document.createElement('div');
      strip.id = 'pxPriorityStrip';
      strip.className = 'px-priority-strip';
      mainPanel.insertAdjacentElement('beforebegin', strip);
    }
    const mainTablePanel = document.getElementById('mainTablePanel');
    const twWrapper = mainTablePanel ? mainTablePanel.querySelector('.tw') : null;
    if (twWrapper && !document.getElementById('pxSignalHistoryPanel')) {
      const historyPanel = document.createElement('section');
      historyPanel.id = 'pxSignalHistoryPanel';
      historyPanel.className = 'px-signal-history-panel';
      historyPanel.innerHTML = `
        <div class="px-signal-history-head">
          <div>
            <h4>Signal Results</h4>
            <div class="px-signal-history-meta">
              <span id="pxSignalHistoryRetention">Retention: ${DEFAULT_SIGNAL_RETENTION_HOURS}h</span>
              <span id="pxSignalHistoryCount">Visible: 0 / Total: 0</span>
              <span id="pxSignalHistoryLastUpdate">Last refresh: --</span>
            </div>
          </div>
          <div class="px-signal-history-actions">
            <button class="px-history-btn" id="pxSignalHistoryRefresh">Refresh</button>
          </div>
        </div>
        <div class="px-signal-history-table-wrapper">
          <table id="pxSignalHistoryTable" class="px-history-table">
            <thead><tr id="pxSignalHistoryHeader"></tr></thead>
            <tbody></tbody>
          </table>
        </div>`;
      twWrapper.appendChild(historyPanel);
    }
    const historyRefresh = document.getElementById('pxSignalHistoryRefresh');
    if (historyRefresh) {
      historyRefresh.addEventListener('click', () => renderSignalHistory());
    }

    const botGrid = document.querySelector('#botPanel .botp-grid');
    if (botGrid && !document.getElementById('pxTelegramPreviewCard')) {
      const card = document.createElement('div');
      card.id = 'pxTelegramPreviewCard';
      card.className = 'px-tg-shell';
      card.innerHTML = '<div id="pxTelegramPreview"></div>';
      botGrid.appendChild(card);
    }

    const mSide = document.getElementById('mSide');
    if (mSide && !document.getElementById('pxSignalInfoCard')) {
      const html = `
        <div class="px-side-card" id="pxSignalInfoCard"><h4>Signal Snapshot</h4><div id="pxSignalInfo"></div></div>
        <div class="px-side-card"><h4>Why Block</h4><div id="pxWhyBlock"></div></div>
        <div class="px-side-card"><h4>Execution / Invalidation</h4><div id="pxExecBlock"></div></div>
        <div class="px-side-card"><h4>Full TP Matrix</h4><div id="pxTpMatrix"></div></div>
        <div class="px-side-card"><h4>Event History</h4><div id="pxEventHistory"></div></div>
        <div class="px-side-card"><h4>Quick Links</h4><div class="px-modal-links" id="pxModalLinks"></div></div>`;
      mSide.insertAdjacentHTML('beforeend', html);
    }

    const chartWrap = document.querySelector('.mchart-wrap');
    if (chartWrap && !chartWrap.querySelector('.px-chart-watermark')) {
      chartWrap.insertAdjacentHTML('beforeend', '<div class="px-chart-watermark"><img class="px-chart-logo" src="assets/media/corporate-logo.png" alt="PROPTREX Radar"><span class="px-chart-watermark-text">proptrex.com</span></div>');
    }

    if (!document.getElementById('pxAdminOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'pxAdminOverlay';
      overlay.className = 'px-admin-overlay';
      overlay.innerHTML = '<div class="px-admin-panel" id="pxAdminPanel"></div>';
      document.body.appendChild(overlay);
      // Backdrop tıklamasıyla kapanmaz — sadece Kapat butonu ile kapanır
    }

    const adminPanel = document.getElementById('pxAdminPanel');
    if (adminPanel && !adminPanel.getAttribute('data-ready')) {
      adminPanel.setAttribute('data-ready', '1');
      adminPanel.innerHTML = `
        <div class="px-admin-head">
          <div>
            <div class="px-admin-title">⚙ Settings</div>
            <div class="px-admin-sub">Filtreler, sinyal eşikleri, sembol listeleri ve endpoint yönetimi</div>
          </div>
          <button class="px-admin-btn" id="pxAdminClose">Kapat ×</button>
        </div>
        <div class="px-admin-note">IP allow/block alanları bu statik build içinde policy olarak saklanır.</div>

        <!-- Sinyal Filtreleri (filter-toolbar.js tarafından doldurulur) -->
        <div class="px-admin-sec" style="grid-column:1/-1">
          <h5>Sinyal Filtreleri</h5>
          <div id="pxSettingsFilterZone" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center"></div>
        </div>

        <!-- TA Sinyalleri -->
        <div class="px-admin-sec" style="grid-column:1/-1">
          <h5>TA Sinyalleri</h5>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
            <button class="px-filter-pill" data-s="rsiob">RSI &gt;70</button>
            <button class="px-filter-pill" data-s="rsios">RSI &lt;30</button>
            <button class="px-filter-pill" data-s="macdup">MACD ↑</button>
            <button class="px-filter-pill" data-s="macddn">MACD ↓</button>
            <button class="px-filter-pill" data-s="gap">GAP</button>
            <button class="px-filter-pill" data-s="fib">FIB 0.618</button>
            <button class="px-filter-pill" data-s="whale">🐋 Balina</button>
          </div>
        </div>

        <div class="px-admin-grid">
          <div class="px-admin-sec">
            <h5>Thresholds</h5>
            <div class="px-admin-field"><label for="admPriorityThreshold">Priority Threshold</label><input id="admPriorityThreshold" type="number" step="1"></div>
            <div class="px-admin-field"><label for="admTradeableThreshold">Tradeable Threshold</label><input id="admTradeableThreshold" type="number" step="1"></div>
            <div class="px-admin-field"><label for="admExecutionThreshold">Execution Threshold</label><input id="admExecutionThreshold" type="number" step="1"></div>
            <div class="px-admin-field"><label for="admExecutionEntryDist">Execution Entry Distance %</label><input id="admExecutionEntryDist" type="number" step="0.01"></div>
            <div class="px-admin-field"><label for="admPriorityEntryDist">Priority Entry Distance %</label><input id="admPriorityEntryDist" type="number" step="0.01"></div>
            <div class="px-admin-field"><label for="admMaxEntryDistancePct">Max Entry Distance %</label><input id="admMaxEntryDistancePct" type="number" step="0.01"></div>
            <div class="px-admin-field"><label for="admFreshnessThreshold">Freshness Threshold</label><input id="admFreshnessThreshold" type="number" step="1"></div>
            <div class="px-admin-field"><label for="admWhaleAlignmentThreshold">Whale Alignment Threshold</label><input id="admWhaleAlignmentThreshold" type="number" step="1"></div>
          </div>
          <div class="px-admin-sec">
            <h5>Delivery / Discovery</h5>
            <div class="px-admin-field"><label for="admCooldownMinutes">Cooldown Minutes</label><input id="admCooldownMinutes" type="number" step="1"></div>
            <div class="px-admin-field"><label for="admMaxAlertsPerSymbolPerHour">Max Alerts per Symbol / Hour</label><input id="admMaxAlertsPerSymbolPerHour" type="number" step="1"></div>
            <div class="px-admin-field"><label for="admInvalidationTrap">Invalidation Trap</label><input id="admInvalidationTrap" type="number" step="1"></div>
            <div class="px-admin-field"><label for="admDiscoveryChangePct">Discovery Min Move %</label><input id="admDiscoveryChangePct" type="number" step="0.1"></div>
            <div class="px-admin-field"><label for="admDiscoveryVolumeAccel">Discovery Min Volume Accel</label><input id="admDiscoveryVolumeAccel" type="number" step="0.1"></div>
            <div class="px-admin-field"><label for="admExposurePenalty">Exposure Penalty</label><input id="admExposurePenalty" type="number" step="0.1"></div>
            <div class="px-admin-field"><label for="admExposureWindowMinutes">Exposure Window Minutes</label><input id="admExposureWindowMinutes" type="number" step="1"></div>
            <div class="px-admin-field"><label for="admMaxRows">Visible Row Limit</label><input id="admMaxRows" type="number" step="1"></div>
          </div>
          <div class="px-admin-sec">
            <h5>Signal History</h5>
            <div class="px-admin-field">
              <label for="admSignalRetentionHours">Retention Hours</label>
              <select id="admSignalRetentionHours">
                <option value="4">04 hours</option>
                <option value="8">08 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
              </select>
            </div>
            <div class="px-admin-field">
              <label for="admSignalDedupWindowMinutes">Dedup Window Minutes</label>
              <input id="admSignalDedupWindowMinutes" type="number" step="1" min="1">
            </div>
            <div class="px-admin-field">
              <small>Rolling retention window keeps history rows for the selected duration; dedup window avoids duplicate rows.</small>
            </div>
          </div>
          <div class="px-admin-sec">
            <h5>Manual Filters</h5>
            <div class="px-admin-field"><label for="admManualIncludeSymbols">Allowed Symbols</label><textarea id="admManualIncludeSymbols" aria-label="Allowed Symbols"></textarea></div>
            <div class="px-admin-field"><label for="admManualExcludeSymbols">Blocked Symbols</label><textarea id="admManualExcludeSymbols" aria-label="Blocked Symbols"></textarea></div>
            <div class="px-admin-field"><label for="admManualPrioritySymbols">Forced Priority Symbols</label><textarea id="admManualPrioritySymbols" aria-label="Forced Priority Symbols"></textarea></div>
          </div>
          <div class="px-admin-sec">
            <h5>IP Policy</h5>
            <div class="px-admin-field"><label for="admIpAllowlist">IP Allowlist</label><textarea id="admIpAllowlist" aria-label="IP Allowlist"></textarea></div>
            <div class="px-admin-field"><label for="admIpBlocklist">IP Blocklist</label><textarea id="admIpBlocklist" aria-label="IP Blocklist"></textarea></div>
          </div>
          <div class="px-admin-sec">
            <h5>Endpoint Override</h5>
            <div class="px-admin-field"><label for="admRestUsdm">USD-M REST</label><input id="admRestUsdm" type="text" aria-label="USD-M REST"></div>
            <div class="px-admin-field"><label for="admWsUsdm">USD-M WS</label><input id="admWsUsdm" type="text" aria-label="USD-M WS"></div>
            <div class="px-admin-field"><label for="admRestCoinm">COIN-M REST</label><input id="admRestCoinm" type="text" aria-label="COIN-M REST"></div>
            <div class="px-admin-field"><label for="admWsCoinm">COIN-M WS</label><input id="admWsCoinm" type="text" aria-label="COIN-M WS"></div>
          </div>
        </div>
        <div class="px-admin-actions">
          <button class="px-admin-btn" id="pxAdminReset">Reset</button>
          <button class="px-admin-btn primary" id="pxAdminSave">Save</button>
        </div>`;

      const bindAdminForm = () => {
        const cfg = adminCfg();
        const map = {
          admPriorityThreshold:'priorityThreshold', admTradeableThreshold:'tradeableThreshold', admExecutionThreshold:'executionThreshold', admExecutionEntryDist:'executionEntryDist', admPriorityEntryDist:'priorityEntryDist', admMaxEntryDistancePct:'maxEntryDistancePct', admFreshnessThreshold:'freshnessThreshold', admWhaleAlignmentThreshold:'whaleAlignmentThreshold', admCooldownMinutes:'cooldownMinutes', admMaxAlertsPerSymbolPerHour:'maxAlertsPerSymbolPerHour', admInvalidationTrap:'invalidationTrap', admDiscoveryChangePct:'discoveryChangePct', admDiscoveryVolumeAccel:'discoveryVolumeAccel', admExposurePenalty:'exposurePenalty', admExposureWindowMinutes:'exposureWindowMinutes', admManualIncludeSymbols:'manualIncludeSymbols', admManualExcludeSymbols:'manualExcludeSymbols', admManualPrioritySymbols:'manualPrioritySymbols', admIpAllowlist:'ipAllowlist', admIpBlocklist:'ipBlocklist', admRestUsdm:'restUsdm', admWsUsdm:'wsUsdm', admRestCoinm:'restCoinm', admWsCoinm:'wsCoinm', admMaxRows:'maxRows', admSignalRetentionHours:'signalRetentionHours', admSignalDedupWindowMinutes:'signalDedupWindowMinutes'
        };
        Object.entries(map).forEach(([id,key]) => {
          const node = document.getElementById(id);
          if (node) node.value = cfg[key] == null ? '' : String(cfg[key]);
        });
        // Sync TA signal button active states
        adminPanel.querySelectorAll('[data-s]').forEach(btn => {
          btn.classList.toggle('on', Z.sig === btn.getAttribute('data-s'));
        });
        // Sync filter pill active states
        adminPanel.querySelectorAll('[data-px-filter]').forEach(btn => {
          btn.classList.toggle('on', !!Z.proptrex.filters[btn.getAttribute('data-px-filter')]);
        });
      };
      bindAdminForm();
      adminPanel.__bindAdminForm = bindAdminForm;

      // TA Signal button handlers
      adminPanel.querySelectorAll('[data-s]').forEach(btn => {
        btn.addEventListener('click', () => {
          const s = btn.getAttribute('data-s');
          Z.sig = (Z.sig === s) ? null : s;
          adminPanel.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', Z.sig === b.getAttribute('data-s')));
          Z.proptrex.forceSort = true;
          rTbl();
        });
      });
      // Filter pill handlers inside settings panel
      adminPanel.querySelectorAll('[data-px-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.getAttribute('data-px-filter');
          Z.proptrex.filters[k] = !Z.proptrex.filters[k];
          btn.classList.toggle('on', !!Z.proptrex.filters[k]);
          Z.proptrex.forceSort = true;
          rTbl();
        });
      });


      document.getElementById('pxAdminClose')?.addEventListener('click', () => {
        document.getElementById('pxAdminOverlay')?.classList.remove('on');
        adminPanel.classList.remove('on');
        document.getElementById('pxAdminOpen')?.classList.remove('on');
      });
      document.getElementById('pxAdminReset')?.addEventListener('click', () => {
        const cfg = saveAdminConfig(defaultAdminConfig());
        bindAdminForm();
        rTbl();
        renderPriorityStrip();
      });
      document.getElementById('pxAdminSave')?.addEventListener('click', () => {
        const pick = id => document.getElementById(id)?.value ?? '';
        const cfg = saveAdminConfig({
          priorityThreshold:Number(pick('admPriorityThreshold')),
          tradeableThreshold:Number(pick('admTradeableThreshold')),
          executionThreshold:Number(pick('admExecutionThreshold')),
          executionEntryDist:Number(pick('admExecutionEntryDist')),
          priorityEntryDist:Number(pick('admPriorityEntryDist')),
          maxEntryDistancePct:Number(pick('admMaxEntryDistancePct')),
          freshnessThreshold:Number(pick('admFreshnessThreshold')),
          whaleAlignmentThreshold:Number(pick('admWhaleAlignmentThreshold')),
          cooldownMinutes:Number(pick('admCooldownMinutes')),
          maxAlertsPerSymbolPerHour:Number(pick('admMaxAlertsPerSymbolPerHour')),
          invalidationTrap:Number(pick('admInvalidationTrap')),
          discoveryChangePct:Number(pick('admDiscoveryChangePct')),
          discoveryVolumeAccel:Number(pick('admDiscoveryVolumeAccel')),
          exposurePenalty:Number(pick('admExposurePenalty')),
          exposureWindowMinutes:Number(pick('admExposureWindowMinutes')),
          manualIncludeSymbols:pick('admManualIncludeSymbols'),
          manualExcludeSymbols:pick('admManualExcludeSymbols'),
          manualPrioritySymbols:pick('admManualPrioritySymbols'),
          ipAllowlist:pick('admIpAllowlist'),
          ipBlocklist:pick('admIpBlocklist'),
          restUsdm:pick('admRestUsdm').trim(),
          wsUsdm:pick('admWsUsdm').trim(),
          restCoinm:pick('admRestCoinm').trim(),
          wsCoinm:pick('admWsCoinm').trim(),
          maxRows:Number(pick('admMaxRows')),
          signalRetentionHours:Number(pick('admSignalRetentionHours')),
          signalDedupWindowMinutes:Number(pick('admSignalDedupWindowMinutes'))
        });
        Z.proptrex.visibilitySeen.clear();
        runSignalLayer();
        Z.proptrex.forceSort = true;
        rTbl();
        renderPriorityStrip();
        renderSignalHistory();
        try { if (Z.ws) Z.ws.close(); } catch {}
        try { connectWS(); } catch {}
      });
    }

    document.getElementById('pxAdminOpen')?.addEventListener('click', () => {
      const overlay = document.getElementById('pxAdminOverlay');
      const panel = document.getElementById('pxAdminPanel');
      if (!overlay || !panel) return;
      overlay.classList.toggle('on');
      panel.classList.toggle('on');
      document.getElementById('pxAdminOpen')?.classList.toggle('on', overlay.classList.contains('on'));
      if (panel.__bindAdminForm) panel.__bindAdminForm();
    });
    setupSignalHistoryMaintenance();
  }

  window.PROPTREX_APP = window.PROPTREX_APP || {};
  Object.assign(window.PROPTREX_APP, {
    state: Z,
    rerenderTable: () => rTbl(),
    rerenderPriorityStrip: () => renderPriorityStrip(),
    rerenderTelegramPreview: () => renderTelegramPreview(),
    installUi: () => installUi(),
    loadAdminConfig,
    saveAdminConfig,
    defaultAdminConfig,
    refreshSignalLayer: () => runSignalLayer(),
    openAdminPanel: () => document.getElementById('pxAdminOpen')?.click()
  });

  // First install + sync.
  signalHistoryStore.hydratePersistedSignals();
  installUi();
  restoreSignalHistoryRows();
  renderPriorityStrip();
  renderTelegramPreview();

  (function(){
    var sp=document.querySelector('.sp');if(!sp)return;
    var panels=Array.from(sp.querySelectorAll('.ss[data-panel-id]'));if(!panels.length)return;
    panels.forEach(function(p){
      var h=document.createElement('span');h.className='px-dh';h.textContent='⋮⋮';h.title='Sürükle';p.appendChild(h);
      var cb=document.createElement('span');cb.className='px-cb';cb.textContent='—';cb.title='Küçült';
      cb.addEventListener('click',function(e){e.stopPropagation();p.classList.toggle('px-col');cb.textContent=p.classList.contains('px-col')?'+':'—';_savePL();});
      p.appendChild(cb);
      h.addEventListener('mousedown',function(e){e.preventDefault();p.classList.add('px-dragging');var sy=e.clientY;
        function mm(ev){p.style.transform='translateY('+(ev.clientY-sy)+'px)';
          Array.from(sp.querySelectorAll('.ss[data-panel-id]:not(.px-dragging)')).forEach(function(s){
            var r=s.getBoundingClientRect(),m=r.top+r.height/2;
            if(ev.clientY<m&&ev.clientY>r.top)sp.insertBefore(p,s);
            else if(ev.clientY>m&&ev.clientY<r.bottom){if(s.nextSibling)sp.insertBefore(p,s.nextSibling);else sp.appendChild(p);}
          });
        }
        function mu(){p.classList.remove('px-dragging');p.style.transform='';document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);_savePL();}
        document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
      });
    });
    function _savePL(){try{var o=Array.from(sp.querySelectorAll('.ss[data-panel-id]')).map(function(p){return{id:p.getAttribute('data-panel-id'),col:p.classList.contains('px-col')};});localStorage.setItem('px_layout',JSON.stringify(o));}catch(e){}}
    function _loadPL(){try{var s=JSON.parse(localStorage.getItem('px_layout')||'[]');if(!s.length)return;var m={};panels.forEach(function(p){m[p.getAttribute('data-panel-id')]=p;});s.forEach(function(i){var p=m[i.id];if(!p)return;sp.appendChild(p);if(i.col){p.classList.add('px-col');var b=p.querySelector('.px-cb');if(b)b.textContent='+';}});}catch(e){}}
    _loadPL();
  })();

})();



// ═══ SERVICE WORKER ═══
if ('serviceWorker' in navigator) {
  const SW_SRC = `
const CACHE = 'proptrex-v1';
const ASSETS = [location.href || '/'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Only cache same-origin HTML; let API/WS pass through
  if (url.origin === location.origin && url.pathname.endsWith('.html')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    })));
  }
});
`;
  try {
    const blob = new Blob([SW_SRC], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    navigator.serviceWorker.register(swUrl, { scope: '/' }).catch(() => {});
  } catch(e) {}
}

// ═══ INSTALL PROMPT ═══
(function() {
  let deferredPrompt = null;
  const banner = document.getElementById('pxInstallBanner');
  const installBtn = document.getElementById('pxInstallBtn');
  const dismissBtn = document.getElementById('pxInstallDismiss');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (banner) banner.style.display = 'flex';
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (banner) banner.style.display = 'none';
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      if (banner) banner.style.display = 'none';
      try { localStorage.setItem('px_install_dismissed', '1'); } catch(e) {}
    });
  }

  // Don't show if already dismissed
  try {
    if (localStorage.getItem('px_install_dismissed')) {
      if (banner) banner.style.display = 'none';
    }
  } catch(e) {}

  // iOS Safari: no beforeinstallprompt — show manual instructions
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = ('standalone' in navigator && navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !isInStandalone) {
    setTimeout(() => {
      try { if (localStorage.getItem('px_install_dismissed')) return; } catch(e) {}
      const toast = document.getElementById('pxToastBox');
      if (!toast) return;
      const el = document.createElement('div');
      el.className = 'px-toast';
      el.innerHTML = `<span class="px-toast-icon">📱</span>
        <div class="px-toast-body">
          <div class="px-toast-title">iOS'a Ekle</div>
          <div class="px-toast-detail">Safari'de <b>Paylaş</b> → <b>Ana Ekrana Ekle</b> adımlarını izle</div>
        </div>
        <button class="px-toast-close" onclick="this.parentElement.remove()">✕</button>`;
      toast.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch(e) {} }, 12000);
    }, 3000);
  }

  // Fired when app is installed
  window.addEventListener('appinstalled', () => {
    if (banner) banner.style.display = 'none';
    deferredPrompt = null;
  });
})();
