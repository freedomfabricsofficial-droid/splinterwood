import type { GameState, SkillId } from '../types';
import { ITEMS } from '../data/items';
import { Big, stringifyState, parseState } from '../util/bignum';

const SAVE_KEY = 'splinterwood_save';
const CURRENT_VERSION = 15;

export function freshState(): GameState {
  const now = Date.now();
  return {
    version: CURRENT_VERSION,
    coin: Big(0),
    hp: Big(20),
    maxHp: Big(20),
    inv: {},
    skills: {
      woodcutting: { xp: Big(0), level: 1, perkPoints: 0, owned: {} },
      carving:     { xp: Big(0), level: 1, perkPoints: 0, owned: {} },
      combat:      { xp: Big(0), level: 1, perkPoints: 0, owned: {} },
      mining:      { xp: Big(0), level: 1, perkPoints: 0, owned: {} },
      smithing:    { xp: Big(0), level: 1, perkPoints: 0, owned: {} },
    },
    equipped: { weapon: null, shield: null },
    equipInstances: {},
    equipStacks: {},
    equippedInst: {},
    abilityState: {},
    task: null,
    combatTask: null,
    questIndex: 0,
    questClaimed: {},
    questFlags: {},
    helpersHired: {},
    helpersProgress: {},
    satchelLocked: {},
    satchelCollapsed: {},
    idleSince: now,
    shopState: {},
    shopLastReset: now,
    activeBuffs: [],
    lastTick: now,
    lastSave: now,
    journalUnlocked: {},
    dailyLetterLastClaim: 0,
    dailyLetterStreak: 0,
    dailyBread: 0,
    doodlesOwned: {},
    counterPurchases: {},
    permBonuses: {},
    currentFloor: 'splinterwood',
    leadershipPoints: 0,
    leadershipOwned: {},
    combatFirstHitConsumed: false,
    slush: Big(0),
    slushLifetime: Big(0),
    loopCount: 0,
    investmentsOwned: {},
    expensesOwned: {},
  };
}

function migrate(raw: any): GameState {
  let s = raw;
  if (!s.version) s.version = 0;

  // v1 -> v2: helpers/shop/satchel/idle
  if (s.version < 2) {
    s.helpersHired = s.helpersHired ?? {};
    s.helpersProgress = s.helpersProgress ?? {};
    s.satchelLocked = s.satchelLocked ?? {};
    s.satchelCollapsed = s.satchelCollapsed ?? {};
    s.idleSince = s.idleSince ?? Date.now();
    s.shopState = s.shopState ?? {};
    s.shopLastReset = s.shopLastReset ?? Date.now();
    s.version = 2;
  }

  // v2 -> v3: active buffs from consumables
  if (s.version < 3) {
    s.activeBuffs = s.activeBuffs ?? [];
    s.version = 3;
  }

  // v3 -> v4: journal unlocks
  if (s.version < 4) {
    s.journalUnlocked = s.journalUnlocked ?? {};
    s.version = 4;
  }

  // v4 -> v5: daily letter (Maggie), Daily Bread, doodles, counter, perm bonuses
  if (s.version < 5) {
    s.dailyLetterLastClaim = s.dailyLetterLastClaim ?? 0;
    s.dailyLetterStreak    = s.dailyLetterStreak ?? 0;
    s.dailyBread           = s.dailyBread ?? 0;
    s.doodlesOwned         = s.doodlesOwned ?? {};
    s.counterPurchases     = s.counterPurchases ?? {};
    s.permBonuses          = s.permBonuses ?? {};
    s.version = 5;
  }

  // v5 -> v6: floor system + mining/smithing skills
  if (s.version < 6) {
    if (!s.skills.mining)   s.skills.mining   = { xp: 0, level: 1, perkPoints: 0, owned: {} };
    if (!s.skills.smithing) s.skills.smithing = { xp: 0, level: 1, perkPoints: 0, owned: {} };
    s.currentFloor = s.currentFloor ?? 'splinterwood';
    s.version = 6;
  }

  // v6 -> v7: instance-based equipment + 6 slots + stats bag
  if (s.version < 7) {
    s.equipInstances = s.equipInstances ?? {};
    s.equippedInst   = s.equippedInst ?? {};
    s.abilityState   = s.abilityState ?? {};
    // Convert any equipment items sitting in inv as counts into 'adequate'
    // tier instances with no modifier (same stats as before for fairness).
    // Then drop them out of inv since equipment is now instance-based.
    const equipKeys: string[] = [];
    for (const id of Object.keys(s.inv ?? {})) {
      const idef = ITEMS[id];
      if (idef?.equip?.slot) equipKeys.push(id);
    }
    for (const id of equipKeys) {
      const count = s.inv[id] ?? 0;
      if (count <= 0) { delete s.inv[id]; continue; }
      s.equipInstances[id] = s.equipInstances[id] ?? [];
      for (let i = 0; i < count; i++) {
        s.equipInstances[id].push({
          id,
          tier: 'adequate',
          modifier: null,
          instId: 'mig_' + id + '_' + i + '_' + Math.random().toString(36).slice(2, 8),
        });
      }
      delete s.inv[id];
    }
    // Migrate equipped pointers
    if (s.equipped?.weapon) {
      const insts = s.equipInstances[s.equipped.weapon];
      if (insts && insts.length > 0) {
        s.equippedInst.weapon = insts[0].instId;
      }
    }
    if (s.equipped?.shield) {
      const insts = s.equipInstances[s.equipped.shield];
      if (insts && insts.length > 0) {
        s.equippedInst.offhand = insts[0].instId;
      }
    }
    s.version = 7;
  }

  // v7 -> v8: category skill trees (Gathering/Crafting/Combat/Leadership)
  // The old per-skill perks no longer exist with the same IDs. Clear the
  // owned maps and refund all spent perk points by recomputing from scratch.
  // Per user direction: we don't preserve old purchases between major
  // skill-tree redesigns; players are expected to wipe their save if they
  // had old perks purchased. This migration just makes the schema sane.
  if (s.version < 8) {
    for (const k of Object.keys(s.skills ?? {}) as SkillId[]) {
      // wipe old perk ownership — new perk IDs are completely different
      s.skills[k].owned = {};
    }
    s.leadershipPoints = s.leadershipPoints ?? 0;
    s.leadershipOwned = s.leadershipOwned ?? {};
    s.combatFirstHitConsumed = false;
    s.version = 8;
  }

  // v8 -> v9: tier-prereq enforcement (must own previous-tier perk in branch).
  // Existing saves may have illegal purchases (e.g., a Tier 3 perk without
  // Tier 1/2 owned). Cleanest fix per user direction: wipe all category-tree
  // perks AND leadership perks; do NOT refund points. Player starts perk
  // selection from scratch with their current point pools.
  if (s.version < 9) {
    for (const k of Object.keys(s.skills ?? {}) as SkillId[]) {
      s.skills[k].owned = {};
    }
    s.leadershipOwned = {};
    s.version = 9;
  }

  // v9 -> v10: combat moves to its own parallel task slot (state.combatTask).
  // If a save has state.task with kind='cb', migrate it over.
  if (s.version < 10) {
    if (s.task && s.task.kind === 'cb') {
      s.combatTask = s.task;
      s.task = null;
    }
    if (s.combatTask === undefined) s.combatTask = null;
    s.version = 10;
  }

  // Make sure schema is sane regardless of version
  const defaults = freshState();
  s = { ...defaults, ...s };
  s.skills = { ...defaults.skills, ...s.skills };
  for (const k of Object.keys(defaults.skills) as SkillId[]) {
    s.skills[k] = { ...defaults.skills[k], ...s.skills[k] };
    s.skills[k].owned = s.skills[k].owned ?? {};
  }
  s.equipped = { ...defaults.equipped, ...s.equipped };
  s.inv = s.inv ?? {};
  s.questClaimed = s.questClaimed ?? {};
  s.questFlags = s.questFlags ?? {};

  // v10 -> v11: compress equipInstances to equipStacks. Saves with millions
  // of individual rolls collapse to a handful of {count, mods} entries per
  // tier. Equipped and user-locked items stay as full instances.
  if ((s.version ?? 0) < 11) {
    s.equipStacks = s.equipStacks ?? {};
    const equippedSet = new Set<string>();
    const eqInst = s.equippedInst ?? {};
    for (const slot of Object.keys(eqInst)) {
      const instId = eqInst[slot];
      if (instId) equippedSet.add(instId);
    }
    const oldMap = s.equipInstances ?? {};
    let compressed = 0;
    for (const baseId of Object.keys(oldMap)) {
      const survivors: any[] = [];
      for (const inst of oldMap[baseId]) {
        const isEquipped = equippedSet.has(inst.instId);
        const isLocked = !!inst.locked;
        if (isEquipped || isLocked) {
          survivors.push(inst);
          continue;
        }
        // Fold into stack
        s.equipStacks[baseId] = s.equipStacks[baseId] ?? {};
        const tier = inst.tier;
        const tierStack = s.equipStacks[baseId][tier] ?? { count: 0, mods: {} };
        tierStack.count++;
        const modKey = inst.modifier ?? '';
        tierStack.mods[modKey] = (tierStack.mods[modKey] ?? 0) + 1;
        s.equipStacks[baseId][tier] = tierStack;
        compressed++;
      }
      oldMap[baseId] = survivors;
    }
    if (compressed > 0) {
      console.log(`[splinterwood] Migration v10→v11: compressed ${compressed} equipment instances into stacks.`);
    }
  }

  // v11 -> v12: convert coin, hp, maxHp, and skills[*].xp to Decimal
  // (BigLike) so they can scale to NGU-grade magnitudes without JS number
  // precision loss past ~9 quadrillion.
  if ((s.version ?? 0) < 12) {
    if (typeof s.coin === 'number' || typeof s.coin === 'string') {
      s.coin = Big(s.coin);
    }
    if (typeof s.hp === 'number' || typeof s.hp === 'string') {
      s.hp = Big(s.hp);
    }
    if (typeof s.maxHp === 'number' || typeof s.maxHp === 'string') {
      s.maxHp = Big(s.maxHp);
    }
    if (s.skills) {
      for (const sk of Object.keys(s.skills)) {
        const skill = s.skills[sk];
        if (skill && (typeof skill.xp === 'number' || typeof skill.xp === 'string')) {
          skill.xp = Big(skill.xp);
        }
      }
    }
    // foeHp on any active task
    if (s.task && (typeof s.task.foeHp === 'number' || typeof s.task.foeHp === 'string')) {
      s.task.foeHp = Big(s.task.foeHp);
    }
    if (s.combatTask && (typeof s.combatTask.foeHp === 'number' || typeof s.combatTask.foeHp === 'string')) {
      s.combatTask.foeHp = Big(s.combatTask.foeHp);
    }
    console.log('[splinterwood] Migration v11→v12: converted coin/xp/hp to Decimal storage.');
  }

  // v12 -> v13: fix broken v12 saves where coin/xp were serialized as
  // untagged strings instead of Decimal-tagged strings (the v0.81
  // serializer bug). After this migration, the live save will round-trip
  // correctly because the new serializer explicitly tags Decimal fields.
  if ((s.version ?? 0) < 13) {
    // Force coercion of any string/number coin/xp/hp values to Decimal.
    // The parseState reviver in v0.81+ already does this, but old corrupt
    // saves may have escaped that path. This is the belt-and-suspenders
    // pass.
    const toDec = (v: any) => {
      if (v === null || v === undefined) return v;
      if (typeof v === 'string' || typeof v === 'number') return Big(v);
      return v; // already a Decimal
    };
    s.coin = toDec(s.coin);
    s.hp = toDec(s.hp);
    s.maxHp = toDec(s.maxHp);
    if (s.skills) {
      for (const sk of Object.keys(s.skills)) {
        if (s.skills[sk]) s.skills[sk].xp = toDec(s.skills[sk].xp);
      }
    }
    if (s.task) {
      s.task.foeHp = toDec(s.task.foeHp);
      s.task.playerHp = toDec(s.task.playerHp);
    }
    if (s.combatTask) {
      s.combatTask.foeHp = toDec(s.combatTask.foeHp);
      s.combatTask.playerHp = toDec(s.combatTask.playerHp);
    }
    console.log('[splinterwood] Migration v12→v13: fixed Decimal serialization for coin/xp/hp/foeHp.');
  }

  // v13 -> v14: prestige ("Cook the Books") — Slush carryover currency + Investments.
  if ((s.version ?? 0) < 14) {
    s.slush = (s.slush === undefined || s.slush === null) ? Big(0) : Big(s.slush);
    s.slushLifetime = (s.slushLifetime === undefined || s.slushLifetime === null) ? Big(0) : Big(s.slushLifetime);
    s.loopCount = s.loopCount ?? 0;
    s.investmentsOwned = s.investmentsOwned ?? {};
    console.log('[splinterwood] Migration v13→v14: added prestige (Slush + Investments).');
  }

  // v14 -> v15: Expenses (within-run coin sink).
  if ((s.version ?? 0) < 15) {
    s.expensesOwned = s.expensesOwned ?? {};
    console.log('[splinterwood] Migration v14→v15: added Expenses (coin sink).');
  }

  s.version = CURRENT_VERSION;
  return s;
}

export function loadGame(): { state: GameState; offlineSeconds: number } {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return { state: freshState(), offlineSeconds: 0 };
  try {
    // parseState revives Decimal-tagged strings back to Decimal instances.
    // For old saves (pre-v12), coin/hp/xp will come back as plain numbers;
    // the migrate() step below converts them to Decimals.
    const parsed = parseState(raw);
    const state = migrate(parsed);
    const now = Date.now();
    // NGU-style offline progress: no cap. Full elapsed time always counts.
    const elapsed = Math.max(0, (now - state.lastTick) / 1000);
    state.lastTick = now;
    return { state, offlineSeconds: elapsed > 5 ? elapsed : 0 };
  } catch (e) {
    console.error('Save corrupted, starting fresh:', e);
    return { state: freshState(), offlineSeconds: 0 };
  }
}

export function saveGame(state: GameState): void {
  if ((window as any).__splinterwood_wiped) return;
  state.lastSave = Date.now();
  try {
    // stringifyState uses bignumReplacer to convert Decimal instances to
    // tagged strings, so JSON.stringify doesn't drop their precision.
    const serialized = stringifyState(state);
    localStorage.setItem(SAVE_KEY, serialized);
    (window as any).__splinterwood_save_failed = false;
  } catch (e) {
    if (!(window as any).__splinterwood_save_failed) {
      (window as any).__splinterwood_save_failed = true;
      const sizeKb = Math.round(stringifyState(state).length / 1024);
      console.error(`[splinterwood] SAVE FAILED — payload ${sizeKb} KB, localStorage quota likely exceeded.`);
      console.error('Open dev tools, run window.exportSave() to download a copy before reload.');
      console.error(e);
    }
  }
}

// Expose a manual export for emergency rescue when auto-