// Cooldown abilities for combat.
//
// Each ability is a discrete on-click action with a cooldown. Unlike passive
// stats or perks, abilities are explicit decisions the player makes during a
// fight ("this is the big one, use Bloodlust now").
//
// All ability effects are temporary buffs pushed into state.activeBuffs.
// The buff system already exists; abilities just produce buffs with very
// short durations and high magnitudes.

import type { GameState } from '../types';

export interface AbilityDef {
  id: string;
  name: string;
  flavor: string;
  icon: string;                    // tabler icon name
  cooldownMs: number;
  durationMs: number;              // how long the effect lasts (0 = instant)
  unlock: (s: GameState) => boolean;
  unlockHint: string;
  // Applied immediately when ability is triggered. Returns true on success.
  trigger: (s: GameState) => boolean;
  // Short description shown in the UI bar
  description: string;
}

// Helper to push a buff entry that the existing buff system already understands.
// Note: the existing ActiveBuff is XP-multiplier focused; we extend it loosely
// by adding new buff sources. Stat-buff effects are computed by reading
// state.activeBuffs in computePlayerStats — extended in Phase 1b.
function pushStatBuff(s: GameState, source: string, durationMs: number, statDeltas: Record<string, number>): void {
  // We piggyback on the buff array. Each buff carries arbitrary stat deltas
  // via the `effect` field which we'll plumb through computePlayerStats.
  s.activeBuffs.push({
    source,
    skill: 'all',
    multiplier: 0,
    expiresAt: Date.now() + durationMs,
    // @ts-ignore - extending the structure inline; the engine reads these
    effect: statDeltas,
  });
}

export const ABILITIES: AbilityDef[] = [
  {
    id: 'rally',
    name: 'Rally',
    flavor: '"For Splinterwood!" you shout at no one in particular.',
    icon: 'ti-bolt',
    cooldownMs: 3 * 60_000,
    durationMs: 30_000,
    unlock: (s) => s.skills.combat.level >= 10,
    unlockHint: 'Combat Lv 10',
    description: '+30% Attack for 30 seconds.',
    trigger: (s) => {
      pushStatBuff(s, 'ability_rally', 30_000, { atk: 0.30 });
      return true;
    },
  },
  {
    id: 'iron_skin',
    name: 'Iron Skin',
    flavor: 'You inhale and become, for a moment, ridiculous.',
    icon: 'ti-shield',
    cooldownMs: 3 * 60_000,
    durationMs: 30_000,
    unlock: (s) => s.skills.combat.level >= 15,
    unlockHint: 'Combat Lv 15',
    description: '+30% Defense for 30 seconds.',
    trigger: (s) => {
      pushStatBuff(s, 'ability_iron_skin', 30_000, { def: 0.30 });
      return true;
    },
  },
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    flavor: 'You start nodding too much. Nobody asks why.',
    icon: 'ti-flame',
    cooldownMs: 4 * 60_000,
    durationMs: 20_000,
    unlock: (s) => s.skills.combat.level >= 25,
    unlockHint: 'Combat Lv 25',
    description: '+50% Crit for 20 seconds.',
    trigger: (s) => {
      pushStatBuff(s, 'ability_bloodlust', 20_000, { crit: 0.50 });
      return true;
    },
  },
  {
    id: 'second_wind',
    name: 'Second Wind',
    flavor: 'You remember you packed a sandwich. It is gone.',
    icon: 'ti-heart',
    cooldownMs: 5 * 60_000,
    durationMs: 0,
    unlock: (s) => s.skills.combat.level >= 5,
    unlockHint: 'Combat Lv 5',
    description: 'If below 50% HP, heal to 50%.',
    trigger: (s) => {
      if (s.hp >= Math.floor(s.maxHp * 0.5)) return false;
      s.hp = Math.floor(s.maxHp * 0.5);
      if (s.task && s.task.kind === 'cb' && typeof s.task.playerHp === 'number') {
        s.task.playerHp = s.hp;
      }
      return true;
    },
  },
];

export function getAbilityById(id: string): AbilityDef | null {
  return ABILITIES.find(a => a.id === id) ?? null;
}

export function canUseAbility(state: GameState, abilityId: string): { ok: boolean; reason?: string; remainingMs: number } {
  const def = getAbilityById(abilityId);
  if (!def) return { ok: false, reason: 'unknown', remainingMs: 0 };
  if (!def.unlock(state)) return { ok: false, reason: 'locked', remainingMs: 0 };
  const ast = state.abilityState?.[abilityId];
  if (ast) {
    const passed = Date.now() - ast.lastUsedAt;
    if (passed < def.cooldownMs) return { ok: false, reason: 'cooldown', remainingMs: def.cooldownMs - passed };
  }
  return { ok: true, remainingMs: 0 };
}

export function useAbility(state: GameState, abilityId: string): boolean {
  const def = getAbilityById(abilityId);
  if (!def) return false;
  const check = canUseAbility(state, abilityId);
  if (!check.ok) return false;
  const ok = def.trigger(state);
  if (!ok) return false;
  state.abilityState = state.abilityState ?? {};
  state.abilityState[abilityId] = { lastUsedAt: Date.now() };
  return true;
}

export function cooldownRemaining(state: GameState, abilityId: string): number {
  const def = getAbilityById(abilityId);
  if (!def) return 0;
  const ast = state.abilityState?.[abilityId];
  if (!ast) return 0;
  const passed = Date.now() - ast.lastUsedAt;
  return Math.max(0, def.cooldownMs - passed);
}
