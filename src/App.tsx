import { useEffect, useRef, useState } from 'react';
// createPortal — used inside inventory components, not directly here
import './styles/game.css';
// COMBAT_FOES/COMBAT_POOLS — used inside src/components/combat/, not directly here
import { ITEMS } from './data/items';
// CATEGORY_ORDER/CATEGORY_LABELS used inside SatchelCategorized
// PERK_TREES/CATEGORY_TREES used inside PerksTab, not directly here
// Branch/CategoryPerk types used inside PerksTab, not directly here
import { QUEST_STEPS, getQuestGivers } from './data/quests';
import { HELPERS } from './data/helpers';
// SHOP_ITEMS — used inside ShopTab, not directly here
import { IDLE_STATUSES, activeStatusText } from './data/flavor';
import type { RandomEventDef } from './data/events';
import { Big, bLt, bGt, bToNumber } from './util/bignum';
import {
  shouldOfferLetter, claimLetter, updateLetterQueue,
  // COUNTER_BUFFS/counterPurchaseCount/buyCounterBuff used inside InnkeepCounterTab
} from './data/letter';
import type { LetterContents } from './data/letter';
import { checkJournalUnlocks } from './data/journal';
// JournalSection/getJournalCounts/ACHIEVEMENTS/get*Entries used inside JournalPanel
// JOURNAL_PAGES used inside JournalPanel
import { STORY_LETTERS_BY_ID } from './data/storyLetters';
import type { StoryLetter } from './data/storyLetters';
import {
  loadGame, saveGame, freshState,
  // wipeSave/exportSave/importSave used inside LedgerPanel
} from './state/save';
import {
  tickTask, checkQuest, claimDailyReward, addCoin, setCombatTabActive,
  // sellItem/sellCategory used inside InvItemRow/SatchelCategorized
  applyOfflineProgress, getLogs, consumeToast,
  // toggleItemLock used inside InvItemRow
  // payTroll unused
  log,
  // hireHelper used inside HelpersTab
  // buyFromShop/getShopStock used inside ShopTab, not directly here
  maybeResetDailyShop, consumeDeath, getTaskDef,
  pruneExpiredBuffs, activeStepForGiver, drainEvents,
  // consumeItem used inside InvItemRow
  totalMaxHp,
  // totalAtk/totalDef used inside CharacterSheetTab/CombatTab/AdventurerPanel
  // xpForLevel/cumulativeXpToLevel used inside SkillsOverviewTab/AdventurerPanel
} from './systems/engine';
// perkEffect — used inside SkillsOverviewTab, not directly here
import { fmt, formatTime } from './systems/format';
import { getCurrentFloor, setCurrentFloor } from './data/floors';
import { TASK_REGISTRY, validateTaskRegistry } from './data/tasks';
// Avatar — used inside CharacterSheetTab and CombatTab, not directly here
// instanceStats/equipInstance/unequipSlot/isInstanceEquipped/removeInstance/
// getInstanceSellPrice used inside inventory components
// fullItemName used inside inventory components
// abilities/* — used inside src/components/combat/AbilitiesBar.tsx, not directly here
// SKILL_INFO — used inside SkillsOverviewTab, not directly here
// QualityTier/StatKey types used inside components, not directly here
// ItemInstance/EquipSlot used inside inventory components and CharacterSheetTab
import {
  spawnSawdust, spawnSparks, spawnCoinBurst, spawnInkSplat, spawnLevelUp, spawnFloater, spawnConfetti,
} from './systems/effects';
import { playSfx, unlockAudio, setMusicTrack } from './systems/audio';
import { ParticleLayer } from './ui/ParticleLayer';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { DoodleOverlay } from './ui/DoodleOverlay';
import type { GameState, TaskKind, ReturnSummary } from './types';
// ItemCategory used inside inventory components
import type { GameEvent } from './systems/engine';
import { DEV_TOOLS_ENABLED } from './dev/config';
import { DevPanel } from './dev/DevPanel';

// ---------- Modal/component imports (extracted from this file) ----------
import {
  DiscoveryModal,
  HireCelebrationModal,
  DeathModal,
  EventModal,
  QuestLogModal,
  LetterModal,
  StoryLetterModal,
  DailyRewardsModal,
  RealmMapModal,
} from './components/modals';
// PageBlockRenderer used inside JournalPanel/DiscoveryModal/StoryLetterModal
// formatStat used inside inventory/tabs components
import { SatchelCategorized } from './components/inventory';
import {
  WoodcuttingTab,
  CarvingTab,
  MiningTab,
  SmithingTab,
  AlchemyTab,
  EnchantingTab,
  CharacterSheetTab,
  SkillsOverviewTab,
  EconomyLedgerTab,
  ShopTab,
  AdventurerPanel,
  HelpersTab,
  PerksTab,
  InnkeepCounterTab,
  ExpensesTab,
  PrestigeTab,
  JournalPanel,
  LedgerPanel,
} from './components/tabs';
import { CombatTab } from './components/combat';
import { GoalTracker } from './components/GoalTracker';

const TICK_MS = 100;
const SAVE_INTERVAL_MS = 15000;
const IDLE_CYCLE_MS = 10000;

type District = 'gather' | 'workshop' | 'fight' | 'town' | 'self';
type SubTab = string;

const DISTRICTS: { id: District; label: string; icon: string; subtabs: { id: SubTab; label: string }[] }[] = [
  { id: 'gather',   label: 'Gather',   icon: 'ti-tree',           subtabs: [
    { id: 'woodcutting', label: 'Woodcutting' },
    { id: 'mining',      label: 'Mining' },
  ]},
  { id: 'workshop', label: 'Workshop', icon: 'ti-tool',           subtabs: [
    { id: 'carving',  label: 'Carving' },
    { id: 'smithing', label: 'Smithing' },
    { id: 'alchemy',  label: 'Alchemy' },
    { id: 'enchanting', label: 'Enchanting' },
  ]},
  { id: 'fight',    label: 'Fight',    icon: 'ti-sword',          subtabs: [{ id: 'combat',      label: 'Combat' }] },
  { id: 'town',     label: 'Town',     icon: 'ti-building-store', subtabs: [
    { id: 'shop',     label: 'Shop' },
    { id: 'counter',  label: "Maggie's Counter" },
    { id: 'helpers',  label: 'Hired Help' },
    { id: 'expenses', label: 'Expenses' },
  ]},
  { id: 'self',     label: 'Self',     icon: 'ti-user',           subtabs: [
    { id: 'character', label: 'Adventurer' },
    { id: 'skills',    label: 'Skills' },
    { id: 'economy',   label: 'Ledger' },
    { id: 'perks',     label: 'Skill Trees' },
    { id: 'cookbooks', label: 'Cook the Books' },
  ]},
];

let _stateRef: GameState = freshState();

// Journal unlock toasts. Pushed when checkJournalUnlocks fires, drained by the UI.
type JournalToast = { id: number; kind: 'achievement' | 'discovery'; name: string };
const _journalToasts: JournalToast[] = [];
let _journalToastId = 0;
function pushJournalToast(kind: 'achievement' | 'discovery', name: string) {
  _journalToasts.push({ id: ++_journalToastId, kind, name });
}
function drainJournalToasts(): JournalToast[] {
  const out = _journalToasts.slice();
  _journalToasts.length = 0;
  return out;
}

export default function App() {
  const [, setTick] = useState(0);
  const forceRerender = () => setTick((n) => n + 1);

  const [district, setDistrict] = useState<District>('gather');
  const [subtab, setSubtab] = useState<SubTab>('woodcutting');
  // Push subtab to engine so combat coin sounds only play on the combat tab.
  useEffect(() => { setCombatTabActive(subtab === 'combat'); }, [subtab]);
  const [toastText, setToastText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const lastSaveRef = useRef(Date.now());
  const initialized = useRef(false);

  const [returnSummary, setReturnSummary] = useState<ReturnSummary | null>(null);
  const [deathEvent, setDeathEvent] = useState<{ coinLost: number; foeName: string; line: string } | null>(null);
  const [activeEvent, setActiveEvent] = useState<RandomEventDef | null>(null);
  const [activeLetter, setActiveLetter] = useState<LetterContents | null>(null);
  const [activeStoryLetter, setActiveStoryLetter] = useState<StoryLetter | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [dailyRewardsOpen, setDailyRewardsOpen] = useState(false);
  const [hireCelebration, setHireCelebration] = useState<string | null>(null);
  const [journalToasts, setJournalToasts] = useState<JournalToast[]>([]);

  // Idle status cycle
  const [idleIndex, setIdleIndex] = useState(0);

  // One-time integrity check: surfaces missing helpers or stale registry entries.
  // Runs only in dev (DEV_TOOLS_ENABLED), and only on first mount.
  useEffect(() => {
    if (!DEV_TOOLS_ENABLED) return;
    const issues = validateTaskRegistry(HELPERS as { id: string; kind: TaskKind; taskId: string }[]);
    if (issues.length) {
      console.warn('[task registry] Integrity issues found:');
      for (const i of issues) console.warn('  - ' + i);
    } else {
      console.log('[task registry] All tasks valid (' + TASK_REGISTRY.length + ' tasks registered)');
    }
  }, []);

  // Boot
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const { state, offlineSeconds } = loadGame();
    _stateRef = state;
    maybeResetDailyShop(_stateRef);
    updateLetterQueue(_stateRef);
    if (offlineSeconds > 0) {
      const summary = applyOfflineProgress(_stateRef, offlineSeconds);
      if (summary) setReturnSummary(summary);
    } else if (!localStorage.getItem('splinterwood_intro_seen')) {
      log('You arrive in Splinterwood. Maggie the Innkeep eyes you up.', 'gold');
      log('Try chopping a Crooked Twig.');
      localStorage.setItem('splinterwood_intro_seen', '1');
    }
    forceRerender();
  }, []);

  // Convert engine events into visual effects (particles, floaters)
  function handleGameEvent(ev: GameEvent) {
    function getTaskCardCenter(taskId: string): { x: number; y: number } | null {
      const el = document.querySelector(`[data-task-id="${taskId}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    // Center point of the foe pane in the new combat arena layout.
    // Falls back to the legacy task card lookup if we're outside the arena.
    function getFoePaneCenter(): { x: number; y: number } | null {
      const el = document.querySelector('.foe-pane');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    // Flash a damage overlay on a combat pane element.
    function flashDamage(selector: string) {
      const el = document.querySelector(selector);
      if (!el) return;
      // Restart the flash without a synchronous forced reflow (offsetWidth reads
      // force layout every hit, which janks at swing speed on a rich page).
      el.classList.remove('damage-flash');
      requestAnimationFrame(() => el.classList.add('damage-flash'));
    }
    // The "finish point" of a progress bar — right edge, vertically centered.
    function getProgressBarEnd(taskId: string): { x: number; y: number } | null {
      const card = document.querySelector(`[data-task-id="${taskId}"]`);
      if (!card) return null;
      const bar = card.querySelector('.progress-wrap');
      if (!bar) return getTaskCardCenter(taskId);
      const r = bar.getBoundingClientRect();
      return { x: r.right, y: r.top + r.height / 2 };
    }
    function getCoinDisplayCenter(): { x: number; y: number } | null {
      const el = document.querySelector('.quick-stat-coin');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    if (ev.type === 'task_started') {
      // Placeholder click sound on the active gather/craft buttons.
      // Each skill gets its own characteristic sound so you hear the difference.
      switch (ev.kind) {
        case 'wc': playSfx('chop'); break;
        case 'mn': playSfx('mine'); break;
        case 'cv': playSfx('craft'); break;
        case 'sm': playSfx('smith'); break;
        case 'al': playSfx('craft'); break;
        // combat already plays its own sounds on swing
      }
    } else if (ev.type === 'gather_complete') {
      const pos = getProgressBarEnd(ev.taskId);
      if (pos) {
        spawnSawdust(pos.x, pos.y, 18);
        spawnFloater(pos.x, pos.y - 24, `+${ev.amount}`, '#3d5a2b');
        // Pick per-skill sound: 'chop' for woodcutting, 'mine' for mining
        playSfx(ev.kind === 'mn' ? 'mine' : 'chop');
      }
    } else if (ev.type === 'craft_complete') {
      const pos = getProgressBarEnd(ev.taskId);
      if (pos) {
        spawnSparks(pos.x, pos.y, 22);
        spawnFloater(pos.x, pos.y - 24, '✓', '#3d5a2b');
        // Per-skill craft sound — smithing gets the heavier clang, carving the lighter chime
        playSfx(ev.kind === 'sm' ? 'smith' : 'craft');
      }
    } else if (ev.type === 'foe_hit') {
      // Prefer the new combat arena foe pane; fall back to legacy card.
      const pos = getFoePaneCenter() ?? getTaskCardCenter(ev.foeId);
      if (pos) {
        spawnSparks(pos.x + 20, pos.y, 14);
        spawnFloater(pos.x + 30, pos.y, `-${ev.damage}`, '#8a1a1a');
        playSfx('hit');
      }
      flashDamage('.foe-pane');
    } else if (ev.type === 'foe_defeated') {
      // Coin burst at the foe pane in the new layout (with fallback).
      const pos = getFoePaneCenter() ?? getTaskCardCenter(ev.foeId);
      if (pos) {
        spawnCoinBurst(pos.x, pos.y, 14);
        spawnFloater(pos.x, pos.y - 20, `+${ev.coinGained}`, '#a07a23');
        playSfx('defeat');
      }
    } else if (ev.type === 'player_hit') {
      // Flash the HP quick-stat AND the player combat pane.
      const el = document.querySelector('.quick-stat-hp');
      if (el) {
        el.classList.remove('hit-flash');
        requestAnimationFrame(() => el.classList.add('hit-flash'));
      }
      flashDamage('.player-pane');
      playSfx('player_hit');
    } else if (ev.type === 'level_up') {
      const pos = getCoinDisplayCenter();
      if (pos) {
        spawnLevelUp(pos.x, pos.y - 40);
        spawnFloater(pos.x, pos.y - 60, `${ev.skill} Lv ${ev.level}!`, '#a07a23');
      }
      playSfx('levelup');
    } else if (ev.type === 'helper_hired') {
      // Big celebration: confetti from viewport center + hire sfx + modal
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight * 0.45;
      spawnConfetti(cx, cy, 80);
      // A small second wave from each side
      window.setTimeout(() => { spawnConfetti(cx - 200, cy, 40); spawnConfetti(cx + 200, cy, 40); }, 200);
      playSfx('hire');
      setHireCelebration(ev.helperId);
    }
  }

  // Game loop
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      let dt = Math.min((now - _stateRef.lastTick) / 1000, 1);
      // Dev fast-forward: scale dt by 10x if enabled
      if (DEV_TOOLS_ENABLED && (window as any).__devFastForward) dt *= 10;
      _stateRef.lastTick = now;
      tickTask(_stateRef, dt);
      checkQuest(_stateRef);
      maybeResetDailyShop(_stateRef);
      updateLetterQueue(_stateRef);
      pruneExpiredBuffs(_stateRef);

      // Drain engine events and spawn visual effects
      const events = drainEvents();
      const journalCtx: { foeDefeatedId?: string; treeChoppedId?: string; itemTouchedId?: string } = {};
      for (const ev of events) {
        handleGameEvent(ev);
        // Aggregate context for journal discovery checks
        if (ev.type === 'foe_defeated')    journalCtx.foeDefeatedId = ev.foeId;
        if (ev.type === 'gather_complete' && ev.kind === 'wc') journalCtx.treeChoppedId = ev.taskId;
        if (ev.type === 'item_touched')    journalCtx.itemTouchedId = ev.itemId;
      }
      // Check journal unlocks once per tick using accumulated context
      const unlocks = checkJournalUnlocks(_stateRef, journalCtx);
      if (unlocks.length) {
        // Push them through the unlock queue (UI shows toasts)
        for (const u of unlocks) pushJournalToast(u.kind, u.entry.name);
      }
      // Check for death event surfaced by engine
      const death = consumeDeath();
      if (death) setDeathEvent(death);
      // Random events are disabled for now. The system (data/events.ts +
      // EventModal) is kept intact; re-enable by uncommenting this block.
      // if (!activeEvent) {
      //   const ev = maybeFireEvent(_stateRef);
      //   if (ev) {
      //     consumeEvent();
      //     setActiveEvent(ev);
      //   }
      // }
      // Save periodically
      if (now - lastSaveRef.current > SAVE_INTERVAL_MS) {
        saveGame(_stateRef);
        lastSaveRef.current = now;
      }
      // Drain accumulated journal toasts so the UI can show them
      const newToasts = drainJournalToasts();
      if (newToasts.length) {
        setJournalToasts((cur) => [...cur, ...newToasts]);
        // Auto-expire each toast after 4s
        for (const t of newToasts) {
          window.setTimeout(() => {
            setJournalToasts((cur) => cur.filter(x => x.id !== t.id));
          }, 4000);
        }
      }
      // Drain toast queue
      const t = consumeToast();
      if (t) {
        setToastText(t.msg);
        setToastVisible(true);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2400);
      }
      forceRerender();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Idle status text cycles every IDLE_CYCLE_MS
  useEffect(() => {
    const id = window.setInterval(() => {
      setIdleIndex((i) => (i + 1) % IDLE_STATUSES.length);
    }, IDLE_CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  // Save on unload
  useEffect(() => {
    const handler = () => {
      // Skip saving if a wipe is in progress (Burn the Ledger / dev FULL RESET)
      if ((window as any).__splinterwood_wiped) return;
      saveGame(_stateRef);
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Global button click effect — spawn an ink splat at the click point + play click sfx
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest('button');
      if (!btn) return;
      if ((btn as HTMLButtonElement).disabled) return;
      unlockAudio();
      // Ensure music is running once we have a user gesture (browsers block autoplay).
      const floor = getCurrentFloor(_stateRef);
      setMusicTrack(floor.id);
      spawnInkSplat(e.clientX, e.clientY, 14);
      // Buttons can opt out of the global page-turn click sound by adding the
      // "no-click-sfx" class. Used for money buttons (which fire 'coin' instead)
      // and the combat swing button (which uses 'hit' on contact).
      if (btn.classList.contains('no-click-sfx')) return;
      playSfx('click');
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Music coordinator — react to floor changes and start the right track.
  // (Initial start happens on first click above; this re-syncs on travel.)
  useEffect(() => {
    const floor = getCurrentFloor(_stateRef);
    setMusicTrack(floor.id);
  }, [_stateRef.currentFloor]);

  const s = _stateRef;
  s.maxHp = Big(totalMaxHp(s));
  if (bGt(s.hp, s.maxHp)) s.hp = s.maxHp;

  // Theme the page by current floor (read by CSS via body[data-floor])
  if (typeof document !== 'undefined') {
    document.body.dataset.floor = s.currentFloor ?? 'splinterwood';
  }

  const currentSubtabs = DISTRICTS.find(d => d.id === district)?.subtabs ?? [];

  return (
    <>
      <header>
        <h1>
          The Splinterwood Ledger
          <span className="small">— A faithful accounting of one adventurer's tedium —</span>
        </h1>
      </header>

      <div className="banner-row">
        <StatusBanner state={s} idleStatus={IDLE_STATUSES[idleIndex]} />
        <LetterNode
          state={s}
          onOpen={() => {
            const pending = s.pendingStoryLetters ?? [];
            if (pending.length === 0) return;
            const letter = STORY_LETTERS_BY_ID[pending[0]];
            if (letter) setActiveStoryLetter(letter);
          }}
        />
        <button
          className="map-button"
          onClick={() => setMapOpen(true)}
          title="Open the realm map"
        >
          <i className="ti ti-map-2" aria-hidden="true"></i>
          <span>Map</span>
        </button>
        {/* Daily Rewards button — opens the 30-day reward track. Shows a
            notify dot when today's reward is available to claim. */}
        <button
          className={`daily-rewards-button no-click-sfx ${shouldOfferLetter(s) ? 'available' : ''}`}
          onClick={() => setDailyRewardsOpen(true)}
          title="Open the daily rewards track"
        >
          <i className="ti ti-gift" aria-hidden="true"></i>
          <span>Daily</span>
          {shouldOfferLetter(s) && <span className="daily-rewards-dot" aria-label="available">●</span>}
        </button>
      </div>

      <GoalTracker state={s} />

      <div className="layout">
        {/* LEFT RAIL: Districts */}
        <nav className="district-rail">
          {DISTRICTS.map((d) => {
            // Per-district notification state.
            // 'self'  breathes when ANY skill has unspent perk points (resource-to-spend).
            // 'town'  shows a "look here" dot when there's an affordable hire available.
            let breathing = false;
            let dotOnly = false;
            if (d.id === 'self') {
              breathing = Object.values(s.skills).some(sk => (sk?.perkPoints ?? 0) > 0)
                       || (s.leadershipPoints ?? 0) > 0;
            }
            if (d.id === 'town') {
              dotOnly = HELPERS.some((h) => {
                if (s.helpersHired[h.id]) return false;
                if (h.requiredSkill && h.requiredLevel && s.skills[h.requiredSkill].level < h.requiredLevel) return false;
                if (bLt(s.coin, h.hireCost)) return false;
                return true;
              });
            }
            const showDot = breathing || dotOnly;
            return (
              <button
                key={d.id}
                className={`district-btn ${district === d.id ? 'active' : ''} ${breathing ? 'breathing' : ''}`}
                onClick={() => {
                  setDistrict(d.id);
                  setSubtab(d.subtabs[0].id);
                }}
              >
                <i className={`ti ${d.icon}`} aria-hidden="true"></i>
                <span>{d.label}</span>
                {showDot && <span className="district-notify-dot" aria-label="attention">●</span>}
              </button>
            );
          })}
          <div className="district-rail-spacer"></div>
          {/* Always-visible quick stats at bottom of rail */}
          <div className="district-rail-stats">
            <div className="quick-stat quick-stat-coin"><span>Coin</span><AnimatedNumber value={s.coin} /></div>
            <div className="quick-stat quick-stat-hp"><span>HP</span><AnimatedNumber value={Math.max(0, Math.floor(bToNumber(s.hp)))} format={(n) => `${n}/${bToNumber(s.maxHp)}`} /></div>
          </div>
        </nav>

        {/* CENTER: Main action area */}
        <main className="main-area">
          <div className="panel main-panel">
            <div className="tabs">
              {currentSubtabs.map((st) => {
                // Notification cues per sub-tab.
                // - 'helpers': dot pulse when there's an affordable hire (low-priority "look here")
                // - 'perks':   breathing color + dot when perk points are sitting unspent (resource-to-spend)
                let notify = false;
                let breathing = false;
                if (st.id === 'helpers') {
                  notify = HELPERS.some((h) => {
                    if (s.helpersHired[h.id]) return false;
                    if (h.requiredSkill && h.requiredLevel && s.skills[h.requiredSkill].level < h.requiredLevel) return false;
                    if (bLt(s.coin, h.hireCost)) return false;
                    return true;
                  });
                }
                if (st.id === 'perks') {
                  breathing = Object.values(s.skills).some(sk => (sk?.perkPoints ?? 0) > 0)
                           || (s.leadershipPoints ?? 0) > 0;
                  notify = breathing;
                }
                return (
                  <button
                    key={st.id}
                    className={`tab ${subtab === st.id ? 'active' : ''} ${notify ? 'has-notify' : ''} ${breathing ? 'breathing' : ''}`}
                    onClick={() => setSubtab(st.id)}
                  >{st.label}{notify && <span className="tab-notify-dot" aria-label="attention">●</span>}</button>
                );
              })}
            </div>

            <div className="main-scroll">
              {subtab === 'woodcutting' && <WoodcuttingTab state={s} onAction={forceRerender} />}
              {subtab === 'mining'      && <MiningTab     state={s} onAction={forceRerender} />}
              {subtab === 'carving'     && <CarvingTab     state={s} onAction={forceRerender} />}
              {subtab === 'smithing'    && <SmithingTab    state={s} onAction={forceRerender} />}
              {subtab === 'alchemy'     && <AlchemyTab     state={s} onAction={forceRerender} />}
              {subtab === 'enchanting'  && <EnchantingTab  state={s} onAction={forceRerender} />}
              {subtab === 'combat'      && <CombatTab      state={s} onAction={forceRerender} />}
              {subtab === 'shop'        && <ShopTab        state={s} onAction={forceRerender} />}
              {subtab === 'counter'     && <InnkeepCounterTab state={s} onAction={forceRerender} />}
              {subtab === 'helpers'     && <HelpersTab     state={s} onAction={forceRerender} />}
              {subtab === 'expenses'    && <ExpensesTab    state={s} onAction={forceRerender} />}
              {subtab === 'character'   && <CharacterSheetTab state={s} onAction={forceRerender} />}
              {subtab === 'skills'      && <SkillsOverviewTab state={s} />}
              {subtab === 'economy'     && <EconomyLedgerTab state={s} />}
              {subtab === 'perks'       && <PerksTab       state={s} onAction={forceRerender} />}
              {subtab === 'cookbooks'   && <PrestigeTab    state={s} onAction={forceRerender} />}
            </div>
          </div>
        </main>

        {/* RIGHT: Adventurer details + tabbed panels */}
        <RightRail
          state={s}
          onAction={forceRerender}
          returnSummary={returnSummary}
          onDismissSummary={() => setReturnSummary(null)}
        />
      </div>

      <div className="footer">v0.82 · Splinterwood · save corruption fixed, XP scaling visible</div>

      <DoodleOverlay state={s} />
      <ParticleLayer />

      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toastText}</div>

      <div className="journal-toast-stack">
        {journalToasts.map((t) => (
          <div key={t.id} className="journal-toast">
            <i className={`ti ${t.kind === 'achievement' ? 'ti-trophy' : 'ti-bookmark'}`} aria-hidden="true"></i>
            <div className="journal-toast-body">
              <div className="journal-toast-kind">{t.kind === 'achievement' ? 'Achievement' : 'Discovery'}</div>
              <div className="journal-toast-name">{t.name}</div>
            </div>
          </div>
        ))}
      </div>

      {deathEvent && (
        <DeathModal event={deathEvent} onDismiss={() => setDeathEvent(null)} />
      )}

      {activeEvent && (
        <EventModal
          event={activeEvent}
          state={s}
          onClose={() => setActiveEvent(null)}
          onAction={forceRerender}
        />
      )}

      {activeLetter && (
        <LetterModal
          letter={activeLetter}
          onClaim={() => {
            claimLetter(s, activeLetter);
            if (activeLetter.coin > 0) playSfx('coin');
            forceRerender();
            setActiveLetter(null);
          }}
          onClose={() => setActiveLetter(null)}
        />
      )}

      {activeStoryLetter && (
        <StoryLetterModal
          letter={activeStoryLetter}
          onClose={() => {
            // Apply any rewards and dismiss; remove from queue
            const r = activeStoryLetter.reward;
            if (r?.coin) { addCoin(s, r.coin); playSfx('coin'); }
            if (r?.perkPoint) { s.skills.combat.perkPoints += 1; }
            s.pendingStoryLetters = (s.pendingStoryLetters ?? []).filter(id => id !== activeStoryLetter.id);
            forceRerender();
            setActiveStoryLetter(null);
          }}
        />
      )}

      {mapOpen && (
        <RealmMapModal
          state={s}
          onClose={() => setMapOpen(false)}
          onTravel={(floorId) => {
            // Visiting Greystone for the first time claims Maggie's intro quest
            if (floorId === 'greystone_reach') s.questFlags.visited_greystone = true;
            // Visiting the Cloud Islands for the first time unlocks Alchemy/Enchanting
            if (floorId === 'floor_3') s.questFlags.visited_floor3 = true;
            setCurrentFloor(s, floorId);
            forceRerender();
            setMapOpen(false);
          }}
        />
      )}

      {dailyRewardsOpen && (
        <DailyRewardsModal
          state={s}
          onClose={() => setDailyRewardsOpen(false)}
          onClaim={() => {
            const result = claimDailyReward(s);
            if (result.ok) forceRerender();
          }}
        />
      )}

      {hireCelebration && (
        <HireCelebrationModal
          helperId={hireCelebration}
          onClose={() => setHireCelebration(null)}
        />
      )}

      {/* Discovery modal — fires when something lore-related drops (page today,
          curio/note in the future). Reads head of pendingDiscoveries queue;
          dismissing shifts the queue so the next discovery shows automatically. */}
      {(s.pendingDiscoveries?.length ?? 0) > 0 && (
        <DiscoveryModal
          discovery={s.pendingDiscoveries![0]}
          onClose={() => {
            s.pendingDiscoveries!.shift();
            forceRerender();
          }}
        />
      )}

      {DEV_TOOLS_ENABLED && <DevPanel state={s} onAction={forceRerender} />}
    </>
  );
}

/* ---------- Status Banner (prominent, full-width, idle pressure) ---------- */
function StatusBanner({ state, idleStatus }: { state: GameState; idleStatus: string }) {
  const isIdle = !state.task;
  let label: string;
  if (state.task) {
    const def = getTaskDef(state.task.kind, state.task.id);
    label = def ? activeStatusText(state.task.kind, def.name) : 'doing something';
  } else {
    label = idleStatus;
  }
  return (
    <div className={`status-banner ${isIdle ? 'idle' : 'active'}`}>
      <span className="status-prefix">Currently</span>
      <span className="status-text">{label}</span>
      {isIdle && <span className="status-nudge">— pick something.</span>}
    </div>
  );
}

/* ---------- Right Rail (tabbed: Self/Quest/Pack/Journal/Log/Save) ---------- */
type RightTab = 'adventurer' | 'quest' | 'satchel' | 'journal' | 'log' | 'ledger';

function RightRail({ state, onAction, returnSummary, onDismissSummary }: {
  state: GameState;
  onAction: () => void;
  returnSummary: ReturnSummary | null;
  onDismissSummary: () => void;
}) {
  const [tab, setTab] = useState<RightTab>('adventurer');
  const [questLogOpen, setQuestLogOpen] = useState(false);
  // If a return summary just arrived, jump to the log tab so the player sees it
  useEffect(() => {
    if (returnSummary) setTab('log');
  }, [returnSummary]);

  return (
    <aside className="right-rail">
      {questLogOpen && (
        <QuestLogModal state={state} onClose={() => setQuestLogOpen(false)} />
      )}
      <div className="right-rail-tabs">
        {([
          ['adventurer', 'ti-user',         'Self'],
          ['quest',      'ti-scroll',       'Quest'],
          ['satchel',    'ti-briefcase',    'Pack'],
          ['journal',    'ti-notebook',     'Tome'],
          ['log',        'ti-list',         'Log'],
          ['ledger',     'ti-book',         'Save'],
        ] as [RightTab, string, string][]).map(([id, icon, label]) => {
          // Tome tab gets a notify dot when there are unread pages.
          let notify = false;
          if (id === 'journal') {
            const unread = state.pagesUnread ?? {};
            notify = Object.keys(unread).some(k => unread[k]);
          }
          return (
            <button
              key={id}
              className={`right-tab ${tab === id ? 'active' : ''}`}
              onClick={() => (id === 'quest' ? setQuestLogOpen(true) : setTab(id))}
              aria-label={label}
            >
              <i className={`ti ${icon}`} aria-hidden="true"></i>
              <span>{label}</span>
              {notify && <span className="right-tab-notify-dot" aria-label="attention">●</span>}
            </button>
          );
        })}
      </div>

      <div className="right-rail-content">
        {tab === 'adventurer' && <AdventurerPanel state={state} />}
        {tab === 'quest'      && <QuestArea state={state} />}
        {tab === 'satchel'    && <SatchelCategorized state={state} onAction={onAction} />}
        {tab === 'journal'    && <JournalPanel state={state} />}
        {tab === 'log'        && (
          <div className="log-panel-wrap">
            <div className="log">
              {getLogs().map((entry) => (
                <div key={entry.id} className={`log-entry ${entry.cls ?? ''}`}>
                  {entry.msg}
                  {entry.count > 1 && <span className="log-count"> ×{entry.count}</span>}
                </div>
              ))}
            </div>
            {returnSummary && <ReturnSummaryCard summary={returnSummary} onDismiss={onDismissSummary} />}
          </div>
        )}
        {tab === 'ledger'     && <LedgerPanel state={state} onAction={onAction} />}
      </div>
    </aside>
  );
}

/* AdventurerPanel moved to src/components/tabs/AdventurerPanel.tsx */

/* JournalPanel (with HelpSectionBody, PagesSectionBody, JournalSectionBody)
   moved to src/components/tabs/JournalPanel.tsx
   LedgerPanel moved to src/components/tabs/LedgerPanel.tsx */

/* SatchelCategorized, EquipmentSatchelSection, EquipmentStackRow,
   EquipmentInstanceRow, EquipmentInstanceTooltip, InvItemRow,
   ItemTooltipFloater all moved to src/components/inventory/.
   getInstanceSellPrice, sellInstance, sellAllUnprotectedEquipment moved
   to systems/playerStats.ts (they're pure logic). */

/* ---------- Wilds: Woodcutting ---------- */
// =============================================================================
// TaskTabRenderer — single rendering implementation for all task tabs.
//
// Every gather/workshop tab is now a thin wrapper around this. Adding a new
// task to the registry will automatically render correctly on its tab; adding
// a new task tab is a one-line wrapper.
//
// The renderer pulls all uniform behavior in one place:
//   - Helper detection (every task auto-checks for an assigned helper)
//   - Active-task progress display
//   - Active swing button + stop button
//   - Start button with affordability check (for craft tasks)
//   - Locked label when level requirement not met
//
// What differs between tabs is data-driven:
//   - The TaskRegistryEntry for each task supplies button labels and icons
//   - Gather vs craft is determined by the underlying task data (presence of `cost`)
// =============================================================================

/* TaskTabRenderer, TaskCard, defaultIconForTask moved to
   src/components/tabs/ — see barrel index.ts */

// =============================================================================
// Thin wrappers — one per tab. Each declares the tab's intro text and forwards
// to the renderer. Adding a new task to TASK_REGISTRY automatically extends
// these tabs; adding a new tab is a single new wrapper.
// =============================================================================

/* WoodcuttingTab / CarvingTab / MiningTab / SmithingTab moved to
   src/components/tabs/ — see barrel index.ts */

/* AbilitiesBar and CombatTab moved to src/components/combat/ — see barrel index.ts */

/* CharacterSheetTab, EquippedInstanceDisplay, StatBlockDisplay moved to
   src/components/tabs/CharacterSheetTab.tsx */


/* SkillsOverviewTab and SkillSpeedSummary moved to
   src/components/tabs/SkillsOverviewTab.tsx */

/* EconomyLedgerTab moved to src/components/tabs/EconomyLedgerTab.tsx */

/* ShopTab moved to src/components/tabs/ShopTab.tsx */

/* HelpersTab moved to src/components/tabs/HelpersTab.tsx */

/* PerksTab and helpers (CategoryTreeView, BranchesView, LadderView, PerkNode)
   moved to src/components/tabs/PerksTab.tsx */

function ReturnSummaryCard({ summary, onDismiss }: { summary: ReturnSummary; onDismiss: () => void }) {
  const xpLines = Object.entries(summary.xpGained)
    .filter(([_k, v]) => (v ?? 0) > 0)
    .map(([k, v]) => `${capitalize(k)} +${fmt(v as number)} XP`);
  const levelLines = Object.entries(summary.levelsGained)
    .filter(([_k, v]) => (v ?? 0) > 0)
    .map(([k, v]) => `${capitalize(k)} +${v} level${(v as number) > 1 ? 's' : ''}`);
  const itemLines = Object.entries(summary.itemsGained)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => `${ITEMS[id]?.name ?? id}: ${n}`);

  return (
    <div className="return-summary">
      <button className="summary-close" onClick={onDismiss} aria-label="Close">✕</button>
      <h3>While You Were Away</h3>
      <div className="summary-elapsed">{formatTime(summary.elapsedSeconds)} passed in Splinterwood.</div>
      {summary.taskName && <div className="summary-line">Task: {summary.taskName} ({summary.taskCompletions} completed)</div>}
      {summary.coinGained > 0 && <div className="summary-line">+{fmt(summary.coinGained)} coin</div>}
      {xpLines.map((l) => <div key={l} className="summary-line">{l}</div>)}
      {levelLines.length > 0 && <div className="summary-line gold">{levelLines.join(', ')}</div>}
      {summary.perkPointsGained > 0 && <div className="summary-line gold">+{summary.perkPointsGained} perk point{summary.perkPointsGained > 1 ? 's' : ''}</div>}
      {itemLines.length > 0 && (
        <>
          <div className="summary-divider">Items</div>
          {itemLines.map((l) => <div key={l} className="summary-line">{l}</div>)}
        </>
      )}
      {summary.rareEvents.length > 0 && (
        <>
          <div className="summary-divider">Of Note</div>
          {summary.rareEvents.map((e) => <div key={e} className="summary-line gold">{e}</div>)}
        </>
      )}
    </div>
  );
}

function capitalize(s: string) { return s[0].toUpperCase() + s.slice(1); }

function QuestArea({ state }: { state: GameState }) {
  const [openGiver, setOpenGiver] = useState<string | null>(null);

  // Collect givers that have at least one VISIBLE step
  const visibleGivers = getQuestGivers().filter((npc) => {
    return QUEST_STEPS.some(q => q.npc === npc && q.visible(state));
  });

  if (visibleGivers.length === 0) {
    return (
      <div style={{ fontStyle: 'italic', color: 'var(--ink-soft)', fontSize: '0.9em' }}>
        No one has work for you yet.
      </div>
    );
  }

  return (
    <>
      {visibleGivers.map((npc) => {
        const npcSteps = QUEST_STEPS.filter(q => q.npc === npc);
        const claimedCount = npcSteps.filter(q => state.questClaimed[q.id]).length;
        const activeStep = activeStepForGiver(state, npc);
        const allDone = claimedCount === npcSteps.length;
        return (
          <div
            key={npc}
            className={`quest-giver-row ${allDone ? 'done' : ''} ${activeStep ? 'has-active' : ''}`}
            onClick={() => setOpenGiver(npc)}
          >
            <span className="quest-giver-name">
              {npc}
              {activeStep && <span className="perk-points-badge">!</span>}
            </span>
            <span className="quest-giver-count">{claimedCount} / {npcSteps.length}</span>
          </div>
        );
      })}
      {openGiver && (
        <QuestLogModal
          state={state}
          initialNpc={openGiver}
          onClose={() => setOpenGiver(null)}
        />
      )}
    </>
  );
}

/* Modals extracted to src/components/modals/ — see barrel index.ts:
   QuestGiverModal, DeathModal, EventModal, LetterModal,
   StoryLetterModal, DailyRewardsModal, RealmMapModal
   (DiscoveryModal, HireCelebrationModal already noted above) */

// LetterNode — shows in the top banner when a STORY letter is pending.
// Story letters are triggered by gameplay thresholds (not daily cadence).
// Daily rewards have moved to their own button beside the Map.
function LetterNode({ state, onOpen }: { state: GameState; onOpen: () => void }) {
  const pending = state.pendingStoryLetters ?? [];
  if (pending.length === 0) return null;
  return (
    <button
      className="letter-node pulsing no-click-sfx"
      onClick={onOpen}
      title="A letter has arrived. Click to open."
    >
      <i className="ti ti-mail" aria-hidden="true"></i>
      <span className="letter-node-label">Letter</span>
    </button>
  );
}

/* InnkeepCounterTab moved to src/components/tabs/InnkeepCounterTab.tsx */

/* ActiveBuffsPanel moved with AdventurerPanel — see
   src/components/tabs/AdventurerPanel.tsx */

/* InvItemRow and ItemTooltipFloater moved to src/components/inventory/ */

/* ---------- Helper progress display ---------- */
/* SwingButton, HelperProgressBar, activeHelperFor extracted to
   src/components/shared/ — see barrel. */
