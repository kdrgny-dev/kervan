export type Rarity = 'common' | 'rare' | 'epic';

/** Kartların değiştirdiği tur içi çarpanlar ve bayraklar. */
export interface Mods {
  dmgMult: number;
  meleeDmgMult: number;
  hpMult: number;
  cooldownMult: number;
  rangeBonus: number;
  splashBonus: number;
  critBonus: number;
  healMult: number;
  extraTargets: number;
  goldMult: number;
  gemMult: number;
  heroDropMult: number;
  xpMult: number;
  powerMult: number;
  magnetRadius: number;
  speedMult: number;
  bumpMult: number;
  dmgTakenMult: number;
  enemyHpMult: number;
  enemyCountMult: number;
  waveGoldMult: number;
  thorns: number;
  martyr: number;
  wavePower: boolean;
}

export const defaultMods = (): Mods => ({
  dmgMult: 1,
  meleeDmgMult: 1,
  hpMult: 1,
  cooldownMult: 1,
  rangeBonus: 0,
  splashBonus: 0,
  critBonus: 0,
  healMult: 1,
  extraTargets: 0,
  goldMult: 1,
  gemMult: 1,
  heroDropMult: 1,
  xpMult: 1,
  powerMult: 1,
  magnetRadius: 0,
  speedMult: 1,
  bumpMult: 1,
  dmgTakenMult: 1,
  enemyHpMult: 1,
  enemyCountMult: 1,
  waveGoldMult: 1,
  thorns: 0,
  martyr: 0,
  wavePower: false,
});

export interface CardDef {
  name: string;
  desc: string;
  rarity: Rarity;
  /** Lanetli: güçlü ama bedelli. */
  cursed?: boolean;
  /** Bir turda en fazla kaç kez alınabilir. */
  max: number;
  /** Arayüzde gösterilecek doku anahtarı. */
  icon: string;
  apply: (m: Mods) => void;
  /** Seçildiği an olan tek seferlik etki. */
  instant?: 'heroToken';
}

export const CARDS = {
  sharpBlades: { name: 'Bilenmiş Kılıçlar', desc: 'Yakın dövüşçüler +%25 hasar', rarity: 'common', max: 4, icon: 'icon.sword', apply: (m) => void (m.meleeDmgMult += 0.25) },
  eagleEye: { name: 'Kartal Gözü', desc: 'Menzilli kahramanlara +1 menzil', rarity: 'rare', max: 2, icon: 'icon.range', apply: (m) => void (m.rangeBonus += 1) },
  doubleShot: { name: 'Çifte Atış', desc: 'Okçular bir hedefe daha ateş eder', rarity: 'epic', max: 2, icon: 'portrait.archer', apply: (m) => void (m.extraTargets += 1) },
  pyromancer: { name: 'Ateş Ustası', desc: 'Patlama alanı +1 hücre', rarity: 'rare', max: 2, icon: 'portrait.mage', apply: (m) => void (m.splashBonus += 1) },
  holyLight: { name: 'Kutsal Işık', desc: 'Rahip şifası ×2', rarity: 'common', max: 3, icon: 'portrait.priest', apply: (m) => void (m.healMult += 1) },
  shadowStep: { name: 'Gölge Adımı', desc: 'Kritik şansı +%15', rarity: 'common', max: 3, icon: 'portrait.rogue', apply: (m) => void (m.critBonus += 0.15) },
  sturdyArmor: { name: 'Sağlam Zırh', desc: 'Tüm kafile +%20 maks. can', rarity: 'common', max: 5, icon: 'icon.heart', apply: (m) => void (m.hpMult += 0.2) },
  quickHands: { name: 'Hızlı Eller', desc: 'Saldırılar %15 daha sık', rarity: 'rare', max: 3, icon: 'power.speed', apply: (m) => void (m.cooldownMult *= 0.85) },
  warCry: { name: 'Savaş Narası', desc: 'Tüm hasar +%15', rarity: 'common', max: 5, icon: 'power.rage', apply: (m) => void (m.dmgMult += 0.15) },
  goldFever: { name: 'Altın Ateşi', desc: 'Paralar +%25 değerli', rarity: 'common', max: 2, icon: 'icon.coin', apply: (m) => void (m.goldMult += 0.25) },
  gemHunter: { name: 'Mücevher Avcısı', desc: 'Mücevher düşme şansı ×2', rarity: 'rare', max: 2, icon: 'icon.gem', apply: (m) => void (m.gemMult *= 2) },
  longBrew: { name: 'Uzun Demleme', desc: 'Güçlendirmeler %50 uzun sürer', rarity: 'common', max: 3, icon: 'power.shield', apply: (m) => void (m.powerMult += 0.5) },
  lodestone: { name: 'Mıknatıs Taşı', desc: 'Lider 2 hücre çevresindeki ganimeti hep çeker', rarity: 'rare', max: 2, icon: 'power.magnet', apply: (m) => void (m.magnetRadius += 2) },
  recruiter: { name: 'Davetçi', desc: 'Düşmanlardan kahraman jetonu ×2 düşer', rarity: 'rare', max: 1, icon: 'hero.token', apply: (m) => void (m.heroDropMult *= 2) },
  newFriend: { name: 'Yeni Yoldaş', desc: 'Hemen bir kahraman jetonu belirir', rarity: 'common', max: 3, icon: 'hero.token', apply: () => undefined, instant: 'heroToken' },
  martyr: { name: 'Şehit Ruhu', desc: 'Düşen kahraman çevresine 40 hasar verir', rarity: 'rare', max: 3, icon: 'fx_explosion.1', apply: (m) => void (m.martyr += 40) },
  thornArmor: { name: 'Diken Zırh', desc: 'Vuran düşman 6 hasar geri alır', rarity: 'common', max: 3, icon: 'icon.sword', apply: (m) => void (m.thorns += 6) },
  campfire: { name: 'Sefer Ateşi', desc: 'Her dalga rastgele bir güçlendirmeyle başlar', rarity: 'epic', max: 1, icon: 'fx.levelUp', apply: (m) => void (m.wavePower = true) },
  scholar: { name: 'Bilge', desc: 'Kazanılan XP +%50', rarity: 'common', max: 3, icon: 'icon.trophy', apply: (m) => void (m.xpMult += 0.5) },
  windborne: { name: 'Rüzgâr Gibi', desc: 'Kafile %12 daha hızlı ilerler', rarity: 'rare', max: 2, icon: 'power.speed', apply: (m) => void (m.speedMult *= 0.88) },
  shieldWall: { name: 'Kalkan Duvarı', desc: 'Düşmana çarpma hasarı −%50', rarity: 'common', max: 2, icon: 'power.shield', apply: (m) => void (m.bumpMult *= 0.5) },

  bloodPact: { name: 'Kan Paktı', desc: '+%40 hasar · maks. can −%20', rarity: 'rare', cursed: true, max: 2, icon: 'power.rage', apply: (m) => { m.dmgMult += 0.4; m.hpMult -= 0.2; } },
  greed: { name: 'Açgözlülük', desc: 'Paralar +%50 · düşmanlar +%25 can', rarity: 'rare', cursed: true, max: 2, icon: 'icon.coin', apply: (m) => { m.goldMult += 0.5; m.enemyHpMult += 0.25; } },
  glassCannon: { name: 'Cam Top', desc: '+%60 hasar · alınan hasar +%30', rarity: 'epic', cursed: true, max: 1, icon: 'fx_explosion.1', apply: (m) => { m.dmgMult += 0.6; m.dmgTakenMult *= 1.3; } },
  chaosRite: { name: 'Kaos Ayini', desc: 'Dalga ödülü ×2 · düşman sayısı +%25', rarity: 'rare', cursed: true, max: 2, icon: 'icon.trophy', apply: (m) => { m.waveGoldMult += 1; m.enemyCountMult += 0.25; } },
} satisfies Record<string, CardDef>;

export type CardId = keyof typeof CARDS;
export const CARD_IDS = Object.keys(CARDS) as CardId[];

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 30, epic: 10 };
export const RARITY_NAME: Record<Rarity, string> = { common: 'Yaygın', rare: 'Nadir', epic: 'Efsane' };
export const DRAFT_SIZE = 3;
export const CURSED_CHANCE = 0.15;
export const rerollCost = (used: number) => 15 * 2 ** used;
