// ============================================================================
// TRADE SECRETS — the cross-skill synergy web
// ============================================================================
//
// Every trade quietly teaches the others. As a skill levels, it grants a small,
// permanent bonus somewhere ELSE on the character sheet. The bonuses are routed
// only to stats that NEVER cap out (atk/def/hp pools, coin find, rare-drop rate,
// crit damage, all-skill XP), so a high level in any skill keeps paying off
// forever — the same anti-obsolescence promise behind Tempering.
//
// The web forms a loop:
//   • Gatherers (Woodcutting, Mining)  fund and toughen you
//   • Crafters  (Carving, Smithing)    arm and armor you
//   • Combat                           fuels the rare-reagent economy
//   • Floor-3 magic (Alchemy, Enchanting) pays back into XP and crits
//
// IMPLEMENTATION NOTES
// - This adds NO new persistent state. Every bonus is derived live from skill
//   levels, which already persist and reset correctly. No save migration needed.
// - 'pool' synergies (atk/def/hp) multiply the already-aggregated stat at the
//   final pass in computePlayerStats, exactly like the Investments multipliers.
// - 'pct'  synergies (coin_find/drop_rate/crit_dmg) add into the matching bag key.
// - The Alchemy → XP synergy is applied directly in engine.giveXp (XP multipliers
//   are a sanctioned exception to "read the stat bag" — see stats-rules.md).
// - A skill only contributes once it is UNLOCKED, so locked Floor-3 skills don't
//   silently pad the web before the player has met Laileb.

import type { GameState, SkillId, StatKey } from '../types';

// +0.5% per level of the source skill (the "Medium" intensity Shannon picked).
// At level 40 a skill gives +20% to its target; at level 100, +50%.
export const SYNERGY_PER_LEVEL = 0.005;

// How a synergy's value is applied.
//   'pool' — multiplies an aggregated combat-stat pool (atk/def/hp).
//   'pct'  — adds into a percentage stat bag key (coin_find/drop_rate/crit_dmg).
//   'xp'   — all-skill XP multiplier, applied in giveXp (not via the stat bag).
export type SynergyKind = 'pool' | 'pct' | 'xp';

export interface SynergyDef {
  source: SkillId;       // the skill whose level powers this bonus
  name: string;          // the trade-secret's flavorful name
  flavor: string;        // one dry in-world line
  kind: SynergyKind;
  statKey: StatKey | 'xp_gain'; // which stat/pool it feeds
  // Plain-language description of what the number does (core design rule:
  // every number explains itself).
  effectLabel: string;
}

export const SYNERGIES: SynergyDef[] = [
  {
    source: 'woodcutting', name: 'Seasoned Eye', kind: 'pct', statKey: 'coin_find',
    flavor: 'Years among the trees taught you exactly what good timber is worth.',
    effectLabel: 'Coin earned from everything',
  },
  {
    source: 'mining', name: 'Strong Back', kind: 'pool', statKey: 'hp',
    flavor: 'Hauling stone all day builds a back that does not quit.',
    effectLabel: 'Maximum HP',
  },
  {
    source: 'carving', name: 'Honed Edges', kind: 'pool', statKey: 'atk',
    flavor: 'Every blade you shape, you understand a little better.',
    effectLabel: 'Attack power',
  },
  {
    source: 'smithing', name: 'Tempered Plate', kind: 'pool', statKey: 'def',
    flavor: 'You have forged enough armor to know exactly where it fails.',
    effectLabel: 'Defense',
  },
  {
    source: 'combat', name: 'Battle Instinct', kind: 'pct', statKey: 'drop_rate',
    flavor: 'A fighter learns to spot the strange thing on the ground mid-swing.',
    effectLabel: 'Rare reagent & loot find (feeds Alchemy & Enchanting)',
  },
  {
    source: 'alchemy', name: 'In the Blood', kind: 'xp', statKey: 'xp_gain',
    flavor: 'Your tonics linger in the veins, and learning comes a little quicker.',
    effectLabel: 'XP earned from every skill',
  },
  {
    source: 'enchanting', name: 'Resonance', kind: 'pct', statKey: 'crit_dmg',
    flavor: 'The magic you bind into gear hums louder when it bites.',
    effectLabel: 'Critical hit damage',
  },
];

export const SYNERGIES_BY_SOURCE: Record<string, SynergyDef> =
  Object.fromEntries(SYNERGIES.map(s => [s.source, s]));

// A skill only feeds the web once it is unlocked, so the Floor-3 skills don't
// quietly pad bonuses before the player has actually opened them.
export function isSkillUnlocked(state: GameState, skill: SkillId): boolean {
  if (skill === 'mining' || skill === 'smithing') return !!state.questFlags.visited_greystone;
  if (skill === 'alchemy' || skill === 'enchanting') return !!state.questFlags.visited_floor3;
  return true; // woodcutting, carving, combat
}

// The synergy bonus contributed by ONE skill, as a fraction (0.20 = +20%).
// Returns 0 if the skill is still locked.
export function synergyBonus(state: GameState, skill: SkillId): number {
  if (!isSkillUnlocked(state, skill)) return 0;
  const lvl = state.skills[skill]?.level ?? 0;
  return SYNERGY_PER_LEVEL * Math.max(0, lvl);
}

// Sum of all synergy fractions feeding a single stat key (used by the stat
// pipeline for the 'pct' and 'pool' synergies).
export function synergyForStat(state: GameState, statKey: string): number {
  let total = 0;
  for (const def of SYNERGIES) {
    if (def.statKey !== statKey) continue;
    total += synergyBonus(state, def.source);
  }
  return total;
}

// Rich rows for the Trade Secrets UI panel: each unlocked synergy with its
// current computed value, so the player can see the whole web at a glance.
export interface SynergyRow {
  def: SynergyDef;
  level: number;
  value: number;       // fraction, e.g. 0.20
  valueText: string;   // "+20.0%"
}

export function getSynergyRows(state: GameState): SynergyRow[] {
  const rows: SynergyRow[] = [];
  for (const def of SYNERGIES) {
    if (!isSkillUnlocked(state, def.source)) continue;
    const level = state.skills[def.source]?.level ?? 0;
    const value = synergyBonus(state, def.source);
    rows.push({ def, level, value, valueText: `+${(value * 100).toFixed(1)}%` });
  }
  return rows;
}
