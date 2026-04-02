# PROPTREX Radar

Canonical app entry:

- [public/proptrex_radar/index.html](D:/PROJELER/PROPTREX%20Radar/public/proptrex_radar/index.html)

Backend entry:

- [main.py](D:/PROJELER/PROPTREX%20Radar/main.py)
- [proptrex_radar/server.py](D:/PROJELER/PROPTREX%20Radar/proptrex_radar/server.py)

Telegram binding:

- `TELEGRAM_BOT_TOKEN` - required for sending messages
- `TELEGRAM_BOT_USERNAME` - required for deep-link generation
- `TELEGRAM_WEBHOOK_SECRET` - optional webhook secret
- `PUBLIC_BASE_URL` - optional public URL for deployments

Run:

```bash
python main.py
```

Routes:

- `/` -> `/proptrex_radar/`
- `/proptrex_radar/` -> canonical product surface
- `/api/telegram/link-session` -> create a Telegram deep-link binding
- `/api/telegram/webhook` -> receive Telegram bot confirmations

