# Telegram Backend ve Bot Center

- Zaman: 2026-03-30 18:30:00
- Kapsam: Kullanici bazli Telegram baglama ve mesaj alma akisi

## Ozet

Gercek bir Telegram baglama akisi kuruldu. Kullanici, bot deep-link ile kendi Telegram hesabini bagliyor; `/start <token>` webhook ile dogrulanip oturum `sqlite` icinde tutuluyor. Bot Center tarafina deep-link olusturma, durum izleme, test mesaji ve unlink aksiyonlari eklendi.

## Degisen Dosyalar

- `proptrex_radar/server.py`
- `proptrex_radar/config.py`
- `proptrex_radar/services/telegram_service.py`
- `proptrex_radar/storage/sqlite_store.py`
- `proptrex_radar/api/telegram_api.py`
- `proptrex_radar/domain/telegram.py`
- `proptrex_radar/__main__.py`
- `proptrex_radar/README.md`
- `public/proptrex_radar/assets/config/telegram.json`
- `public/proptrex_radar/assets/js/telegram-link.js`
- `public/proptrex_radar/assets/js/bootstrap.js`
- `main.py`

## Dogrulama

- `/api/health` calisti.
- `/api/telegram/link-session` token ve `t.me/<bot>?start=<token>` deep-link uretti.
- Test mesaji altyapisi bot token baglandiginda aktif olacak sekilde kuruldu.

