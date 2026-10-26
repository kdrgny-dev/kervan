# Ses istemleri (yapay zekâ)

Oyunun sesleri iki araçla üretilir:
- **Efektler:** ElevenLabs → Sound Effects. İstemler İngilizce (araç İngilizcede çok daha iyi).
- **Müzik:** Suno (ya da Udio).

Oyunu satacağımız için **ticari kullanıma izin veren ücretli plan** gerekir. Ücretsiz planlarla üretilen sesler satılan bir oyunda kullanılamaz.

## Ortak tarz

Her efekt isteminin sonuna bunu ekle:

> `, warm cartoon fantasy game sound, playful and punchy, clean, no music, no voice`

Ton: sıcak, sevimli, çizgi film masalı (Kingdom Rush, Nimble Quest havası). Gerçekçi kan ve vahşet yok. Kervan/Anadolu dokusu olan yerlerde zil, def, saz gibi tınılar hoş olur.

## Teslim

1. Her olay için tablodaki kadar **varyant** üret (aynı istemi tekrar çalıştırmak yeterli; her seferinde biraz farklı çıkar). Beğenmediklerini at.
2. MP3 indir ve şu adla kaydet: `<olay>_<n>.mp3`. Örnekler: `hit_1.mp3`, `hit_2.mp3`, `coin_1.mp3`.
3. Dosyaları `public/assets/audio/` klasörüne **ekle**. Klasörü komple değiştirme.
4. Bana "sesler hazır" de. Ses seviyelerini ben eşitlerim, oyuna bağlarım, telefonuna kurarım.

Hepsini birden yapmak zorunda değilsin. En sık duyulanlar önce: **hit, enemyDie, slash, coin, click**.

## Efektler (ElevenLabs Sound Effects)

ElevenLabs ayarları: **Duration** tablodaki süre, **Prompt influence** ~0.5.

| Olay (dosya adı) | Ne zaman | Süre | Varyant | İstem |
|---|---|---|---|---|
| `hit` | Kahraman düşmana vurur (çok sık) | 0.3 s | 4 | short soft cartoon hit thump, light punch on a small creature |
| `crit` | Kritik vuruş | 0.5 s | 3 | heavy satisfying cartoon critical hit, punchy whack with a bright sparkle on top |
| `slash` | Şövalye/Haydut kılıç savurur | 0.4 s | 3 | quick sword swoosh slash through air, light metallic swish |
| `arrow` | Okçu ok atar | 0.3 s | 3 | bow string twang and arrow whoosh, short |
| `fireball` | Büyücü ateş topu atar | 0.5 s | 3 | small magic fireball launch, whooshing flame puff |
| `explosion` | Ateş topu / top güllesi patlar | 0.8 s | 3 | small cartoon fire explosion, soft boom with crackle, not too loud |
| `holy` | Rahip kutsal ışık atar | 0.4 s | 2 | gentle holy chime sparkle, soft bell shimmer |
| `heal` | Kafile iyileşir | 0.6 s | 2 | soft healing magic, warm rising shimmer with small bells |
| `enemyDie` | Düşman ölür (çok sık) | 0.4 s | 4 | cute cartoon monster defeated, soft pop and poof |
| `heroHurt` | Kahraman hasar alır | 0.3 s | 3 | short armor clank with a small grunt-less impact |
| `heroDie` | Kafileden bir kahraman düşer | 0.8 s | 2 | sad cartoon fall, descending soft thud with fading chime |
| `coin` | Para toplanır (çok sık) | 0.3 s | 3 | bright single coin pickup clink, cheerful |
| `gem` | Mücevher toplanır | 0.5 s | 2 | magical gem pickup sparkle, crystalline ting |
| `power` | Güçlendirme alınır | 0.7 s | 2 | power-up pickup, magical rising whoosh with sparkle |
| `bomb` | Bomba güçlendirmesi patlar | 1.0 s | 2 | big cartoon bomb blast clearing the screen, deep boom then debris sparkle |
| `recruit` | Yeni kahraman kafileye katılır | 0.8 s | 2 | joyful recruit fanfare blip, small caravan bell jingle |
| `bump` | Lider düşmana çarpar | 0.3 s | 3 | soft bonk bump into a creature, comedic |
| `shockWarn` | Boss şok dalgasına hazırlanır | 0.8 s | 2 | ominous charging rumble rising, warning before a ground slam |
| `shockwave` | Boss şok dalgası | 0.8 s | 2 | heavy ground slam shockwave, deep thump and rumble |
| `levelUp` | Kafile seviye atlar | 1.0 s | 1 | cheerful level up jingle, short bright ascending arpeggio with bells |
| `waveStart` | Dalga başlar | 1.0 s | 1 | battle start horn, short war drum hit with a caravan horn |
| `waveCleared` | Dalga temizlenir | 1.5 s | 1 | victory mini fanfare, short happy flourish with frame drum and bells |
| `gameOver` | Kafile düşer | 2.0 s | 1 | comedic sad game over jingle, descending notes, gentle and funny not depressing |
| `click` | Menü butonu | 0.1 s | 3 | soft wooden UI click, short and crisp |

### Sonra eklenecekler (kodda olayı da açacağım)

| Olay | Ne zaman | Süre | İstem |
|---|---|---|---|
| `cannon` | Fatih'in Şahi topu ateşler | 0.8 s | ottoman bronze cannon shot, deep boom with smoke puff, cartoon style |
| `bossRoar` | Boss sahneye çıkar | 1.5 s | giant cartoon monster roar, big but friendly, not scary |
| `ships` | Gemiler karadan başlar | 1.5 s | wooden ship creaking and sliding on greased logs, ropes and cheering crowd far away |
| `husnu` | Hüsnü konuşmaya başlar | 0.6 s | old man cheerful "hmm-hm!" mumble, warm and funny, no real words |

## Müzik (Suno)

Suno'da **Instrumental** açık olsun. Döngüye uygun çıkması için istemde "seamless loop" geçiyor. Her biri 1–2 dakika yeterli.

| Dosya | Nerede | İstem |
|---|---|---|
| `music_menu.mp3` | Menüler, kamp | Warm cozy fantasy caravan camp music, saz and oud with soft frame drum, campfire evening mood, gentle and inviting, seamless loop, instrumental |
| `music_vale.mp3` | Yeşil Vadi | Upbeat cheerful adventure music, playful pizzicato strings, flute and light percussion, sunny meadow, video game, seamless loop, instrumental |
| `music_bones.mp3` | Kemik Ovası | Spooky but playful desert adventure, plucked strings, rattling percussion, mysterious bone field, cartoon, seamless loop, instrumental |
| `music_ash.mp3` | Kül Dağları | Driving fiery adventure, taiko and darbuka drums, low brass, volcanic mountains, energetic but fun, seamless loop, instrumental |
| `music_frost.mp3` | Buz Çölü | Icy crystalline adventure, celesta and glockenspiel, airy pads, light percussion, frozen desert, seamless loop, instrumental |
| `music_fetih.mp3` | Fetih destanı | Epic but playful Ottoman mehter inspired march, davul, zurna, cymbals, heroic caravan siege, cartoon game, seamless loop, instrumental |
| `music_boss.mp3` | Boss dalgaları | Intense boss battle, fast drums, low strings and brass stabs, dramatic but cartoonish, seamless loop, instrumental |

Müzik dosyalarını da aynı klasöre (`public/assets/audio/`) koy. Bölgeye göre müzik geçişini ben kodlayacağım.
