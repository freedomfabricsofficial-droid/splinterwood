import { WOODCUTTING_NODES } from '../data/woodcutting';
import { CARVING_RECIPES } from '../data/carving';
import { COMBAT_FOES } from '../data/combat';
import { MINING_NODES } from '../data/mining';
import { SMITHING_RECIPES } from '../data/smithing';
import { ITEMS } from '../data/items';
import { PERK_TREES } from '../data/perks';
import { QUEST_STEPS } from '../data/quests';
import { HELPERS } from '../data/helpers';
import { SHOP_ITEMS } from '../data/shop';
import { DEATH_LINES } from '../data/flavor';
import type { GameState, SkillId, TaskKind, CombatFoe, ReturnSummary } from '../types';
import { perkEffect, perkFlag } from './perks';
import { totalAtk, totalDef, totalMaxHp, autoEquip } from './stats';
import { computePlayerStats } from './playerStats';
import { xpForLevel, cumulativeXpToLevel, levelFromTotalXp } from './leveling';

// ---------- Logging (in-memory, capped) ----------
// ---------- Logging (in-memory, capped) ----------
export type LogEntry = { msg: string; cls?: 'gold' | 'green' | 'red'; id: number; count: number };
let _logId = 0;
const logs: LogEntry[] = [];
const toasts: { msg: string; id: number }[] = [];

// ---------- Gameplay event bus ----------
// The engine pushes events here for any subsystem (UI, particles, audio) to read.
export type GameEvent =
  | { type: 'gather_complete'; kind: TaskKind; taskId: string; itemId: string; amount: number }
  | { type: 'craft_complete';  taskId: string; itemId: string }
  | { type: 'foe_hit';          foeId: string; damage: number }
  | { type: 'foe_defeated';     foeId: string; coinGained: number }
  | { type: 'player_hit';       damage: number }
  | { type: 'coin_gained';      amount: number }
  | { type: 'level_up';         skill: SkillId; level: number }
  | { type: 'quest_complete';   stepId: string }
  | { type: 'item_touched';     itemId: string }
  | { type: 'helper_hired';     helperId: string }
  | { type: 'journal_unlock';   kind: 'achievement' | 'discovery'; name: string; section: string };

const _events: GameEvent[] = [];
export function pushEvent(e: GameEvent): void { _events.push(e); }
export function drainEvents(): GameEvent[] {
  const out = _events.slice();
  _events.length = 0;
  return out;
}

export function log(msg: string, cls?: 'gold' | 'green' | 'red'): void {
  // If the most-recent entry has the same message AND class, just bump its count.
  // (logs are ordered newest-first via unshift, so index 0 is the most recent.)
  const head = logs[0];
  if (head && head.msg === msg && head.cls === cls) {
    head.count += 1;
    head.id = ++_logId; // refresh id so React re-renders the row
    return;
  }
  logs.unshift({ msg, cls, id: ++_logId, count: 1 });
  while (logs.length > 50) logs.pop();
}
export function getLogs(): LogEntry[] { return logs; }
export function clearLogs(): void { logs.length = 0; }

export function showToast(msg: string): void {
  toasts.push({ msg, id: ++_logId });
}
export function consumeToast(): { msg: string; id: number } | null {
  return toasts.shift() ?? null;
}

// ---------- Summary capture mode ----------
// When applying offline progress, we route XP/coin/item gains into a summary
// instead of generating dozens of log entries.
let _summary: ReturnSummary | null = null;
function startSummary(): ReturnSummary {
  _summary = {
    elapsedSeconds: 0,
    taskName: null,
    taskCompletions: 0,
    xpGained: {},
    levelsGained: {},
    perkPointsGained: 0,
    coinGained: 0,
    itemsGained: {},
    rareEvents: [],
  };
  return _summary;
}
function endSummary(): ReturnSummary | null {
  const s = _summary;
  _summary = null;
  return s;
}

// ---------- Lookups ----------
export function getTaskDef(kind: TaskKind, id: string) {
  if (kind === 'wc') return WOODCUTTING_NODES.find(t => t.id === id);
  if (kind === 'cv') return CARVING_RECIPES.find(t => t.id === id);
  if (kind === 'cb') return COMBAT_FOES.find(t => t.id === id);
  if (kind === 'mn') return MINING_NODES.find(t => t.id === id);
  if (kind === 'sm') return SMITHING_RECIPES.find(t => t.id === id);
}
export function skillIdForKind(kind: TaskKind): SkillId {
  if (kind === 'wc') return 'woodcutting';
  if (kind === 'cv') return 'carving';
  if (kind === 'cb') return 'combat';
  if (kind === 'mn') return 'mining';
  if (kind === 'sm') return 'smithing';
  return 'combat';
}
export function getTaskTime(state: GameState, kind: TaskKind, def: any): number {
  const wcPerm = state.permBonuses?.wcSpeed ?? 0;
  const cvPerm = state.permBonuses?.cvSpeed ?? 0;
  const mnPerm = state.permBonuses?.mnSpeed ?? 0;
  const smPerm = state.permBonuses?.smSpeed ?? 0;
  if (kind === 'wc') return def.time / (1 + perkEffect(state, 'wc_speed') + wcPerm);
  if (kind === 'cv') return def.time / (1 + perkEffect(state, 'cv_speed') + cvPerm);
  if (kind === 'mn') return def.time / (1 + perkEffect(state, 'mn_speed') + mnPerm);
  if (kind === 'sm') return def.time / (1 + perkEffect(state, 'sm_speed') + smPerm);
  return def.time || 1;
}
export function canAfford(state: GameState, cost: Record<string, number>): boolean {
  for (const k in cost) if ((state.inv[k] ?? 0) < cost[k]) return false;
  return true;
}

// ---------- Gain helpers ----------
export function addItem(state: GameState, id: string, n: number): void {
  const def = ITEMS[id];
  // Equipment gets routed through autoEquip which creates a fresh rolled
  // instance per item. We do NOT also bump inv counts for equipment — the
  // satchel's equipment section reads from equipInstances instead.
  if (def?.equip?.slot) {
    for (let i = 0; i < n; i++) autoEquip(state, id);
    if (_summary) _summary.itemsGained[id] = (_summary.itemsGained[id] ?? 0) + n;
    if (!_summary) pushEvent({ type: 'item_touched', itemId: id });
    return;
  }
  state.inv[id] = (state.inv[id] ?? 0) + n;
  if (_summary) _summary.itemsGained[id] = (_summary.itemsGained[id] ?? 0) + n;
  if (!_summary) pushEvent({ type: 'item_touched', itemId: id });
}
export function addCoin(state: GameState, n: number): void {
  state.coin += n;
  if (_summary) _summary.coinGained += n;
  // First-time hire hint: once the player crosses 1000c, Maggie hollers from town.
  // Fires only once (gated by flag). Skipped during offline-progress summary.
  if (!_summary && !state.questFlags.maggie_hint_first_hire && state.coin >= 1000) {
    state.questFlags.maggie_hint_first_hire = true;
    showToast("Maggie hollers from across town: 'GET YOURSELF A WORKER, you LITERAL.'");
  }
}
export function addPerkPoint(state: GameState, skill: SkillId, n: number): void {
  state.skills[skill].perkPoints += n;
  if (_summary) _summary.perkPointsGained += n;
  if (!_summary) showToast(`+${n} ${skill} perk point${n > 1 ? 's' : ''}!`);
}

export function giveXp(state: GameState, skillId: SkillId, amount: number): void {
  const xpKeyMap: Record<SkillId, string> = {
    woodcutting: 'wc_xp',
    carving: 'cv_xp',
    combat: 'cb_xp',
    mining: 'mn_xp',
    smithing: 'sm_xp',
  };
  const xpKey = xpKeyMap[skillId];
  let mult = 1 + perkEffect(state, xpKey);
  // Apply any active xp-boost buffs
  const now = Date.now();
  for (const buff of state.activeBuffs) {
    if (buff.expiresAt < now) continue;
    if (buff.skill === 'all' || buff.skill === skillId) {
      mult += buff.multiplier;
    }
  }
  const final = amount * mult;
  const s = state.skills[skillId];
  s.xp += final;
  if (_summary) _summary.xpGained[skillId] = (_summary.xpGained[skillId] ?? 0) + final;
  const newLevel = levelFromTotalXp(s.xp);
  while (s.level < newLevel) {
    s.level++;
    if (_summary) _summary.levelsGained[skillId] = (_summary.levelsGained[skillId] ?? 0) + 1;
    else {
      log(`${capitalize(skillId)} reached level ${s.level}!`, 'green');
      pushEvent({ type: 'level_up', skill: skillId, level: s.level });
    }
    if (s.level % 5 === 0) {
      s.perkPoints++;
      if (_summary) _summary.perkPointsGained++;
      else log(`+1 ${skillId} perk point.`, 'gold');
    }
  }
}

function capitalize(s: string) { return s[0].toUpperCase() + s.slice(1); }

// ---------- Task management ----------
export function startTask(state: GameState, kind: TaskKind, id: string): void {
  const def = getTaskDef(kind, id);
  if (!def) return;
  if ('level' in def && state.skills[skillIdForKind(kind)].level < def.level) {
    showToast(`Requires level ${def.level}.`);
    return;
  }
  if (kind === 'cv' && !canAfford(state, (def as any).cost)) {
    showToast('Not enough materials.');
    return;
  }
  if (kind === 'cb' && state.hp <= 0) {
    state.hp = totalMaxHp(state);
  }
  state.task = {
    kind, id,
    progress: 0,
    totalTime: getTaskTime(state, kind, def),
    foeHp: kind === 'cb' ? (def as CombatFoe).hp : null,
    playerHp: kind === 'cb' ? state.hp : undefined,
  };
  state.idleSince = 0; // mark as active
  if (!_summary) log(`Started: ${def.name}`);
  if (_summary) _summary.taskName = def.name;
}

export function stopTask(state: GameState): void {
  state.task = null;
  state.idleSince = Date.now();
}

// ---------- Active mode swing ----------
// Returns true if the swing landed, false if it was on cooldown / no task.
// Cooldown is enforced here so the UI can stay simple.
export const SWING_COOLDOWN_MS = 600;

export function canSwing(state: GameState): boolean {
  if (!state.task) return false;
  const last = state.lastSwingAt ?? 0;
  return Date.now() - last >= SWING_COOLDOWN_MS;
}

export function swingCooldownRemaining(state: GameState): number {
  const last = state.lastSwingAt ?? 0;
  return Math.max(0, SWING_COOLDOWN_MS - (Date.now() - last));
}

export function doSwing(state: GameState): boolean {
  if (!state.task) return false;
  if (!canSwing(state)) return false;
  const t = state.task;
  state.lastSwingAt = Date.now();

  if (t.kind === 'wc' || t.kind === 'cv' || t.kind === 'mn' || t.kind === 'sm') {
    // Advance progress by 30% of total time (capped so it doesn't lap)
    const bonus = t.totalTime * 0.30;
    t.progress = Math.min(t.totalTime, t.progress + bonus);
    return true;
  } else if (t.kind === 'cb') {
    // Active combat: deal one extra hit immediately, no foe retaliation
    const def = getTaskDef(t.kind, t.id) as CombatFoe | null;
    if (!def) return false;
    const dmg = Math.max(1, totalAtk(state));
    t.foeHp! -= dmg;
    pushEvent({ type: 'foe_hit', foeId: def.id, damage: dmg });
    if (t.foeHp! <= 0) {
      const coinGain = Math.floor(def.coin * (1 + perkEffect(state, 'cb_coin')));
      addCoin(state, coinGain);
      giveXp(state, 'combat', def.xp);
      const dropMult = 1 + perkEffect(state, 'cb_drops');
      for (const drop of def.drops ?? []) {
        if (Math.random() < drop.chance * dropMult) {
          addItem(state, drop.id, 1);
          log(`Looted ${ITEMS[drop.id].name}.`, 'gold');
        }
      }
      log(`Defeated ${def.name}! +${coinGain} coin, +${def.xp} combat XP.`, 'green');
      pushEvent({ type: 'foe_defeated', foeId: def.id, coinGained: coinGain });
      if (def.id === 'boar')  state.questFlags.boarSlain  = true;
      if (def.id === 'troll') state.questFlags.trollSlain = true;
      t.foeHp = def.hp;
    }
    return true;
  }
  return false;
}

export function tickTask(state: GameState, dt: number): void {
  // Always tick helpers regardless of whether player has a task
  tickHelpers(state, dt);

  if (!state.task) return;
  const t = state.task;
  const def = getTaskDef(t.kind, t.id);
  if (!def) { state.task = null; state.idleSince = Date.now(); return; }

  if (t.kind === 'wc' || t.kind === 'cv' || t.kind === 'mn' || t.kind === 'sm') {
    t.progress += dt;
    while (t.progress >= t.totalTime) {
      t.progress -= t.totalTime;
      completeGather(state, t.kind, def);
      if (!state.task) return;
      if (_summary) _summary.taskCompletions++;
    }
  } else if (t.kind === 'cb') {
    const stats = computePlayerStats(state);
    const ROUND = 1.5 / (1 + (stats.speed ?? 0));
    t.progress += dt;
    while (t.progress >= ROUND) {
      t.progress -= ROUND;
      combatRound(state, def as CombatFoe);
      if (!state.task) return;
    }
  }
}

function completeGather(state: GameState, kind: TaskKind, def: any): void {
  if (kind === 'wc') {
    let amount = 1;
    if (!perkFlag(state, 'wc_double_disable') && Math.random() < perkEffect(state, 'wc_double')) {
      amount++;
    }
    addItem(state, def.yield, amount);
    if (Math.random() < perkEffect(state, 'wc_rare')) {
      const idx = WOODCUTTING_NODES.findIndex(t => t.id === def.id);
      const upgrade = WOODCUTTING_NODES[idx + 1];
      if (upgrade) {
        addItem(state, upgrade.yield, 1);
        if (_summary) _summary.rareEvents.push(`Found a rare ${ITEMS[upgrade.yield].name}`);
        else log(`A rare ${ITEMS[upgrade.yield].name} fell from the canopy!`, 'gold');
      }
    }
    giveXp(state, 'woodcutting', def.xp);
    if (!_summary) pushEvent({ type: 'gather_complete', kind: 'wc', taskId: def.id, itemId: def.yield, amount });
  } else if (kind === 'cv') {
    if (!canAfford(state, def.cost)) {
      if (!_summary) showToast('Out of materials.');
      state.task = null;
      state.idleSince = Date.now();
      return;
    }
    if (Math.random() >= perkEffect(state, 'cv_save')) {
      for (const k in def.cost) state.inv[k] -= def.cost[k];
    }
    addItem(state, def.produces, 1);
    giveXp(state, 'carving', def.xp);
    if (!_summary) {
      log(`Carved a ${ITEMS[def.produces].name}.`, 'green');
      pushEvent({ type: 'craft_complete', taskId: def.id, itemId: def.produces });
    }
  } else if (kind === 'mn') {
    let amount = 1;
    addItem(state, def.yield, amount);
    giveXp(state, 'mining', def.xp);
    if (!_summary) pushEvent({ type: 'gather_complete', kind: 'mn', taskId: def.id, itemId: def.yield, amount });
  } else if (kind === 'sm') {
    if (!canAfford(state, def.cost)) {
      if (!_summary) showToast('Out of materials.');
      state.task = null;
      state.idleSince = Date.now();
      return;
    }
    for (const k in def.cost) state.inv[k] -= def.cost[k];
    addItem(state, def.produces, 1);
    giveXp(state, 'smithing', def.xp);
    if (!_summary) {
      log(`Forged a ${ITEMS[def.produces].name}.`, 'green');
      pushEvent({ type: 'craft_complete', taskId: def.id, itemId: def.produces });
    }
  }
}

function combatRound(state: GameState, foe: CombatFoe): void {
  const t = state.task!;
  const stats = computePlayerStats(state);
  let dmg = Math.max(1, totalAtk(state));
  // Crit roll
  const critChance = stats.crit ?? 0;
  const critDmgBonus = stats.crit_dmg ?? 0.5;
  let didCrit = false;
  if (Math.random() < critChance) {
    dmg = Math.floor(dmg * (1 + critDmgBonus));
    didCrit = true;
  }
  t.foeHp! -= dmg;
  if (!_summary) pushEvent({ type: 'foe_hit', foeId: foe.id, damage: dmg });
  if (didCrit && !_summary) {
    // A modest gold-tinted log line; we'll wire a particle effect in 1b.
    log(`Critical hit! ${dmg} damage.`, 'gold');
  }
  if (t.foeHp! <= 0) {
    const coinMult = 1 + perkEffect(state, 'cb_coin') + (stats.coin_find ?? 0);
    const coinGain = Math.floor(foe.coin * coinMult);
    addCoin(state, coinGain);
    giveXp(state, 'combat', foe.xp);
    const dropMult = 1 + perkEffect(state, 'cb_drops') + (stats.drop_rate ?? 0);
    for (const drop of foe.drops ?? []) {
      if (Math.random() < drop.chance * dropMult) {
        addItem(state, drop.id, 1);
        if (!_summary) log(`Looted ${ITEMS[drop.id].name}.`, 'gold');
      }
    }
    if (!_summary) {
      log(`Defeated ${foe.name}! +${coinGain} coin, +${foe.xp} combat XP.`, 'green');
      pushEvent({ type: 'foe_defeated', foeId: foe.id, coinGained: coinGain });
    }
    if (_summary) _summary.taskCompletions++;
    if (foe.id === 'boar')  state.questFlags.boarSlain  = true;
    if (foe.id === 'troll') state.questFlags.trollSlain = true;
    t.foeHp = foe.hp;
    return;
  }
  // foe swings
  const foeDmg = Math.max(1, foe.atk - totalDef(state));
  t.playerHp! -= foeDmg;
  state.hp = t.playerHp!;
  if (!_summary) pushEvent({ type: 'player_hit', damage: foeDmg });
  if (state.hp <= 0) {
    applyDeathPenalty(state, foe);
    state.task = null;
    state.idleSince = Date.now();
  }
}

// Death: lose 10% coin (capped 500), foe heals to full, message dispatched via toast/log
// AND surfaced as a special death event for the UI to show as an inline popup.
let _pendingDeath: { coinLost: number; foeName: string; line: string } | null = null;
export function consumeDeath(): { coinLost: number; foeName: string; line: string } | null {
  const d = _pendingDeath;
  _pendingDeath = null;
  return d;
}

function applyDeathPenalty(state: GameState, foe: CombatFoe): void {
  const loss = Math.min(500, Math.floor(state.coin * 0.10));
  state.coin = Math.max(0, state.coin - loss);
  state.hp = totalMaxHp(state);
  state.questFlags.died_once = true;
  const line = DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)];
  _pendingDeath = { coinLost: loss, foeName: foe.name, line };
  log(`You were defeated by ${foe.name}. (-${loss} coin)`, 'red');
}

// ---------- Helpers (hireable NPCs that auto-do tasks) ----------
function tickHelpers(state: GameState, dt: number): void {
  for (const helper of HELPERS) {
    if (!state.helpersHired[helper.id]) continue;
    const def = getTaskDef(helper.kind, helper.taskId);
    if (!def) continue;
    if (helper.kind !== 'wc' && helper.kind !== 'cv') continue; // helpers don't fight
    const baseTime = getTaskTime(state, helper.kind, def);
    const helperTime = baseTime / helper.speedMultiplier;
    state.helpersProgress[helper.id] = (state.helpersProgress[helper.id] ?? 0) + dt;
    while (state.helpersProgress[helper.id] >= helperTime) {
      state.helpersProgress[helper.id] -= helperTime;
      runHelperCompletion(state, helper.kind, helper.speedMultiplier, def);
    }
  }
}

function runHelperCompletion(state: GameState, kind: TaskKind, speedMult: number, def: any): void {
  if (kind === 'wc') {
    addItem(state, def.yield, 1);
    giveXp(state, 'woodcutting', def.xp * speedMult);
  } else if (kind === 'cv') {
    if (!canAfford(state, def.cost)) return; // helper waits silently if out of mats
    for (const k in def.cost) state.inv[k] -= def.cost[k];
    addItem(state, def.produces, 1);
    giveXp(state, 'carving', def.xp * speedMult);
  } else if (kind === 'mn') {
    addItem(state, def.yield, 1);
    giveXp(state, 'mining', def.xp * speedMult);
  } else if (kind === 'sm') {
    if (!canAfford(state, def.cost)) return;
    for (const k in def.cost) state.inv[k] -= def.cost[k];
    addItem(state, def.produces, 1);
    giveXp(state, 'smithing', def.xp * speedMult);
  }
}

export function hireHelper(state: GameState, helperId: string): boolean {
  const helper = HELPERS.find(h => h.id === helperId);
  if (!helper || state.helpersHired[helperId]) return false;
  if (state.coin < helper.hireCost) return false;
  if (helper.requiredSkill && helper.requiredLevel
      && state.skills[helper.requiredSkill].level < helper.requiredLevel) {
    showToast(`Requires ${helper.requiredSkill} Lv ${helper.requiredLevel}.`);
    return false;
  }
  state.coin -= helper.hireCost;
  state.helpersHired[helperId] = true;
  state.helpersProgress[helperId] = 0;
  log(`Hired ${helper.name}.`, 'gold');
  pushEvent({ type: 'helper_hired', helperId });
  return true;
}

// ---------- Quest ----------
// New model: each giver has their own chain. Within a giver's chain, steps
// are completed in order. `visible` (in data) controls UI spoiler-gating.
export function checkQuest(state: GameState): void {
  // For each NPC, find the first unclaimed step in their chain and check it.
  const seen = new Set<string>();
  for (const step of QUEST_STEPS) {
    if (seen.has(step.npc)) continue;
    // Find this NPC's first unclaimed step
    const npcSteps = QUEST_STEPS.filter(q => q.npc === step.npc);
    const firstUnclaimed = npcSteps.find(q => !state.questClaimed[q.id]);
    if (!firstUnclaimed) { seen.add(step.npc); continue; }
    // Track "had ever" item flags so visibility predicates can use them
    for (const itemId of Object.keys(state.inv)) {
      if (state.inv[itemId] > 0) state.questFlags[`had_${itemId}`] = true;
    }
    if (firstUnclaimed.check(state)) {
      state.questClaimed[firstUnclaimed.id] = true;
      firstUnclaimed.claim(state, {
        addCoin: (n) => addCoin(state, n),
        addPerkPoint: (s, n) => addPerkPoint(state, s, n),
        showToast,
      });
      log(`Quest complete!`, 'gold');
      // Bump legacy questIndex too so any old code referring to it stays sane
      state.questIndex = Math.min(QUEST_STEPS.length, state.questIndex + 1);
    }
    seen.add(step.npc);
  }
}

// UI helper: which step is currently active for a given giver?
// Returns null if the giver has no active step (all done, or none visible yet).
export function activeStepForGiver(state: GameState, npc: string): typeof QUEST_STEPS[0] | null {
  const steps = QUEST_STEPS.filter(q => q.npc === npc);
  for (const s of steps) {
    if (state.questClaimed[s.id]) continue;
    if (!s.visible(state)) return null; // gated - the chain is paused here
    return s;
  }
  return null;
}

// All "had_X" item flags are recorded here so visibility can use "has ever had"
export function recordItemMilestones(state: GameState): void {
  for (const itemId of Object.keys(state.inv)) {
    if (state.inv[itemId] > 0) state.questFlags[`had_${itemId}`] = true;
  }
}

// ---------- Perks ----------
export function buyPerk(state: GameState, skillId: SkillId, perkId: string): void {
  const s = state.skills[skillId];
  const perk = PERK_TREES[skillId].find(p => p.id === perkId);
  if (!perk || s.owned[perkId] || s.perkPoints < perk.cost) return;
  if (perk.requires && !s.owned[perk.requires]) return;
  if (perk.exclusive) {
    const conflicting = PERK_TREES[skillId].some(p =>
      p.exclusive === perk.exclusive && p.id !== perk.id && s.owned[p.id]
    );
    if (conflicting) return;
  }
  s.perkPoints -= perk.cost;
  s.owned[perkId] = true;
  log(`Acquired perk: ${perk.name}.`, 'gold');
}

// ---------- Selling ----------
export function sellItem(state: GameState, id: string): void {
  const n = state.inv[id] ?? 0;
  if (!n) return;
  if (state.satchelLocked[id]) {
    showToast('That item is locked.');
    return;
  }
  const def = ITEMS[id];
  if (def.category === 'quest') {
    showToast("That's a quest item. Won't sell.");
    return;
  }
  if (state.equipped.weapon === id) state.equipped.weapon = null;
  if (state.equipped.shield === id) state.equipped.shield = null;
  const bonus = state.permBonuses?.sellBonus ?? 0;
  const total = Math.floor(def.sell * n * (1 + bonus));
  addCoin(state, total);
  state.inv[id] = 0;
  log(`Sold ${n}× ${def.name} for ${total} coin.`, 'gold');
}

export function sellCategory(state: GameState, category: string): void {
  let total = 0;
  let count = 0;
  const bonus = state.permBonuses?.sellBonus ?? 0;
  for (const id of Object.keys(state.inv)) {
    if (!state.inv[id]) continue;
    const def = ITEMS[id];
    if (def.category !== category) continue;
    if (def.category === 'quest') continue;
    if (state.satchelLocked[id]) continue;
    if (state.equipped.weapon === id || state.equipped.shield === id) continue;
    total += Math.floor(def.sell * state.inv[id] * (1 + bonus));
    count += state.inv[id];
    state.inv[id] = 0;
  }
  if (count > 0) {
    addCoin(state, total);
    log(`Sold ${count} items for ${total} coin.`, 'gold');
  }
}

export function toggleItemLock(state: GameState, id: string): void {
  state.satchelLocked[id] = !state.satchelLocked[id];
}

// ---------- Shop ----------
export function getShopStock(state: GameState, shopItemId: string): number {
  const item = SHOP_ITEMS.find(s => s.id === shopItemId);
  if (!item) return 0;
  if (item.stockType === 'unlimited') return Infinity;
  return state.shopState[shopItemId] ?? item.dailyStock ?? 0;
}

export function buyFromShop(state: GameState, shopItemId: string): boolean {
  const item = SHOP_ITEMS.find(s => s.id === shopItemId);
  if (!item) return false;
  if (state.coin < item.cost) return false;
  if (item.stockType === 'daily') {
    const stock = state.shopState[shopItemId] ?? item.dailyStock ?? 0;
    if (stock <= 0) return false;
    state.shopState[shopItemId] = stock - 1;
  }
  state.coin -= item.cost;
  addItem(state, item.id, 1);
  log(`Bought ${ITEMS[item.id].name}.`, 'gold');
  return true;
}

// ---------- Consumables ----------
export function consumeItem(state: GameState, itemId: string): boolean {
  const def = ITEMS[itemId];
  if (!def?.consume) {
    showToast('That item cannot be consumed.');
    return false;
  }
  if ((state.inv[itemId] ?? 0) <= 0) return false;

  state.inv[itemId] -= 1;
  const effect = def.consume;

  // Apply effects
  if (effect.heal !== undefined) {
    const before = state.hp;
    state.hp = Math.min(totalMaxHp(state), state.hp + effect.heal);
    log(`Used ${def.name}. +${Math.floor(state.hp - before)} HP.`, 'green');
    if (state.task?.kind === 'cb') (state.task as any).playerHp = state.hp;
  }
  if (effect.healPercent !== undefined) {
    const max = totalMaxHp(state);
    const before = state.hp;
    state.hp = Math.min(max, state.hp + Math.floor(max * (effect.healPercent / 100)));
    log(`Used ${def.name}. +${Math.floor(state.hp - before)} HP.`, 'green');
    if (state.task?.kind === 'cb') (state.task as any).playerHp = state.hp;
  }
  if (effect.coinBonus !== undefined) {
    addCoin(state, effect.coinBonus);
    log(`Used ${def.name}. +${effect.coinBonus} coin.`, 'gold');
  }
  if (effect.instantXp) {
    const skills: SkillId[] = effect.instantXp.skill === 'all'
      ? ['woodcutting', 'carving', 'combat']
      : [effect.instantXp.skill];
    for (const sk of skills) giveXp(state, sk, effect.instantXp.amount);
    log(`Used ${def.name}. +${effect.instantXp.amount} XP.`, 'green');
  }
  if (effect.xpBoost) {
    const now = Date.now();
    state.activeBuffs.push({
      source: itemId,
      skill: effect.xpBoost.skill,
      multiplier: effect.xpBoost.amount,
      expiresAt: now + effect.xpBoost.durationSec * 1000,
    });
    log(`Used ${def.name}. ${effect.description}`, 'gold');
  }

  return true;
}

export function pruneExpiredBuffs(state: GameState): void {
  const now = Date.now();
  state.activeBuffs = state.activeBuffs.filter(b => b.expiresAt > now);
}

export function maybeResetDailyShop(state: GameState): void {
  const now = Date.now();
  const ONE_DAY = 24 * 3600 * 1000;
  if (now - state.shopLastReset >= ONE_DAY) {
    state.shopState = {};
    state.shopLastReset = now;
  }
}

// ---------- Troll quest ----------
export function payTroll(state: GameState): void {
  if (state.coin < 1000) return;
  state.coin -= 1000;
  state.questFlags.trollPaid = true;
  log('You paid the toll. The Troll tips its cap.', 'gold');
}

// ---------- Offline progress with summary ----------
export function applyOfflineProgress(state: GameState, seconds: number): ReturnSummary | null {
  if (seconds <= 0) return null;
  const summary = startSummary();
  summary.elapsedSeconds = seconds;

  // Capture the current task name for the summary
  if (state.task) {
    const def = getTaskDef(state.task.kind, state.task.id);
    if (def) summary.taskName = def.name;
  }

  let remaining = seconds;
  const STEP = 1.0;
  while (remaining > 0) {
    tickTask(state, Math.min(STEP, remaining));
    remaining -= STEP;
  }

  return endSummary();
}

// re-exports
export { totalAtk, totalDef, totalMaxHp, xpForLevel, cumulativeXpToLevel };
