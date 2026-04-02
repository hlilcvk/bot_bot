# Alt Urun Hiyerarsi

- Zaman: 2026-03-30 18:11:00
- Kapsam: `proptrex_radar` alt urun klasorleme sistemi

## Ozet

Proje ana urunu bozmayacak sekilde `public/proptrex_radar/` altinda canonical giris kuruldu. Page contract, navigation registry ve locale registry dosyalari eklendi. Alt urun tree'si `ui`, `domain`, `api`, `persistence`, `workers`, `deploy`, `health`, `observability`, `evidence` ve `tests` klasorlerine ayrildi.

## Degisen Dosyalar

- `public/proptrex_radar/index.html`
- `public/proptrex_radar/contracts/page-registry.json`
- `public/proptrex_radar/contracts/navigation-registry.json`
- `public/proptrex_radar/contracts/locale-registry.json`
- `public/proptrex_radar/locale/en.json`
- `public/proptrex_radar/locale/tr.json`
- `public/proptrex_radar/locale/de.json`
- `public/proptrex_radar/README.md`
- `public/proptrex_radar/*/README.md`

## Dogrulama

- `/proptrex_radar/` canonical entry olarak calisti.
- Registry ve locale JSON'lari 200 dondu.

