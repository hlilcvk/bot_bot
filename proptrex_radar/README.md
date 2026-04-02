# PROPTREX Radar Backend

This package contains the real backend surface for the `proptrex_radar` subproduct.

## Modules

- `config.py` - environment and path settings
- `server.py` - HTTP server and API routing
- `api/telegram_api.py` - Telegram API contract handlers
- `services/telegram_service.py` - deep-link, webhook and message delivery logic
- `storage/sqlite_store.py` - persistent Telegram binding store
- `domain/telegram.py` - domain view model
- `ai/registry.py` - AI role registry and evidence-source map

## AI binding

AI is preserved as a first-class subsystem in this repo. The backend registry and the product UI shell are kept in sync through the canonical AI layer mapping, and any future model/provider integration must remain schema-bound and evidence-bound.

## Telegram flow

1. UI creates a binding session.
2. Backend returns a deep-link to the bot.
3. User opens the link and Telegram sends `/start <token>`.
4. Webhook confirms the binding.
5. Radar can send messages to the bound chat.
