import type { GameState, SkillId } from '../types';
import { ITEMS } from '../data/items';

const SAVE_KEY = 'splinterwood_save';
const CURRENT_VERSION = 7;

export function freshState(): GameState {
  const now = Date.now();
  return {
    version: CURRENT_VERSION,
    coin: 0,
    hp: 20,
    maxHp: 20,
    inv: {},
    skills: {
      woodcutting: { xp: 0, level: 1, perkPoints: 0, owned: {} },
      carving:     { xp: 0, level: 1, perkPoints: 0, owned: {} },
      combat:      { xp: 0, level: 1, perkPoints: 0, owned: {} },
      mining:      { xp: 0, level: 1, perkPoints: 0, owned: {} },
      smithing:    { xp: 0, level: 1, perkPoints: 0, owned: {} },
    },
    equipped: { weapon: null, shield: null },
    equipInstances: {},
    equippedInst: {},
    abilityState: {},
    task: null,
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
  s.version = CURRENT_VERSION;
  return s;
}

export function loadGame(): { state: GameState; offlineSeconds: number } {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return { state: freshState(), offlineSeconds: 0 };
  try {
    const parsed = JSON.parse(raw);
    const state = migrate(parsed);
    const now = Date.now();
    const elapsed = Math.min((now - state.lastTick) / 1000, 12 * 3600);
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
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function wipeSave(): void {
  // Mark the wipe so the beforeunload save handler skips writing back to localStorage
  // before the page actually reloads.
  (window as any).__splinterwood_wiped = true;
  localStorage.removeItem(SAVE_KEY);
}

export function exportSave(state: GameState): string {
  return btoa(JSON.stringify(state));
}

export function importSave(encoded: string): GameState {
  return migrate(JSON.parse(atob(encoded)));
}
