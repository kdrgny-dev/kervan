# Claude Design istemi — Aşama 5: Kervan Yolu

> Kullanım: Bu metni Claude Design'a yapıştır. Ek olarak `public/assets/characters/` içinden `knight_idle_1.svg`, `slime_idle_1.svg`, `slime_king_idle_1.svg`, `public/assets/tiles/` ve `docs/design/stage4/tokens.json` dosyalarını ver. Önceki aşamalardaki tarz, palet (`docs/design/palette.json`) ve teknik kurallar aynen geçerli.

---

## Bağlam

Kervan artık bir yolculuk oyunu: her 10 dalgada kervan yeni bir bölgeye geçiyor (Yeşil Vadi → Kemik Ovası → Kül Dağları → Buz Çölü), yol bitince "Yolculuk II" ile baştan ve daha zor başlıyor. Anlatıcı, esprili ihtiyar **Kervanbaşı Hüsnü**. Ton: sıcak, mizahi masal (Kingdom Rush havası).

Şu an yeni bölgeler ve düşmanlar mevcut çizimleri renklendirerek gösteriliyor; bu aşamada hepsinin gerçek çizimleri lazım.

## Teknik kurallar (değişmedi)

- SVG, `viewBox` = piksel ölçüsü, şeffaf arka plan, script/dış bağlantı/font yok.
- Karakter tuvali 96 × 96 (boss 128 × 128), ayaklar alttan 6 px yukarıda, sağa bakış, kontur `#14121c` 3 px.
- Kare adlandırma: `<anahtar>_<hareket>_<n>.svg`. Klasörler aşağıda belirtildiği gibi.
- Mevcut dosyalara dokunma, yalnızca yeni dosya ekle. Teslimde `manifest.json` ver.

---

## 1. Bölge karoları — `tiles/<bölge>/`

Her bölge için: `tile_floor_1..3`, `tile_wall`, `tile_wall_side`, `tile_wall_corner` (96 × 96, Yeşil Vadi setiyle aynı yapı ve kesintisiz döşenme). Zemin düşük kontrastlı kalsın; karakterler öne çıkmalı.

| Klasör | Bölge | Zemin | Duvar |
|---|---|---|---|
| `tiles/bones/` | Kemik Ovası | Soluk kum, kuru çatlaklar, yer yer küçük kemik parçaları | Eski, yıpranmış kemik-taş karışımı sur |
| `tiles/ash/` | Kül Dağları | Koyu kül ve bazalt, ince turuncu lav çatlakları | Kararmış volkanik taş, köşelerde közler |
| `tiles/frost/` | Buz Çölü | Açık buz ve kar, hafif mavi gölgeler | Buz blokları, üstte kar birikintisi |

Her bölge için 4 süs (48 × 48): `decor/<bölge>/decor_1..4` (ör. kemik ovasında kafatası, kırık mızrak, kuru diken, mezar taşı; kül dağlarında köz, obsidyen, yanmış kütük, lav kabarcığı; buz çölünde buz sarkıtı, kardan tepe, donmuş çalı, buzda kalmış sandık).

## 2. Yeni düşmanlar — `characters/`

Her biri: `idle_1`, `move_1..4`, `attack_1..2`, `hurt_1`.

| Anahtar | Tanım |
|---|---|
| `wraith` | **Hayalet**: yarı saydam görünen soluk mavi-beyaz hayalet, uçuşan etek kenarı, sevimli ama ürkütücü gözler; `move` süzülme |
| `magma_slime` | **Magma Balçığı**: turuncu-kırmızı, içinde parlayan lav damarları, üstünden duman tüten balçık; `move` zıplama (3 kare de olur) |
| `frost_skeleton` | **Buz İskeleti**: buzla kaplı kemikler, buzdan yay, omzunda kar; `attack` buz oku germe |

## 3. Yeni boss'lar — `characters/` (128 × 128)

Her biri: `idle_1..2` (nefes), `summon_1..2` (çağırma), `charge_1..2` (şok dalgası öncesi şişme/hazırlanma, kırmızımsı ton), `hurt_1`.

| Anahtar | Tanım |
|---|---|
| `bone_lord` | **Kemik Lordu**: pelerinli, taçlı dev iskelet, elinde kemik asa; `summon` asayı kaldırır, yerde mor ışık |
| `ember_king` | **Kor Kral**: alevden taçlı dev magma balçığı, ağzından kıvılcım; Balçık Kralı'nın akrabası gibi |
| `frost_giant` | **Buz Devi**: iri, sakalı buzdan, omuzları karlı dev; elinde buz topuz; `charge` topuzu kaldırır |

## 4. Kervanbaşı Hüsnü — `ui/narrator/`

- `husnu_portrait_normal.svg`, `husnu_portrait_laugh.svg`, `husnu_portrait_surprised.svg` (256 × 256, omuz hizası). Yaşlı, tombul, kırmızı sarıklı, beyaz bıyıklı ve sakallı, elinde çay bardağı olan sıcak bir karakter. Diyalog kutusunda solda duracak.
- `husnu_full.svg` (256 × 384): ayakta, bir eli belinde, diğerinde çaydanlık. Kamp ekranında kullanılacak.

## 5. Kamp — `ui/camp/`

Dükkân artık kervanın kampı. Üç bina var; her binanın üç gelişim seviyesi olsun (`_1`, `_2`, `_3`), seviye arttıkça bina büyüsün ve süslensin.

- `camp_bg.svg` (1152 × 720): akşamüstü, kamp ateşi, develer, çadırlar; ortada binalar için boşluk.
- `building_barracks_1..3` (Kışla: kahramanların çadırı, sancaklı), `building_temple_1..3` (Tapınak: küçük taş mabet, mumlar), `building_market_1..3` (Pazar: tezgâh, kumaşlar, terazi). Her biri 320 × 280.
- `campfire_1..4` (96 × 96): döngülü kamp ateşi animasyonu.

## 6. Harita — `ui/map/`

- `route_map.svg` (1100 × 420): sol baştan sağa kıvrılan tek bir kervan yolu; dört bölge sırayla küçük vinyetler hâlinde (vadi çayırı, kemikli ova, dumanlı dağlar, buzlu düzlük), en sağda ufukta kaybolan yol (sonsuz yolculuk). Bölge noktaları üzerine oyun içinde düğüm çizilecek, o yüzden noktaların yerini `manifest.json`'da (x, y) olarak belirt.
- `region_icon_<bölge>.svg` (96 × 96) × 4: harita düğümleri ve bölge afişleri için yuvarlak rozet.

## 7. Bölge afişleri

`ui/components/ui_banner_region_<bölge>.svg` (640 × 128, mevcut `ui_banner` ile aynı 9-slice payları): her bölgenin renginde afiş (vadi yeşil-altın, kemik kum-krem, kül kor-kırmızı, buz buz-mavi).

---

## Teslim

1. Önce **bölge karoları** ve **Hayalet** idle karesiyle bir stil kilidi göster (mevcut Yeşil Vadi karoları ve Şövalye ile yan yana). Onaydan sonra devam et.
2. Ardından sırasıyla düşmanlar, boss'lar, Hüsnü, kamp, harita, afişler.
3. Tek zip + `manifest.json`.
