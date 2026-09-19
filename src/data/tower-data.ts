// ============================================================
// tower-data.ts — Tower types & upgrade paths (BTD6-inspired)
// ============================================================

export type TowerTypeId =
  | 'dart' | 'tack' | 'bomb' | 'ice' | 'super'
  | 'boomerang' | 'sniper' | 'sub' | 'buccaneer' | 'ace' | 'cannon'
  | 'heli' | 'mortar' | 'dartling' | 'wizard' | 'ninja'
  | 'alchemist' | 'druid' | 'farm' | 'village' | 'engineer'
  | 'beast' | 'mermonkey' | 'sentinel' | 'chemist' | 'ranger';
export type DamageType = 'sharp' | 'explosive' | 'freeze' | 'energy';
export type TargetMode = 'first' | 'last' | 'close' | 'strong';

export interface UpgradeDef {
  name: string;
  cost: number;
  description: string;
  /** Stat deltas applied on upgrade */
  statMods: Partial<{
    damageAdd: number;
    rangeAdd: number;
    cooldownMul: number;   // multiply cooldown (0.7 = 30% faster)
    pierceAdd: number;
    splashRadiusAdd: number;
    projectileSpeedAdd: number;
  }>;
}

export interface TowerConfig {
  id: TowerTypeId;
  name: string;
  emoji: string;
  cost: number;
  range: number;           // pixels
  attackCooldown: number;  // seconds between shots
  damage: number;
  pierce: number;          // how many bloons one projectile can hit
  projectileSpeed: number; // pixels per second
  splashRadius: number;    // 0 = no splash
  damageType: DamageType;
  freezeDuration: number;  // seconds (0 for non-ice towers)
  description: string;
  color: string;           // tower body color
  accentColor: string;     // tower accent / highlight
  /** 2 upgrade paths, 3 tiers each */
  upgrades: UpgradeDef[][];
}

export const TOWER_DATA: Record<TowerTypeId, TowerConfig> = {
  dart: {
    id: 'dart', name: 'Dart Monkey', emoji: '🎯',
    cost: 200, range: 130, attackCooldown: 0.95,
    damage: 1, pierce: 2, projectileSpeed: 420,
    splashRadius: 0, damageType: 'sharp', freezeDuration: 0,
    description: 'Günstig und zuverlässig. Wirft Darts auf Ballons.',
    color: '#8B5E3C', accentColor: '#D4A574',
    upgrades: [
      // Path A: Speed & Multi-shot
      [
        { name: 'Schnelle Darts', cost: 140, description: 'Wirft 25% schneller',
          statMods: { cooldownMul: 0.75 } },
        { name: 'Dreifachschuss', cost: 300, description: '+2 Pierce',
          statMods: { pierceAdd: 2 } },
        { name: 'Scharfschütze', cost: 800, description: '+3 Damage & +50 Range',
          statMods: { damageAdd: 3, rangeAdd: 50 } },
      ],
      // Path B: Range & Power
      [
        { name: 'Lange Reichweite', cost: 100, description: '+30 Range',
          statMods: { rangeAdd: 30 } },
        { name: 'Stärkere Darts', cost: 250, description: '+1 Damage',
          statMods: { damageAdd: 1 } },
        { name: 'Turbo-Darts', cost: 600, description: '50% schneller & +2 Pierce',
          statMods: { cooldownMul: 0.5, pierceAdd: 2 } },
      ],
    ],
  },

  tack: {
    id: 'tack', name: 'Tack Shooter', emoji: '📌',
    cost: 280, range: 100, attackCooldown: 1.1,
    damage: 1, pierce: 1, projectileSpeed: 350,
    splashRadius: 0, damageType: 'sharp', freezeDuration: 0,
    description: 'Feuert 8 Tacks in alle Richtungen gleichzeitig.',
    color: '#7f8c8d', accentColor: '#e74c3c',
    upgrades: [
      [
        { name: 'Schnelles Feuer', cost: 200, description: '30% schneller',
          statMods: { cooldownMul: 0.7 } },
        { name: 'Mehr Tacks', cost: 350, description: '+1 Pierce pro Tack',
          statMods: { pierceAdd: 1 } },
        { name: 'Tack Sturm', cost: 900, description: 'Extrem schnell, +1 Damage',
          statMods: { cooldownMul: 0.4, damageAdd: 1 } },
      ],
      [
        { name: 'Längere Range', cost: 120, description: '+30 Range',
          statMods: { rangeAdd: 30 } },
        { name: 'Heißere Tacks', cost: 300, description: '+1 Damage',
          statMods: { damageAdd: 1 } },
        { name: 'Flammenring', cost: 750, description: '+3 Damage & +20 Range',
          statMods: { damageAdd: 3, rangeAdd: 20 } },
      ],
    ],
  },

  bomb: {
    id: 'bomb', name: 'Bomb Shooter', emoji: '💣',
    cost: 525, range: 140, attackCooldown: 1.5,
    damage: 1, pierce: 14, projectileSpeed: 300,
    splashRadius: 40, damageType: 'explosive', freezeDuration: 0,
    description: 'Feuert Bomben die bei Einschlag explodieren (AoE).',
    color: '#2d3436', accentColor: '#e17055',
    upgrades: [
      [
        { name: 'Größere Bomben', cost: 300, description: '+20 Splash Radius',
          statMods: { splashRadiusAdd: 20 } },
        { name: 'Stärkerer Sprengstoff', cost: 500, description: '+2 Damage',
          statMods: { damageAdd: 2 } },
        { name: 'MOAB Mauler', cost: 1200, description: '+8 Damage, schneller',
          statMods: { damageAdd: 8, cooldownMul: 0.7 } },
      ],
      [
        { name: 'Schnelle Zündung', cost: 250, description: '25% schneller',
          statMods: { cooldownMul: 0.75 } },
        { name: 'Weitere Reichweite', cost: 200, description: '+40 Range',
          statMods: { rangeAdd: 40 } },
        { name: 'Cluster-Bomben', cost: 900, description: '+5 Damage & +30 Splash',
          statMods: { damageAdd: 5, splashRadiusAdd: 30 } },
      ],
    ],
  },

  ice: {
    id: 'ice', name: 'Ice Monkey', emoji: '❄️',
    cost: 350, range: 100, attackCooldown: 2.5,
    damage: 0, pierce: 40, projectileSpeed: 0,
    splashRadius: 100, damageType: 'freeze', freezeDuration: 1.5,
    description: 'Friert alle Ballons in Reichweite kurzzeitig ein.',
    color: '#74b9ff', accentColor: '#0984e3',
    upgrades: [
      [
        { name: 'Kälteres Eis', cost: 200, description: 'Freeze dauert länger (+1s effektiv)',
          statMods: { cooldownMul: 0.75 } },
        { name: 'Eisiger Wind', cost: 400, description: '+40 Range',
          statMods: { rangeAdd: 40 } },
        { name: 'Arktischer Frost', cost: 1000, description: 'Damage +2, große Range',
          statMods: { damageAdd: 2, rangeAdd: 30 } },
      ],
      [
        { name: 'Mehr Reichweite', cost: 150, description: '+25 Range',
          statMods: { rangeAdd: 25 } },
        { name: 'Schnapper', cost: 350, description: '40% schneller',
          statMods: { cooldownMul: 0.6 } },
        { name: 'Permafrost', cost: 800, description: '+1 Damage, verlangsamte Ballons',
          statMods: { damageAdd: 1, cooldownMul: 0.5 } },
      ],
    ],
  },

  super: {
    id: 'super', name: 'Super Monkey', emoji: '🦸',
    cost: 2500, range: 170, attackCooldown: 0.06,
    damage: 1, pierce: 1, projectileSpeed: 600,
    splashRadius: 0, damageType: 'energy', freezeDuration: 0,
    description: 'Ultra-schnelle Schussrate. Teuer aber verheerend.',
    color: '#6c5ce7', accentColor: '#a29bfe',
    upgrades: [
      [
        { name: 'Laser Blasts', cost: 2500, description: '+1 Damage & +1 Pierce',
          statMods: { damageAdd: 1, pierceAdd: 1 } },
        { name: 'Plasma Blasts', cost: 4000, description: '+2 Damage & +2 Pierce',
          statMods: { damageAdd: 2, pierceAdd: 2 } },
        { name: 'Sun Avatar', cost: 8000, description: '+5 Damage & +3 Pierce',
          statMods: { damageAdd: 5, pierceAdd: 3 } },
      ],
      [
        { name: 'Weitere Sicht', cost: 1200, description: '+40 Range',
          statMods: { rangeAdd: 40 } },
        { name: 'Epische Range', cost: 2000, description: '+60 Range',
          statMods: { rangeAdd: 60 } },
        { name: 'Dunkler Ritter', cost: 6000, description: '+4 Damage & +4 Pierce',
          statMods: { damageAdd: 4, pierceAdd: 4 } },
      ],
    ],
  },
};

const EXTRA_TOWER_INFO: Array<[TowerTypeId, string, string, string, string]> = [
  ['boomerang', 'Boomerang Guard', '🪃', '#d35400', 'Bumerangs treffen mehrere Ziele.'],
  ['sniper', 'Longshot', '🔭', '#34495e', 'Präzise Schüsse über die ganze Karte.'],
  ['cannon', 'Iron Cannon', '⚙️', '#607d8b', 'Schwere Geschosse mit hoher Durchschlagskraft.'],
  ['sub', 'Tide Sub', '⚓', '#2980b9', 'Unterstützt Türme mit Ortung und Torpedos.'],
  ['buccaneer', 'Wave Corsair', '⛵', '#16a085', 'Schnelle Salven und breite Reichweite.'],
  ['ace', 'Sky Ace', '✈️', '#7f8c8d', 'Kreist über der Karte und feuert rundum.'],
  ['heli', 'Rescue Heli', '🚁', '#27ae60', 'Mobiler Luftschutz mit schneller Salve.'],
  ['mortar', 'Siege Mortar', '🧨', '#7f8c8d', 'Explosiver Flächenschaden.'],
  ['dartling', 'Dartling Gunner', '🔫', '#8e44ad', 'Lenkbare, schnelle Geschosse.'],
  ['wizard', 'Ember Wizard', '🧙', '#9b59b6', 'Magie durchdringt Ballons.'],
  ['ninja', 'Shadow Ninja', '🥷', '#2c3e50', 'Schnelle Angriffe und Tarnung.'],
  ['alchemist', 'Potion Alchemist', '⚗️', '#f39c12', 'Stärkt nahe Türme und ätzt Ballons.'],
  ['druid', 'Storm Druid', '🌿', '#229954', 'Naturmagie und Blitze.'],
  ['farm', 'Coin Grove', '🌳', '#d4ac0d', 'Erzeugt zusätzliches Einkommen.'],
  ['village', 'Command Village', '🏯', '#c0392b', 'Verbessert Türme in der Umgebung.'],
  ['engineer', 'Gear Engineer', '🛠️', '#f1c40f', 'Platziert Fallen und Geschütztürme.'],
  ['beast', 'Beast Handler', '🐾', '#884c21', 'Ruft ein treues Tier zur Hilfe.'],
  ['mermonkey', 'Tide Singer', '🧜', '#1abc9c', 'Kontrolliert die Geschwindigkeit der Ballons.'],
  ['sentinel', 'Sun Sentinel', '🛡️', '#e67e22', 'Schützt den Ausgang mit Licht.'],
  ['chemist', 'Void Chemist', '🧪', '#00b894', 'Säure und Debuffs gegen starke Ziele.'],
  ['ranger', 'Forest Ranger', '🏹', '#2ecc71', 'Langstreckenangriffe mit Dornen.'],
];

function generatedUpgrades(name: string, accent: string): UpgradeDef[][] {
  return [
    [
      { name: `${name} · Schnellfeuer`, cost: 120, description: '25% schneller', statMods: { cooldownMul: 0.75 } },
      { name: `${name} · Mehrkraft`, cost: 280, description: '+1 Schaden und +1 Pierce', statMods: { damageAdd: 1, pierceAdd: 1 } },
      { name: `${name} · Meister`, cost: 750, description: '+3 Schaden und +30 Reichweite', statMods: { damageAdd: 3, rangeAdd: 30 } },
    ],
    [
      { name: `${name} · Fernsicht`, cost: 100, description: '+35 Reichweite', statMods: { rangeAdd: 35 } },
      { name: `${name} · Durchschlag`, cost: 320, description: '+3 Pierce', statMods: { pierceAdd: 3 } },
      { name: `${name} · Elite`, cost: 850, description: '+5 Schaden', statMods: { damageAdd: 5 } },
    ],
    [
      { name: `${name} · Fokus`, cost: 150, description: 'Schneller und genauer', statMods: { cooldownMul: 0.85, projectileSpeedAdd: 80 } },
      { name: `${name} · Resonanz`, cost: 400, description: '+25 Reichweite und +2 Schaden', statMods: { rangeAdd: 25, damageAdd: 2 } },
      { name: `${name} · Apex`, cost: 1100, description: '+6 Schaden und +2 Pierce', statMods: { damageAdd: 6, pierceAdd: 2 } },
    ],
  ];
}

for (const [id, name, emoji, color, description] of EXTRA_TOWER_INFO) {
  TOWER_DATA[id] = {
    id, name, emoji, cost: 250, range: 135, attackCooldown: 0.9,
    damage: 1, pierce: 2, projectileSpeed: 430, splashRadius: 0,
    damageType: 'sharp', freezeDuration: 0, description, color,
    accentColor: accentColorFor(color), upgrades: generatedUpgrades(name, color),
  };
}

for (const config of Object.values(TOWER_DATA)) {
  if (!config.upgrades[2]) config.upgrades[2] = generatedUpgrades(config.name, config.accentColor)[2];
}

function accentColorFor(color: string): string {
  return color === '#2c3e50' ? '#ecf0f1' : '#ffcf58';
}

export const TOWER_IDS: TowerTypeId[] = (Object.keys(TOWER_DATA) as TowerTypeId[]).filter(id => id !== 'super');
export const SELL_REFUND_RATE = 0.7;
