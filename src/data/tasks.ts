// ============================================================================
// TASK REGISTRY
// ============================================================================
//
// The single source of truth for every task in the game.
//
// A "task" is any activity in the Gather or Workshop districts. Combat is
// intentionally NOT in this registry — fight tasks are different beasts
// (foes, drops, retaliation) and live in combat.ts.
//
// HOW TO ADD A NEW TASK:
//   1. Define the task data in its appropriate file (woodcutting.ts, etc.)
//   2. Add a TaskRegistryEntry below pointing at it
//   3. Add the matching helper in helpers.ts (the registry will WARN you in
//      dev mode if you forget) — OR set `noHelper: true` if it's intentional
//   4. Done. Tabs, helper UI, and progression all wire themselves up.
//
// The TaskTabRenderer reads from this registry to render every gather and
// workshop tab uniformly. Adding a new task → it appears on its tab automatically.

import type { GameState, TaskKind, SkillId } from '../types';
import { WOODCUTTING_NODES } from './woodcutting';
import { MINING_NODES } from './mining';
import { CARVING_RECIPES } from './carving';
import { SMITHING_RECIPES } from './smithing';
import { ALCHEMY_RECIPES } from './alchemy';

// What kind of "task tab" this task belongs to. Used to group tasks for display.
export type TaskCategory = 'gather' | 'workshop';

export interface TaskRegistryEntry {
  // Identifying data
  kind: TaskKind;              // 'wc' | 'cv' | 'mn' | 'sm'
  taskId: string;              // unique within its kind (e.g. 'oak', 'iron_pick')
  skill: SkillId;              // which skill levels and applies XP

  // UI grouping
  category: TaskCategory;      // which district tab it shows on
  district: 'gather' | 'workshop'; // mirrors category; kept for clarity

  // Display
  buttonLabel: string;         // verb for the "start" button: "Chop", "Mine", "Carve", "Forge"
  swingLabel: string;          // verb for the active swing button: "Chop", "Strike", "Carve", "Strike"

  // Helper expectation: by default every task should have a helper.
  // Set `noHelper: true` only for tasks intentionally excluded from automation.
  noHelper?: boolean;

  // Optional quest/floor gate. If set, the task is hidden from its tab until
  // state.questFlags[requiresFlag] is truthy. Used to keep Floor 3 cloud-gear
  // recipes out of the Carving/Smithing tabs until the player has visited the
  // Cloud Islands (the tabs themselves are always visible, so per-task gating
  // is needed — unlike Alchemy, whose whole skill/tab is hidden).
  requiresFlag?: string;
}

// The full task registry. Adding a task here is what makes it appear in the game.
//
// Note we reference the existing data files for the actual task data (yield,
// time, cost, etc.) — this registry just declares structural facts about each
// task. The two files together (data file + registry entry) define a task.
export const TASK_REGISTRY: TaskRegistryEntry[] = [
  // --- Woodcutting (Splinterwood) ---
  { kind: 'wc', taskId: 'twig',     skill: 'woodcutting', category: 'gather',   district: 'gather',   buttonLabel: 'Chop', swingLabel: 'Chop' },
  { kind: 'wc', taskId: 'oak',      skill: 'woodcutting', category: 'gather',   district: 'gather',   buttonLabel: 'Chop', swingLabel: 'Chop' },
  { kind: 'wc', taskId: 'pine',     skill: 'woodcutting', category: 'gather',   district: 'gather',   buttonLabel: 'Chop', swingLabel: 'Chop' },
  { kind: 'wc', taskId: 'ironbark', skill: 'woodcutting', category: 'gather',   district: 'gather',   buttonLabel: 'Chop', swingLabel: 'Chop' },

  // --- Mining (Greystone Reach) ---
  { kind: 'mn', taskId: 'sandstone', skill: 'mining', category: 'gather', district: 'gather', buttonLabel: 'Mine', swingLabel: 'Strike' },
  { kind: 'mn', taskId: 'greystone', skill: 'mining', category: 'gather', district: 'gather', buttonLabel: 'Mine', swingLabel: 'Strike' },
  { kind: 'mn', taskId: 'bluerock',  skill: 'mining', category: 'gather', district: 'gather', buttonLabel: 'Mine', swingLabel: 'Strike' },
  { kind: 'mn', taskId: 'veinstone', skill: 'mining', category: 'gather', district: 'gather', buttonLabel: 'Mine', swingLabel: 'Strike' },

  // --- Carving (Splinterwood) ---
  { kind: 'cv', taskId: 'club',     skill: 'carving', category: 'workshop', district: 'workshop', buttonLabel: 'Carve', swingLabel: 'Carve' },
  { kind: 'cv', taskId: 'shield',   skill: 'carving', category: 'workshop', district: 'workshop', buttonLabel: 'Carve', swingLabel: 'Carve' },
  { kind: 'cv', taskId: 'sword',    skill: 'carving', category: 'workshop', district: 'workshop', buttonLabel: 'Carve', swingLabel: 'Carve' },
  { kind: 'cv', taskId: 'greatbow', skill: 'carving', category: 'workshop', district: 'workshop', buttonLabel: 'Carve', swingLabel: 'Carve' },
  // Floor 3 cloud-gear (hidden until visited_floor3). noHelper for now — auto-craft helpers TBD.
  { kind: 'cv', taskId: 'woven_gloves', skill: 'carving', category: 'workshop', district: 'workshop', buttonLabel: 'Weave', swingLabel: 'Weave', requiresFlag: 'visited_floor3', noHelper: true },
  { kind: 'cv', taskId: 'drift_charm',  skill: 'carving', category: 'workshop', district: 'workshop', buttonLabel: 'Carve', swingLabel: 'Carve', requiresFlag: 'visited_floor3', noHelper: true },

  // --- Smithing (Greystone Reach) ---
  { kind: 'sm', taskId: 'iron_pick',        skill: 'smithing', category: 'workshop', district: 'workshop', buttonLabel: 'Forge', swingLabel: 'Strike' },
  { kind: 'sm', taskId: 'stone_buckler',    skill: 'smithing', category: 'workshop', district: 'workshop', buttonLabel: 'Forge', swingLabel: 'Strike' },
  { kind: 'sm', taskId: 'greystone_maul',   skill: 'smithing', category: 'workshop', district: 'workshop', buttonLabel: 'Forge', swingLabel: 'Strike' },
  { kind: 'sm', taskId: 'veinforged_blade', skill: 'smithing', category: 'workshop', district: 'workshop', buttonLabel: 'Forge', swingLabel: 'Strike' },
  // Floor 3 cloud-gear (hidden until visited_floor3). noHelper for now — auto-craft helpers TBD.
  { kind: 'sm', taskId: 'cloudiron_helm', skill: 'smithing', category: 'workshop', district: 'workshop', buttonLabel: 'Forge', swingLabel: 'Strike', requiresFlag: 'visited_floor3', noHelper: true },
  { kind: 'sm', taskId: 'sky_cuirass',    skill: 'smithing', category: 'workshop', district: 'workshop', buttonLabel: 'Forge', swingLabel: 'Strike', requiresFlag: 'visited_floor3', noHelper: true },

  // --- Alchemy (The Cloud Islands) ---
  { kind: 'al', taskId: 'swiftroot',      skill: 'alchemy', category: 'workshop', district: 'workshop', buttonLabel: 'Brew', swingLabel: 'Stir' },
  { kind: 'al', taskId: 'ember_tincture', skill: 'alchemy', category: 'workshop', district: 'workshop', buttonLabel: 'Brew', swingLabel: 'Stir' },
  { kind: 'al', taskId: 'veil_extract',   skill: 'alchemy', category: 'workshop', district: 'workshop', buttonLabel: 'Brew', swingLabel: 'Stir' },
];

// ---------- Lookups ----------

// Get all tasks for a given kind (drives a tab's content)
export function tasksForKind(kind: TaskKind): TaskRegistryEntry[] {
  return TASK_REGISTRY.filter(t => t.kind === kind);
}

// Look up a single task entry
export function taskEntry(kind: TaskKind, taskId: string): TaskRegistryEntry | undefined {
  return TASK_REGISTRY.find(t => t.kind === kind && t.taskId === taskId);
}

// Look up the underlying task data (yield, time, cost) from the existing data files.
// Returns the raw def or undefined if the task isn't in its data file.
export function taskData(kind: TaskKind, taskId: string): any {
  if (kind === 'wc') return WOODCUTTING_NODES.find(t => t.id === taskId);
  if (kind === 'cv') return CARVING_RECIPES.find(t => t.id === taskId);
  if (kind === 'mn') return MINING_NODES.find(t => t.id === taskId);
  if (kind === 'sm') return SMITHING_RECIPES.find(t => t.id === taskId);
  if (kind === 'al') return ALCHEMY_RECIPES.find(t => t.id === taskId);
  return undefined;
}

// Tasks that should be visible to the player given current game state.
// Excludes tasks for skills the player hasn't unlocked yet.
export function visibleTasksForKind(state: GameState, kind: TaskKind): TaskRegistryEntry[] {
  // Hide flag-gated tasks until earned (e.g. Floor 3 cloud-gear stays hidden
  // until visited_floor3). Level gating still happens per-task in the card.
  return tasksForKind(kind).filter(t => !t.requiresFlag || !!state.questFlags[t.requiresFlag]);
}

// ---------- Dev-mode integrity check ----------

// Runs once at module load in development. Surfaces problems early:
//   - Tasks in the registry without matching data in their data file
//   - Tasks expected to have a helper but missing one in helpers.ts
//   - Tasks marked noHelper: true but where a helper accidentally exists
//
// We import HELPERS lazily here to avoid circular import issues.
let _checked = false;
export function validateTaskRegistry(helpers: { id: string; kind: TaskKind; taskId: string }[]): string[] {
  if (_checked) return [];
  _checked = true;
  const issues: string[] = [];

  for (const t of TASK_REGISTRY) {
    // Does the underlying task data exist?
    const data = taskData(t.kind, t.taskId);
    if (!data) {
      issues.push(`Task "${t.kind}:${t.taskId}" has a registry entry but no data in its data file.`);
      continue;
    }
    // Helper expectation
    const helper = helpers.find(h => h.kind === t.kind && h.taskId === t.taskId);
    if (!t.noHelper && !helper) {
      issues.push(`Task "${t.kind}:${t.taskId}" expects a helper but none is defined in helpers.ts.`);
    }
    if (t.noHelper && helper) {
      issues.push(`Task "${t.kind}:${t.taskId}" is marked noHelper but a helper exists in helpers.ts.`);
    }
  }

  return issues;
}
