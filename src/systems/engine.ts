import { WOODCUTTING_NODES } from '../data/woodcutting';
import { CARVING_RECIPES } from '../data/carving';
import { COMBAT_FOES, pickFoeFromPool } from '../data/combat';
import { MINING_NODES } from '../data/mining';
import { SMITHING_RECIPES } from '../data/smithing';
import { ALCHEMY_RECIPES } from '../data/alchemy';
import { GATHER_REAGENT, FOE_REAGENT, REAGENT_GATHER_CHANCE, REAGENT_FOE_CHANCE } from '../data/reagents';
import { ITEMS } from '../data/items';
import { ALL_PERKS, CATEGORY_TREES } from '../data/perks';
import { QUEST_STEPS } from '../data/quests';
import { HELPERS } from '../data/helpers';
import { SHOP_ITEMS } from '../data/shop';
import { DEATH_LINES } from '../data/flavor';
import type { GameState, SkillId, TaskKind, CombatFoe, ReturnSummary, ActiveTask } from '../types';
import { perkEffect, perkFlag } from './perks';
import { investmentEffect } from '../data/investments';
import { expenseEffect } from '../data/expenses';
import { synergyBonus } from '../data/synergies';
import { totalAtk, totalDef, totalMaxHp, autoEquip } from './stats';
import { computePlayerStats } from './playerStats';
import { xpForLevel, cumulativeXpToLevel, levelFromTotalXpBig } from './leveling';
import { playSfx } from './audio';
import { rollPageDrop, PAGES_BY_ID } from '../data/pages';
import { getCurrentFloor } from '../data/floors';
import { getDayReward, nextStreakDay } from '../data/dailyRewards';
import { Big, bAdd, bSub, bMul, bGte, bLte, bLt, bMax, bMin, bFloor, bToNumber, bPow } from '../util/bignum';

// Throttled coin sound — call this from action sites where the player
// actively gains/spends coin (sells, kills, letters, events, buys).
// Suppressed during offline catchup (_summary). 150ms throttle prevents
// stacking when multiple coin events fire in the same tick.
let _lastCoinSoundAt = 0;
function playCoinSound(): void {
  if (_summary) return; // offline catchup — silent
  const now = Date.now();
  if (now - _lastCoinSoundAt < 150) return;
  _lastCoinSoundAt = now;
  playSfx('coin');
}

// Tracks whether the player is currently viewing the Combat tab. Combat coin
// sounds are suppressed when this is false so the player can work in other
// tabs without constant chiming from background combat.
let _combatTabActive = false;
export function setCombatTabActive(active: boolean): void {
  _combatTabActive = active;
}
// Coin sound for combat-context drops (foe defeated). Only plays when the
// player is actually looking at the combat tab. Other coin sounds (sales,
// letters, etc.) continue to play normally via playCoinSound.
function playCombatCoinSound(): void {
  if (!_combatTabActive) return;
  playCoinSound();
}

// Tries to drop a journal page on task completion. Call from any site that
// completes a task (gather, mine, carve, smith, combat-kill).
// Silent during offline catchup so the player doesn't return to 5 page logs
// they can't appreciate. Page is still added to state — they'll see it in
// the Tome's Pages section.
function tryDropPage(state: GameState, kind: 'wc' | 'mn' | 'cv' | 'sm' | 'cb'): void {
  const floor = getCurrentFloor(state);
  const pagesFound = state.pagesFound ?? {};
  const pageId = rollPageDrop(kind, floor.number, pagesFound);
  if (!pageId) return;
  state.pagesFound = pagesFound;
  state.pagesFound[pageId] = true;
  state.pagesUnread = state.pagesUnread ?? {};
  state.pagesUnread[pageId] = true;
  // Queue a blocking discovery modal — unless we're in offline catchup,
  // where the player isn't watching and we shouldn't slam them with a
  // modal on return.
  if (!_summary) {
    state.pendingDiscoveries = state.pendingDiscoveries ?? [];
    state.pendingDiscoveries.push({ kind: 'page', refId: pageId });
    const page = PAGES_BY_ID[pageId];
    log(`Found a page: ${page.title}.`, 'gold');
  }
}

// ---------- Rare reagent drops (feed Alchemy + Enchanting) ----------
// These ride the existing rare-drop perks (gather_rare / drop_rate for
// gathering; combat_drop_bonus / drop_rate for foes), and announce themselves
// as a gold "rare find" so the player notices the mystery item even though
// they can't use it until Floor 3.
function tryDropGatherReagent(state: GameState, nodeId: string): void {
  const reagentId = GATHER_REAGENT[nodeId];
  if (!reagentId) return;
  const stats = computePlayerStats(state);
  const chance = REAGENT_GATHER_CHANCE + perkEffect(state, 'gather_rare') + (stats.drop_rate ?? 0);
  if (Math.random() < chance) {
    addItem(state, reagentId, 1);
    if (_summary) _summary.rareEvents.push(`Found a rare ${ITEMS[reagentId].name}`);
    else {
      log(`A rare ${ITEMS[reagentId].name}! You pocket it, unsure why.`, 'gold');
    }
  }
}
function tryDropFoeReagent(state: GameState, foeId: string, dropMult: number): void {
  const reagentId = FOE_REAGENT[foeId];
  if (!reagentId) return;
  if (Math.random() < REAGENT_FOE_CHANCE * dropMult) {
    addItem(state, reagentId, 1);
    if (_summary) _summary.rareEvents.push(`Found a rare ${ITEMS[reagentId].name}`);
    else {
      log(`A rare ${ITEMS[reagentId].name}! It looks important. Somehow.`, 'gold');
    }
  }
}

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
  | { type: 'craft_complete';  taskId: string; itemId: string; kind: TaskKind }
  | { type: 'foe_hit';          foeId: string; damage: number }
  | { type: 'foe_defeated';     foeId: string; coinGained: number }
  | { type: 'player_hit';       damage: number }
  | { type: 'coin_gained';      amount: number }
  | { type: 'level_up';         skill: SkillId; level: number }
  | { type: 'quest_complete';   stepId: string }
  | { type: 'item_touched';     itemId: string }
  | { type: 'helper_hired';     helperId: string }
  | { type: 'task_started';     kind: TaskKind; taskId: string }
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

// Tracks gather counter for "The Bounty" capstone (every 5th gather = free yield).
// Stored as module-local; cleared on task stop/start so the count restarts per session.
let _gatherCounter = 0;

// ---------- Lookups ----------
export function getTaskDef(kind: TaskKind, id: string) {
  if (kind === 'wc') return WOODCUTTING_NODES.find(t => t.id === id);
  if (kind === 'cv') return CARVING_RECIPES.find(t => t.id === id);
  if (kind === 'cb') return COMBAT_FOES.find(t => t.id === id);
  if (kind === 'mn') return MINING_NODES.find(t => t.id === id);
  if (kind === 'sm') return SMITHING_RECIPES.find(t => t.id === id);
  if (kind === 'al') return ALCHEMY_RECIPES.find(t => t.id === id);
}
export function skillIdForKind(kind: TaskKind): SkillId {
  if (kind === 'wc') return 'woodcutting';
  if (kind === 'cv') return 'carving';
  if (kind === 'cb') return 'combat';
  if (kind === 'mn') return 'mining';
  if (kind === 'sm') return 'smithing';
  if (kind === 'al') return 'alchemy';
  return 'combat';
}
export function getTaskTime(state: GameState, kind: TaskKind, def: any): number {
  // computePlayerStats already aggregates perks + permBonuses + equipment
  // into gather_speed and craft_speed. Single source of truth.
  const stats = computePlayerStats(state);
  const gather = stats.gather_speed ?? 0;
  const craft  = stats.craft_speed  ?? 0;
  if (kind === 'wc') return def.time / (1 + gather);
  if (kind === 'mn') return def.time / (1 + gather);
  if (kind === 'cv') return def.time / (1 + craft);
  if (kind === 'sm') return def.time / (1 + craft);
  if (kind === 'al') return def.time / (1 + craft);
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
    // Equipment never enters state.inv, so record a persistent "owned this" flag
    // here — quests and the Collector achievement rely on it to detect crafted gear.
    state.questFlags['had_' + id] = true;
    if (_summary) _summary.itemsGained[id] = (_summary.itemsGained[id] ?? 0) + n;
    if (!_summary) pushEvent({ type: 'item_touched', itemId: id });
    return;
  }
  state.inv[id] = (state.inv[id] ?? 0) + n;
  if (_summary) _summary.itemsGained[id] = (_summary.itemsGained[id] ?? 0) + n;
  if (!_summary) pushEvent({ type: 'item_touched', itemId: id });
}
// Coin gain. Caller passes the BASE coin amount; this function applies the
// per-level coin multiplier from the source skill (if given) before adding.
// Per-level coin multiplier: 1.025^level for the skill that earned the coin.
// Foe drops use combat level; node drops use the relevant skill level.
export function addCoin(state: GameState, n: number | import('break_eternity.js').default, fromSkill?: SkillId): void {
  let gained = Big(n);
  if (fromSkill) {
    const lvl = state.skills[fromSkill].level;
    const mult = bPow(1.025, lvl);
    gained = bMul(gained, mult);
  }
  // Prestige: Compound Interest investment boosts all coin gains.
  const invCoin = investmentEffect(state, 'inv_coin');
  if (invCoin > 0) gained = bMul(gained, 1 + invCoin);
  // Expenses: Bulk Orders (within-run coin boost).
  const expCoin = expenseEffect(state, 'exp_coin');
  if (expCoin > 0) gained = bMul(gained, 1 + expCoin);
  state.coin = bAdd(state.coin, gained);
  if (_summary) _summary.coinGained = bToNumber(bAdd(_summary.coinGained, gained));
  // First-time hire hint: once the player crosses 1000c, Maggie hollers from town.
  // Fires only once (gated by flag). Skipped during offline-progress summary.
  if (!_summary && !state.questFlags.maggie_hint_first_hire && bGte(state.coin, 1000)) {
    state.questFlags.maggie_hint_first_hire = true;
    showToast("Maggie hollers from across town: 'GET YOURSELF A WORKER, you LITERAL.'");
  }
}
export function addPerkPoint(state: GameState, skill: SkillId, n: number): void {
  state.skills[skill].perkPoints += n;
  if (_summary) _summary.perkPointsGained += n;
  if (!_summary) showToast(`+${n} ${skill} perk point${n > 1 ? 's' : ''}!`);
}

// XP gain. Caller passes the BASE xp amount; this function applies:
// - Active perk multiplier (e.g. wc_xp perk)
// - Active buff multipliers (xp boost potions etc.)
// - Per-level XP multiplier: 1.02^level for the skill receiving the XP.
//   This compounds — a Lv 200 skill earns ~52× the XP per kill/task that
//   a Lv 1 skill would. Leaves headroom for prestige/synergy multipliers.
export function giveXp(state: GameState, skillId: SkillId, amount: number | import('break_eternity.js').default): void {
  const xpKeyMap: Record<SkillId, string> = {
    woodcutting: 'wc_xp',
    carving: 'cv_xp',
    combat: 'cb_xp',
    mining: 'mn_xp',
    smithing: 'sm_xp',
    alchemy: 'al_xp',
    enchanting: 'en_xp',
  };
  const xpKey = xpKeyMap[skillId];
  let mult = 1 + perkEffect(state, xpKey);
  const now = Date.now();
  for (const buff of state.activeBuffs) {
    if (buff.expiresAt < now) continue;
    if (buff.skill === 'all' || buff.skill === skillId) {
      mult += buff.multiplier;
    }
  }
  // Prestige: Annuity investment boosts all XP gains.
  mult += investmentEffect(state, 'inv_xp');
  // Expenses: Night Shifts (within-run XP boost).
  mult += expenseEffect(state, 'exp_xp');
  // Trade Secrets: Alchemy's "In the Blood" boosts XP across every skill.
  mult += synergyBonus(state, 'alchemy');
  const s = state.skills[skillId];
  // Compose all multipliers in Decimal so high-level multiplier doesn't overflow
  const levelMult = bPow(1.02, s.level);
  const final = bMul(bMul(Big(amount), mult), levelMult);
  s.xp = bAdd(s.xp, final);
  if (_summary) _summary.xpGained[skillId] = bToNumber(bAdd(_summary.xpGained[skillId] ?? 0, final));
  const newLevel = levelFromTotalXpBig(s.xp);
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
  if ((kind === 'cv' || kind === 'al') && !canAfford(state, (def as any).cost)) {
    showToast('Not enough materials.');
    return;
  }
  if (kind === 'cb' && bLte(state.hp, 0)) {
    state.hp = Big(totalMaxHp(state));
  }
  const newTask: ActiveTask = {
    kind, id,
    progress: 0,
    totalTime: getTaskTime(state, kind, def),
    foeHp: kind === 'cb' ? Big((def as CombatFoe).hp) : null,
    playerHp: kind === 'cb' ? state.hp : undefined,
  };
  // Combat runs in its own slot (state.combatTask), parallel to gather/craft.
  if (kind === 'cb') {
    state.combatTask = newTask;
    state.combatFirstHitConsumed = false;
  } else {
    state.task = newTask;
    state.idleSince = 0;
  }
  if (!_summary) {
    log(`Started: ${def.name}`);
    pushEvent({ type: 'task_started', kind, taskId: id });
  }
  if (_summary) _summary.taskName = def.name;
}

// Stop the active gather/craft task (state.task). Combat has its own stop.
export function stopTask(state: GameState): void {
  state.task = null;
  if (!state.combatTask) state.idleSince = Date.now();
}

// Stop the active combat task (state.combatTask). Gather/craft untouched.
export function stopCombat(state: GameState): void {
  state.combatTask = null;
}

// Start combat against a random foe from the given pool. Sets selectedCombatPool
// so subsequent foe defeats auto-respawn from the same pool.
export function startPoolCombat(state: GameState, poolId: string): boolean {
  const foe = pickFoeFromPool(poolId);
  if (!foe) return false;
  state.selectedCombatPool = poolId;
  startTask(state, 'cb' as TaskKind, foe.id);
  return true;
}

// ---------- Active mode swing ----------
// Returns true if the swing landed, false if it was on cooldown / no task.
// Cooldown is enforced here so the UI can stay simple.
export const SWING_COOLDOWN_MS = 50;

// Gather/craft swings have NO cooldown — players can spam as fast as they want.
// Combat swings keep a small 50ms cooldown — fast enough that any human can
// spam normally, slow enough to limit macro abuse.
//
// canSwing/swingCooldownRemaining accept which task slot ('task' for
// gather/craft, 'combatTask' for combat) so the UI can query each slot.
export function canSwing(state: GameState, slot: 'task' | 'combatTask' = 'task'): boolean {
  const t = state[slot];
  if (!t) return false;
  if (t.kind !== 'cb') return true;
  const last = state.lastSwingAt ?? 0;
  return Date.now() - last >= SWING_COOLDOWN_MS;
}

export function swingCooldownRemaining(state: GameState, slot: 'task' | 'combatTask' = 'task'): number {
  const t = state[slot];
  if (!t || t.kind !== 'cb') return 0;
  const last = state.lastSwingAt ?? 0;
  return Math.max(0, SWING_COOLDOWN_MS - (Date.now() - last));
}

export function doSwing(state: GameState, slot: 'task' | 'combatTask' = 'task'): boolean {
  const t = state[slot];
  if (!t) return false;
  if (!canSwing(state, slot)) return false;
  state.lastSwingAt = Date.now();

  if (t.kind === 'wc' || t.kind === 'cv' || t.kind === 'mn' || t.kind === 'sm' || t.kind === 'al') {
    // Advance progress by 30% of total time (capped so it doesn't lap)
    const bonus = t.totalTime * 0.30;
    t.progress = Math.min(t.totalTime, t.progress + bonus);
    return true;
  } else if (t.kind === 'cb') {
    // Active combat: deal one extra hit immediately, no foe retaliation
    const def = getTaskDef(t.kind, t.id) as CombatFoe | null;
    if (!def) return false;
    const dmg = Math.max(1, totalAtk(state));
    t.foeHp = bSub(t.foeHp!, dmg);
    pushEvent({ type: 'foe_hit', foeId: def.id, damage: dmg });
    if (bLte(t.foeHp!, 0)) {
      const playerStats = computePlayerStats(state);
      const coinBaseMult = 1 + (playerStats.combat_coin_bonus ?? 0) + (playerStats.coin_find ?? 0);
      const coinGain = bFloor(bMul(def.coin, coinBaseMult));
      addCoin(state, coinGain, 'combat');
      playCombatCoinSound();
      giveXp(state, 'combat', def.xp);
      tryDropPage(state, 'cb');
      const dropMult = 1 + (playerStats.combat_drop_bonus ?? 0) + (playerStats.drop_rate ?? 0);
      const rollsPerDrop = perkFlag(state, 'double_drops') ? 2 : 1;
      for (const drop of def.drops ?? []) {
        for (let r = 0; r < rollsPerDrop; r++) {
          if (Math.random() < drop.chance * dropMult) {
            addItem(state, drop.id, 1);
            log(`Looted ${ITEMS[drop.id].name}.`, 'gold');
          }
        }
      }
      // Rare Enchanting reagent drop (mysterious until Floor 3)
      tryDropFoeReagent(state, def.id, dropMult);
      // Second Breath
      const healPct = perkEffect(state, 'heal_per_kill');
      if (healPct > 0) {
        const maxHp = totalMaxHp(state);
        const heal = Math.ceil(maxHp * healPct);
        state.hp = bMin(Big(maxHp), bAdd(state.hp, heal));
        t.playerHp = state.hp;
      }
      log(`Defeated ${def.name}! +${bToNumber(coinGain).toLocaleString()} coin, +${def.xp} combat XP.`, 'green');
      pushEvent({ type: 'foe_defeated', foeId: def.id, coinGained: bToNumber(coinGain) });
      if (def.id === 'boar')  state.questFlags.boarSlain  = true;
      if (def.id === 'troll') state.questFlags.trollSlain = true;
      // If the player is fighting from a pool, draw the next foe from that
      // same pool. Otherwise (legacy path) respawn the same foe.
      if (state.selectedCombatPool) {
        const next = pickFoeFromPool(state.selectedCombatPool);
        if (next) {
          t.id = next.id;
          t.foeHp = Big(next.hp);
        } else {
          t.foeHp = Big(def.hp);
        }
      } else {
        t.foeHp = Big(def.hp);
      }
      state.combatFirstHitConsumed = false;
    }
    return true;
  }
  return false;
}

export function tickTask(state: GameState, dt: number): void {
  // Always tick helpers regardless of whether player has a task
  tickHelpers(state, dt);

  // Tick gather/craft task (state.task)
  if (state.task) {
    const t = state.task;
    const def = getTaskDef(t.kind, t.id);
    if (!def) {
      state.task = null;
      if (!state.combatTask) state.idleSince = Date.now();
    } else if (t.kind === 'wc' || t.kind === 'cv' || t.kind === 'mn' || t.kind === 'sm' || t.kind === 'al') {
      t.progress += dt;
      while (t.progress >= t.totalTime) {
        t.progress -= t.totalTime;
        completeGather(state, t.kind, def);
        if (!state.task) break;
        if (_summary) _summary.taskCompletions++;
      }
    }
    // (combat path is never here — combat lives in combatTask)
  }

  // Tick combat task (state.combatTask) — independent of gather/craft
  if (state.combatTask && state.combatTask.kind === 'cb') {
    const ct = state.combatTask;
    const def = getTaskDef(ct.kind, ct.id);
    if (!def) {
      state.combatTask = null;
    } else {
      const stats = computePlayerStats(state);
      const ROUND = 1.5 / (1 + (stats.speed ?? 0));
      ct.progress += dt;
      while (ct.progress >= ROUND) {
        ct.progress -= ROUND;
        combatRound(state, def as CombatFoe);
        if (!state.combatTask) break;
      }
    }
  }
}

function completeGather(state: GameState, kind: TaskKind, def: any): void {
  if (kind === 'wc') {
    let amount = 1;
    // gather_double covers both new (Double Swing) and legacy (Lucky Strike via wc_double key).
    if (!perkFlag(state, 'wc_double_disable') && Math.random() < perkEffect(state, 'wc_double')) {
      amount++;
    }
    // gather_yield is a flat % yield multiplier (Sharper Tools, Keen Eye).
    // Apply as a probabilistic bonus: e.g. +15% means a 15% chance of +1 yield.
    const yieldBonus = perkEffect(state, 'gather_yield');
    if (yieldBonus > 0 && Math.random() < yieldBonus) amount++;
    // The Bounty: every 5th gather is free
    _gatherCounter++;
    if (perkFlag(state, 'gather_free_5th') && _gatherCounter % 5 === 0) {
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
    // Rare Alchemy reagent drop (mysterious until Floor 3)
    tryDropGatherReagent(state, def.id);
    // The Whisperwood: 1% chance to drop 50c on gather
    const coinDrop = perkEffect(state, 'gather_coin_drop_chance');
    if (coinDrop > 0 && Math.random() < coinDrop) {
      addCoin(state, 50);
      if (!_summary) log(`The wood whispered. 50 coin clinks into your purse.`, 'gold');
    }
    giveXp(state, 'woodcutting', def.xp);
    tryDropPage(state, 'wc');
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
    // craft_double: small chance to produce two
    let amount = 1;
    if (Math.random() < perkEffect(state, 'craft_double')) amount++;
    addItem(state, def.produces, amount);
    giveXp(state, 'carving', def.xp);
    tryDropPage(state, 'cv');
    if (!_summary) {
      log(`Carved a ${ITEMS[def.produces].name}.`, 'green');
      pushEvent({ type: 'craft_complete', taskId: def.id, itemId: def.produces, kind: 'cv' });
    }
  } else if (kind === 'mn') {
    let amount = 1;
    // gather_double (Double Swing / Wide Cut) applies to mining too
    if (Math.random() < perkEffect(state, 'mn_double')) amount++;
    const yieldBonus = perkEffect(state, 'gather_yield');
    if (yieldBonus > 0 && Math.random() < yieldBonus) amount++;
    _gatherCounter++;
    if (perkFlag(state, 'gather_free_5th') && _gatherCounter % 5 === 0) {
      amount++;
    }
    addItem(state, def.yield, amount);
    // mn_rare → same as wc_rare: chance to find next-tier ore
    if (Math.random() < perkEffect(state, 'gather_rare')) {
      const idx = MINING_NODES.findIndex(t => t.id === def.id);
      const upgrade = MINING_NODES[idx + 1];
      if (upgrade) {
        addItem(state, upgrade.yield, 1);
        if (!_summary) log(`A rare ${ITEMS[upgrade.yield].name} chips loose!`, 'gold');
      }
    }
    // Rare Alchemy reagent drop (mysterious until Floor 3)
    tryDropGatherReagent(state, def.id);
    // The Whisperwood: 1% chance to drop 50c on gather (applies to mining too)
    const coinDrop = perkEffect(state, 'gather_coin_drop_chance');
    if (coinDrop > 0 && Math.random() < coinDrop) {
      addCoin(state, 50);
      if (!_summary) log(`A glint of coin caught in the stone. 50c.`, 'gold');
    }
    giveXp(state, 'mining', def.xp);
    tryDropPage(state, 'mn');
    if (!_summary) pushEvent({ type: 'gather_complete', kind: 'mn', taskId: def.id, itemId: def.yield, amount });
  } else if (kind === 'sm') {
    if (!canAfford(state, def.cost)) {
      if (!_summary) showToast('Out of materials.');
      state.task = null;
      state.idleSince = Date.now();
      return;
    }
    if (Math.random() >= perkEffect(state, 'sm_save')) {
      for (const k in def.cost) state.inv[k] -= def.cost[k];
    }
    let amount = 1;
    if (Math.random() < perkEffect(state, 'craft_double')) amount++;
    addItem(state, def.produces, amount);
    giveXp(state, 'smithing', def.xp);
    tryDropPage(state, 'sm');
    if (!_summary) {
      log(`Forged a ${ITEMS[def.produces].name}.`, 'green');
      pushEvent({ type: 'craft_complete', taskId: def.id, itemId: def.produces, kind: 'sm' });
    }
  } else if (kind === 'al') {
    if (!canAfford(state, def.cost)) {
      if (!_summary) showToast('Out of materials.');
      state.task = null;
      state.idleSince = Date.now();
      return;
    }
    if (Math.random() >= perkEffect(state, 'craft_save')) {
      for (const k in def.cost) state.inv[k] -= def.cost[k];
    }
    let amount = 1;
    if (Math.random() < perkEffect(state, 'craft_double')) amount++;
    addItem(state, def.produces, amount);
    giveXp(state, 'alchemy', def.xp);
    if (!_summary) {
      log(`Brewed a ${ITEMS[def.produces].name}.`, 'green');
      pushEvent({ type: 'craft_complete', taskId: def.id, itemId: def.produces, kind: 'al' });
    }
  }
}

function combatRound(state: GameState, foe: CombatFoe): void {
  const t = state.combatTask!;
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
  // The Killing Blow: crits on foes under 25% HP deal 3× damage.
  // Compare foeHp/foe.hp as a ratio in plain numbers via bToNumber.
  if (didCrit && perkFlag(state, 'killing_blow') && bToNumber(t.foeHp!) / foe.hp < 0.25) {
    dmg = Math.floor(dmg * 3);
    if (!_summary) log(`KILLING BLOW! ${dmg} damage.`, 'gold');
  }
  t.foeHp = bSub(t.foeHp!, dmg);
  if (!_summary) pushEvent({ type: 'foe_hit', foeId: foe.id, damage: dmg });
  if (didCrit && !_summary) {
    log(`Critical hit! ${dmg} damage.`, 'gold');
  }
  if (bLte(t.foeHp!, 0)) {
    const coinMult = 1 + (stats.combat_coin_bonus ?? 0) + (stats.coin_find ?? 0);
    const coinGain = bFloor(bMul(foe.coin, coinMult));
    addCoin(state, coinGain, 'combat');
    playCombatCoinSound();
    giveXp(state, 'combat', foe.xp);
    tryDropPage(state, 'cb');
    const dropMult = 1 + (stats.combat_drop_bonus ?? 0) + (stats.drop_rate ?? 0);
    const rollsPerDrop = perkFlag(state, 'double_drops') ? 2 : 1;
    for (const drop of foe.drops ?? []) {
      for (let r = 0; r < rollsPerDrop; r++) {
        if (Math.random() < drop.chance * dropMult) {
          addItem(state, drop.id, 1);
          if (!_summary) log(`Looted ${ITEMS[drop.id].name}.`, 'gold');
        }
      }
    }
    // Rare Enchanting reagent drop (mysterious until Floor 3)
    tryDropFoeReagent(state, foe.id, dropMult);
    // Second Breath: heal % max HP per kill
    const healPct = perkEffect(state, 'heal_per_kill');
    if (healPct > 0) {
      const maxHp = totalMaxHp(state);
      const heal = Math.ceil(maxHp * healPct);
      state.hp = bMin(Big(maxHp), bAdd(state.hp, heal));
      t.playerHp = state.hp;
    }
    if (!_summary) {
      log(`Defeated ${foe.name}! +${bToNumber(coinGain).toLocaleString()} coin, +${foe.xp} combat XP.`, 'green');
      pushEvent({ type: 'foe_defeated', foeId: foe.id, coinGained: bToNumber(coinGain) });
    }
    if (_summary) _summary.taskCompletions++;
    if (foe.id === 'boar')  state.questFlags.boarSlain  = true;
    if (foe.id === 'troll') state.questFlags.trollSlain = true;
    if (state.selectedCombatPool) {
      const next = pickFoeFromPool(state.selectedCombatPool);
      if (next) {
        t.id = next.id;
        t.foeHp = Big(next.hp);
      } else {
        t.foeHp = Big(foe.hp);
      }
    } else {
      t.foeHp = Big(foe.hp);
    }
    state.combatFirstHitConsumed = false;
    return;
  }
  // foe swings
  let foeDmg = Math.max(1, foe.atk - totalDef(state));
  // Stonefoot: first hit each fight is ignored entirely
  if (perkFlag(state, 'first_hit_ignored') && !state.combatFirstHitConsumed) {
    foeDmg = 0;
    state.combatFirstHitConsumed = true;
    if (!_summary) log(`Stonefoot! The first blow glanced off.`, 'gold');
  }
  t.playerHp = bSub(t.playerHp!, foeDmg);
  state.hp = t.playerHp!;
  // Spite: retribution damage to foe
  const reflect = perkEffect(state, 'retribution');
  if (reflect > 0 && foeDmg > 0) {
    const ret = Math.max(1, Math.floor(foeDmg * reflect));
    t.foeHp = bSub(t.foeHp!, ret);
    if (!_summary) log(`Spite! ${ret} damage back to ${foe.name}.`, 'gold');
  }
  if (!_summary) pushEvent({ type: 'player_hit', damage: foeDmg });
  if (bLte(state.hp, 0)) {
    applyDeathPenalty(state, foe);
    // Death stops combat only. Gather/craft (state.task) continues unaffected.
    state.combatTask = null;
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
  // Lose 10% of coin, capped at 500.
  const tenPct = bFloor(bMul(state.coin, 0.10));
  const loss = bMin(Big(500), tenPct);
  state.coin = bMax(Big(0), bSub(state.coin, loss));
  state.hp = Big(totalMaxHp(state));
  state.questFlags.died_once = true;
  const line = DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)];
  _pendingDeath = { coinLost: bToNumber(loss), foeName: foe.name, line };
  log(`You were defeated by ${foe.name}. (-${bToNumber(loss).toLocaleString()} coin)`, 'red');
}

// ---------- Helpers (hireable NPCs that auto-do tasks) ----------
// Computes the total speed multiplier for a hired helper, combining the
// helper's base speedMultiplier with all Leadership / category-tree perks
// that boost helpers.
function helperSpeedMult(state: GameState, kind: TaskKind, baseSpeedMult: number): number {
  let mult = baseSpeedMult;
  // Leadership: per-helper speed perks (First Apprentice, Sturdy Stock)
  mult *= 1 + perkEffect(state, 'helper_speed');
  // Gathering Tempo capstone: gather helpers +25% speed
  if (kind === 'wc' || kind === 'mn') {
    mult *= 1 + perkEffect(state, 'gather_helper_speed');
  }
  // Crafting Tempo capstone: craft helpers +25% speed
  if (kind === 'cv' || kind === 'sm' || kind === 'al') {
    mult *= 1 + perkEffect(state, 'craft_helper_speed');
  }
  // The Guild capstone: +15% to everything helpers do
  mult *= 1 + perkEffect(state, 'helper_everything');
  return mult;
}

// Computes the helper's yield bonus chance (extra +1 yield roll).
// Stacks from Honest Wage, Coordinated Crew, The Guild.
function helperYieldBonus(state: GameState): number {
  const flat = perkEffect(state, 'helper_yield');
  const perHire = perkEffect(state, 'helper_yield_per_hire');
  const hiredCount = Object.keys(state.helpersHired ?? {}).filter(k => state.helpersHired[k]).length;
  const everything = perkEffect(state, 'helper_everything');
  return flat + perHire * hiredCount + everything;
}

function tickHelpers(state: GameState, dt: number): void {
  for (const helper of HELPERS) {
    if (!state.helpersHired[helper.id]) continue;
    const def = getTaskDef(helper.kind, helper.taskId);
    if (!def) continue;
    // Allow all gather/craft kinds (wc, cv, mn, sm). Combat helpers aren't a thing yet.
    if (helper.kind !== 'wc' && helper.kind !== 'cv' && helper.kind !== 'mn' && helper.kind !== 'sm' && helper.kind !== 'al') continue;
    const baseTime = getTaskTime(state, helper.kind, def);
    const effectiveSpeed = helperSpeedMult(state, helper.kind, helper.speedMultiplier);
    const helperTime = baseTime / effectiveSpeed;
    state.helpersProgress[helper.id] = (state.helpersProgress[helper.id] ?? 0) + dt;
    while (state.helpersProgress[helper.id] >= helperTime) {
      state.helpersProgress[helper.id] -= helperTime;
      runHelperCompletion(state, helper.kind, effectiveSpeed, def);
    }
  }
}

// Helper completions now share the perk logic with manual completions.
// Things like wc_double, wc_rare, cv_save apply because the helper is
// effectively "you, automated" — your skill trees benefit them too.
// Additionally, Leadership perks add their own yield/rare-drop bonuses on top.
function runHelperCompletion(state: GameState, kind: TaskKind, speedMult: number, def: any): void {
  const helperYieldChance = helperYieldBonus(state);
  const helperRareBonus = perkEffect(state, 'helper_rare_drop') + perkEffect(state, 'helper_everything');
  if (kind === 'wc') {
    let amount = 1;
    if (!perkFlag(state, 'wc_double_disable') && Math.random() < perkEffect(state, 'wc_double')) amount++;
    if (helperYieldChance > 0 && Math.random() < helperYieldChance) amount++;
    addItem(state, def.yield, amount);
    if (Math.random() < perkEffect(state, 'wc_rare') + helperRareBonus) {
      const idx = WOODCUTTING_NODES.findIndex(t => t.id === def.id);
      const upgrade = WOODCUTTING_NODES[idx + 1];
      if (upgrade) {
        addItem(state, upgrade.yield, 1);
        if (_summary) _summary.rareEvents.push(`Found a rare ${ITEMS[upgrade.yield].name}`);
      }
    }
    tryDropGatherReagent(state, def.id);
    giveXp(state, 'woodcutting', def.xp * speedMult);
    tryDropPage(state, 'wc');
  } else if (kind === 'cv') {
    if (!canAfford(state, def.cost)) return;
    if (Math.random() >= perkEffect(state, 'cv_save')) {
      for (const k in def.cost) state.inv[k] -= def.cost[k];
    }
    let amount = 1;
    if (helperYieldChance > 0 && Math.random() < helperYieldChance) amount++;
    addItem(state, def.produces, amount);
    giveXp(state, 'carving', def.xp * speedMult);
    tryDropPage(state, 'cv');
  } else if (kind === 'mn') {
    let amount = 1;
    if (perkEffect(state, 'mn_double') > 0 && Math.random() < perkEffect(state, 'mn_double')) amount++;
    if (helperYieldChance > 0 && Math.random() < helperYieldChance) amount++;
    addItem(state, def.yield, amount);
    if (Math.random() < perkEffect(state, 'gather_rare') + helperRareBonus) {
      const idx = MINING_NODES.findIndex(t => t.id === def.id);
      const upgrade = MINING_NODES[idx + 1];
      if (upgrade) addItem(state, upgrade.yield, 1);
    }
    tryDropGatherReagent(state, def.id);
    giveXp(state, 'mining', def.xp * speedMult);
    tryDropPage(state, 'mn');
  } else if (kind === 'sm') {
    if (!canAfford(state, def.cost)) return;
    if (Math.random() >= perkEffect(state, 'sm_save')) {
      for (const k in def.cost) state.inv[k] -= def.cost[k];
    }
    let amount = 1;
    if (helperYieldChance > 0 && Math.random() < helperYieldChance) amount++;
    addItem(state, def.produces, amount);
    giveXp(state, 'smithing', def.xp * speedMult);
    tryDropPage(state, 'sm');
  } else if (kind === 'al') {
    if (!canAfford(state, def.cost)) return;
    if (Math.random() >= perkEffect(state, 'craft_save')) {
      for (const k in def.cost) state.inv[k] -= def.cost[k];
    }
    let amount = 1;
    if (helperYieldChance > 0 && Math.random() < helperYieldChance) amount++;
    addItem(state, def.produces, amount);
    giveXp(state, 'alchemy', def.xp * speedMult);
  }
}

export function hireHelper(state: GameState, helperId: string): boolean {
  const helper = HELPERS.find(h => h.id === helperId);
  if (!helper || state.helpersHired[helperId]) return false;
  // Apply Leadership "Pay the Rate" / "Inheritance" discount
  const costReduction = Math.min(0.8, perkEffect(state, 'hire_cost_reduction'));
  const actualCost = Math.floor(helper.hireCost * (1 - costReduction));
  if (bLt(state.coin, actualCost)) return false;
  if (helper.requiredSkill && helper.requiredLevel
      && state.skills[helper.requiredSkill].level < helper.requiredLevel) {
    showToast(`Requires ${helper.requiredSkill} Lv ${helper.requiredLevel}.`);
    return false;
  }
  state.coin = bSub(state.coin, actualCost);
  state.helpersHired[helperId] = true;
  state.helpersProgress[helperId] = 0;
  // Award 1 leadership point per hire (per design — see perks.ts)
  state.leadershipPoints = (state.leadershipPoints ?? 0) + 1;
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
      playCoinSound();
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
// New buyPerk that works with category trees.
// Spending rules:
//   - Gathering perks: must have woodcutting.perkPoints + mining.perkPoints >= cost
//     Drain from whichever has more points first.
//   - Crafting perks: same pattern across carving/smithing.
//   - Combat perks: drained from combat.perkPoints.
//   - Leadership perks: drained from state.leadershipPoints.
//
// Returns the perk that must be owned before `perk` can be purchased.
// Returns null if `perk` is a Tier 1 entry or a Leadership ladder starter.
// For branch trees: prereq is the previous-tier perk in the SAME branch.
// For Leadership ladder: prereq is the previous perk in the ladder order.
export function prereqForPerk(perkId: string): { id: string; name: string } | null {
  // Branch trees first
  for (const tree of [CATEGORY_TREES.gathering, CATEGORY_TREES.crafting, CATEGORY_TREES.combat]) {
    for (const branch of tree.branches) {
      const idx = branch.perks.findIndex(p => p.id === perkId);
      if (idx === -1) continue;
      if (idx === 0) return null; // Tier 1: no prereq
      const prev = branch.perks[idx - 1];
      return { id: prev.id, name: prev.name };
    }
  }
  // Leadership ladder
  const ladder = CATEGORY_TREES.leadership.ladder ?? [];
  const idx = ladder.findIndex(p => p.id === perkId);
  if (idx === -1) return null;
  if (idx === 0) return null;
  const prev = ladder[idx - 1];
  return { id: prev.id, name: prev.name };
}

// Returns true on success.
export function buyCategoryPerk(state: GameState, treeId: 'gathering' | 'crafting' | 'combat' | 'leadership', perkId: string): boolean {
  // Look up perk
  let perk: { id: string; cost: number; name: string } | undefined;
  for (const p of ALL_PERKS) {
    if (p.id === perkId) { perk = p; break; }
  }
  if (!perk) return false;

  // Check ownership (already owned)
  if (treeId === 'leadership') {
    if ((state.leadershipOwned ?? {})[perkId]) return false;
  } else {
    for (const sk of Object.keys(state.skills) as SkillId[]) {
      if (state.skills[sk].owned[perkId]) return false;
    }
  }

  // PREREQUISITE CHECK — must own the previous-tier perk in the same branch
  // (or previous node in the Leadership ladder).
  const prereq = prereqForPerk(perkId);
  if (prereq) {
    let prereqOwned = false;
    if (treeId === 'leadership') {
      prereqOwned = !!(state.leadershipOwned ?? {})[prereq.id];
    } else {
      for (const sk of Object.keys(state.skills) as SkillId[]) {
        if (state.skills[sk].owned[prereq.id]) { prereqOwned = true; break; }
      }
    }
    if (!prereqOwned) return false;
  }

  // Available points — use the tree-aware helper so leadership (which uses
  // state.leadershipPoints instead of skill pools) is handled correctly.
  const totalAvailable = pointsAvailableForTree(state, treeId);
  if (totalAvailable < perk.cost) return false;

  // Spend: drain from each pool in order until the cost is covered
  if (treeId === 'leadership') {
    state.leadershipPoints = (state.leadershipPoints ?? 0) - perk.cost;
    state.leadershipOwned = state.leadershipOwned ?? {};
    state.leadershipOwned[perkId] = true;
  } else {
    const pools = pointPoolsFor(state, treeId);
    let remaining = perk.cost;
    for (const pool of pools) {
      if (remaining <= 0) break;
      const take = Math.min(pool.points, remaining);
      state.skills[pool.skill].perkPoints -= take;
      remaining -= take;
    }
    const firstSkill = pools[0].skill;
    state.skills[firstSkill].owned[perkId] = true;
  }

  log(`Acquired perk: ${perk.name}.`, 'gold');
  return true;
}

// Which skill perk-point pools feed which tree.
function pointPoolsFor(state: GameState, treeId: 'gathering' | 'crafting' | 'combat' | 'leadership'): { skill: SkillId; points: number }[] {
  if (treeId === 'gathering') {
    return [
      { skill: 'woodcutting', points: state.skills.woodcutting.perkPoints },
      { skill: 'mining',      points: state.skills.mining.perkPoints },
    ];
  }
  if (treeId === 'crafting') {
    return [
      { skill: 'carving',  points: state.skills.carving.perkPoints },
      { skill: 'smithing', points: state.skills.smithing.perkPoints },
    ];
  }
  if (treeId === 'combat') {
    return [
      { skill: 'combat', points: state.skills.combat.perkPoints },
    ];
  }
  // leadership uses its own pool, not skill points
  return [];
}

// How many points are available to spend in a given tree.
export function pointsAvailableForTree(state: GameState, treeId: 'gathering' | 'crafting' | 'combat' | 'leadership'): number {
  if (treeId === 'leadership') return state.leadershipPoints ?? 0;
  return pointPoolsFor(state, treeId).reduce((a, b) => a + b.points, 0);
}

// Legacy buyPerk kept for any leftover callers — now a no-op since the old
// per-skill perk system is gone. Calls should be migrated to buyCategoryPerk.
export function buyPerk(_state: GameState, _skillId: SkillId, _perkId: string): void {
  return;
}

// ---------- Selling ----------
// Computes the sell-price multiplier for a single item, taking into account
// permanent bonuses (Maggie's Counter) and category-tree perks:
//   - Wisp-Touched: +% coin from gather sells (materials)
//   - Sell Premium / Signature Mark: +% sell on crafted items (equipment)
function sellMultiplier(state: GameState, def: any): number {
  let bonus = state.permBonuses?.sellBonus ?? 0;
  if (def.category === 'material') bonus += perkEffect(state, 'gather_sell_bonus');
  if (def.category === 'equipment') bonus += perkEffect(state, 'craft_sell_bonus');
  return 1 + bonus;
}

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
  const total = Math.floor(def.sell * n * sellMultiplier(state, def));
  addCoin(state, total);
  state.inv[id] = 0;
  playCoinSound();
  log(`Sold ${n}× ${def.name} for ${total} coin.`, 'gold');
}

export function sellCategory(state: GameState, category: string): void {
  let total = 0;
  let count = 0;
  for (const id of Object.keys(state.inv)) {
    if (!state.inv[id]) continue;
    const def = ITEMS[id];
    if (def.category !== category) continue;
    if (def.category === 'quest') continue;
    if (state.satchelLocked[id]) continue;
    if (state.equipped.weapon === id || state.equipped.shield === id) continue;
    total += Math.floor(def.sell * state.inv[id] * sellMultiplier(state, def));
    count += state.inv[id];
    state.inv[id] = 0;
  }
  if (count > 0) {
    addCoin(state, total);
    playCoinSound();
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
  if (bLt(state.coin, item.cost)) return false;
  if (item.stockType === 'daily') {
    const stock = state.shopState[shopItemId] ?? item.dailyStock ?? 0;
    if (stock <= 0) return false;
    state.shopState[shopItemId] = stock - 1;
  }
  state.coin = bSub(state.coin, item.cost);
  addItem(state, item.id, 1);
  playCoinSound();
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
    state.hp = bMin(Big(totalMaxHp(state)), bAdd(state.hp, effect.heal));
    log(`Used ${def.name}. +${Math.floor(bToNumber(bSub(state.hp, before)))} HP.`, 'green');
    if (state.combatTask) state.combatTask.playerHp = state.hp;
  }
  if (effect.healPercent !== undefined) {
    const max = totalMaxHp(state);
    const before = state.hp;
    const healAmt = Math.floor(max * (effect.healPercent / 100));
    state.hp = bMin(Big(max), bAdd(state.hp, healAmt));
    log(`Used ${def.name}. +${Math.floor(bToNumber(bSub(state.hp, before)))} HP.`, 'green');
    if (state.combatTask) state.combatTask.playerHp = state.hp;
  }
  if (effect.coinBonus !== undefined) {
    addCoin(state, effect.coinBonus);
    playCoinSound();
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

// ---------- Daily Reward ----------
// Replaces the old daily letter system. Player clicks the Daily Rewards
// button → sees the 30-day track → claims today's reward. Coin, daily
// bread, perk points, and doodles flow in. Streak wraps after day 30.
export function claimDailyReward(state: GameState): { ok: boolean; day?: number; reward?: import('../data/dailyRewards').DailyRewardContents } {
  const lastClaim = state.dailyLetterLastClaim ?? 0;
  if (lastClaim !== 0) {
    // 20-hour cooldown shared with the old letter system
    const COOLDOWN = 20 * 60 * 60 * 1000;
    if (Date.now() - lastClaim < COOLDOWN) return { ok: false };
  }
  const day = nextStreakDay(state);
  const reward = getDayReward(day);
  if (!reward) return { ok: false };

  addCoin(state, reward.coin);
  playCoinSound();
  state.dailyBread = (state.dailyBread ?? 0) + reward.dailyBread;
  if (reward.doodleId) {
    state.doodlesOwned = state.doodlesOwned ?? {};
    state.doodlesOwned[reward.doodleId] = true;
  }
  if (reward.perkPoint) {
    state.skills.combat.perkPoints += 1;
  }

  state.dailyLetterStreak = day;
  state.dailyLetterLastClaim = Date.now();

  log(`Daily reward claimed. Day ${day}.`, 'gold');
  return { ok: true, day, reward };
}

// ---------- Troll quest ----------
export function payTroll(state: GameState): void {
  if (bLt(state.coin, 1000)) return;
  state.coin = bSub(state.coin, 1000);
  playCoinSound();
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

  // Adaptive step size — for long offline periods (NGU-style uncapped) we
  // can't simulate at 1-second resolution or the load thread freezes for
  // minutes. Use larger steps for longer offline times. Math in tickTask
  // is dt-correct so coarser steps yield equivalent totals.
  let step = 1.0;
  if (seconds > 6 * 3600)   step = 5;     // > 6h:   5s steps
  if (seconds > 24 * 3600)  step = 30;    // > 1d:   30s steps
  if (seconds > 7 * 24 * 3600) step = 120; // > 1w: 2-min steps

  let remaining = seconds;
  while (remaining > 0) {
    const dt = Math.min(step, remaining);
    tickTask(state, dt);
    remaining -= dt;
  }

  return endSummary();
}

// re-exports
export { totalAtk, totalDef, totalMaxHp, xpForLevel, cumulativeXpToLevel };
