import { PERK_TREES } from '../data/perks';
import type { GameState, SkillId } from '../types';

export function perkEffect(state: GameState, key: string): number {
  let total = 0;
  for (const skillId of Object.keys(state.skills) as SkillId[]) {
    const tree = PERK_TREES[skillId];
    if (!tree) continue;
    for (const perk of tree) {
      if (state.skills[skillId].owned[perk.id]) {
        const val = perk.effect[key];
        if (typeof val === 'number') total += val;
      }
    }
  }
  return total;
}

export function perkFlag(state: GameState, key: string): boolean {
  for (const skillId of Object.keys(state.skills) as SkillId[]) {
    const tree = PERK_TREES[skillId];
    if (!tree) continue;
    for (const perk of tree) {
      if (state.skills[skillId].owned[perk.id] && perk.effect[key] === true) {
        return true;
      }
    }
  }
  return false;
}
