# Kervan — Oyun Tasarım Dokümanı (GDD) v0.1

> Çalışma adı: **Kervan**. Nimble Quest tarzı snake + otomatik savaş + roguelite meta ilerleme.
> Platform: Web + Masaüstü (Mac / Windows / Linux). Tarih: 2026-10-18, son güncelleme 2026-10-24 (F6).

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
| Gamepad | D-pad / sol çubuk: yön · A: onay/tekrar · B veya Start: duraklat/geri |

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
| Büyücü | Alan hasarı | 30 | 8 | 1.4 sn | 3 | Ateş topu, 1 hücre yarıçap | 200 altın |
| Rahip | Destek | 40 | 3 | 1.0 sn | 3 | Her 3 sn tüm kafileye +3 HP | 350 altın |
| Haydut | Hızlı yakın dövüş | 50 | 9 | 0.55 sn | 1 | %25 şansla x2 kritik vuruş | 500 altın |

**Tur içi seviye:** Öldürmeler ortak XP verir (düşmanın bütçe maliyeti kadar). Her seviye: kafiledeki tüm kahramanlara +%8 hasar, +%8 maks. HP. Seviye eşiği: `20 × 1.35^seviye`. Seviye atlayınca maks. HP artışı mevcut HP'ye de eklenir; sonradan katılan kahramanlar güncel bonusla gelir.

**Aynı kahramandan birden fazla** bulunabilir (kafile kompozisyonu stratejisi).

---

## 5. Düşmanlar (MVP: 4 + mini boss)

Düşmanlar da ızgarada, kendi tick hızlarıyla hareket eder. Saldırı aralıkları: Goblin 1.2 sn. Yakın dövüş düşmanları bir kahramana komşu (çapraz dahil) olunca durur ve saldırı aralığıyla vurur. Saldırı aralıkları: Balçık 1.0 sn, Yarasa 0.8 sn, İskelet 2.0 sn (mermi).

| Düşman | HP | Temas hasarı | Hız (tick) | Davranış | Bütçe maliyeti | İlk dalga |
|---|---|---|---|---|---|---|
| Balçık | 20 | 8 | 400 ms | Rastgele dolaşır, kafileye yavaş yönelir | 2 | 1 |
| Yarasa | 8 | 4 | 200 ms | Hızlı, zikzak | 2 | 2 |
| İskelet Okçu | 15 | 5 (mermi) | 350 ms | 4 hücre mesafe korur, ateş eder (2 sn) | 3 | 3 |
| Goblin | 45 | 12 | 300 ms | Lideri kovalar, 3 hücreden yakında 2× hızlanır | 5 | 4 |
| **Balçık Kralı** (mini boss) | 260 (her sonraki boss +%50) | 20 | 450 ms | 6 sn'de bir balçık çağırır (en fazla 4); 5 sn'de bir şok dalgası: 0.8 sn uyarı, 3 hücre içine 10 hasar. Ölünce 25 altın + 1 mücevher | — | Her 5. dalga |

---

## 6. Dalga Sistemi

- Dalga bütçesi: `4 + 4n + ⌊n²/4⌋` puan (ilk dalga 4 balçık; başta yumuşak, sonra karesel artar).
- Dalga temizleme ödülü: `5 + 2n` altın. Bütçe, açık düşman tiplerinden rastgele harcanır.
- Düşmanlar harita kenarlarından doğar; doğmadan **1 sn önce** yer işareti gösterilir (haksız ölüm olmasın).
- Kafileye 3 hücreden yakın yerde doğma yasak.
- İlk dalga 2 sn sonra başlar. Başlangıçta haritada bir Okçu jetonu bulunur.
- Tüm düşmanlar ölünce dalga biter → 3 sn mola → **kahraman jetonu** haritaya düşer (yerde jeton yoksa).
- Her 5. dalga: Balçık Kralı + bütçenin yarısı.
- Zorluk ölçeği: dalga 10 sonrası düşman HP'si dalga başına +%6.

---

## 7. Ganimet ve Güçlendirmeler

**Düşme oranları (düşman başına)**

| Ganimet | Şans | Not |
|---|---|---|
| Altın | %70 | Değer: 1 (iskelet 2, goblin 3, boss 25) |
| Mücevher | %2 | Nadir meta para birimi |
| Güçlendirme | %6 | Haritada 10 sn kalır |
| Kahraman jetonu | %3 | + her dalga sonunda 1 garanti |

Düşman başına tek zar atılır, eşikler tablodaki sırayla kümülatiftir (en fazla bir ganimet). Ganimet 10 sn sonra kaybolur (son 3 sn yanıp söner); dalga sonu garantili jetonun süresi dolmaz. Yalnızca lider üzerinden geçince toplar.

**Güçlendirmeler (süre 8 sn)**

| Ad | Etki |
|---|---|
| Öfke | Tüm hasar ×2 |
| Kalkan | Hasar alınmaz |
| Hız | Tick 120 ms |
| Mıknatıs | Liderin 5 hücre çevresindeki ganimet toplanır (kahraman jetonu hariç) |
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
  - Hızlı başlangıç: ilk dalga başlarken rastgele güçlendirme (5 mücevher)
  - Uzun etki: güçlendirme süresi +2 sn (10 mücevher, 3 seviye)
  - Yoldaş: tura açık kahramanlardan rastgele 2. kahramanla başla (25 mücevher)
- Kahraman jetonları yalnızca açılmış kahramanlardan çıkar.
- Turu duraklatma menüsünden bırakmak da kazancı kasaya ekler.
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
- Ses: tüm efektler ve müzik WebAudio ile kodda üretilir (dosya yok): `src/audio/`. Aynı efekt 40 ms içinde tekrar çalmaz. Müzik: La minör Am–F–C–G döngüsü, 112 BPM.
- Parçacıklar: vuruş kıvılcımı, düşmana özel renkli ölüm bulutu, ganimet pırıltısı, seviye/boss konfetisi, lider ayak tozu.
- Aynı anda en fazla 24 hasar sayısı (kritikler hariç).

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
- **Sprite manifesti** — `src/render/sprites.ts`: doku anahtarı → dosya, kahraman/düşman → `SpriteSet` (idle, walk, attack, hurt). Çizimi olmayan birim geometrik geçici çizimle görünür.
- Çözünürlük: mantıksal 1152 × 720, `Scale.FIT` ile ölçeklenir; masaüstünde tam ekran destekli.

**Dağıtım**
- Web: `vite build` → statik dosyalar (itch.io HTML5 / Vercel).
- Masaüstü: `tauri-action` ile etiket atılınca Mac (.dmg, Apple Silicon + Intel), Windows (.msi/.exe), Linux (.AppImage/.deb) otomatik derlenir, taslak GitHub Release'e yüklenir; itch.io için web zip'i de eklenir (`.github/workflows/release.yml`).
- Web: `main`'e her push'ta GitHub Pages'e yayın (`.github/workflows/web.yml`). Her push/PR'da test + tip kontrolü (`ci.yml`).
- Masaüstüne özel: menüde Çıkış butonu, tam ekran pencere API'siyle (F11). Kimlik: `com.kdrgny.kervan`, pencere 1152 × 720 (en az 800 × 500).
- İmzalama: başlangıçta imzasız; yayında Apple Developer ($99/yıl) + Windows sertifikası.

---

## 12. Denge Ölçümü

`npm run balance` saf sim üzerinde açgözlü bir botla senaryo başına 40 tur oynatır. 2026-10-23 sonuçları (bot kaba; gerçek oyuncu daha iyi oynar):

| Senaryo | Dalga p25/p50/p75 | Süre p50 | Ort. altın |
|---|---|---|---|
| Yeni oyuncu | 5/5/7 | 68 sn | 103 |
| Orta (Sv3, Büyücü) | 6/9/12 | 112 sn | 268 |
| Güçlü (hepsi Sv6 + perkler) | 14/19/24 | 352 sn | 964 |

`tests/balance.test.ts` bu eğrinin kırılmasını yakalayan hızlı bir bekçidir.

## 13. Aşama Planı

| Faz | İçerik | Bitti sayılır |
|---|---|---|
| ✅ **F0 İskelet** | Vite + Phaser + TS kurulum, ızgara, kafile hareketi, girdi tamponu, duvar/kuyruk çarpışması, geçici çizimler | Snake oynanıyor |
| ✅ **F1 Savaş** | Kahraman otomatik saldırıları, mermiler, 4 düşman tipi + yapay zekâ, dalga sistemi, HP/ölüm, lider devri | 5 dalga hayatta kalınabiliyor |
| ✅ **F2 Ganimet** | Altın, güçlendirmeler, kahraman jetonu, tur içi seviye | Kafile büyüyor, tur anlamlı |
| ✅ **F3 Meta** | Menüler, kahraman seçimi, dükkan, kayıt, oyun sonu ekranı, mini boss | Turlar arası ilerleme var |
| ✅ **F4 His** | Parçacıklar, sarsıntı, hasar sayıları, sesler, gamepad, denge turu | Oynaması keyifli |
| ✅ **F5 Paketleme** | Tauri, CI derlemeleri, web yayını | 3 işletim sisteminde indirilebilir |
| ✅ **F6 Grafik** | Claude Design asset'lerinin manifest ile entegrasyonu | Nihai görünüm |

F6 paralel yürüyebilir: grafik üretimi F0'dan itibaren başlayabilir.

---

## 13b. Uzun Ömür Tasarımı (F7–F10)

**Hedef:** Oyuncu her tur bir şey kazansın, her gün geri dönmek için bir sebebi olsun, yol hiç bitmesin. Ton: sıcak ve esprili masal. Gelir: tek seferlik ücret; tüm ödüller oynayarak kazanılır, para karşılığı güç yok.

| Katman | Sistem | Faz |
|---|---|---|
| Tur içi derinlik | Dalga arası 3 kartlık seçim, lanetli kartlar, yeniden çekme; sınıf sinerjileri | F7 |
| Havuçlar | Hesap seviyesi + ödül yolu, kart koleksiyonu (açılmamışlar silüet), günlük/haftalık görevler, başarımlar, kahraman ustalığı | F8 |
| Sonsuz hikaye | Kervan Yolu haritası: bölgeler (Yeşil Vadi → Kemik Ovası → Kül Dağları → Buz Çölü …), her bölgenin düşmanları/boss'u/hikaye anı; Kamp (Demirci, Tapınak, Pazar… dükkânın yerini alır), kervanbaşı anlatıcı | F9 |
| Geri dönüş | Yolculuk II, III… (artan zorluk + kurallar), günlük sefer (aynı tohum, ileride çevrimiçi skor) | F10 |

### ✅ F7 — Kartlar ve Sinerjiler

- Her dalga temizlenince oyun durur, **3 kart** sunulur; biri seçilince 3 sn'lik mola başlar.
- Nadirlik: Yaygın %60 · Nadir %30 · Efsane %10. Her seçimde %15 ihtimalle bir **lanetli** kart (güçlü + bedelli) yer alır.
- **Yeniden çek:** tur altınıyla, her kullanımda pahalanır (`15 × 2^k`).
- Kartların çoğu birden fazla kez alınabilir (her kartın üst sınırı var).
- **Sınıflar ve sinerjiler** (aynı sınıftan kahraman sayısı):

| Sınıf | Kahraman | 2 | 4 |
|---|---|---|---|
| Savaşçı | Şövalye | Alınan hasar −%15 | −%30 |
| Nişancı | Okçu | Okçulara +1 menzil | Okçular 2 hedefe atar |
| Büyücü | Büyücü | Patlama alanı +1 | Büyücü hasarı +%50 |
| Kutsal | Rahip | Şifa ×2 | Şifa ×3 |
| Gölge | Haydut | Kritik şansı +%20 | Kritik ×3 |

- 25 kart (21 normal + 4 lanetli) `src/data/cards.ts`; etkiler tur içi `Mods` çarpanları ve birkaç özel kancadır (şehit patlaması, diken zırh, dalga başı güçlendirme, anlık jeton).
- Denge (2026-10-24, bot her seçimde ilk kartı alır): yeni oyuncu dalga p25/p50/p75 = 6/10/17, ~2,5 dk; orta 6/11/22; güçlü 19/20/22. Kartlarla oyuncu her dalga güçlendiği için düşman canı ilk dalgadan itibaren dalga başına +%7 büyür.
- Tur başına altın arttığı için dükkân fiyatları yükseltildi: kilitler 400/700/1000, yükseltme `80 × 1,6^seviye`.

### ✅ F8 — Hesap Seviyesi, Görevler, Başarımlar

- **Hesap XP'si** her turda: `dalga × 15 + öldürme + boss × 60` (+ görev XP'si). Seviye eşiği `150 + 75 × (seviye − 1)`.
- **Ödül yolu** (`src/data/progression.ts`): 2–22 arası her seviyede kart, altın ya da mücevher; 22'den sonra sonsuza dek altın, her 5 seviyede mücevher. Unvanlar: Çaylak Yolcu → Kervan Çırağı (5) → Deve Fısıldayan (10) → Yol Kurdu (15) → Kervanbaşı Yardımcısı (20) → Kervanbaşı (30) → Efsanevi Kervanbaşı (40) → Yolların Efendisi (50).
- **Kart koleksiyonu:** 12 başlangıç kartı; kalan 13 kart ödül yolunda. Kart seçiminde yalnızca açılmış kartlar çıkar. Koleksiyon ekranı kilitlileri silüetle ve açılış seviyesiyle gösterir.
- **Görevler:** her gün 3 günlük (15 görevlik havuz), her hafta 2 haftalık (5'lik havuz). Seçim gün/hafta anahtarından tohumlanır, herkes aynı görevleri görür. "sum" görevleri turlar boyunca birikir, "max" görevleri tek turda yapılmalı. Ödüller tur bitince otomatik verilir.
- **Başarımlar:** 15 tek seferlik hedef (ilk boss, 10/20/30. dalga, 1.000/10.000 öldürme, tam kadro, tüm kartlar, hesap seviyesi 10/25…). Ömür boyu sayaçlara bakar.
- Oyun sonu ekranı: hesap XP çubuğu, seviye atlama, yeni kart, görev ve başarım çipleri. Menüde hesap rozeti; yeni "Yolculuk" (Görevler · Ödül Yolu · Başarımlar) ve "Koleksiyon" ekranları.
- Kayıt şeması v2; v1 kayıtlar altın, kahraman ve rekorları korunarak yükseltilir.

### ✅ F9 — Kervan Yolu, Bölgeler, Kamp, Hikaye

- **Rota:** Yeşil Vadi → Kemik Ovası → Kül Dağları → Buz Çölü; her bölge 10 dalga, her 5. dalgada bölgenin boss'u. 40. dalgadan sonra Yolculuk II başlar (rota tekrar eder, zorluk dalgayla büyümeye devam eder).
- **Yeni düşmanlar:** Hayalet (hızlı, zikzak), Magma Balçığı (ölünce 2 balçığa bölünür), Buz İskeleti (okları kafileyi 1,5 sn yavaşlatır; adım ×1,35).
- **Yeni boss'lar:** Kemik Lordu (iskelet çağırır + 3 hedefe kemik yağmuru), Kor Kral (magma balçığı çağırır), Buz Devi (buz iskeleti çağırır, şok dalgası yavaşlatır).
- **Çizimler (Aşama 5):** her bölgenin kendi karo ve süs seti (`tiles/<bölge>/`, `decor/<bölge>/`), yeni düşman/boss sprite'ları, Hüsnü portreleri (normal/gülme/şaşkın, diyalogda hikaye anının ruh hâline göre), Kamp sahnesi (`ui/camp/`: arka plan, seviyeye göre büyüyen 3 bina, kamp ateşi), parşömen rota haritası (`ui/map/`) ve bölge afişleri. İstem: `docs/claude-design-prompt-stage5.md`, teslim manifesti `docs/design/stage5/manifest.json`.
- **Kervanbaşı Hüsnü:** 13 hikaye anı (giriş, ilk sefer, her bölge, her boss, Yolculuk II, seviye 5/10/20). Tur sonunda sıraya girer, menüde anlatılır, Yolculuk → Günlük sekmesinden tekrar okunur.
- **Harita:** Yolculuk → Harita sekmesi; ulaşılan bölgeler, devrilen boss'lar, şu anki bölgenin hikayesi.
- **Kamp:** menüden açılan kamp sahnesi; binaya tıklayınca paneli açılır. Dükkân yerine Kışla (kahramanlar), Tapınak (mücevher yükseltmeleri), Pazar (yeni): Tüccar Ağı (+%10 altın, 5 sv), Kervan Kasası (+1 ücretsiz yeniden çekme, 3 sv), Harita Ustası (+%10 hesap XP'si, 5 sv).
- Kayıt şeması v3: yolculuk ilerlemesi, hikaye, pazar.

### Oynanış ayarı (v0.3 sonrası)

- Oyun duraksadıktan sonra (tur başı, kart seçimi, duraklatma) 3-2-1 geri sayım; sayım sırasında yön seçilebilir, kafile durur.
- Kafile adımı 170 → 200 ms (saniyede ~5 kare); hız gücü 120 → 140 ms.

### Destanlar (iskelet)

- Ayrıntılı tasarım: `docs/destanlar.md`. Çizim istemi: `docs/claude-design-prompt-stage6.md`.
- **Yolculuk seçimi:** en az bir destan açıksa "Oyna" önce yolculuk seçim ekranını açar (Hüsnü'nün Yolu / destanlar / yakında). Seçim kayıtta hatırlanır.
- **Destan I · Fetih** (hesap Sv 6): Rumeli Hisarı → Haliç Kıyısı → Galata Sırtları → Kara Surlar. Yeni düşmanlar: Canlı Mazgal, Zincir Yılanı, Sis Perisi, Mancınık Golemi. Boss'lar: Taş Nöbetçi, Liman Ahtapotu, Yağ Küpü Devi; 40. dalgada final boss Sur Bekçisi Dev.
- **Gemiler karadan:** destanda her boss dalgasında 10 sn boyunca kafile duvardan girip karşı kenardan çıkar.
- 40. dalga temizlenince destan biter, efsanevi kahraman **Fatih** (Şahi topu: menzil 5, alan hasarı) açılır; yol Destan+ olarak sürer. Efsanevi kahramanlar altınla açılmaz.
- Hikaye: `destans`, `fetih_intro`, bölge/boss anları, `fetih_done`. Kayıt şeması v4 (`campaigns`, `lastCampaign`).
- Çizimler: Claude Design Aşama 6 (`docs/design/stage6/manifest.json`); bölge/boss anlarını Dede Hüsnü kendi ağzından anlatır.

### Mobil web (PWA)

- `public/manifest.webmanifest` + ikonlar (`public/icons/`): ana ekrana eklenince tam ekran, yatay açılır.
- `public/sw.js`: kurulumda derlemedeki bütün dosyaları önbelleğe alır (liste ve sürüm `vite.config.ts` içindeki eklentiyle derlemede yazılır); sonra önbellekten verir, çevrimdışı oynanır. Yeni yayın bir sonraki açılışta devreye girer. Masaüstü pakette ve geliştirmede kayıtlı değil.
- Dikey tutulan dokunmatik ekranda "yan çevir" uyarısı; çentikli ekranlar için güvenli alan boşlukları.
- Dokunmatikte buton, sekme ve toggle'ların dokunma alanı en az 44 pt'ye büyür (`minTouchPx`).
- iPhone'da tam ekran API'si yok; Ayarlar'da tam ekran yerine "Ana ekrana ekle" yazar. iOS ses bağlamı dokunmayla ve uygulamaya dönünce yeniden açılır.

## 14. Görsel Sistem (F6)

- Çizimler Claude Design ile 4 aşamada üretildi; referanslar `docs/design/` altında (palet, önizleme sayfaları, mockup'lar, `tokens.json`, `motion.json`, `components.json`).
- `public/assets/`: `characters/` (5 kahraman + 5 düşman, idle/yürüme/saldırı/hasar; boss nefes/çağırma/şişme), `tiles/`, `decor/`, `loot/`, `fx/`, `ui/` (bileşenler, ikonlar, portreler, logo, fontlar).
- Fontlar: Grandstander (başlık, sayılar) + Nunito (metin), ikisi de OFL; menüden önce yüklenir.
- Arayüz kiti `src/ui/kit.ts`: 9-slice buton/panel/kart/sekme/çubuk (2x raster, yarı ölçekte), kurdele başlık, hap sayaç, pip, toggle. HUD `src/ui/hud.ts`.
- Hareketler `docs/design/stage4/motion.json`'daki süre ve easing'lerle uygulandı.

## 15. Asset Listesi (Claude Design için)

**Tarz önerisi:** Düz vektör (flat), kalın koyu kontur (3 px), sınırlı palet (~16 renk), yukarıdan 3/4 bakış, sevimli/chibi oranlar (büyük kafa). Animasyon kodla yapılacağı için **her karakter tek kare** yeterli. Sağa bakan çizilir; sola bakış yatay aynalama ile.

**Format:** SVG tercih; yoksa PNG @2x şeffaf arka plan. Tüm karakterler aynı tuvalde ortalanmış, ayaklar alt kenardan 4 px yukarıda.

### Karakterler — tuval 96 × 96 (oyunda 48 × 48)
| Anahtar | Açıklama |
|---|---|
| `hero.knight` ✅ | Mavi zırhlı şövalye, kılıç + kalkan (yürüme 4, saldırı 2, hasar 1 kare) |
| `hero.archer` ✅ | Yeşil kukuletalı okçu, yay |
| `hero.mage` ✅ | Mor cübbeli büyücü, asa, sivri şapka |
| `hero.priest` | Beyaz-altın cübbeli rahip, ışıklı asa |
| `hero.rogue` ✅ | Mor kukuletalı haydut, hançer |
| `enemy.slime` ✅ | Yeşil yarı saydam balçık |
| `enemy.bat` | Mor yarasa, açık kanatlar |
| `enemy.skeleton` ✅ | İskelet okçu |
| `enemy.goblin` ✅ | Yeşil goblin |
| `boss.slime_king` ✅ | Taçlı mor balçık, tuval 128 × 128 |

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

## 16. Açık Sorular

1. Nihai oyun adı?
2. Steam hedefi var mı? (Varsa Electron'a geçiş ve Steamworks değerlendirilir.)
3. Müzik: ücretsiz CC0 parçalar mı, sonradan özel mi?
4. Monetizasyon: ücretli tek seferlik / ücretsiz web + ücretli masaüstü / tamamen ücretsiz?
5. Dil: Türkçe + İngilizce baştan mı (i18n altyapısı F3'te kolay eklenir)?
