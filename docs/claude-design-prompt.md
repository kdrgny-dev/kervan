# Claude Design istemi — Kervan görsel seti ve arayüz

> Kullanım: Bu dosyanın tamamını Claude Design'a yapıştır. Ekler olarak `public/assets/` içindeki mevcut SVG'leri (özellikle `knight_walk_1.svg`, `knight_attack_1.svg`, `slime.svg`, `boss_slime_king.svg`) ve oyunun bir ekran görüntüsünü ver. Tutarlılık için önce **Aşama 1**'i iste, onayladıktan sonra diğer aşamalara geç.

---

## Bağlam

**Kervan**, Nimble Quest tarzı bir oyun: snake mekaniğiyle ilerleyen bir kahraman kafilesi, kahramanlar düşmanlara otomatik saldırıyor, dalgalar halinde düşman geliyor, her 5. dalgada boss var. Web ve masaüstünde (Mac/Windows/Linux) yatay 1152 × 720 çözünürlükte çalışıyor; oyun alanı 24 × 15 hücre, hücre 48 px.

Ekteki SVG'ler oyunun **mevcut ve onaylı tarzı**: flat vektör, kalın koyu kontur, chibi oranlar (büyük kafa, kısa gövde), yumuşak tek ton gölgelendirme, sevimli ama cesur. Yeni her şey bu tarzla **birebir aynı ailede** görünmeli. Ekteki Şövalye animasyon seti (4 kare yürüme, 2 kare saldırı, 1 kare hasar) kalite ve kare yapısı için referans.

## Teknik kurallar (hepsine uy)

- **Format:** SVG, `viewBox` piksel ölçüsüyle aynı, şeffaf arka plan, `<script>` yok, dış bağlantı ve font yok (metin varsa path'e çevrilmiş olsun).
- **Karakter tuvali:** 96 × 96 (boss 128 × 128). Karakter ortalanmış, **ayaklar alt kenardan 6 px yukarıda**, kafa üstte en az 4 px boşluk. Tüm kareler aynı tuvalde ve aynı hizada; kareler arasında karakter kaymamalı.
- **Yön:** Her karakter **sağa bakıyor** (sola bakış kodda aynalanıyor).
- **Kontur:** Koyu mor-siyah `#14121c`, 3 px (96'lık tuvalde).
- **Animasyon kareleri:** Her kare ayrı bir SVG dosyası; ad kalıbı `<anahtar>_<hareket>_<n>.svg` (n 1'den başlar). Kare süreleri: yürüme 110 ms, saldırı toplam 220 ms.
- **Palet:** Ekteki SVG'lerden çıkar ve tüm sette ortak kullan. Arayüz renkleri aşağıda.
- **Teslim:** Her dosya adı aşağıdaki listedeki gibi olsun; sonunda tek bir zip ve dosya listesini içeren bir `manifest.json` (dosya adı → boyut, kare sayısı) ver.

---

## Aşama 1 — Stil kilidi (önce bunu iste ve onayla)

1. **Palet sayfası:** 16–20 renk, adlarıyla (ör. `ink #14121c`, `grass-dark`, `gold`…).
2. **Rahip** (`priest`) idle karesi ve **Yarasa** (`bat`) idle karesi. Mevcut Şövalye ve Balçık'ın yanında yan yana gösterilmiş bir karşılaştırma görseli.
3. **Zemin karosu** (`tile_floor_1`) ve **duvar karosu** (`tile_wall`).

Bu dört şey Şövalye ile aynı elden çıkmış gibi durmuyorsa diğer aşamalara geçme.

---

## Aşama 2 — Eksik karakterler ve tüm animasyonlar

Var olanlar: `knight` (tam set), `archer`, `mage`, `rogue`, `slime`, `skeleton`, `goblin`, `boss_slime_king` (hepsi tek kare). Eksikleri çiz, var olanlara animasyon karelerini ekle.

### Kahramanlar — 96 × 96

Her kahraman için: `idle` (1), `walk` (4), `attack` (2), `hurt` (1) → **8 dosya**.

| Anahtar | Tanım | Saldırı hareketi |
|---|---|---|
| `knight` | ✅ mevcut set | — |
| `archer` | Yeşil kukuletalı okçu, yay (mevcut idle'ı koru) | Yayı germe → bırakma |
| `mage` | Mor cübbeli, sivri şapkalı büyücü, asa (mevcut idle'ı koru) | Asayı kaldırma → ileri savurma, ucunda turuncu parıltı |
| `rogue` | Mor kukuletalı haydut, hançer (mevcut idle'ı koru) | Hızlı çapraz hançer darbesi |
| `priest` | **Yeni.** Beyaz-altın cübbeli rahip, tepesinde ışık olan asa, sakin yüz | Asayı yere vurma, altın ışık halkası |

Hasar karesinde (`hurt`) karakter hafif geriye eğilsin, gözler kapalı/sıkılmış; mevcut `knight_hurt.svg` gibi.

### Düşmanlar — 96 × 96

Her düşman: `idle` (1), `move` (2–4), `attack` (2), `hurt` (1).

| Anahtar | Tanım | Not |
|---|---|---|
| `slime` | ✅ mevcut idle | `move`: 3 kare zıplama (ezilme → uzama → iniş) |
| `bat` | **Yeni.** Mor yarasa, açık kanatlar, sivri kulaklar, sevimli ama yaramaz | `move`: 4 kare kanat çırpma |
| `skeleton` | ✅ mevcut idle, okçu iskelet | `attack`: kemik yayı germe → bırakma |
| `goblin` | ✅ mevcut idle | `move`: 4 kare koşu; `attack`: sopa savurma |
| `slime_king` | ✅ mevcut boss, **128 × 128** | `idle` 2 kare nefes alma; `summon` 2 kare (tacı parlıyor, ağzından küçük balçık); `charge` 2 kare (şok dalgası öncesi şişme, kırmızımsı ton); `hurt` 1 |

---

## Aşama 3 — Harita, ganimet ve efektler

### Karolar — 96 × 96, kesintisiz döşenebilir

- `tile_floor_1`, `tile_floor_2`, `tile_floor_3`: koyu çim/toprak varyasyonları (oyunda dama düzeninde yan yana gelecek, kontrast düşük kalsın; karakterler öne çıkmalı)
- `tile_wall`, `tile_wall_corner`: alçak taş duvar, üst yüzü görünen 3/4 bakış
- `decor_1` … `decor_6`: çiçek öbeği, küçük taş, kemik, mantar, çalı, kırık kalkan (çarpışmasız süs, 48 × 48 içinde ortalı)

### Ganimet — 48 × 48

- `coin_1` … `coin_4`: dönen altın para (4 kare)
- `coin_big`: boss parası, daha büyük ve parlak
- `gem_1` … `gem_3`: turkuaz mücevher pırıltı döngüsü
- `hero_token`: altın çerçeveli yuvarlak rozet; içine kahraman portresi oyunda bindirilecek, ortası boş olsun
- Güçlendirmeler (`power_rage`, `power_shield`, `power_speed`, `power_magnet`, `power_bomb`): yuvarlak rozet + ikon. Renkler: Öfke kırmızı `#e5533d`, Kalkan mavi `#5ab8f0`, Hız sarı `#f0c23b`, Mıknatıs mor `#c77dff`, Bomba koyu gri + kıvılcım.

### Mermi ve efekt — 48 × 48 (aksi yazmıyorsa)

- `fx_arrow`, `fx_bone_arrow` (sağa bakan, 48 × 16), `fx_fireball_1..3` (alev döngüsü), `fx_holy` (küçük altın ışık)
- `fx_slash_1..3`: beyaz kılıç izi yayı
- `fx_explosion_1..4`: turuncu patlama, 96 × 96
- `fx_shockwave`: mor halka, 192 × 192
- `fx_spawn_marker_1..2`: kırmızı yanıp sönen çarpı işareti (düşmanın nereden çıkacağı)
- `fx_level_up`: altın yıldız patlaması, 96 × 96

---

## Aşama 4 — Uygulama arayüzü (asıl şov burada)

Şu an arayüz düz renkli kutulardan oluşuyor; bunu **sıcak, el yapımı hissi veren, kaliteli bir fantastik oyun arayüzüne** çevir. Referans his: Nimble Quest, Kingdom Rush ve Slay the Spire'ın menüleri; ama kendi kimliğiyle. Ahşap ve parşömen dokusu olabilir ama ucuz/skeuomorfik olmasın; flat vektör tarzla uyumlu, kalın konturlu, katmanlı ve **derinliği olan** bir arayüz.

### Önce: tasarım sistemi

- **Renk tokenları:** Mevcut olanlar başlangıç noktası: arka plan `#14121c`, panel `#231f2e`, panel kenarı `#3a3348`, birincil (altın) `#d9a441`, metin `#f4efe6`, soluk metin `#a39c8f`, altın `#f0c23b`, mücevher `#5ef0e0`, tehlike `#ff7a6a`. Daha zengin ve tutarlı bir palet öner.
- **Yazı tipi:** Türkçe karakterleri (ç ğ ı İ ö ş ü) tam destekleyen, ücretsiz lisanslı (OFL) bir Google Font öner: başlık için karakterli bir tane, metin için okunaklı bir tane (ör. Lilita One / Fredoka / Baloo 2). Uygulama çevrimdışı çalıştığı için font dosyası pakete gömülecek.
- **Bileşenler (SVG, 9-slice uyumlu):**
  - `ui_button_primary` / `ui_button_secondary` / `ui_button_disabled`: normal, hover, basılı halleri; 9-slice kenar payını belirt
  - `ui_panel`, `ui_panel_header`, `ui_card` (kahraman kartı), `ui_card_selected`, `ui_card_locked`
  - `ui_tab_active`, `ui_tab_idle`
  - `ui_bar_frame` + `ui_bar_fill_hp` / `_xp` / `_boss` (HP, XP ve boss çubukları)
  - `ui_toggle_on` / `ui_toggle_off`
  - İkonlar 64 × 64: `icon_coin`, `icon_gem`, `icon_heart`, `icon_sword`, `icon_range`, `icon_pause`, `icon_settings`, `icon_shop`, `icon_trophy`, `icon_lock`, `icon_sound`, `icon_music`, `icon_fullscreen`, `icon_exit`, `icon_back`
  - `portrait_<kahraman>` × 5: 256 × 256, omuz hizası, HUD ve dükkân için
- **Logo:** `logo_kervan`, 1024 × 512. "KERVAN" yazısı + kafile/kervan motifi (ör. yazının üstünde yürüyen küçük kahraman siluetleri veya bir sancak). Ayrıca 1024 × 1024 **uygulama ikonu**: koyu yeşil yuvarlatılmış kare zemin üzerinde Şövalye, macOS ikon ızgarasına uygun.

### Sonra: ekran tasarımları (1152 × 720, yüksek doğruluklu mockup)

Her ekran için mockup ve kullanılan bileşenlerin listesini ver.

1. **Yükleme:** Logo + ilerleme çubuğu.
2. **Ana menü:** Logo, Oyna (büyük, birincil), Dükkan, Ayarlar, Çıkış (yalnızca masaüstü); sağda Rekorlar panosu (ilk 5: sıra, puan, dalga, kahraman portresi); üst sağda altın/mücevher; altta yürüyen kahraman kafilesi; arka planda bulanık oyun alanı ya da manzara.
3. **Kahraman seçimi:** 5 kahraman kartı (portre, ad, rol, Can/Hasar/Menzil statları ikonlu, kilitliyse kilit + fiyat), seçili kart vurgulu; Geri ve "Yola çık" butonları.
4. **Dükkan:** "Kahramanlar" ve "Genel" sekmeleri. Kahramanlar: her satırda portre, ad, rol, Can ve Hasar yükseltmeleri için seviye göstergesi (10 pip), fiyatlı buton; kilitli kahramanlarda "Kilidi aç · 200 altın". Genel: mücevherle alınan 3 yükseltme (Hızlı başlangıç, Uzun etki 0/3, Yoldaş).
5. **Ayarlar:** Ekran sarsıntısı, Hasar sayıları, Ses efektleri, Müzik (toggle), Tam ekran.
6. **Oyun HUD'u:** Üst solda Dalga / Kafile / Düşman sayacı; üst ortada XP çubuğu + seviye; üst sağda altın, mücevher, duraklat butonu; boss varken üstte boss adı + büyük HP çubuğu; alt ortada aktif güçlendirmeler (ikon + kalan saniye). HUD oyun alanını en az kapatmalı.
7. **Duraklatma:** Yarı saydam karartma, "Duraklatıldı", Devam / Baştan başla / Menüye dön.
8. **Oyun sonu:** Ölüm nedeni başlığı ("Kafile düştü" vb.), "Yeni rekor!" rozeti, istatistikler (Dalga, Öldürme, Skor), "+X altın +Y mücevher kasaya eklendi", Dükkan / Tekrar (birincil) / Menü.
9. **Dalga afişi:** "Dalga 5 · Balçık Kralı!" ve "Dalga temizlendi! +15 altın" için ekran ortasında beliren afiş tasarımı.

### Hareket (motion) notları

Her ekran için kısa bir hareket tarifi ver (koda dökeceğim): buton hover/basılma ölçeği, panel giriş animasyonu (ör. 200 ms Back.Out ile yukarıdan kayma), afişin belirip kaybolması, oyun sonu istatistiklerinin sırayla sayarak gelmesi, rekor rozetinin parlaması, menüdeki kafilenin yürüyüşü. Süreleri ms cinsinden, easing adlarıyla yaz.

---

## Teslim edilecekler (özet)

1. Aşama 1 stil kilidi görseli → onay
2. Karakter ve animasyon SVG'leri (adlandırma kurallarına uygun)
3. Karo, ganimet ve efekt SVG'leri
4. Tasarım sistemi: renk tokenları, font önerisi, UI bileşen SVG'leri, ikonlar, portreler, logo, uygulama ikonu
5. 9 ekranın mockup'ları + hareket notları
6. Tek zip + `manifest.json`
