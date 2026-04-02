# Rapor

Bu klasor, `proptrex_radar` alt urunu icin yapilan her anlamli degisikligi zaman damgali rapor dosyalarinda tutar.

## Kural

- Her yeni islem icin yeni bir `.md` dosyasi olusturulur.
- Dosya adi `YYYY-MM-DD_HHMMSS_baslik.md` formatindadir.
- Her rapor 1 baslik, 1 ozet ve degisen dosyalar bolumu icerir.

## Yardimci Komut

Yeni rapor olusturmak icin:

```powershell
./rapor/new-report.ps1 -Title "Islem Basligi"
```

