import type { CombatFoe } from '../types';

// Foes are grouped into POOLS. A pool = (floor + tier). When the player
// "selects" a pool, encounters draw a random foe from that pool. All foes
// in a pool share the same drop table and reward tier (eventually).
//
// Pool IDs are stable strings: '<floor>-t<tier>'
//   e.g., 'splinterwood-t1', 'splinterwood-t2', 'greystone-t1'
//
// New pools added by appending to COMBAT_POOLS below and tagging foes with
// the right poolId. Existing saves that reference a foe id by string keep
// working — but selectedPool is the new normalized way to track combat.
export interface CombatPoolDef {
  id: string;             // pool identifier, e.g. 'splinterwood-t1'
  label: string;          // displayed label, e.g. 'The Locals'
  floor: 'splinterwood' | 'greystone_reach' | string;  // matches FloorDef ids
  tier: number;           // 1, 2, 3...
  unlockLevel: number;    // combat level required to fight in this pool
  flavor: string;         // shown when pool is selected
}

// The combat ladder. Each pool is a rung: a difficulty bracket gated by combat
// level. The player climbs as they level (combat damage scales with level — see
// systems/stats.ts combatDamageMult) and gear/perks/Investments let them climb
// faster and survive deeper. This gives the prestige loop a real power ladder.
export const COMBAT_POOLS: CombatPoolDef[] = [
  { id: 'splinterwood-t1', label: 'The Locals',        floor: 'splinterwood',    tier: 1, unlockLevel: 1,
    flavor: 'The town drunks and the wildlife. Neither is happy to see you.' },
  { id: 'splinterwood-t2', label: 'The Troublemakers', floor: 'splinterwood',    tier: 2, unlockLevel: 10,
    flavor: 'The kind of people Maggie warns you about. Not the wildlife. The other kind.' },
  { id: 'splinterwood-t3', label: 'The Feral Quarter', floor: 'splinterwood',    tier: 3, unlockLevel: 20,
    flavor: 'Past the last lamppost, the rules become suggestions at best.' },
  { id: 'greystone-t1',    label: 'The Crossing',      floor: 'greystone_reach', tier: 4, unlockLevel: 32,
    flavor: 'Bridges, tolls, and the things that collect them.' },
  { id: 'greystone-t2',    label: 'Deep Greystone',    floor: 'greystone_reach', tier: 5, unlockLevel: 48,
    flavor: 'Down where the stone remembers being something else.' },
];

// Combat coin/XP are the primary active income engine, and scale further with
// combat level (1.025^lvl coin, 1.02^lvl xp — see engine.ts). The base values
// below climb ~3x per rung so each tier is a real step up in both threat and pay.
//
// poolId groups foes into encounter pools; foes in the same pool share unified
// HP/atk/xp/coin/drops, so variety within a rung is purely visual (name + icon +
// flavor) and "tier" reads as a clean difficulty bracket.
//
// TUNABLE: these base numbers are first-pass and meant to be felt and adjusted.
export const COMBAT_FOES: CombatFoe[] = [
  // Tier 1 — The Locals (Lv 1)
  { id: 'goblin', name: 'Hungover Goblin',     level: 1,  hp: 8,    atk: 2,  xp: 8,    coin: 18,   drops: [{ id: 'meat_scrap', chance: 0.4 }], flavor: 'Reeks of cheap mead and bad decisions.', poolId: 'splinterwood-t1' },
  { id: 'boar',   name: 'Recreational Boar',   level: 1,  hp: 8,    atk: 2,  xp: 8,    coin: 18,   drops: [{ id: 'meat_scrap', chance: 0.4 }], flavor: 'It does this for fun. It is winning.',   poolId: 'splinterwood-t1' },
  { id: 'bandit', name: 'Off-Duty Bandit',     level: 1,  hp: 8,    atk: 2,  xp: 8,    coin: 18,   drops: [{ id: 'meat_scrap', chance: 0.4 }], flavor: 'Insists this is a hobby, not a career.', poolId: 'splinterwood-t1' },

  // Tier 2 — The Troublemakers (Lv 10)
  { id: 'brigand', name: 'Off-Season Brigand', level: 10, hp: 35,   atk: 5,  xp: 24,   coin: 48,   drops: [{ id: 'coin_purse', chance: 0.3 }], flavor: 'Robbing folk, but casually. It is the slow season.', poolId: 'splinterwood-t2' },

  // Tier 3 — The Feral Quarter (Lv 20)
  { id: 'taxman',  name: 'The Tax Collector',  level: 20, hp: 95,   atk: 11, xp: 60,   coin: 120,  drops: [{ id: 'coin_purse', chance: 0.4 }], flavor: 'Wants what is owed. Declines to say by whom.',       poolId: 'splinterwood-t3' },

  // Tier 4 — The Crossing (Lv 32)
  { id: 'troll',   name: 'Bridge Toll Troll',  level: 32, hp: 320,  atk: 22, xp: 380,  coin: 800,  drops: [{ id: 'troll_tooth', chance: 0.3 }], flavor: 'Will accept exact change only.',                    poolId: 'greystone-t1' },

  // Tier 5 — Deep Greystone (Lv 48)
  { id: 'golem',   name: 'Disappointed Golem', level: 48, hp: 1000, atk: 40, xp: 1400, coin: 2400, drops: [{ id: 'troll_tooth', chance: 0.35 }, { id: 'ore_greystone', chance: 0.5 }], flavor: 'It expected more from you. From everyone, really.', poolId: 'greystone-t2' },
];

// Helper: get all foes in a given pool
export function foesInPool(poolId: string): CombatFoe[] {
  return COMBAT_FOES.filter(f => f.poolId === poolId);
}

// Picks a random foe from a given pool. Returns null if pool is empty or
// doesn't exist.
export function pickFoeFromPool(poolId: string): CombatFoe | null {
  const pool = foesInPool(poolId);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
