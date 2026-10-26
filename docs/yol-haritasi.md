# Kervan — Yol Haritası

Öncelik sırasıyla. Her madde kendi dalında yapılır, onayla `main`'e birleşir.

| # | İş | Neden | Durum |
|---|---|---|---|
| 1 | **Keskin görüntü:** oyunu ekranın gerçek piksel yoğunluğunda çiz | Oyun sabit 1152×720 tuvale çiziliyor, tarayıcı/telefon bunu büyütüyor; retina ve büyük ekranda yazılar ve çizimler bulanık | Bitti |
| 2 | **Fetih dengesi:** erken bölgelerde düşmanlar yumuşar, kahraman jetonu sıklaşır | Bot ölçümü: orta seviye oyuncu Fetih'te medyan dalga 8 (Yol'da 17), kafile 14 (Yol'da 24), kafilenin silinmesi 4,5 kat fazla | Bitti — Fetih·orta medyan 22, kafile 35 |
| 3 | **Telefonda menüler:** ana menü, kamp, kart ekranları telefonda büyük ve tam ekran | Oyun içi telefona uyarlandı, menüler hâlâ küçük ve ortada | Bitti — sade ekranlar %20 büyük ve tam ekran; liste ekranları sığdırılıyor (telefona özel liste tasarımı ayrı iş) |
| 4 | **Kahraman çeşidi:** yeni kahramanlar (destanlarla ve altınla açılan) | Kadro 5 + Fatih; uzun oyunda çeşit az | Bekliyor |
| 5 | **Başkalarına dağıtım:** TestFlight (Apple Developer 99$/yıl), Android APK | Kendi iPhone'unda çalışıyor (`docs/ios.md`); başkası kuramıyor | Bekliyor |
| 6 | **Faz 10 · Günlük sefer + çevrimiçi skor tablosu** | Oyuncuyu her gün geri getirir; arka uç kararı gerekir | Bekliyor |
| 7 | **Destan II · İpek Yolu** | İskelet hazır; çoğunlukla içerik | Bekliyor |
| 8 | **Küçükler:** menü geçidinde Fatih; macOS/Windows imzalama | Satıştan önce | Bekliyor |

## Bitenler (son)

- Mobil web (PWA), telefonda tam ekran oyun alanı + yakın kamera, ayrı gösterge şeridi
- Duvarda son an payı; kafile oyunun önünde çiziliyor (geç görme hissi)
- Ölü düşman görüntülerinin kalması (bomba + mıknatıs; duraklat/devam)
- iOS uygulaması kendi iPhone'unda

## Notlar

- itch.io bilinçli olarak ertelendi; oyun yeterince gelişince açılacak.
- Gelir modeli: tek seferlik ücret, reklamsız, güce para yok.
- Denge ölçümü: `RUNS=60 npm run balance` (bot duvara/kuyruğa insandan sık çarpar; mutlak değil, senaryolar arası karşılaştırma için).
