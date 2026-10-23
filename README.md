# Kervan

Nimble Quest tarzı snake + otomatik savaş roguelite. Kahraman kafileni ızgarada yönet, kahramanlar kendiliğinden saldırsın, dalgalara dayan, kazandığın altınla kafileni güçlendir.

Web (tarayıcı) ve masaüstü (macOS, Windows, Linux) aynı koddan çıkar. Tasarım dokümanı: [docs/GDD.md](docs/GDD.md).

## Kontroller

| | Klavye | Gamepad | Dokunmatik |
|---|---|---|---|
| Yön | Ok tuşları / WASD | D-pad / sol çubuk | Kaydır |
| Onay, tekrar | Boşluk / Enter / R | A | Butonlar |
| Duraklat | Esc / P | Start / B | Sağ üstteki II |
| Tam ekran | F11 | — | Ayarlar |

## Geliştirme

```bash
npm install
npm run dev          # http://localhost:5190
npm test             # birim testleri + denge bekçisi
npm run balance      # bot ile senaryo başına 40 tur, denge tablosu
npm run build        # dist/ içine web sürümü
```

## Masaüstü (Tauri 2)

Yerelde derlemek için [Rust](https://rustup.rs/) gerekir (macOS'ta Xcode Command Line Tools da).

```bash
npm run desktop:dev     # pencerede geliştirme
npm run desktop:build   # src-tauri/target/release/bundle/ altına kurulum dosyaları
```

İkon kaynağı `src-tauri/app-icon.svg`; değiştirirsen `npx tauri icon src-tauri/app-icon.svg` ile yeniden üret.

## Sürüm çıkarma

1. `package.json` ve `src-tauri/tauri.conf.json` içindeki `version` alanını artır.
2. Etiket at ve gönder: `git tag v0.1.0 && git push origin v0.1.0`
3. **Release** iş akışı macOS (Apple Silicon + Intel), Windows ve Linux kurulum dosyalarını ve itch.io için web zip'ini derleyip **taslak** bir GitHub Release'e koyar. Kontrol edip yayınla.

macOS ve Windows sürümleri şimdilik imzasız: kullanıcı ilk açılışta güvenlik uyarısını onaylamalı. İmzalama için Apple Developer hesabı ve Windows kod imzalama sertifikası gerekir.

## Web yayını

**Web** iş akışı `main`'e her push'ta testleri çalıştırıp siteyi GitHub Pages'e yükler. Bir kez repo ayarlarından **Settings → Pages → Source: GitHub Actions** seçilmeli. (Private repolarda Pages ücretli plan ister.)

itch.io için: sürümdeki `kervan-web-vX.Y.Z.zip` dosyasını HTML5 oyun olarak yükle; dosya yolları göreli olduğu için alt dizinde de çalışır.

## Yapı

```
src/sim/      Saf oyun mantığı (Phaser'dan bağımsız, test edilir)
src/data/     Denge tabloları
src/meta/     Kayıt, dükkan, ekonomi
src/scenes/   Phaser sahneleri
src/render/   Sprite'lar, efektler
src/audio/    WebAudio ses efektleri ve müzik (dosyasız)
tools/        Denge botu ve simülatörü
src-tauri/    Masaüstü paketleme
```
