# Claude Design istemi — Aşama 7: Destan II · Alpler

> Kullanım: Bu metni Claude Design'a yapıştır. Ek olarak `public/assets/characters/` içinden `knight_idle_1.svg`, `fatih_idle_1.svg`, `slime_idle_1.svg`, `frost_giant_idle_1.svg`, `public/assets/ui/narrator/dede_husnu_portrait_normal.svg`, `public/assets/tiles/frost/` ve `docs/design/stage4/tokens.json` dosyalarını ver. Önceki aşamaların tarzı, paleti (`docs/design/palette.json`) ve teknik kuralları aynen geçerli.
>
> **Teslimde dikkat:** Yalnızca yeni dosyaları ver. `public/assets` klasörünü komple değiştirme; yeni dosyaları mevcut klasörlerin içine **birleştir**.

---

## Bağlam

İkinci destan **Alpler (MÖ 218)**: Hannibal'ın ordusu filleriyle Alpleri aşıyor. Erzak kervanının fil bakıcısı, Hüsnü'nün çok eski dedesi **Ata Hüsnü**. Fillerden korkar, filler ona bayılır, hepsi arkasından gelir.

Ton: sıcak, mizahi masal; Kingdom Rush havası. **Hannibal ağırbaşlı ve saygın çizilir**; mizah Ata Hüsnü'de ve fillerdedir. Düşmanlar **insan asker değil**, dağın ve karın sevimli-tuhaf yaratıklarıdır. Hiçbir halk ya da inanç sembolü düşman tarafında kullanılmaz.

Oyunun yeni kuralı: kafilede **fil** varken lider düşmana çarparsa düşman ezilir. Filin çizimi bu yüzden ağır, sağlam ve iyi kalpli görünmeli.

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
| `iber/` | İber kıyısı | Sıcak kum, yer yer taş döşeme ve deniz kabuğu | Kireçli liman duvarı, halatlı kazıklar | Amfora, halat, deniz kabuğu, küçük tekne |
| `pirene/` | Pireneler | Çam iğneli orman toprağı, kök ve taş | Kayalık yamaç, devrik çam kütükleri | Çam kozalağı, mantar, keçi çanı, kütük |
| `zirve/` | Karlı Alpler | Kar, ayak izleri, buz parlaması | Buzlu kaya, kar saçakları | Kardan adam (sahipsiz), buz sarkıtı, ayak izi, terk edilmiş kızak |
| `po/` | Po ovası | Taze yeşil ova, çiçekler, tek tük erimiş kar lekesi | Alçak taş çit, saman balyaları | Saman balyası, çiçek, ırmak taşı, kırık kar küreği |

## 2. Yeni düşmanlar — `characters/` (96 × 96)

Her biri: `idle_1`, `move_1..4`, `attack_1..2`, `hurt_1`.

| Anahtar | Tanım |
|---|---|
| `sand_crab` | **Kum Yengeci**: turuncu, tombul, kocaman tek kıskaçlı; yan yan yürür; `attack` kıskaç çıtlatma |
| `gull` | **Martı**: arsız, iri gagalı, yanındakinin simidine göz dikmiş bakış; `move` kanat çırparak süzülme |
| `goat` | **Dağ Keçisi**: inatçı, keçi sakallı, kıvrık boynuzlu; `move` zıplayarak koşma, `attack` kafa atma |
| `snowball` | **Kartopu**: yuvarlanan, iki kömür gözlü, sinirli kar topu; `move` yuvarlanma; ayrıca küçük hâli için aynı çizim yeterli (oyun küçültür) |
| `yeti` | **Yeti**: kocaman, tüylü, utangaç; elinde kar topu; `attack` kar topu fırlatma |

Ek: `fx/snowball_shot.svg` (24 × 24, yetinin attığı kar topu).

## 3. Boss'lar — `characters/`

Her biri: `idle_1..2`, `summon_1..2`, `charge_1..2` (kırmızımsı ton), `hurt_1`.

| Anahtar | Tuval | Tanım |
|---|---|---|
| `tide_crab` | 128 × 128 | **Gelgit Yengeci**: kabuğunda midye ve yosun olan dev yengeç; `summon` kumdan küçük yengeçler çıkarır |
| `cave_bear` | 128 × 128 | **Mağara Ayısı**: uykusu bölünmüş, gecelikli gibi duran iri ayı; `charge` iki ayağa kalkıp kükreme |
| `storm_eagle` | 128 × 128 | **Fırtına Kartalı**: kanatlarından kar savuran, tüyleri buzlu kartal; `summon` martı çağırır |
| `avalanche_giant` | **160 × 160** | **Çığ Devi** (final): dağdan yuvarlanıp gelmiş kar ve kaya yığını; ovada biraz erimiş, şaşkın; gövdesinde çam ağaçları ve bir kızak saplı; `summon` kartopu yuvarlar, `charge` öne doğru çığ gibi eğilir |

## 4. Kafile — Fil ve Hannibal (96 × 96)

**Fil** (`elephant`): `elephant_idle_1`, `elephant_walk_1..4`, `elephant_attack_1..2`, `elephant_hurt_1`. Gri, sevimli, iri kulaklı, sırtında renkli bir örtü ve küçük erzak sandığı. Kafilenin diğer üyelerinden **bir boy büyük** görünmeli (tuval aynı, çizim tuvalin tamamını kullanır). `attack` ön ayaklarını kaldırıp yere vurma.

**Hannibal** (`hannibal`): `hannibal_idle_1`, `hannibal_walk_1..4`, `hannibal_attack_1..2`, `hannibal_hurt_1`. Fil sırtında komutan; tunç miğfer, kızıl pelerin, kısa kıvırcık sakal; vakur ve kararlı, **komik değil**. Fil küçük çizilir ama kafilede yine en iri birim o olmalı. `attack` mızrağı öne savurma + filin yere basması.

## 5. Ata Hüsnü — `ui/narrator/`

- `ata_husnu_portrait_normal.svg`, `ata_husnu_portrait_laugh.svg`, `ata_husnu_portrait_surprised.svg` (256 × 256): **Hüsnü'nün aynı yüzü** (espri bu), ama MÖ 218 kıyafetiyle: kaba yün pelerin, deri kemer, başında sarık yerine **kalın kürk başlık**. Elinde çay yerine **fıstık dolu bir kese** (fillere rüşvet). Şaşkın hâlinde arkasında bir fil hortumu görünür.

## 6. Destan ekranı — `ui/campaign/`

- `campaign_cover_alpler.svg` (480 × 270): karlı Alp geçidinden aşağı inen fil kervanı; önde fıstık kesesini sallayan Ata Hüsnü, arkasında sevgiyle onu izleyen filler, uzakta Po ovasının yeşili.
- `elephant_icon.svg` (64 × 64): HUD'da filin kafilede olduğunu gösteren küçük fil başı.

## 7. Bölge afişleri ve harita rozetleri

- `ui/components/ui_banner_region_<bölge>.svg` × 4 (640 × 128, mevcut afişle aynı 9-slice payları): iber kum-turuncu, pirene çam yeşili, zirve buz mavisi-beyaz, po taze yeşil.
- `ui/map/region_icon_<bölge>.svg` × 4 (96 × 96) yuvarlak rozet.

---

## Teslim

1. Önce **stil kilidi**: `zirve` karoları + `elephant_idle_1` + `hannibal_idle_1`, mevcut Şövalye, Fatih ve Buz Çölü karolarıyla yan yana. Onaydan sonra devam et.
2. Sırasıyla: karolar, düşmanlar, boss'lar (Gelgit Yengeci → İber, Mağara Ayısı → Pireneler, Fırtına Kartalı → Zirve, Çığ Devi → Po), fil + Hannibal, Ata Hüsnü, destan kapağı, afiş ve rozetler.
3. Tek zip + `manifest.json`.
