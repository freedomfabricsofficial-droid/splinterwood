// ============================================================================
// GOALS — "what am I working toward right now"
// ============================================================================
//
// Computes the player's most relevant current objectives from live state. Drives
// the always-visible Pursuing tracker, which is both the retention hook (you always
// have a next thing to chase) and onboarding (a new player is never lost). Pure and
// cheap — safe to call every render. Never returns empty.

import type { GameState, SkillId } from '../types';
import { WOODCUTTING_NODES } from '../data/woodcutting';
import { MINING_NODES } from '../data/mining';
import { CARVING_RECIPES } from '../data/carving';
import { SMITHING_RECIPES } from '../data/smithing';
import { COMBAT_POOLS } from '../data/combat';
import { getFloor } from '../data/floors';
import { getQuestGivers } from '../data/quests';
import { activeStepForGiver } from './engine';

export interface Goal {
  id: string;
  label: string;
  cur?: number;
  target?: number;
  progress?: number; // 0..1 when there's a numeric bar
  priority: number;  // higher = shown first
}

const GATHER_CRAFT: { skill: SkillId; nodes: { name: string; level: number }[] }[] = [
  { skill: 'woodcutting', nodes: WOODCUTTING_NODES },
  { skill: 'mining',      nodes: MINING_NODES },
  { skill: 'carving',     nodes: CARVING_RECIPES },
  { skill: 'smithing',    nodes: SMITHING_RECIPES },
];

function skillVisible(state: GameState, skill: SkillId): boolean {
  if (skill === 'mining' || skill === 'smithing') return !!state.questFlags?.visited_greystone;
  return true;
}
function cap(s: string): string { return s[0].toUpperCase() + s.slice(1); }

export function computeGoals(state: GameState): Goal[] {
  const goals: Goal[] = [];

  // 1) Active quests — designer-authored direction, always top.
  for (const npc of getQuestGivers()) {
    if (activeStepForGiver(state, npc)) {
      goals.push({ id: `quest_${npc}`, label: `${npc} has work for you — open the Quest tab`, priority: 100 });
    }
  }

  // 2) Reach Greystone Reach (a big milestone) while still locked.
  if (!getFloor('greystone_reach').isUnlocked(state)) {
    const cur = Math.max(state.skills.woodcutting.level, state.skills.combat.level);
    goals.push({
      id: 'unlock_greystone', label: 'Reach Greystone Reach',
      cur, target: 25, progress: Math.min(1, cur / 25), priority: 85,
    });
  }

  // 3) Nearest gather/craft unlock (only the single closest, to avoid clutter).
  let bestSkill: Goal | null = null;
  for (const g of GATHER_CRAFT) {
    if (!skillVisible(state, g.skill)) continue;
    const lvl = state.skills[g.skill].level;
    const next = g.nodes.find(n => n.level > lvl);
    if (!next) continue;
    const progress = Math.min(1, lvl / next.level);
    if (!bestSkill || progress > (bestSkill.progress ?? 0)) {
      bestSkill = {
        id: `unlock_${g.skill}_${next.level}`,
        label: `Unlock ${next.name} — ${cap(g.skill)} Lv ${next.level}`,
        cur: lvl, target: next.level, progress, priority: 65,
      };
    }
  }
  if (bestSkill) goals.push(bestSkill);

  // 4) Next combat tier.
  const cbLvl = state.skills.combat.level;
  const nextPool = COMBAT_POOLS.find(p => p.unlockLevel > cbLvl);
  if (nextPool) {
    goals.push({
      id: `unlock_pool_${nextPool.id}`,
      label: `Open ${nextPool.label} — Combat Lv ${nextPool.unlockLevel}`,
      cur: cbLvl, target: nextPool.unlockLevel,
      progress: Math.min(1, cbLvl / nextPool.unlockLevel), priority: 63,
    });
  }

  // 5) Unspent perk points waiting to be used.
  const perkPts =
    Object.values(state.skills).reduce((a, s) => a + (s?.perkPoints ?? 0), 0) +
    (state.leadershipPoints ?? 0);
  if (perkPts > 0) {
    goals.push({
      id: 'spend_perks',
      label: `Spend ${perkPts} perk point${perkPts > 1 ? 's' : ''} — Skill Trees`,
      priority: 58,
    });
  }

  // Never empty.
  if (goals.length === 0) {
    goals.push({ id: 'fallback', label: 'Keep at it — new things open up as you level', priority: 1 });
  }

  goals.sort((a, b) => b.priority - a.priority);
  return goals.slice(0, 3);
}
