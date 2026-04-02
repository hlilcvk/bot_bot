# Modul Katmanlar ve Editable Config

- Zaman: 2026-03-30 18:01:00
- Kapsam: Filtre, AI label ve admin varsayimlarinin dosya bazli ayrilmasi

## Ozet

Tek parca HTML'nin yanina ayrik `assets/config` ve `assets/js` katmanlari eklendi. Filtre gruplari, AI layer tanimlari ve admin default'lari ayrik JSON dosyalarina tasindi. Bunlari okuyup sayfaya baglayan bootstrap modulu eklendi.

## Degisen Dosyalar

- `public/assets/config/filters.json`
- `public/assets/config/ai-layers.json`
- `public/assets/config/admin-defaults.json`
- `public/assets/js/config-loader.js`
- `public/assets/js/filter-toolbar.js`
- `public/assets/js/ai-layers-panel.js`
- `public/assets/js/admin-sync.js`
- `public/assets/js/bootstrap.js`
- `public/assets/css/editor.css`

## Dogrulama

- Config dosyalari ayni origin uzerinden servis edildi.
- Filtre bari ve AI paneli runtime'da ayrik dosyalardan beslendi.

