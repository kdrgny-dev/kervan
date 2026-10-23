# Kervan — Oyun Tasarım Dokümanı (GDD) v0.1

> Çalışma adı: **Kervan**. Nimble Quest tarzı snake + otomatik savaş + roguelite meta ilerleme.
> Platform: Web + Masaüstü (Mac / Windows / Linux). Tarih: 2026-10-18, son güncelleme 2026-10-23 (F1).

---

## 1. Özet

Oyuncu ızgara üzerinde ilerleyen bir kahraman kafilesini yönetir. Sadece yön verir; kahramanlar menzile giren düşmanlara **otomatik** saldırır. Düşmanlar dalgalar halinde gelir. Ölen düşmanlardan altın, güçlendirme ve yeni kahraman düşer; toplanan kahraman kafilenin sonuna eklenir. Duvara veya kendi kuyruğuna çarpmak oyunu bitirir. Turlar arası altınla kahraman açılır ve yükseltilir.

**Hedef his:** "Bir tur daha." 3–8 dakikalık turlar, hızlı yeniden başlama.

---

## 2. Çekirdek Döngü

```
Menü → Başlangıç kahramanı seç → Tur (dalgalar) → Ölüm → Sonuç ekranı (altın) → Dükkan → Menü
```

Tur içi döngü: hareket et → düşman öldür → ganimet topla → kafile büyüsün → daha zor dalga.

---

## 3. Hareket ve Kontroller

| Konu | Değer |
|---|---|
| Harita | 24 × 15 hücre, hücre 48 px (mantıksal 1152 × 720) |
| Hareket | Lider her **tick**'te 1 hücre ilerler; kuyruk izi takip eder |
| Temel tick | 170 ms (Hız güçlendirmesiyle 120 ms) |
| Görsel | Hücreler arası yumuşak interpolasyon (sim ızgarada, çizim akıcı) |
| Girdi tamponu | En fazla 2 yön sırada tutulur (hızlı U dönüşleri için) |
| 180° dönüş | Yasak (yok sayılır) |
| Klavye | Ok tuşları / WASD, `Esc` duraklat |
| Mobil/dokunmatik | Kaydırma (swipe), min 24 px |
| Gamepad | D-pad / sol çubuk (Faz 4) |

**Çarpışma kuralları**
- Duvar veya kendi kuyruğu → **oyun biter**.
- Düşman gövdesine çarpma → lider maks. HP'sinin %40'ı kadar hasar alır (sonra 0.5 sn koruma). Düşman ilerleme yönünde 1 hücre itilir ve lider o hücreye geçer; itilemiyorsa kafile o tick yerinde kalır.
- Lider ölürse sıradaki kahraman lider olur, kafile devam eder. Son kahraman ölünce oyun biter.

---

## 4. Kahramanlar (MVP: 5)

Saldırılar otomatiktir; her kahraman kendi menzilindeki en yakın düşmanı hedefler. Menzil hücre cinsinden (Chebyshev mesafesi).

| Kahraman | Rol | HP | Hasar | Bekleme | Menzil | Özel | Açılış |
|---|---|---|---|---|---|---|---|
| Şövalye | Yakın dövüş | 60 | 10 | 0.8 sn | 1 | — | Başlangıç |
| Okçu | Menzilli tek hedef | 35 | 6 | 0.7 sn | 4 | Ok mermisi | Başlangıç |
| Büyücü | Alan hasarı | 30 | 8 | 1.4 sn | 3 | Ateş topu, 1 hücre yarıçap | 300 altın |
| Rahip | Destek | 40 | 3 | 1.0 sn | 3 | Her 3 sn tüm kafileye +3 HP | 500 altın |
| Barbar | Yakın dövüş, alan | 75 | 14 | 1.1 sn | 1 | Komşu tüm düşmanlara vurur | 800 altın |

**Tur içi seviye:** Öldürmeler ortak XP verir. Her seviye: kafiledeki tüm kahramanlara +%8 hasar, +%8 maks. HP. Seviye eşiği: `20 × 1.35^seviye`.

**Aynı kahramandan birden fazla** bulunabilir (kafile kompozisyonu stratejisi).

---

## 5. Düşmanlar (MVP: 4 + mini boss)

Düşmanlar da ızgarada, kendi tick hızlarıyla hareket eder. Yakın dövüş düşmanları bir kahramana komşu (çapraz dahil) olunca durur ve saldırı aralığıyla vurur. Saldırı aralıkları: Balçık 1.0 sn, Yarasa 0.8 sn, Ork 1.2 sn, İskelet 2.0 sn (mermi).

| Düşman | HP | Temas hasarı | Hız (tick) | Davranış | Bütçe maliyeti | İlk dalga |
|---|---|---|---|---|---|---|
| Balçık | 20 | 8 | 400 ms | Rastgele dolaşır, kafileye yavaş yönelir | 2 | 1 |
| Yarasa | 8 | 4 | 200 ms | Hızlı, zikzak | 2 | 2 |
| İskelet Okçu | 15 | 5 (mermi) | 350 ms | 4 hücre mesafe korur, ateş eder (2 sn) | 3 | 3 |
| Ork | 45 | 12 | 300 ms | Lideri kovalar, yakına gelince 1 sn hızlanır | 5 | 4 |
| **Ork Şefi** (mini boss) | 400 | 20 | 350 ms | Ork çağırır, şok dalgası (3 hücre) | — | Her 5. dalga |

---

## 6. Dalga Sistemi

- Dalga bütçesi: `6 + 6 × n` puan (ilk dalga 6 balçık). Bütçe, açık düşman tiplerinden rastgele harcanır.
- Düşmanlar harita kenarlarından doğar; doğmadan **1 sn önce** yer işareti gösterilir (haksız ölüm olmasın).
- Kafileye 3 hücreden yakın yerde doğma yasak.
- İlk dalga 2 sn sonra başlar. Başlangıçta haritada bir Okçu jetonu bulunur.
- Tüm düşmanlar ölünce dalga biter → 3 sn mola → **kahraman jetonu** haritaya düşer (yerde jeton yoksa).
- Her 5. dalga: mini boss + bütçenin yarısı.
- Zorluk ölçeği: dalga 10 sonrası düşman HP'si dalga başına +%6.

---

## 7. Ganimet ve Güçlendirmeler

**Düşme oranları (düşman başına)**

| Ganimet | Şans | Not |
|---|---|---|
| Altın | %70 | Değer: 1 (ork 3, boss 25) |
| Mücevher | %2 | Nadir meta para birimi |
| Güçlendirme | %6 | Haritada 10 sn kalır |
| Kahraman jetonu | %1.5 | + her dalga sonunda 1 garanti |

Ganimet 10 sn sonra yanıp sönüp kaybolur. Lider üzerinden geçince toplanır.

**Güçlendirmeler (süre 8 sn)**

| Ad | Etki |
|---|---|
| Öfke | Tüm hasar ×2 |
| Kalkan | Hasar alınmaz |
| Hız | Tick 120 ms |
| Mıknatıs | 5 hücre içindeki ganimet çekilir |
| Bomba | Anında: ekrandaki tüm düşmanlara 30 hasar |

**Kahraman jetonu:** Açılmış kahramanlardan rastgele biri; toplanınca kafilenin sonuna eklenir.

---

## 8. Meta İlerleme (Dükkan)

- **Altın**: tur sonunda toplanan altının tamamı kalıcı hesaba eklenir.
- **Kahraman açma**: tablodaki fiyatlar (bölüm 4).
- **Kahraman yükseltme** (her kahraman ayrı, seviye 1–10):
  - HP +%10 / seviye, Hasar +%10 / seviye
  - Maliyet: `50 × 1.5^seviye` altın
- **Genel yükseltmeler** (mücevherle):
  - Başlangıçta rastgele güçlendirme (5 mücevher)
  - Güçlendirme süresi +2 sn (10 mücevher, 3 seviye)
  - Başlangıçta 2. kahraman (25 mücevher)
- **Kayıt**: `localStorage` (web) — Tauri webview'de de çalışır. Faz 5'te isteğe bağlı dosyaya yedek.

**Skor:** `ulaşılan dalga × 100 + öldürme × 5 + altın`. Yerel en iyi skor listesi (ilk 10).

---

## 9. Ekranlar

1. **Açılış/Yükleme** — logo, asset yükleme çubuğu
2. **Ana Menü** — Oyna, Dükkan, Ayarlar, Çıkış (masaüstü)
3. **Kahraman Seçimi** — açılmış kahramanlar, portre + statlar
4. **Oyun** — HUD: dalga no, altın, aktif güçlendirme + süre, kafile listesi (portre + HP çubuğu), seviye XP çubuğu
5. **Duraklatma** — Devam, Ayarlar, Menüye dön
6. **Oyun Sonu** — dalga, öldürme, altın, skor, "Tekrar" (tek tuş), "Dükkan"
7. **Dükkan** — kahramanlar sekmesi, genel yükseltmeler sekmesi
8. **Ayarlar** — ses/müzik seviyesi, tam ekran, ekran sarsıntısı aç/kapa

---

## 10. His ve Geri Bildirim ("Juice")

- Vuruşta düşman beyaz yanıp söner + küçük geri itilme
- Ölümde parçacık patlaması, ekran sarsıntısı (boss, bomba)
- Hasar sayıları (kapatılabilir)
- Kahramanlarda kod tabanlı animasyon: yürürken zıplama (squash & stretch), saldırıda ileri hamle, alınan hasarda kırmızı yanıp sönme
- Ganimette hafif süzülme ve parıltı
- Ses: saldırı, vuruş, toplama, seviye atlama, ölüm. Geçici sesler jsfxr ile üretilir.

---

## 11. Teknik Mimari

**Yığın:** TypeScript · Phaser 3 · Vite · Vitest · Tauri 2 (masaüstü) · GitHub Actions (derleme)

```
kervan/
├─ src/
│  ├─ sim/          # Saf oyun mantığı, Phaser'dan bağımsız, test edilebilir
│  │  ├─ grid.ts, party.ts, combat.ts, enemies.ts, waves.ts, loot.ts, rng.ts
│  │  └─ world.ts   # step(dt, input) → yeni durum + olaylar
│  ├─ data/         # Denge tabloları: heroes.ts, enemies.ts, powerups.ts, economy.ts
│  ├─ scenes/       # Boot, Menu, HeroSelect, Game, GameOver, Shop, Settings
│  ├─ render/       # Sprite eşleme, animasyon tween'leri, parçacıklar, HUD
│  ├─ input/        # Klavye, swipe, gamepad → yön kuyruğu
│  ├─ save/         # Kalıcı kayıt (sürüm numaralı şema)
│  └─ main.ts
├─ public/assets/
│  ├─ manifest.json # anahtar → dosya; geçici ↔ gerçek grafik buradan değişir
│  ├─ placeholder/
│  └─ final/
├─ src-tauri/       # Masaüstü paketleme
├─ tests/
└─ .github/workflows/release.yml
```

**İlkeler**
- **Sabit adımlı simülasyon** (60 Hz), çizim bağımsız. Oyun mantığı `sim/` içinde, Phaser'ı bilmez → birim testleri kolay.
- **Tohumlu RNG** — hata ayıklamada aynı turu tekrar oynatabilmek için.
- **Veri odaklı denge** — tüm sayılar `data/` dosyalarında; kodu değiştirmeden ayarlanır.
- **Asset manifesti** — sahneler dosya adı değil anahtar kullanır (`hero.knight`, `enemy.slime`).
- Çözünürlük: mantıksal 1152 × 720, `Scale.FIT` ile ölçeklenir; masaüstünde tam ekran destekli.

**Dağıtım**
- Web: `vite build` → statik dosyalar (itch.io HTML5 / Vercel).
- Masaüstü: `tauri-action` ile etiket atılınca Mac (.dmg, Apple Silicon + Intel), Windows (.msi/.exe), Linux (.AppImage/.deb) otomatik derlenir, GitHub Releases'a yüklenir.
- İmzalama: başlangıçta imzasız; yayında Apple Developer ($99/yıl) + Windows sertifikası.

---

## 12. Aşama Planı

| Faz | İçerik | Bitti sayılır |
|---|---|---|
| ✅ **F0 İskelet** | Vite + Phaser + TS kurulum, ızgara, kafile hareketi, girdi tamponu, duvar/kuyruk çarpışması, geçici çizimler | Snake oynanıyor |
| ✅ **F1 Savaş** | Kahraman otomatik saldırıları, mermiler, 4 düşman tipi + yapay zekâ, dalga sistemi, HP/ölüm, lider devri | 5 dalga hayatta kalınabiliyor |
| **F2 Ganimet** | Altın, güçlendirmeler, kahraman jetonu, tur içi seviye | Kafile büyüyor, tur anlamlı |
| **F3 Meta** | Menüler, kahraman seçimi, dükkan, kayıt, oyun sonu ekranı, mini boss | Turlar arası ilerleme var |
| **F4 His** | Parçacıklar, sarsıntı, hasar sayıları, sesler, gamepad, denge turu | Oynaması keyifli |
| **F5 Paketleme** | Tauri, CI derlemeleri, web yayını | 3 işletim sisteminde indirilebilir |
| **F6 Grafik** | Claude Design asset'lerinin manifest ile entegrasyonu | Nihai görünüm |

F6 paralel yürüyebilir: grafik üretimi F0'dan itibaren başlayabilir.

---

## 13. Asset Listesi (Claude Design için)

**Tarz önerisi:** Düz vektör (flat), kalın koyu kontur (3 px), sınırlı palet (~16 renk), yukarıdan 3/4 bakış, sevimli/chibi oranlar (büyük kafa). Animasyon kodla yapılacağı için **her karakter tek kare** yeterli. Sağa bakan çizilir; sola bakış yatay aynalama ile.

**Format:** SVG tercih; yoksa PNG @2x şeffaf arka plan. Tüm karakterler aynı tuvalde ortalanmış, ayaklar alt kenardan 4 px yukarıda.

### Karakterler — tuval 96 × 96 (oyunda 48 × 48)
| Anahtar | Açıklama |
|---|---|
| `hero.knight` | Mavi zırhlı şövalye, kılıç + kalkan |
| `hero.archer` | Yeşil kukuletalı okçu, yay |
| `hero.mage` | Mor cübbeli büyücü, asa, sivri şapka |
| `hero.priest` | Beyaz-altın cübbeli rahip, ışıklı asa |
| `hero.barbarian` | Kızıl saçlı barbar, çift taraflı balta |
| `enemy.slime` | Yeşil yarı saydam balçık |
| `enemy.bat` | Mor yarasa, açık kanatlar |
| `enemy.skeleton` | İskelet okçu |
| `enemy.orc` | Yeşil tenli ork, sopa |
| `boss.orc_chief` | Ork şefi, tuval 192 × 192, boynuzlu miğfer |

### Harita karoları — 96 × 96, kesintisiz döşenebilir
- `tile.floor_1..3` (çim/taş varyasyonları), `tile.wall`, `tile.wall_corner`, `tile.edge`, `tile.decor_1..4` (çiçek, taş, kemik, mantar — çarpışmasız)

### Mermi ve efekt — 48 × 48
- `fx.arrow`, `fx.fireball`, `fx.bone_arrow`, `fx.heal_spark`, `fx.slash`, `fx.spawn_marker`

### Ganimet — 48 × 48
- `loot.coin`, `loot.gem`, `loot.hero_token`
- `power.rage`, `power.shield`, `power.speed`, `power.magnet`, `power.bomb`

### Arayüz
- `ui.logo` (1024 × 512), `ui.button` (normal/hover/basılı, 9-slice), `ui.panel` (9-slice)
- `ui.icon_coin`, `ui.icon_gem`, `ui.icon_heart`, `ui.icon_pause` (64 × 64)
- `portrait.<kahraman>` × 5 (256 × 256, omuz hizası, HUD ve dükkan için)
- `bg.menu` (1920 × 1080)

**Toplam:** ~50 görsel.

### Claude Design için örnek istem
> "Top-down 3/4 view game character sprite for a cute fantasy roguelite. Flat vector style, bold 3px dark outline, chibi proportions with large head, limited palette. Facing right, centered on a 96×96 transparent canvas, feet 4px above bottom edge. Character: a knight in blue plate armor with a sword and round shield. Export as SVG. Must visually match the other characters in this set."

İlk önce **stil rehberi** (palet + 1 kahraman + 1 düşman + 1 karo) çizdirip onaylamak, sonra seti onun üzerinden üretmek tutarlılığı artırır.

---

## 14. Açık Sorular

1. Nihai oyun adı?
2. Steam hedefi var mı? (Varsa Electron'a geçiş ve Steamworks değerlendirilir.)
3. Müzik: ücretsiz CC0 parçalar mı, sonradan özel mi?
4. Monetizasyon: ücretli tek seferlik / ücretsiz web + ücretli masaüstü / tamamen ücretsiz?
5. Dil: Türkçe + İngilizce baştan mı (i18n altyapısı F3'te kolay eklenir)?
