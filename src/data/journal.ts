// Journal system: achievements, foe/item/tree discoveries, lore beats.
//
// The journal is a parallel meta-game running alongside skill progression.
// Every gather, kill, craft, level-up, or coin gain potentially unlocks an
// entry. Entries are persisted in state.journalUnlocked.
//
// Add a new entry: append to ACHIEVEMENTS. Discoveries are auto-generated
// from existing item/foe/tree data (no manual entries needed).

import type { GameState } from '../types';
import { ITEMS } from './items';
import { WOODCUTTING_NODES } from './woodcutting';
import { COMBAT_FOES } from './combat';

export type JournalSection = 'tales' | 'bestiary' | 'atlas' | 'catalogue';

export interface AchievementDef {
  id: string;
  section: JournalSection;
  name: string;
  description: string;          // shown after unlock; hidden text appears as "???"
  hint?: string;                // a faint hint shown while locked (optional)
  check: (s: GameState) => boolean;
}

// Hand-authored achievements (the "Tales" section)
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_chop',
    section: 'tales',
    name: 'The First Cut',
    description: 'You held an axe. You raised it. A twig was reduced. A career began.',
    hint: 'Chop something.',
    check: (s) => (s.skills.woodcutting.xp ?? 0) > 0,
  },
  {
    id: 'first_carve',
    section: 'tales',
    name: 'Apprentice Whittler',
    description: 'A shape, recognizable. From wood. By your hand. The Council should be informed.',
    hint: 'Carve your first item.',
    check: (s) => (s.skills.carving.xp ?? 0) > 0,
  },
  {
    id: 'first_kill',
    section: 'tales',
    name: 'A Regrettable Necessity',
    description: 'One fewer foe in the world. The ledger notes this without comment.',
    hint: 'Defeat any foe.',
    check: (s) => (s.skills.combat.xp ?? 0) > 0,
  },
  {
    id: 'rich_1k',
    section: 'tales',
    name: 'A Heavy Purse',
    description: 'A thousand coins. Most of it earned. Some of it found. None of it spent yet.',
    hint: 'Accumulate 1,000 coin.',
    check: (s) => s.coin >= 1000,
  },
  {
    id: 'rich_10k',
    section: 'tales',
    name: 'Disreputably Wealthy',
    description: 'Ten thousand coins. People nod at you in the street. They are afraid.',
    hint: 'Accumulate 10,000 coin.',
    check: (s) => s.coin >= 10000,
  },
  {
    id: 'wc_25',
    section: 'tales',
    name: 'Friend to Trees',
    description: 'Woodcutting level 25. The forest considers you, on balance, a fact of nature.',
    hint: 'Reach Woodcutting Lv 25.',
    check: (s) => s.skills.woodcutting.level >= 25,
  },
  {
    id: 'cv_25',
    section: 'tales',
    name: 'Steady Hands',
    description: 'Carving level 25. Your shavings are uniform. Your dovetails are tight.',
    hint: 'Reach Carving Lv 25.',
    check: (s) => s.skills.carving.level >= 25,
  },
  {
    id: 'cb_25',
    section: 'tales',
    name: 'Capable',
    description: 'Combat level 25. The boar no longer laughs.',
    hint: 'Reach Combat Lv 25.',
    check: (s) => s.skills.combat.level >= 25,
  },
  {
    id: 'master_50',
    section: 'tales',
    name: 'Diversified Portfolio',
    description: 'Three skills, each at level 50. An accountant of unreasonable competence.',
    hint: 'Reach Lv 50 in all three skills.',
    check: (s) => s.skills.woodcutting.level >= 50 && s.skills.carving.level >= 50 && s.skills.combat.level >= 50,
  },
  {
    id: 'died_once',
    section: 'tales',
    name: 'A Lesson, Filed Under "Costly"',
    description: 'Returned to Splinterwood the slow way. The ledger records the day with an exclamation point.',
    hint: 'Die for the first time.',
    check: (s) => !!s.questFlags.died_once,
  },
  {
    id: 'collector',
    section: 'tales',
    name: 'A Discerning Eye',
    description: 'Held one of every known item, at least once. The Catalogue is complete.',
    hint: 'Have every item in the Catalogue at least once.',
    check: (s) => {
      const allItems = Object.keys(ITEMS);
      return allItems.every(id => (s.inv[id] ?? 0) > 0 || !!s.questFlags[`had_${id}`]);
    },
  },
];

// ---------- Discovery entries (auto-generated from data) ----------

export interface DiscoveryEntry {
  id: string;                  // journal-unlocked key
  section: JournalSection;
  name: string;
  description: string;
  category?: string;           // shown to give hint about what kind of thing it is
}

// Bestiary entries — one per foe
export function getBestiaryEntries(): DiscoveryEntry[] {
  return COMBAT_FOES.map((foe) => ({
    id: `foe_${foe.id}`,
    section: 'bestiary' as const,
    name: foe.name,
    description: foe.flavor,
    category: `Lv ${foe.level} foe`,
  }));
}

// Atlas entries — one per tree node
export function getAtlasEntries(): DiscoveryEntry[] {
  return WOODCUTTING_NODES.map((node) => ({
    id: `tree_${node.id}`,
    section: 'atlas' as const,
    name: node.name,
    description: node.flavor,
    category: `Lv ${node.level} tree`,
  }));
}

// Catalogue entries — one per item
export function getCatalogueEntries(): DiscoveryEntry[] {
  return Object.entries(ITEMS).map(([id, def]) => ({
    id: `item_${id}`,
    section: 'catalogue' as const,
    name: def.name,
    description: def.flavor ?? 'No notes recorded.',
    category: def.category,
  }));
}

// ---------- Unlock checking ----------

export type UnlockEvent = { kind: 'achievement' | 'discovery'; entry: { name: string; section: JournalSection } };

// Called by the engine on a tick. Returns any newly unlocked entries
// so the UI can show notifications.
export function checkJournalUnlocks(state: GameState, ctx: {
  // what just happened (so we can unlock discoveries from events)
  foeDefeatedId?: string;
  treeChoppedId?: string;
  itemTouchedId?: string;
}): UnlockEvent[] {
  state.journalUnlocked = state.journalUnlocked ?? {};
  const newlyUnlocked: UnlockEvent[] = [];

  // Achievements
  for (const a of ACHIEVEMENTS) {
    if (state.journalUnlocked[a.id]) continue;
    if (a.check(state)) {
      state.journalUnlocked[a.id] = true;
      newlyUnlocked.push({ kind: 'achievement', entry: { name: a.name, section: a.section } });
    }
  }

  // Bestiary — unlock on first defeat of a foe
  if (ctx.foeDefeatedId) {
    const key = `foe_${ctx.foeDefeatedId}`;
    if (!state.journalUnlocked[key]) {
      state.journalUnlocked[key] = true;
      const def = COMBAT_FOES.find(f => f.id === ctx.foeDefeatedId);
      if (def) newlyUnlocked.push({ kind: 'discovery', entry: { name: def.name, section: 'bestiary' } });
    }
  }
  // Atlas — unlock on first successful chop of a tree
  if (ctx.treeChoppedId) {
    const key = `tree_${ctx.treeChoppedId}`;
    if (!state.journalUnlocked[key]) {
      state.journalUnlocked[key] = true;
      const def = WOODCUTTING_NODES.find(t => t.id === ctx.treeChoppedId);
      if (def) newlyUnlocked.push({ kind: 'discovery', entry: { name: def.name, section: 'atlas' } });
    }
  }
  // Catalogue — unlock on any contact with an item
  if (ctx.itemTouchedId) {
    const key = `item_${ctx.itemTouchedId}`;
    if (!state.journalUnlocked[key]) {
      state.journalUnlocked[key] = true;
      const def = ITEMS[ctx.itemTouchedId];
      if (def) newlyUnlocked.push({ kind: 'discovery', entry: { name: def.name, section: 'catalogue' } });
    }
  }

  return newlyUnlocked;
}

// ---------- Aggregate counts for the journal UI ----------

export function getJournalCounts(state: GameState): Record<JournalSection, { unlocked: number; total: number }> {
  const u = state.journalUnlocked ?? {};
  const tales = {
    unlocked: ACHIEVEMENTS.filter(a => u[a.id]).length,
    total: ACHIEVEMENTS.length,
  };
  const bestiary = {
    unlocked: getBestiaryEntries().filter(e => u[e.id]).length,
    total: getBestiaryEntries().length,
  };
  const atlas = {
    unlocked: getAtlasEntries().filter(e => u[e.id]).length,
    total: getAtlasEntries().length,
  };
  const catalogue = {
    unlocked: getCatalogueEntries().filter(e => u[e.id]).length,
    total: getCatalogueEntries().length,
  };
  return { tales, bestiary, atlas, catalogue };
}
