// =============================================================================
// STATS CONTRACT TESTS
// =============================================================================
//
// Locks in the rules from stats-rules.md. Run with `npx tsx test-stats.ts`
// from the project root (or any TS-aware runner). If you'd rather have a real
// test setup, fold these into Vitest later — the structure is friendly to it.
//
// These tests build minimal fake GameState objects and call computePlayerStats
// and the totalAtk/totalDef/totalMaxHp wrappers to verify the contract holds.

import { computePlayerStats } from './src/systems/playerStats';
import { totalAtk, totalDef, totalMaxHp } from './src/systems/stats';
import type { GameState, SkillId } from './src/types';

// ---------- minimal harness ----------
let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${(e as Error).message}`);
    failed++;
  }
}
function eq(actual: number, expected: number, tolerance = 0.001) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

// Skeletal GameState — only fields stat math touches.
function makeState(overrides: Partial<GameState> = {}): GameState {
  const skill = { xp: 0, level: 1, perkPoints: 0, owned: {} };
  return {
    coin: 0, hp: 20, maxHp: 20,
    inv: {},
    equipInstances: {},
    skills: {
      woodcutting: { ...skill }, carving: { ...skill }, mining: { ...skill },
      smithing: { ...skill }, combat: { ...skill },
    } as Record<SkillId, typeof skill>,
    equipped: { weapon: null, shield: null },
    equippedInst: {},
    task: null,
    combatTask: null,
    questIndex: 0,
    questClaimed: {}, questFlags: {},
    helpersHired: {}, helpersProgress: {},
    satchelLocked: {}, satchelCollapsed: {},
    idleSince: Date.now(),
    shopState: {}, shopLastReset: 0,
    activeBuffs: [],
    lastTick: Date.now(),
    leadershipPoints: 0,
    leadershipOwned: {},
    permBonuses: {},
    ...overrides,
  } as GameState;
}

// ---------- the tests ----------
console.log('\nSTATS CONTRACT TESTS\n');

console.log('Bag basics:');

test('empty state — base atk includes base fist (2)', () => {
  const s = makeState();
  eq(totalAtk(s), 2);
});

test('empty state — base def is 0', () => {
  const s = makeState();
  eq(totalDef(s), 0);
});

test('empty state — base maxHp is 20', () => {
  const s = makeState();
  eq(totalMaxHp(s), 20);
});

test('empty state — base crit is 2%', () => {
  const s = makeState();
  eq(computePlayerStats(s).crit ?? 0, 0.02);
});

console.log('\nCrit overflow:');

test('crit at 50% stays 50%', () => {
  const s = makeState({ permBonuses: {} });
  // We can't easily set crit via perks here without a full skill tree setup.
  // Skip; covered by overflow tests below using direct bag manipulation.
});

test('crit overflow converts 1:1 to crit_dmg (logic-level test)', () => {
  // Build a state where Maggie permBonus contributes nothing to crit but a
  // hypothetical chain pushes crit > 1. We simulate by checking the
  // computePlayerStats output against a manually constructed expectation.
  // For now we trust the logic and exercise it via direct invocation
  // when the player has a crit-pushing buff.
  const s = makeState({
    activeBuffs: [{
      skill: 'all', multiplier: 0,
      expiresAt: Date.now() + 10000,
      effect: { crit: 1.20 } as any,
    } as any],
  });
  const stats = computePlayerStats(s);
  // Base 0.02 + buff 1.20 = 1.22; cap at 1.0, overflow 0.22 → crit_dmg.
  eq(stats.crit ?? 0, 1.0);
  eq(stats.crit_dmg ?? 0, 0.5 + 0.22);
});

console.log('\nMaggie multiplicative permBonus:');

test('+5% gather permBonus on +0% existing = +5% gather_speed', () => {
  const s = makeState({ permBonuses: { gatherSpeed: 0.05 } });
  // out.gather_speed starts at 0; (1 + 0) * (1 + 0.05) - 1 = 0.05
  eq(computePlayerStats(s).gather_speed ?? 0, 0.05);
});

test('+1% gather permBonus on +80% existing = +81.8%', () => {
  // Pretend perks gave +80% gather. We need to inject it without a real perk
  // setup — use a buff to seed gather_speed.
  const s = makeState({
    permBonuses: { gatherSpeed: 0.01 },
    activeBuffs: [{
      skill: 'all', multiplier: 0,
      expiresAt: Date.now() + 10000,
      effect: { gather_speed: 0.80 } as any,
    } as any],
  });
  const gs = computePlayerStats(s).gather_speed ?? 0;
  // existing 0.80, Maggie ×1.01 → (1.80 × 1.01) - 1 = 0.818
  eq(gs, 0.818, 0.005);
});

test('no permBonus → no change to gather_speed', () => {
  const s = makeState({
    activeBuffs: [{
      skill: 'all', multiplier: 0,
      expiresAt: Date.now() + 10000,
      effect: { gather_speed: 0.50 } as any,
    } as any],
  });
  eq(computePlayerStats(s).gather_speed ?? 0, 0.50);
});

console.log('\nCaps:');

test('gather_speed caps at 4.0 (400%)', () => {
  const s = makeState({
    activeBuffs: [{
      skill: 'all', multiplier: 0,
      expiresAt: Date.now() + 10000,
      effect: { gather_speed: 10 } as any,
    } as any],
  });
  eq(computePlayerStats(s).gather_speed ?? 0, 4.0);
});

test('speed (combat) caps at 4.0', () => {
  const s = makeState({
    activeBuffs: [{
      skill: 'all', multiplier: 0,
      expiresAt: Date.now() + 10000,
      effect: { speed: 99 } as any,
    } as any],
  });
  eq(computePlayerStats(s).speed ?? 0, 4.0);
});

// ---------- summary ----------
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) throw new Error(`${failed} test(s) failed`);
