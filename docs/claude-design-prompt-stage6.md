# Claude Design istemi — Aşama 6: Destan I · Fetih

> Kullanım: Bu metni Claude Design'a yapıştır. Ek olarak `public/assets/characters/` içinden `knight_idle_1.svg`, `skeleton_idle_1.svg`, `frost_giant_idle_1.svg`, `public/assets/ui/narrator/husnu_portrait_normal.svg`, `public/assets/tiles/bones/` ve `docs/design/stage4/tokens.json` dosyalarını ver. Önceki aşamaların tarzı, paleti (`docs/design/palette.json`) ve teknik kuralları aynen geçerli.
>
> **Teslimde dikkat:** Yalnızca yeni dosyaları ver. `public/assets` klasörünü komple değiştirme; yeni dosyaları mevcut klasörlerin içine **birleştir**.

---

## Bağlam

Kervan'a **Destanlar** geliyor: kervanbaşı Hüsnü'nün kervancı soyu, tarihin büyük seferlerinde ordunun kervanını yürütmüş. Hüsnü bu hikayeleri abartarak anlatır, her zaferi dedelerine mal eder. İlk destan **Fetih (1453)**: Hüsnü'nün dedesi Dede Hüsnü, Fatih'in toplarını ve gemilerini taşıyan kervanın başında.

Ton: sıcak, mizahi masal; Kingdom Rush havası. **Önemli:** Fatih ağırbaşlı ve saygın çizilir; mizah Dede Hüsnü'dedir. Düşmanlar **insan asker değil**, surların ve şehrin efsanevi muhafızlarıdır (taş, zincir, sis). Hiçbir halk ya da inanç sembolü düşman tarafında kullanılmaz.

## Teknik kurallar (değişmedi)

- SVG, `viewBox` = piksel ölçüsü, şeffaf arka plan, script/dış bağlantı/font yok.
- Karakter tuvali 96 × 96 (boss 128 × 128, final boss 160 × 160), ayaklar alttan 6 px yukarıda, sağa bakış, kontur `#14121c` 3 px.
- Kare adlandırma: `<anahtar>_<hareket>_<n>.svg`.
- Mevcut dosyalara dokunma, yalnızca yeni dosya ekle. Teslimde `manifest.json` ver.

---

## 1. Bölge karoları — `tiles/<bölge>/` ve `decor/<bölge>/`

Her bölge için `tile_floor_1..3`, `tile_wall`, `tile_wall_side`, `tile_wall_corner` (96 × 96, mevcut setlerle aynı yapı, kesintisiz döşenme, düşük kontrastlı zemin) ve 4 süs `decor_1..4` (48 × 48).

| Klasör | Bölge | Zemin | Duvar | Süs önerileri |
|---|---|---|---|---|
| `hisar/` | Rumeli Hisarı | Toprak ve kesme taş döşeme, inşaat tozu | Yeni örülmüş açık renk taş, iskele kalasları | Taş yığını, el arabası, harç kovası, kalas |
| `halic/` | Haliç kıyısı | Islak rıhtım taşı, yer yer su birikintisi | Liman duvarı, demir halkalar | Halat yumağı, çapa, balık sepeti, fıçı |
| `galata/` | Galata sırtları | Yeşil yamaç, çimenin üstünde yağlanmış kızak izleri | Kayalık ve ağaç kütükleri | Yağ küpü, kızak kalası, kütük, küçük çadır |
| `surlar/` | Kara surlar | Kuşatma toprağı, top güllesi çukurları | Kalın, eski, yosunlu sur taşı, mazgallar | Top güllesi yığını, kırık merdiven, kalkan, bayrak direği |

## 2. Yeni düşmanlar — `characters/` (96 × 96)

Her biri: `idle_1`, `move_1..4`, `attack_1..2`, `hurt_1`.

| Anahtar | Tanım |
|---|---|
| `chain_serpent` | **Zincir Yılanı**: Haliç zincirinden canlanmış, halkaları demirden yılan; sevimli, mahcup bakışlı; `move` kıvrılarak sürünme |
| `fog_wisp` | **Sis Perisi**: Haliç sisinden süzülen küçük, gri-mavi bulut ruh; fener gibi iki göz; `move` süzülme |
| `gargoyle` | **Sur Gargoylesi**: taştan, kanatlı, kambur bekçi; `move` zıplayarak yürüme, `attack` pençe |
| `catapult_golem` | **Mancınık Golemi**: kalas ve taştan yürüyen mancınık; `attack` kolu geriye çekip taş fırlatma |

## 3. Boss'lar — `characters/`

Her biri: `idle_1..2`, `summon_1..2`, `charge_1..2` (kırmızımsı ton), `hurt_1`.

| Anahtar | Tuval | Tanım |
|---|---|---|
| `harbor_kraken` | 128 × 128 | **Liman Ahtapotu**: Haliç'in dibinden çıkan, kollarında zincir ve çapa olan iri ahtapot; `summon` mürekkep bulutu |
| `stone_sentinel` | 128 × 128 | **Taş Nöbetçi**: hisar inşaatından kalma dev taş muhafız; `charge` yumruğunu yere vurmaya hazırlanır |
| `oil_giant` | 128 × 128 | **Yağ Küpü Devi**: gemileri kaydırmak için kızaklara sürülen yağ küplerinden doğmuş, kocaman, kaygan, toprak küp gövdeli dev; tepesinden yağ taşar; `summon` yere yağ birikintisi döker |
| `wall_warden` | **160 × 160** | **Sur Bekçisi Dev** (final): surların kendisi canlanmış; gövdesi mazgallı sur kulesi, kolları duvar parçası, tepesinde sallanan bayrak direği; ağır, görkemli, biraz şaşkın; `summon` gargoyle'ları uyandırır, `charge` tüm gövdesiyle öne eğilir |

## 4. Efsanevi kahraman — Fatih (96 × 96)

`fatih_idle_1`, `fatih_walk_1..4`, `fatih_attack_1..2`, `fatih_hurt_1`.

Genç sultan; kırmızı-altın kaftan, beyaz kavuk, kısa koyu sakal; vakur ve kararlı duruş, **komik değil**. Yanında küçük bir **Şahi topu** (tekerlekli, bronz). `attack` kareleri: topun fitilini işaretle ateşletme ve geri tepme. Diğer kahramanlarla aynı chibi oranlar ama biraz daha heybetli.

Ek: `fx/cannonball.svg` (24 × 24 gülle) ve `fx/cannon_blast_1..4.svg` (96 × 96 patlama, mevcut patlamadan daha tozlu ve taşlı).

## 5. Dede Hüsnü — `ui/narrator/`

- `dede_husnu_portrait_normal.svg`, `dede_husnu_portrait_laugh.svg`, `dede_husnu_portrait_surprised.svg` (256 × 256): **Hüsnü'nün aynı yüzü** (espri bu), ama 15. yüzyıl kervancısı kıyafetiyle: kalın kaftan, büyük sarık, belinde kırbaç ve kese. Elinde çay bardağı yerine **toprak testi**.

## 6. Destan ekranı — `ui/campaign/`

- `campaign_cover_road.svg` (480 × 270): Hüsnü'nün Yolu kapağı — günbatımında yol alan kervan (mevcut harita/kamp stiliyle).
- `campaign_cover_fetih.svg` (480 × 270): Fetih kapağı — gece, ışıklı Galata sırtlarından karadan yürütülen gemiler, uzakta surlar; ön planda kervan develeri kızak çekiyor.
- `campaign_cover_locked.svg` (480 × 270): bulutla örtülü, üstünde mühürlü parşömen; ileride gelecek destanlar için.
- `campaign_frame.svg` (520 × 360, 9-slice payları 48): kapakları çevreleyen süslü çerçeve.
- `ship_icon.svg` (64 × 64): "gemiler karadan" gücü için HUD ikonu (kızak üstünde küçük gemi).

## 7. Bölge afişleri ve harita rozetleri

- `ui/components/ui_banner_region_<bölge>.svg` × 4 (640 × 128, mevcut afişle aynı 9-slice payları): hisar taş-kum, halic deniz mavisi, galata çimen yeşili, surlar koyu taş-bordo.
- `ui/map/region_icon_<bölge>.svg` × 4 (96 × 96) yuvarlak rozet.

---

## Teslim

1. Önce **stil kilidi**: `surlar` karoları + `gargoyle` idle + `fatih_idle_1`, mevcut Şövalye ve Kemik Ovası karolarıyla yan yana. Onaydan sonra devam et.
2. Sırasıyla: karolar, düşmanlar, boss'lar (Taş Nöbetçi → Hisar, Liman Ahtapotu → Haliç, Yağ Küpü Devi → Galata, Sur Bekçisi Dev → Surlar), Fatih + efektler, Dede Hüsnü, destan ekranı, afiş ve rozetler.
3. Tek zip + `manifest.json`.
