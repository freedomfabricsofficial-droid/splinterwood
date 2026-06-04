// ============================================================================
// ENCHANTING — Tempering logic
// ============================================================================
//
// Tempering raises one gear instance's enchant level by spending Enchanting
// reagents (rare enemy drops). Only INSTANCES can be tempered — that means
// gear that is equipped or locked. Loose drops live compressed in equipStacks
// and have no per-item data, so they can't carry an enchant. To make this
// painless, tempering auto-locks the item, which also guarantees autoEquip
// will never fold it back into a stack and lose the investment.

import type { GameState, ItemInstance } from '../types';
import { temperCost } from '../data/enchanting';
import { findInstanceById } from './playerStats';
import { giveXp } from './engine';

// Every equipped or locked instance, flattened for the Enchanting tab.
export function listTemperable(state: GameState): ItemInstance[] {
  const out: ItemInstance[] = [];
  const map = state.equipInstances ?? {};
  for (const baseId of Object.keys(map)) {
    for (const inst of map[baseId]) out.push(inst);
  }
  return out;
}

// Can the player afford the next temper on this instance?
export function canTemper(state: GameState, instId: string): boolean {
  const inst = findInstanceById(state, instId);
  if (!inst) return false;
  const { reagentId, qty } = temperCost(inst.enchantLevel ?? 0);
  return (state.inv[reagentId] ?? 0) >= qty;
}

// Temper one level. Returns true on success.
export function temperItem(state: GameState, instId: string): boolean {
  const inst = findInstanceById(state, instId);
  if (!inst) return false;
  const level = inst.enchantLevel ?? 0;
  const { reagentId, qty } = temperCost(level);
  if ((state.inv[reagentId] ?? 0) < qty) return false;

  state.inv[reagentId] -= qty;
  if (state.inv[reagentId] <= 0) delete state.inv[reagentId];

  inst.enchantLevel = level + 1;
  inst.locked = true; // protect the investment from sell-all / autoEquip demotion

  // Enchanting XP scales with the level reached so the skill keeps climbing.
  giveXp(state, 'enchanting', 15 * (level + 1));
  return true;
}
