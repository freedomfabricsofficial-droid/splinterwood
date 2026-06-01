// ============================================================================
// PERK EFFECTS
// ============================================================================
//
// Perks are stored on game state in two places:
//   - state.skills[skillId].owned[perkId] — for category-tree perks bought
//     using that skill's perk points (gathering tree perks are stored on
//     either woodcutting or mining, doesn't matter which; we just need a
//     record of ownership)
//   - state.leadershipOwned[perkId] — for the Leadership ladder
//
// perkEffect() walks ALL_PERKS, checks ownership in either location, and
// totals the values of the requested key.

import { ALL_PERKS } from '../data/perks';
import type { GameState, SkillId } from '../types';

// Returns true if the player owns a given perk, regardless of which storage
// bucket it sits in.
export function ownsPerk(state: GameState, perkId: string): boolean {
  // Leadership perks
  if ((state.leadershipOwned ?? {})[perkId]) return true;
  // Category-tree perks — owned[] is keyed per-skill but every perk has a
  // unique id, so we can scan all skills' owned maps for the id.
  for (const skillId of Object.keys(state.skills) as SkillId[]) {
    if (state.skills[skillId].owned[perkId]) return true;
  }
  return false;
}

export function perkEffect(state: GameState, key: string): number {
  let total = 0;
  for (const perk of ALL_PERKS) {
    if (!ownsPerk(state, perk.id)) continue;
    const val = perk.effect[key];
    if (typeof val === 'number') total += val;
  }
  return total;
}

export function perkFlag(state: GameState, key: string): boolean {
  for (const perk of ALL_PERKS) {
    if (!ownsPerk(state, perk.id)) continue;
    if (perk.effect[key] === true || perk.effect[key] === 1) return true;
  }
  return false;
}
