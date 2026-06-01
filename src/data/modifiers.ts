// Item modifier system. Each piece of equipment rolls a Quality Tier and
// optionally a Modifier prefix. Together they define how much an item's base
// stats are scaled and what extra stats it grants.
//
// Adding a new modifier: append to MODIFIERS. Pick a weight (higher = more
// common). Negative stats are allowed and encouraged — Terraria has
// "Broken/Damaged" prefixes that are pure downside, and players reroll until
// they get something good.

import type { QualityTier, StatBlock } from '../types';

// ---------- Quality tiers ----------

export const QUALITY_TIERS: QualityTier[] = ['regrettable', 'forgettable', 'adequate', 'suspicious', 'unreasonable'];

export const QUALITY_LABEL: Record<QualityTier, string> = {
  regrettable:  'Regrettable',
  forgettable:  'Forgettable',
  adequate:     'Adequate',
  suspicious:   'Suspicious',
  unreasonable: 'Unreasonable',
};

// Multiplier applied to the item's BASE stats (atk, def, hp, etc.)
export const QUALITY_MULT: Record<QualityTier, number> = {
  regrettable:  0.50,
  forgettable:  0.75,
  adequate:     1.00,
  suspicious:   1.25,
  unreasonable: 1.50,
};

// Weight when rolling on a freshly-acquired item (without modifiers).
// Higher = more common.
const TIER_WEIGHTS: Record<QualityTier, number> = {
  regrettable:   5,
  forgettable:  20,
  adequate:     50,
  suspicious:   20,
  unreasonable:  5,
};

// ---------- Modifiers ----------
//
// A modifier is an OPTIONAL prefix that adds stat deltas on top of the tier
// multiplier. Some are purely positive ("Vicious"), some purely negative
// ("Broken"), and some are tradeoffs ("Light" = +speed, -atk).

export interface ModifierDef {
  id: string;
  name: string;
  weight: number;          // rolling weight
  // Stat deltas. Negative values are valid. Percentages stored as fractions
  // (e.g. 0.15 = +15%). Adders (like atk, def, hp) are flat numeric values.
  stats: StatBlock;
}

// ~24 starter modifiers spanning the full spectrum.
// Weights are tuned so that "Plain/None" is most common (~30%), terrible
// modifiers and legendary ones are rare (~2% each), the middle band is
// where most rolls land.
export const MODIFIERS: ModifierDef[] = [
  // --- No modifier (most common) ---
  { id: 'none', name: '', weight: 300, stats: {} },

  // --- Terrible (pure downside, very rare) ---
  { id: 'broken',   name: 'Broken',   weight: 10, stats: { atk: -0.20, def: -0.10 } },
  { id: 'brittle',  name: 'Brittle',  weight: 12, stats: { def: -0.20, hp: -0.10 } },
  { id: 'tarnished',name: 'Tarnished',weight: 12, stats: { atk: -0.10, def: -0.10, hp: -0.10 } },
  { id: 'cursed',   name: 'Cursed',   weight: 4,  stats: { atk: -0.15, def: -0.15, hp: -0.15, speed: -0.10 } },

  // --- Mediocre (mild negatives) ---
  { id: 'worn',     name: 'Worn',     weight: 30, stats: { atk: -0.05, def: -0.05 } },
  { id: 'heavy',    name: 'Heavy',    weight: 22, stats: { def: 0.10, speed: -0.10 } },
  { id: 'light',    name: 'Light',    weight: 22, stats: { speed: 0.10, atk: -0.10 } },
  { id: 'rusty',    name: 'Rusty',    weight: 25, stats: { atk: -0.08, crit: 0.03 } },

  // --- Good (small bonuses) ---
  { id: 'sharp',    name: 'Sharp',    weight: 40, stats: { atk: 0.10 } },
  { id: 'sturdy',   name: 'Sturdy',   weight: 40, stats: { def: 0.10 } },
  { id: 'quick',    name: 'Quick',    weight: 35, stats: { speed: 0.10 } },
  { id: 'lucky',    name: 'Lucky',    weight: 25, stats: { drop_rate: 0.10 } },
  { id: 'sneaky',   name: 'Sneaky',   weight: 30, stats: { crit: 0.05 } },
  { id: 'hardy',    name: 'Hardy',    weight: 30, stats: { hp: 0.10 } },

  // --- Great (notable upside) ---
  { id: 'vicious',  name: 'Vicious',  weight: 14, stats: { atk: 0.15, crit: 0.05 } },
  { id: 'resolute', name: 'Resolute', weight: 14, stats: { def: 0.15, hp: 0.10 } },
  { id: 'hasty',    name: 'Hasty',    weight: 12, stats: { speed: 0.20 } },
  { id: 'cunning',  name: 'Cunning',  weight: 10, stats: { crit: 0.15, crit_dmg: 0.10 } },
  { id: 'foragers', name: "Forager's",weight: 12, stats: { gather_speed: 0.15 } },
  { id: 'avaricious',name: 'Avaricious', weight: 10, stats: { coin_find: 0.15 } },

  // --- Legendary (rare big upside) ---
  { id: 'legendary', name: 'Legendary', weight: 4, stats: { atk: 0.12, def: 0.12, hp: 0.12, crit: 0.05, speed: 0.05 } },
  { id: 'mythic',    name: 'Mythic',    weight: 3, stats: { atk: 0.25, crit: 0.10 } },
  { id: 'unbreaking',name: 'Unbreaking',weight: 3, stats: { def: 0.30, hp: 0.25 } },
  { id: 'devastating',name: 'Devastating', weight: 2, stats: { atk: 0.25, crit: 0.15, crit_dmg: 0.20 } },
];

const MODIFIER_BY_ID: Record<string, ModifierDef> = Object.fromEntries(MODIFIERS.map(m => [m.id, m]));

export function getModifier(id: string | null): ModifierDef | null {
  if (!id) return null;
  return MODIFIER_BY_ID[id] ?? null;
}

// ---------- Rolling ----------

function weightedPick<T extends { weight: number }>(pool: T[]): T {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

// Roll options for crafted items:
//   - tierUpChance: + chance to upgrade one tier on the roll (Careful Cut, Steady Pour)
//   - noRegrettable: never roll regrettable (No Slop)
//   - unreasonableChance: forced chance to roll Unreasonable directly (Master Work)
//   - alwaysTierUp: bumps the rolled tier up one (The Maker's Circle capstone)
//   - modifierRollBoost: chance the modifier "none" outcome is rerolled into a real modifier
export interface RollOptions {
  tierUpChance?: number;
  noRegrettable?: boolean;
  unreasonableChance?: number;
  alwaysTierUp?: boolean;
  modifierRollBoost?: number;
}

export function rollTier(opts: RollOptions = {}): QualityTier {
  // Master Work: small forced chance for Unreasonable
  if (opts.unreasonableChance && Math.random() < opts.unreasonableChance) {
    return 'unreasonable';
  }
  // Filter the weight pool if we're suppressing regrettable
  let pool = QUALITY_TIERS.map(t => ({ tier: t, weight: TIER_WEIGHTS[t] }));
  if (opts.noRegrettable) pool = pool.filter(p => p.tier !== 'regrettable');
  let tier = weightedPick(pool).tier;
  // Tier-up chance bumps the tier one rank (Careful Cut / Steady Pour)
  if (opts.tierUpChance && Math.random() < opts.tierUpChance) {
    tier = bumpTier(tier);
  }
  // The Maker's Circle: ALWAYS bump up one tier
  if (opts.alwaysTierUp) tier = bumpTier(tier);
  return tier;
}

function bumpTier(t: QualityTier): QualityTier {
  const idx = QUALITY_TIERS.indexOf(t);
  if (idx < 0 || idx >= QUALITY_TIERS.length - 1) return t;
  return QUALITY_TIERS[idx + 1];
}

export function rollModifier(opts: RollOptions = {}): string | null {
  let m = weightedPick(MODIFIERS);
  // Modifier Sense: if we rolled "none", reroll with the boost%
  if (m.id === 'none' && opts.modifierRollBoost && Math.random() < opts.modifierRollBoost) {
    const realMods = MODIFIERS.filter(x => x.id !== 'none');
    if (realMods.length > 0) m = weightedPick(realMods);
  }
  return m.id === 'none' ? null : m.id;
}

// Generate a unique instance id
export function newInstId(): string {
  return 'i_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ---------- Display helpers ----------

export function fullItemName(itemBaseName: string, tier: QualityTier, modifierId: string | null): string {
  const mod = getModifier(modifierId);
  const tierLabel = QUALITY_LABEL[tier];
  const parts: string[] = [tierLabel];
  if (mod && mod.name) parts.push(mod.name);
  parts.push(itemBaseName);
  return parts.join(' ');
}
