import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './styles/game.css';
import { WOODCUTTING_NODES } from './data/woodcutting';
import { CARVING_RECIPES } from './data/carving';
import { COMBAT_FOES } from './data/combat';
import { ITEMS, CATEGORY_ORDER, CATEGORY_LABELS } from './data/items';
import { PERK_TREES } from './data/perks';
import { QUEST_STEPS, getQuestGivers } from './data/quests';
import { HELPERS } from './data/helpers';
import { SHOP_ITEMS } from './data/shop';
import { IDLE_STATUSES, activeStatusText } from './data/flavor';
import { maybeFireEvent, consumeEvent, devFireEvent } from './data/events';
import type { RandomEventDef } from './data/events';
import {
  shouldOfferLetter, rollLetter, claimLetter, timeUntilNextLetterMs,
  COUNTER_BUFFS, counterPurchaseCount, buyCounterBuff, MARGIN_DOODLES,
} from './data/letter';
import type { LetterContents } from './data/letter';
import {
  checkJournalUnlocks, getJournalCounts,
  ACHIEVEMENTS, getBestiaryEntries, getAtlasEntries, getCatalogueEntries,
} from './data/journal';
import type { JournalSection } from './data/journal';
import {
  loadGame, saveGame, wipeSave, exportSave, importSave, freshState,
} from './state/save';
import {
  startTask, stopTask, tickTask, checkQuest, buyPerk, sellItem, sellCategory,
  toggleItemLock, payTroll, applyOfflineProgress, getLogs, consumeToast,
  showToast, log, canAfford, hireHelper, buyFromShop, getShopStock,
  maybeResetDailyShop, consumeDeath, getTaskDef, getTaskTime,
  consumeItem, pruneExpiredBuffs, activeStepForGiver, drainEvents,
  doSwing, canSwing, swingCooldownRemaining, SWING_COOLDOWN_MS,
  totalAtk, totalDef, totalMaxHp, xpForLevel, cumulativeXpToLevel,
} from './systems/engine';
import { perkEffect } from './systems/perks';
import { fmt, formatTime } from './systems/format';
import { getItemIcon, getTreeIcon, getFoeIcon, getMineIcon, GenericIcon } from './data/icons';
import { MINING_NODES } from './data/mining';
import { SMITHING_RECIPES } from './data/smithing';
import { FLOORS, getCurrentFloor, setCurrentFloor } from './data/floors';
import type { FloorDef, FloorId } from './data/floors';
import { computePlayerStats, findInstanceById, instanceStats, equipInstance, unequipSlot, isInstanceEquipped, removeInstance } from './systems/playerStats';
import { QUALITY_LABEL, fullItemName, getModifier } from './data/modifiers';
import { ABILITIES, canUseAbility, useAbility, cooldownRemaining } from './systems/abilities';
import { SKILL_INFO, getAllSkillsForDisplay } from './data/skillInfo';
import type { ItemInstance, EquipSlot, QualityTier, StatKey } from './types';
import {
  spawnSawdust, spawnSparks, spawnCoinBurst, spawnInkSplat, spawnLevelUp, spawnFloater, spawnConfetti,
} from './systems/effects';
import { playSfx, unlockAudio, setMusicTrack, getAudioSettings, setAudioSettings } from './systems/audio';
import { ParticleLayer } from './ui/ParticleLayer';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { DoodleOverlay } from './ui/DoodleOverlay';
import type { GameState, SkillId, TaskKind, ItemCategory, ReturnSummary } from './types';
import type { GameEvent } from './systems/engine';
import { DEV_TOOLS_ENABLED } from './dev/config';
import { DevPanel } from './dev/DevPanel';

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
  ]},
  { id: 'fight',    label: 'Fight',    icon: 'ti-sword',          subtabs: [{ id: 'combat',      label: 'Combat' }] },
  { id: 'town',     label: 'Town',     icon: 'ti-building-store', subtabs: [
    { id: 'shop',    label: 'Shop' },
    { id: 'counter', label: "Maggie's Counter" },
    { id: 'helpers', label: 'Hired Help' },
  ]},
  { id: 'self',     label: 'Self',     icon: 'ti-user',           subtabs: [
    { id: 'character', label: 'Adventurer' },
    { id: 'skills',    label: 'Skills' },
    { id: 'economy',   label: 'Ledger' },
    { id: 'perks',     label: 'Skill Trees' },
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
  const [toastText, setToastText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const lastSaveRef = useRef(Date.now());
  const initialized = useRef(false);

  const [returnSummary, setReturnSummary] = useState<ReturnSummary | null>(null);
  const [deathEvent, setDeathEvent] = useState<{ coinLost: number; foeName: string; line: string } | null>(null);
  const [activeEvent, setActiveEvent] = useState<RandomEventDef | null>(null);
  const [activeLetter, setActiveLetter] = useState<LetterContents | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [hireCelebration, setHireCelebration] = useState<string | null>(null);
  const [journalToasts, setJournalToasts] = useState<JournalToast[]>([]);

  // Idle status cycle
  const [idleIndex, setIdleIndex] = useState(0);

  // Boot
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const { state, offlineSeconds } = loadGame();
    _stateRef = state;
    maybeResetDailyShop(_stateRef);
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
    if (ev.type === 'gather_complete') {
      const pos = getProgressBarEnd(ev.taskId);
      if (pos) {
        spawnSawdust(pos.x, pos.y, 18);
        spawnFloater(pos.x, pos.y - 24, `+${ev.amount}`, '#3d5a2b');
        playSfx('chop');
      }
    } else if (ev.type === 'craft_complete') {
      const pos = getProgressBarEnd(ev.taskId);
      if (pos) {
        spawnSparks(pos.x, pos.y, 22);
        spawnFloater(pos.x, pos.y - 24, '✓', '#3d5a2b');
        playSfx('craft');
      }
    } else if (ev.type === 'foe_hit') {
      const pos = getTaskCardCenter(ev.foeId);
      if (pos) {
        spawnSparks(pos.x + 20, pos.y, 14);
        spawnFloater(pos.x + 30, pos.y, `-${ev.damage}`, '#8a1a1a');
        playSfx('hit');
      }
    } else if (ev.type === 'foe_defeated') {
      const pos = getTaskCardCenter(ev.foeId);
      if (pos) {
        spawnCoinBurst(pos.x, pos.y, 14);
        spawnFloater(pos.x, pos.y - 20, `+${ev.coinGained}`, '#a07a23');
        playSfx('defeat');
      }
    } else if (ev.type === 'player_hit') {
      const el = document.querySelector('.quick-stat-hp');
      if (el) {
        el.classList.remove('hit-flash');
        void (el as HTMLElement).offsetWidth;
        el.classList.add('hit-flash');
      }
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
      // Check for random events
      if (!activeEvent) {
        const ev = maybeFireEvent(_stateRef);
        if (ev) {
          consumeEvent();
          setActiveEvent(ev);
        }
      }
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
      // setMusicTrack is idempotent — calling repeatedly with the same id is a no-op.
      const floor = getCurrentFloor(_stateRef);
      setMusicTrack(floor.id);
      spawnInkSplat(e.clientX, e.clientY, 14);
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
  s.maxHp = totalMaxHp(s);
  if (s.hp > s.maxHp) s.hp = s.maxHp;

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
          onOpen={() => setActiveLetter(rollLetter(s))}
        />
        <button
          className="map-button"
          onClick={() => setMapOpen(true)}
          title="Open the realm map"
        >
          <i className="ti ti-map-2" aria-hidden="true"></i>
          <span>Map</span>
        </button>
      </div>

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
              breathing = Object.values(s.skills).some(sk => (sk?.perkPoints ?? 0) > 0);
            }
            if (d.id === 'town') {
              dotOnly = HELPERS.some((h) => {
                if (s.helpersHired[h.id]) return false;
                if (h.requiredSkill && h.requiredLevel && s.skills[h.requiredSkill].level < h.requiredLevel) return false;
                if (s.coin < h.hireCost) return false;
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
            <div className="quick-stat quick-stat-hp"><span>HP</span><AnimatedNumber value={Math.max(0, Math.floor(s.hp))} format={(n) => `${n}/${s.maxHp}`} /></div>
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
                    if (s.coin < h.hireCost) return false;
                    return true;
                  });
                }
                if (st.id === 'perks') {
                  breathing = Object.values(s.skills).some(sk => (sk?.perkPoints ?? 0) > 0);
                  notify = breathing; // also show the dot
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
              {subtab === 'combat'      && <CombatTab      state={s} onAction={forceRerender} />}
              {subtab === 'shop'        && <ShopTab        state={s} onAction={forceRerender} />}
              {subtab === 'counter'     && <InnkeepCounterTab state={s} onAction={forceRerender} />}
              {subtab === 'helpers'     && <HelpersTab     state={s} onAction={forceRerender} />}
              {subtab === 'character'   && <CharacterSheetTab state={s} onAction={forceRerender} />}
              {subtab === 'skills'      && <SkillsOverviewTab state={s} />}
              {subtab === 'economy'     && <EconomyLedgerTab state={s} />}
              {subtab === 'perks'       && <PerksTab       state={s} onAction={forceRerender} />}
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

      <div className="footer">v0.25 · Splinterwood · real music in</div>

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
            forceRerender();
            setActiveLetter(null);
          }}
          onClose={() => setActiveLetter(null)}
        />
      )}

      {mapOpen && (
        <RealmMapModal
          state={s}
          onClose={() => setMapOpen(false)}
          onTravel={(floorId) => {
            // Visiting Greystone for the first time claims Maggie's intro quest
            if (floorId === 'greystone_reach') s.questFlags.visited_greystone = true;
            setCurrentFloor(s, floorId);
            forceRerender();
            setMapOpen(false);
          }}
        />
      )}

      {hireCelebration && (
        <HireCelebrationModal
          helperId={hireCelebration}
          onClose={() => setHireCelebration(null)}
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
  // If a return summary just arrived, jump to the log tab so the player sees it
  useEffect(() => {
    if (returnSummary) setTab('log');
  }, [returnSummary]);

  return (
    <aside className="right-rail">
      <div className="right-rail-tabs">
        {([
          ['adventurer', 'ti-user',         'Self'],
          ['quest',      'ti-scroll',       'Quest'],
          ['satchel',    'ti-briefcase',    'Pack'],
          ['journal',    'ti-notebook',     'Tome'],
          ['log',        'ti-list',         'Log'],
          ['ledger',     'ti-book',         'Save'],
        ] as [RightTab, string, string][]).map(([id, icon, label]) => (
          <button
            key={id}
            className={`right-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
            aria-label={label}
          >
            <i className={`ti ${icon}`} aria-hidden="true"></i>
            <span>{label}</span>
          </button>
        ))}
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

function AdventurerPanel({ state }: { state: GameState }) {
  const stats = computePlayerStats(state);
  return (
    <>
      <div className="adventurer-section">
        <div className="stat-row"><span>Coin</span><AnimatedNumber value={state.coin} /></div>
        <div className="stat-row"><span>Health</span><AnimatedNumber value={Math.max(0, Math.floor(state.hp))} format={(n) => `${n} / ${state.maxHp}`} /></div>
        <div className="stat-row"><span>Attack</span><span>{totalAtk(state)}</span></div>
        <div className="stat-row"><span>Defense</span><span>{totalDef(state)}</span></div>
        <div className="stat-row"><span>Crit Chance</span><span>{formatStat('crit', stats.crit ?? 0)}</span></div>
        <div className="stat-row"><span>Crit Damage</span><span>{formatStat('crit_dmg', stats.crit_dmg ?? 0.5)}</span></div>
        <div className="stat-row"><span>Speed</span><span>{formatStat('speed', stats.speed ?? 0)}</span></div>
      </div>
      <h3>Skills</h3>
      {(() => {
        const all: SkillId[] = ['woodcutting', 'carving', 'combat'];
        if (state.questFlags.visited_greystone) {
          all.push('mining', 'smithing');
        }
        return all;
      })().map((id) => {
        const sk = state.skills[id];
        const need = xpForLevel(sk.level);
        const xpInLvl = Math.floor(sk.xp - cumulativeXpToLevel(sk.level));
        const pct = Math.min(100, (xpInLvl / need) * 100);
        return (
          <div key={id}>
            <div className="stat-row">
              <span>
                {id[0].toUpperCase() + id.slice(1)}
                {sk.perkPoints > 0 && <span className="perk-points-badge">{sk.perkPoints} pp</span>}
              </span>
              <span>Lv {sk.level}</span>
            </div>
            <div className="xp-bar-wrap">
              <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
              <span className="xp-bar-label">{fmt(xpInLvl)} / {fmt(need)} XP</span>
            </div>
          </div>
        );
      })}
      <ActiveBuffsPanel state={state} />
    </>
  );
}

/* ---------- Journal Panel (achievements + discoveries) ---------- */
function JournalPanel({ state }: { state: GameState }) {
  const counts = getJournalCounts(state);
  const [openSection, setOpenSection] = useState<JournalSection | 'help' | null>('tales');

  const sectionDefs: { id: JournalSection | 'help'; label: string; flavor: string }[] = [
    { id: 'tales',     label: 'Tales',     flavor: 'Accounts of notable moments.' },
    { id: 'bestiary',  label: 'Bestiary',  flavor: 'Foes encountered, with attached opinions.' },
    { id: 'atlas',     label: 'Atlas',     flavor: 'Trees of Splinterwood. Sketched, sometimes accurately.' },
    { id: 'catalogue', label: 'Catalogue', flavor: 'A list of everything you have ever held.' },
    { id: 'help',      label: 'Help',      flavor: 'Notes and explanations. The rules of how this ledger works.' },
  ];

  return (
    <>
      {sectionDefs.map((sec) => {
        const open = openSection === sec.id;
        let countLabel: string | null = null;
        if (sec.id !== 'help') {
          const c = counts[sec.id as JournalSection];
          countLabel = `${c.unlocked} / ${c.total}`;
        }
        return (
          <div key={sec.id} className="journal-section">
            <div
              className="journal-section-header"
              onClick={() => setOpenSection(open ? null : sec.id)}
            >
              <span className="journal-section-title">{sec.label}</span>
              {countLabel && <span className="journal-section-count">{countLabel}</span>}
            </div>
            {open && (sec.id === 'help'
              ? <HelpSectionBody />
              : <JournalSectionBody state={state} section={sec.id as JournalSection} flavor={sec.flavor} />
            )}
          </div>
        );
      })}
    </>
  );
}

// ---------- Help Section ----------
// Plain explanations of the game's main mechanics. Add new entries here as
// the game grows. Stays in the Tome so it doesn't take a top-level slot.
function HelpSectionBody() {
  const topics: { title: string; body: string }[] = [
    {
      title: 'Hiring Help',
      body: 'In the Town district there is "Hired Help." Spending coin to hire someone permanently automates that gather or craft node at full player speed. You never need to manage it again. Tier-1 helpers are cheap. Tier-4 helpers cost real money. The goal: have someone working everywhere below your cutting edge.',
    },
    {
      title: 'Equipment & Quality',
      body: 'Every weapon, shield, or armor piece rolls a Quality Tier (Regrettable / Forgettable / Adequate / Suspicious / Unreasonable) and sometimes a Modifier like Sharp, Hasty, or Cursed. Two of the same item can be very different. Check the Self district\'s Adventurer tab to see your stats.',
    },
    {
      title: 'Stats',
      body: 'Attack and Defense are the obvious ones. Crit Chance triggers a damage bonus on hits. Speed makes you swing faster in combat. Gather/Craft Speed affects out-of-combat tasks. Drop Rate and Coin Find improve loot from foes. All shown on the Adventurer sheet, with zeros included so you know what\'s available to build toward.',
    },
    {
      title: 'Combat Abilities',
      body: 'Each ability has a cooldown. Unlock them by leveling Combat. Use them whenever — they continue ticking down even outside combat, so a wise adventurer enters fights already prepared.',
    },
    {
      title: 'Floors',
      body: 'The world has multiple realms ("floors"). Splinterwood is your starting home. Greystone Reach unlocks once Maggie writes to you about it. Skills you unlock on one floor stay with you forever — they don\'t reset when you change locations. The realm map (top of screen) lets you visit any unlocked floor.',
    },
    {
      title: "Maggie's Letters",
      body: "Every 20 hours or so, Maggie sends a letter with coin and Daily Bread tokens. Streak counts up if you claim consistently. Miss two days in a row and the streak resets. Spend Daily Bread at Maggie's Counter (Town district) on permanent buffs.",
    },
    {
      title: 'Selling Equipment',
      body: 'In the Satchel, equipment is grouped by name. Click to expand and see each instance. Sell the rolls you don\'t want — equipped items, locked items, and Suspicious-or-better items are all safe from "Sell all unprotected gear."',
    },
    {
      title: 'Random Events',
      body: 'Roughly every 8-12 minutes of active play, something interesting may happen. A trader, a coin in the dirt, a goblin pickpocket. Click choices to respond. None of them are required.',
    },
  ];
  return (
    <div className="journal-section-body help-section-body">
      <div className="journal-section-flavor">Notes and explanations. The rules of how this ledger works.</div>
      {topics.map((t) => (
        <div key={t.title} className="help-topic">
          <div className="help-topic-title">{t.title}</div>
          <div className="help-topic-body">{t.body}</div>
        </div>
      ))}
    </div>
  );
}

function JournalSectionBody({ state, section, flavor }: {
  state: GameState; section: JournalSection; flavor: string;
}) {
  const u = state.journalUnlocked ?? {};
  let entries: { id: string; name: string; description: string; hint?: string; category?: string }[] = [];
  if (section === 'tales') {
    entries = ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name, description: a.description, hint: a.hint }));
  } else if (section === 'bestiary') {
    entries = getBestiaryEntries();
  } else if (section === 'atlas') {
    entries = getAtlasEntries();
  } else if (section === 'catalogue') {
    entries = getCatalogueEntries();
  }
  return (
    <div className="journal-section-body">
      <div className="journal-section-flavor">{flavor}</div>
      {entries.map((e) => {
        const unlocked = !!u[e.id];
        return (
          <div key={e.id} className={`journal-entry ${unlocked ? 'unlocked' : 'locked'}`}>
            <div className="journal-entry-name">
              {unlocked ? e.name : '???'}
              {e.category && <span className="journal-entry-category"> · {e.category}</span>}
            </div>
            <div className="journal-entry-desc">
              {unlocked ? e.description : (e.hint ?? 'Not yet discovered.')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LedgerPanel({ state, onAction }: { state: GameState; onAction: () => void }) {
  return (
    <>
      <button style={{ width: '100%', marginBottom: 6 }} onClick={() => { saveGame(state); showToast('Saved.'); }}>Save Now</button>
      <button style={{ width: '100%', marginBottom: 6 }} onClick={() => {
        const data = exportSave(state);
        window.prompt('Copy this save string:', data);
      }}>Export Save</button>
      <button style={{ width: '100%', marginBottom: 6 }} onClick={() => {
        const raw = window.prompt('Paste save string:');
        if (!raw) return;
        try {
          const next = importSave(raw);
          Object.assign(state, next);
          saveGame(state);
          onAction();
          showToast('Save imported.');
        } catch (_e) {
          alert('That save string is gibberish.');
        }
      }}>Import Save</button>
      <button className="danger" style={{ width: '100%' }} onClick={() => {
        if (!window.confirm('Burn the ledger? All progress lost.')) return;
        wipeSave();
        localStorage.removeItem('splinterwood_intro_seen');
        window.location.reload();
      }}>Burn the Ledger</button>
      <div style={{ fontSize: '0.78em', fontStyle: 'italic', marginTop: 8, color: 'var(--ink-soft)' }}>
        Auto-saves every 15s. Offline progress is granted on return.
      </div>
    </>
  );
}

function SatchelCategorized({ state, onAction }: { state: GameState; onAction: () => void }) {
  const has = (cat: ItemCategory) =>
    Object.keys(state.inv).some(id => state.inv[id] > 0 && ITEMS[id]?.category === cat);

  const equipBaseIds = Object.keys(state.equipInstances ?? {}).filter(
    id => (state.equipInstances?.[id]?.length ?? 0) > 0
  );
  const anyInv = Object.values(state.inv).some(n => n > 0);
  const anyEquip = equipBaseIds.length > 0;
  if (!anyInv && !anyEquip) {
    return <div style={{ fontStyle: 'italic', color: 'var(--ink-soft)', fontSize: '0.9em' }}>Empty. Sad.</div>;
  }

  return (
    <>
      {anyEquip && <EquipmentSatchelSection state={state} onAction={onAction} />}
      {CATEGORY_ORDER.filter((c) => c !== 'equipment').filter(has).map((cat) => {
        const items = Object.keys(state.inv)
          .filter(id => state.inv[id] > 0 && ITEMS[id]?.category === cat)
          .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
        const collapsed = !!state.satchelCollapsed[cat];
        const totalCount = items.reduce((acc, id) => acc + state.inv[id], 0);
        const totalValue = items.reduce((acc, id) => acc + state.inv[id] * ITEMS[id].sell, 0);
        const sellable = cat !== 'quest';

        return (
          <div className="satchel-section" key={cat}>
            <div
              className="satchel-section-header"
              onClick={() => {
                state.satchelCollapsed[cat] = !collapsed;
                onAction();
              }}
            >
              <span>{collapsed ? '▸' : '▾'} {CATEGORY_LABELS[cat]}</span>
              <span className="satchel-section-meta">{totalCount} · {fmt(totalValue)}c</span>
            </div>
            {!collapsed && (
              <>
                {items.map((id) => {
                  const def = ITEMS[id];
                  const equipped = state.equipped.weapon === id || state.equipped.shield === id;
                  const locked = !!state.satchelLocked[id];
                  const isConsumable = !!def.consume;
                  return (
                    <InvItemRow
                      key={id}
                      id={id}
                      state={state}
                      onAction={onAction}
                      cat={cat}
                      equipped={equipped}
                      locked={locked}
                      isConsumable={isConsumable}
                    />
                  );
                })}
                {sellable && items.length > 1 && (
                  <button
                    className="mini bulk-sell"
                    onClick={() => {
                      if (window.confirm(`Sell all ${CATEGORY_LABELS[cat]} (excluding locked and equipped)?`)) {
                        sellCategory(state, cat);
                        onAction();
                      }
                    }}
                  >Sell all {CATEGORY_LABELS[cat].toLowerCase()}</button>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ---------- Satchel: Equipment section (instance-based) ---------- */
function EquipmentSatchelSection({ state, onAction }: { state: GameState; onAction: () => void }) {
  const cat: ItemCategory = 'equipment';
  const collapsed = !!state.satchelCollapsed[cat];
  // Group instances by base item id so we get one row per item type with
  // a stack count and expand chevron.
  const groups = Object.keys(state.equipInstances ?? {})
    .filter((id) => (state.equipInstances?.[id]?.length ?? 0) > 0)
    .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  const totalCount = groups.reduce((acc, id) => acc + (state.equipInstances?.[id]?.length ?? 0), 0);
  return (
    <div className="satchel-section">
      <div
        className="satchel-section-header"
        onClick={() => {
          state.satchelCollapsed[cat] = !collapsed;
          onAction();
        }}
      >
        <span>{collapsed ? '▸' : '▾'} Equipment</span>
        <span className="satchel-section-meta">{totalCount}</span>
      </div>
      {!collapsed && (
        <>
          {groups.map((baseId) => (
            <EquipmentStackRow key={baseId} state={state} baseId={baseId} onAction={onAction} />
          ))}
          <button
            className="mini bulk-sell"
            onClick={() => {
              if (window.confirm("Sell all equipment? Equipped items and 'Suspicious' or better will be kept safe.")) {
                sellAllUnprotectedEquipment(state);
                onAction();
              }
            }}
          >Sell all unprotected gear</button>
        </>
      )}
    </div>
  );
}

function EquipmentStackRow({ state, baseId, onAction }: {
  state: GameState; baseId: string; onAction: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const def = ITEMS[baseId];
  const instances = state.equipInstances?.[baseId] ?? [];
  if (!def || instances.length === 0) return null;
  return (
    <>
      <div className="inv-item equipment-stack-row" onClick={() => setExpanded(!expanded)}>
        <div className="inv-icon">{getItemIcon(baseId, 32) ?? <GenericIcon size={32} />}</div>
        <div className="inv-meta">
          <span className="inv-name">{def.name}</span>
          <span className="inv-count">×{instances.length}</span>
        </div>
        <span className="equipment-expand-chev">{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div className="equipment-instance-list">
          {instances.map((inst) => (
            <EquipmentInstanceRow key={inst.instId} state={state} inst={inst} onAction={onAction} />
          ))}
        </div>
      )}
    </>
  );
}

function EquipmentInstanceRow({ state, inst, onAction }: {
  state: GameState; inst: ItemInstance; onAction: () => void;
}) {
  const def = ITEMS[inst.id];
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  function show() {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ x: rect.left - 12, y: rect.top });
  }
  function hide() { setCoords(null); }

  if (!def) return null;
  const equipped = isInstanceEquipped(state, inst.instId);
  const full = fullItemName(def.name, inst.tier, inst.modifier);
  const stats = instanceStats(inst);
  const locked = !!inst.locked;
  return (
    <div
      ref={rowRef}
      className={`equipment-instance-row tier-${inst.tier} ${equipped ? 'eq' : ''} has-tooltip`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className="equipment-instance-name">
        {full} {locked && <span title="Locked">🔒</span>}
      </div>
      <div className="equipment-instance-stats-line">
        {Object.entries(stats).map(([k, v]) => (
          <span key={k} className={`equip-stat ${(v as number) >= 0 ? 'pos' : 'neg'}`}>
            {formatStat(k, v as number)}
          </span>
        ))}
      </div>
      <div className="equipment-instance-actions">
        {equipped ? (
          <button onClick={() => {
            const slot = def.equip?.slot as EquipSlot | undefined;
            if (slot) unequipSlot(state, slot);
            onAction();
          }}>Unequip</button>
        ) : (
          <button onClick={() => { equipInstance(state, inst.instId); onAction(); }}>Equip</button>
        )}
        <button
          className="mini"
          onClick={() => { inst.locked = !inst.locked; onAction(); }}
          title={locked ? 'Unlock' : 'Lock'}
        >{locked ? '🔓' : '🔒'}</button>
        {!equipped && !locked && (
          <button
            className="mini"
            onClick={() => {
              if (window.confirm(`Sell ${full} for ${getInstanceSellPrice(inst)} coin?`)) {
                sellInstance(state, inst);
                onAction();
              }
            }}
            title="Sell"
          >×</button>
        )}
      </div>
      {coords && createPortal(
        <EquipmentInstanceTooltip inst={inst} equipped={equipped} x={coords.x} y={coords.y} />,
        document.body
      )}
    </div>
  );
}

function EquipmentInstanceTooltip({ inst, equipped, x, y }: {
  inst: ItemInstance; equipped: boolean; x: number; y: number;
}) {
  const def = ITEMS[inst.id];
  if (!def) return null;
  const full = fullItemName(def.name, inst.tier, inst.modifier);
  const stats = instanceStats(inst);
  const mod = getModifier(inst.modifier);
  const sellPrice = getInstanceSellPrice(inst);
  return (
    <div className="item-tooltip floating" role="tooltip" style={{ left: x, top: y }}>
      <div className="tooltip-header">
        <div className="tooltip-image-slot">
          {getItemIcon(inst.id, 56) ?? <GenericIcon size={56} />}
        </div>
        <div className="tooltip-title-block">
          <div className={`tooltip-name tier-${inst.tier}`}>{full}</div>
          <div className="tooltip-category">{def.equip?.slot ? def.equip.slot : 'equipment'}</div>
        </div>
      </div>
      {def.flavor && <div className="tooltip-flavor">"{def.flavor}"</div>}
      <div className="tooltip-stats">
        <div className="tooltip-stat-line"><strong>Quality: {QUALITY_LABEL[inst.tier]}</strong></div>
        {mod && mod.name && (
          <div className="tooltip-stat-line"><em>Modifier: {mod.name}</em></div>
        )}
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className={`tooltip-stat-line ${(v as number) >= 0 ? '' : 'red'}`}>
            {STAT_LABELS[k as StatKey] ?? k}: <strong>{formatStat(k, v as number)}</strong>
          </div>
        ))}
        <div className="tooltip-stat-line">Sell value: <strong>{sellPrice} coin</strong></div>
        {equipped && <div className="tooltip-stat-line gold">★ Currently equipped</div>}
        {inst.locked && <div className="tooltip-stat-line">🔒 Locked from bulk sell</div>}
      </div>
    </div>
  );
}

// ---------- Equipment economy helpers ----------

// Sell price reflects the tier multiplier so good rolls are worth more.
function getInstanceSellPrice(inst: ItemInstance): number {
  const def = ITEMS[inst.id];
  if (!def) return 0;
  const tierMult = { regrettable: 0.4, forgettable: 0.7, adequate: 1.0, suspicious: 1.5, unreasonable: 2.5 }[inst.tier] ?? 1.0;
  return Math.floor(def.sell * tierMult);
}

function sellInstance(state: GameState, inst: ItemInstance): void {
  const def = ITEMS[inst.id];
  if (!def) return;
  if (isInstanceEquipped(state, inst.instId)) return;
  if (inst.locked) return;
  const price = getInstanceSellPrice(inst);
  state.coin += price;
  removeInstance(state, inst.instId);
}

// Bulk-sell: skip equipped, skip user-locked, skip "Suspicious" and "Unreasonable" tier
function sellAllUnprotectedEquipment(state: GameState): void {
  const instMap = state.equipInstances ?? {};
  let total = 0;
  let count = 0;
  for (const baseId of Object.keys(instMap)) {
    const insts = instMap[baseId];
    const survivors: ItemInstance[] = [];
    for (const inst of insts) {
      if (isInstanceEquipped(state, inst.instId)) { survivors.push(inst); continue; }
      if (inst.locked) { survivors.push(inst); continue; }
      if (inst.tier === 'suspicious' || inst.tier === 'unreasonable') { survivors.push(inst); continue; }
      total += getInstanceSellPrice(inst);
      count++;
    }
    instMap[baseId] = survivors;
  }
  state.coin += total;
  if (count > 0) showToast(`Sold ${count} pieces for ${total} coin.`);
  else showToast('Nothing to sell — everything is protected.');
}

/* ---------- Wilds: Woodcutting ---------- */
function WoodcuttingTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Choose a tree to chop. You will keep chopping until told otherwise.
      </p>
      {WOODCUTTING_NODES.map((def) => {
        const unlocked = state.skills.woodcutting.level >= def.level;
        const active = state.task?.kind === 'wc' && state.task.id === def.id;
        const time = (def.time / (1 + perkEffect(state, 'wc_speed'))).toFixed(2);
        // Snap to 100% in the final frame to avoid visual gap before completion
        const rawPct = active && state.task ? (state.task.progress / state.task.totalTime) * 100 : 0;
        const pct = rawPct > 92 ? 100 : rawPct;
        const helper = activeHelperFor(state, 'wc', def.id);
        return (
          <div key={def.id} className={`action-card ${!unlocked ? 'locked' : ''} ${active ? 'active-task' : ''} ${helper ? 'has-helper' : ''}`} data-task-id={def.id}>
            <div className="card-icon">{getTreeIcon(def.id, 56) ?? <GenericIcon size={56} />}</div>
            <div className="card-body">
              <h4>
                {def.name} <span className="lv-tag">Lv {def.level}</span>
                {helper && <span className="helper-tag">· {helper.name} working</span>}
              </h4>
              <div className="flavor">{def.flavor}</div>
              <div className="reqs">{time}s · +{def.xp} XP · yields {ITEMS[def.yield].name}</div>
              {active && (
                <div className="progress-wrap">
                  <div className="progress-fill skill" style={{ width: `${pct}%` }} />
                </div>
              )}
              {helper && <HelperProgressBar state={state} helperId={helper.id} />}
            </div>
            <div className="card-actions">
              {!unlocked ? <span className="locked-label">Locked</span>
                : active ? <>
                    <SwingButton state={state} label="Chop" onAction={onAction} />
                    <button onClick={() => { stopTask(state); onAction(); }}>Stop</button>
                  </>
                : <button onClick={() => { startTask(state, 'wc' as TaskKind, def.id); onAction(); }}>Chop</button>}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Workshop: Carving ---------- */
function CarvingTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Whittle raw logs into useful (or sellable) goods.
      </p>
      {CARVING_RECIPES.map((def) => {
        const unlocked = state.skills.carving.level >= def.level;
        const active = state.task?.kind === 'cv' && state.task.id === def.id;
        const time = (def.time / (1 + perkEffect(state, 'cv_speed'))).toFixed(2);
        const rawPct = active && state.task ? (state.task.progress / state.task.totalTime) * 100 : 0;
        const pct = rawPct > 92 ? 100 : rawPct;
        const costStr = Object.entries(def.cost).map(([k, v]) => `${v}× ${ITEMS[k].name}`).join(', ');
        const affordable = canAfford(state, def.cost);
        const helper = activeHelperFor(state, 'cv', def.id);
        return (
          <div key={def.id} className={`action-card ${!unlocked ? 'locked' : ''} ${active ? 'active-task' : ''} ${helper ? 'has-helper' : ''}`} data-task-id={def.id}>
            <div className="card-icon">{getItemIcon(def.produces, 56) ?? <GenericIcon size={56} />}</div>
            <div className="card-body">
              <h4>
                {def.name} <span className="lv-tag">Lv {def.level}</span>
                {helper && <span className="helper-tag">· {helper.name} working</span>}
              </h4>
              <div className="flavor">{def.flavor}</div>
              <div className="reqs">{time}s · +{def.xp} XP · costs {costStr}</div>
              {active && (
                <div className="progress-wrap">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
              {helper && <HelperProgressBar state={state} helperId={helper.id} />}
            </div>
            <div className="card-actions">
              {!unlocked ? <span className="locked-label">Locked</span>
                : active ? <>
                    <SwingButton state={state} label="Strike" onAction={onAction} />
                    <button onClick={() => { stopTask(state); onAction(); }}>Stop</button>
                  </>
                : <button disabled={!affordable} onClick={() => { startTask(state, 'cv' as TaskKind, def.id); onAction(); }}>Carve</button>}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Gather: Mining ---------- */
function MiningTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  // Mining is locked entirely until the player has been told about Greystone
  const unlockedSkill = !!state.questFlags.visited_greystone;
  if (!unlockedSkill) {
    return (
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', padding: 12 }}>
        You have no business with stone yet. Speak with Maggie when you've grown.
      </p>
    );
  }
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Stone breaks. Eventually. Pick what to break first.
      </p>
      {MINING_NODES.map((def) => {
        const unlocked = state.skills.mining.level >= def.level;
        const active = state.task?.kind === 'mn' && state.task.id === def.id;
        const time = unlocked ? getTaskTime(state, 'mn', def) : def.time;
        const pct = active && state.task ? (state.task.progress / state.task.totalTime) * 100 : 0;
        const helper = HELPERS.find(h => h.kind === 'mn' && h.taskId === def.id && state.helpersHired[h.id]);
        return (
          <div key={def.id} className={`action-card ${!unlocked ? 'locked' : ''} ${active ? 'active-task' : ''} ${helper ? 'has-helper' : ''}`} data-task-id={def.id}>
            <div className="card-icon">{getMineIcon(def.id, 56) ?? <GenericIcon size={56} />}</div>
            <div className="card-body">
              <h4>
                {def.name} <span className="lv-tag">Lv {def.level}</span>
                {helper && <span className="helper-tag">· {helper.name} working</span>}
              </h4>
              <div className="flavor">{def.flavor}</div>
              <div className="reqs">{time.toFixed(2)}s · +{def.xp} XP · yields {ITEMS[def.yield].name}</div>
              {active && (
                <div className="progress-wrap">
                  <div className="progress-fill skill" style={{ width: `${pct}%` }} />
                </div>
              )}
              {helper && <HelperProgressBar state={state} helperId={helper.id} />}
            </div>
            <div className="card-actions">
              {!unlocked ? <span className="locked-label">Locked</span>
                : active ? <>
                    <SwingButton state={state} label="Strike" onAction={onAction} />
                    <button onClick={() => { stopTask(state); onAction(); }}>Stop</button>
                  </>
                : <button onClick={() => { startTask(state, 'mn' as TaskKind, def.id); onAction(); }}>Mine</button>}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Workshop: Smithing ---------- */
function SmithingTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const unlockedSkill = !!state.questFlags.visited_greystone;
  if (!unlockedSkill) {
    return (
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', padding: 12 }}>
        No forge to work yet. Find Brock.
      </p>
    );
  }
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Heat. Hammer. Wait. — Brock
      </p>
      {SMITHING_RECIPES.map((def) => {
        const unlocked = state.skills.smithing.level >= def.level;
        const affordable = canAfford(state, def.cost);
        const active = state.task?.kind === 'sm' && state.task.id === def.id;
        const time = unlocked ? getTaskTime(state, 'sm', def) : def.time;
        const pct = active && state.task ? (state.task.progress / state.task.totalTime) * 100 : 0;
        const costStr = Object.entries(def.cost).map(([k, n]) => `${n} ${ITEMS[k]?.name ?? k}`).join(' + ');
        return (
          <div key={def.id} className={`action-card ${!unlocked ? 'locked' : ''} ${active ? 'active-task' : ''}`} data-task-id={def.id}>
            <div className="card-icon">{getItemIcon(def.produces, 56) ?? <GenericIcon size={56} />}</div>
            <div className="card-body">
              <h4>{def.name} <span className="lv-tag">Lv {def.level}</span></h4>
              <div className="flavor">{def.flavor}</div>
              <div className="reqs">{time.toFixed(2)}s · +{def.xp} XP · costs {costStr}</div>
              {active && (
                <div className="progress-wrap">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
            <div className="card-actions">
              {!unlocked ? <span className="locked-label">Locked</span>
                : active ? <>
                    <SwingButton state={state} label="Strike" onAction={onAction} />
                    <button onClick={() => { stopTask(state); onAction(); }}>Stop</button>
                  </>
                : <button disabled={!affordable} onClick={() => { startTask(state, 'sm' as TaskKind, def.id); onAction(); }}>Forge</button>}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Combat ability bar ---------- */
// A horizontal strip of ability buttons shown during active combat.
// Each button shows a tabler icon, name, and visible cooldown progress.
function AbilitiesBar({ state, onAction }: { state: GameState; onAction: () => void }) {
  const [, setTick] = useState(0);
  // Tick once per 500ms so the cooldown timer text refreshes
  useEffect(() => {
    const id = window.setInterval(() => setTick(n => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  const unlocked = ABILITIES.filter(a => a.unlock(state));
  if (unlocked.length === 0) {
    return (
      <div className="abilities-bar empty">
        <span className="abilities-bar-empty-text">No abilities yet. Reach Combat Lv 5 for your first.</span>
      </div>
    );
  }
  return (
    <div className="abilities-bar">
      {unlocked.map((ab) => {
        const check = canUseAbility(state, ab.id);
        const cd = cooldownRemaining(state, ab.id);
        const cdPct = cd > 0 ? (cd / ab.cooldownMs) * 100 : 0;
        const seconds = Math.ceil(cd / 1000);
        return (
          <button
            key={ab.id}
            className={`ability-btn ${check.ok ? 'ready' : 'cooling'}`}
            disabled={!check.ok}
            onClick={() => {
              if (useAbility(state, ab.id)) {
                showToast(`Used ${ab.name}.`);
                onAction();
              } else {
                showToast(`Can't use ${ab.name} right now.`);
              }
            }}
            title={`${ab.name}: ${ab.description}`}
          >
            <i className={`ti ${ab.icon}`} aria-hidden="true"></i>
            <span className="ability-btn-name">{ab.name}</span>
            {cd > 0 && (
              <>
                <div className="ability-cooldown-overlay" style={{ height: `${cdPct}%` }} />
                <span className="ability-cooldown-text">{seconds}s</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Field: Combat ---------- */
function CombatTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  // Show pay-the-troll option when q4 is the active step
  const trollStepActive = !state.questClaimed['q4'] && QUEST_STEPS.find(q => q.id === 'q4')?.visible(state);
  const showTroll = !!trollStepActive && !state.questFlags.trollPaid && !state.questFlags.trollSlain;
  return (
    <>
      <AbilitiesBar state={state} onAction={onAction} />
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Pick a foe. Your fists will do; your sword would do better.
      </p>
      {COMBAT_FOES.map((def) => {
        const unlocked = state.skills.combat.level >= def.level;
        const active = state.task?.kind === 'cb' && state.task.id === def.id;
        const foeHpPct = active && state.task ? Math.max(0, ((state.task.foeHp ?? 0) / def.hp) * 100) : 100;
        return (
          <div key={def.id} className={`action-card ${!unlocked ? 'locked' : ''} ${active ? 'active-task' : ''}`} data-task-id={def.id}>
            <div className="card-icon">{getFoeIcon(def.id, 56) ?? <GenericIcon size={56} />}</div>
            <div className="card-body">
              <h4>{def.name} <span className="lv-tag">Lv {def.level}</span></h4>
              <div className="flavor">{def.flavor}</div>
              <div className="reqs">HP {def.hp} · ATK {def.atk} · +{def.xp} XP · +{def.coin} coin</div>
              {active && (
                <div className="progress-wrap">
                  <div className="progress-fill combat" style={{ width: `${foeHpPct}%` }} />
                </div>
              )}
            </div>
            <div className="card-actions">
              {!unlocked ? <span className="locked-label">Locked</span>
                : active ? <>
                    <SwingButton state={state} label="Strike" onAction={onAction} />
                    <button onClick={() => { stopTask(state); onAction(); }}>Flee</button>
                  </>
                : <button onClick={() => { startTask(state, 'cb' as TaskKind, def.id); onAction(); }}>Fight</button>}
            </div>
          </div>
        );
      })}
      {showTroll && (
        <div className="action-card">
          <div className="card-icon">{getFoeIcon('troll', 56)}</div>
          <div className="card-body">
            <h4>Pay the Troll</h4>
            <div className="flavor">Bridges aren't free.</div>
            <div className="reqs">Costs 1000 coin.</div>
          </div>
          <div className="card-actions">
            <button disabled={state.coin < 1000} onClick={() => { payTroll(state); onAction(); }}>Pay 1000</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Self: Character Sheet ---------- */
// The big-picture view. Six slot blocks (weapon, offhand, head, body, hands,
// trinket) each showing its equipped instance (or "empty"). Below: the full
// stat breakdown with sources.
function CharacterSheetTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const stats = computePlayerStats(state);
  const equipped = state.equippedInst ?? {};
  const SLOTS: { id: EquipSlot; label: string; icon: string }[] = [
    { id: 'weapon',  label: 'Weapon',  icon: 'ti-sword' },
    { id: 'offhand', label: 'Offhand', icon: 'ti-shield' },
    { id: 'head',    label: 'Head',    icon: 'ti-tools-kitchen' },
    { id: 'body',    label: 'Body',    icon: 'ti-shirt' },
    { id: 'hands',   label: 'Hands',   icon: 'ti-hand-three-fingers' },
    { id: 'trinket', label: 'Trinket', icon: 'ti-diamond' },
  ];

  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Your current account. Every number, with sources.
      </p>

      <h3 style={{ marginTop: 4, marginBottom: 8 }}>Equipment</h3>
      <div className="equipment-grid">
        {SLOTS.map((slot) => {
          const instId = equipped[slot.id];
          const inst = instId ? findInstanceById(state, instId) : null;
          return (
            <div key={slot.id} className={`equip-slot ${inst ? 'filled' : 'empty'}`}>
              <div className="equip-slot-label">
                <i className={`ti ${slot.icon}`} aria-hidden="true"></i> {slot.label}
              </div>
              {inst ? (
                <EquippedInstanceDisplay inst={inst} onUnequip={() => {
                  unequipSlot(state, slot.id);
                  onAction();
                }} />
              ) : (
                <div className="equip-slot-empty">— empty —</div>
              )}
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: 16, marginBottom: 8 }}>Stats</h3>
      <StatBlockDisplay stats={stats} />
    </>
  );
}

function EquippedInstanceDisplay({ inst, onUnequip }: { inst: ItemInstance; onUnequip: () => void }) {
  const baseDef = ITEMS[inst.id];
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  function show() {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ x: rect.left, y: rect.top + rect.height + 4 });
  }
  function hide() { setCoords(null); }

  if (!baseDef) return null;
  const full = fullItemName(baseDef.name, inst.tier, inst.modifier);
  const stats = instanceStats(inst);
  return (
    <div
      ref={rowRef}
      className="equip-instance has-tooltip"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className="equip-instance-icon">{getItemIcon(inst.id, 40) ?? <GenericIcon size={40} />}</div>
      <div className="equip-instance-info">
        <div className={`equip-instance-name tier-${inst.tier}`}>{full}</div>
        <div className="equip-instance-stats">
          {Object.entries(stats).map(([k, v]) => (
            <span key={k} className={`equip-stat ${(v as number) >= 0 ? 'pos' : 'neg'}`}>
              {formatStat(k, v as number)}
            </span>
          ))}
        </div>
      </div>
      <button className="equip-unequip-btn" onClick={onUnequip} title="Unequip">✕</button>
      {coords && createPortal(
        <EquipmentInstanceTooltip inst={inst} equipped={true} x={coords.x} y={coords.y} />,
        document.body
      )}
    </div>
  );
}

function StatBlockDisplay({ stats }: { stats: import('./types').StatBlock }) {
  // Group stats for readable display. Show ALL of them — including 0s — so
  // the player can see the full ladder of what's possible to build toward.
  const groups: { label: string; keys: StatKey[] }[] = [
    { label: 'Combat',  keys: ['hp', 'atk', 'def', 'crit', 'crit_dmg', 'speed'] },
    { label: 'Skills',  keys: ['gather_speed', 'craft_speed', 'xp_gain'] },
    { label: 'Economy', keys: ['coin_find', 'drop_rate'] },
  ];
  return (
    <div className="stat-block-display">
      {groups.map((g) => (
        <div key={g.label} className="stat-group">
          <div className="stat-group-label">{g.label}</div>
          {g.keys.map((k) => {
            const v = stats[k] ?? 0;
            return (
              <div key={k} className="stat-row">
                <span>{STAT_LABELS[k]}</span>
                <span className="stat-value">{formatStat(k, v)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const STAT_LABELS: Record<StatKey, string> = {
  hp: 'Max HP',
  atk: 'Attack',
  def: 'Defense',
  crit: 'Crit Chance',
  crit_dmg: 'Crit Damage',
  speed: 'Combat Speed',
  gather_speed: 'Gather Speed',
  craft_speed: 'Craft Speed',
  coin_find: 'Coin Find',
  drop_rate: 'Drop Rate',
  xp_gain: 'XP Gain',
};

// Format a stat value with its proper unit (% or flat)
function formatStat(key: string, v: number): string {
  const k = key as StatKey;
  const isPct = ['crit', 'crit_dmg', 'speed', 'gather_speed', 'craft_speed', 'coin_find', 'drop_rate', 'xp_gain'].includes(k);
  if (isPct) {
    const pct = Math.round(v * 1000) / 10;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct}%`;
  }
  return `${v >= 0 ? '+' : ''}${Math.round(v * 10) / 10}`;
}

/* ---------- Self: Skills overview ---------- */
// One card per skill showing what it does, where it's used, and the roadmap of
// what unlocks at each level milestone. Helps the player answer the "what do
// these numbers DO?" question and plan what to grind next.
function SkillsOverviewTab({ state }: { state: GameState }) {
  const skills = getAllSkillsForDisplay(state);
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Every skill, every milestone. What you can do, and what's still to come.
      </p>
      {skills.map(({ id, locked }) => {
        const info = SKILL_INFO[id];
        const sk = state.skills[id];
        const lvl = sk?.level ?? 0;
        const need = xpForLevel(lvl);
        const xpInLvl = Math.floor((sk?.xp ?? 0) - cumulativeXpToLevel(lvl));
        const pct = Math.min(100, (xpInLvl / need) * 100);
        return (
          <div key={id} className={`skill-overview-card ${locked ? 'locked' : ''}`}>
            <div className="skill-overview-header">
              <div className="skill-overview-name">
                {info.name}
                <span className="skill-overview-level">Lv {lvl}</span>
              </div>
              {info.introducedOn && (
                <div className="skill-overview-floor">From: {info.introducedOn}</div>
              )}
            </div>
            {!locked && (
              <div className="skill-overview-xp">
                <div className="xp-bar-wrap">
                  <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
                  <span className="xp-bar-label">{fmt(xpInLvl)} / {fmt(need)} XP</span>
                </div>
              </div>
            )}
            <div className="skill-overview-flavor">{info.flavor}</div>
            <div className="skill-overview-description">{info.description}</div>
            <div className="skill-overview-section-label">Used in</div>
            <ul className="skill-overview-list">
              {info.usedIn.map((u, i) => <li key={i}>{u}</li>)}
            </ul>
            <div className="skill-overview-section-label">Milestones</div>
            <ul className="skill-overview-list skill-overview-milestones">
              {info.unlocks.map((u, i) => {
                const reached = lvl >= u.level;
                return (
                  <li key={i} className={reached ? 'reached' : 'pending'}>
                    <span className="milestone-level">Lv {u.level}</span>
                    <span className="milestone-what">{u.what}</span>
                    {reached && <span className="milestone-check">✓</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Self: Economy Ledger ---------- */
// A dashboard view of the player's economic state. Shows current resources,
// equipment value, modifiers affecting income, and a few aggregate readouts.
function EconomyLedgerTab({ state }: { state: GameState }) {
  const stats = computePlayerStats(state);
  // Total carried inventory value (excluding equipment instances which are
  // tier-priced separately)
  let invValue = 0;
  let invCount = 0;
  for (const [id, n] of Object.entries(state.inv)) {
    if (n <= 0) continue;
    const def = ITEMS[id];
    if (!def) continue;
    if (def.category === 'quest') continue;
    invValue += def.sell * n;
    invCount += n;
  }
  // Equipment inventory value (sum of all instances' sell prices)
  let equipValue = 0;
  let equipCount = 0;
  for (const insts of Object.values(state.equipInstances ?? {})) {
    for (const inst of insts) {
      equipValue += getInstanceSellPrice(inst);
      equipCount++;
    }
  }

  // Permanent bonuses from Counter purchases
  const perm = state.permBonuses ?? {};

  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        A faithful account of your holdings, modifiers, and standing.
      </p>

      <div className="economy-grid">
        <div className="economy-card">
          <div className="economy-card-label">Coin on hand</div>
          <div className="economy-card-value">{fmt(state.coin)}</div>
        </div>
        <div className="economy-card">
          <div className="economy-card-label">Daily Bread</div>
          <div className="economy-card-value">{state.dailyBread ?? 0}</div>
        </div>
        <div className="economy-card">
          <div className="economy-card-label">Letter Streak</div>
          <div className="economy-card-value">{state.dailyLetterStreak ?? 0} days</div>
        </div>
      </div>

      <h3 style={{ marginTop: 14, marginBottom: 6 }}>Carried wealth</h3>
      <div className="economy-grid">
        <div className="economy-card">
          <div className="economy-card-label">Satchel items</div>
          <div className="economy-card-value">{invCount}</div>
          <div className="economy-card-sub">≈ {fmt(invValue)}c if sold</div>
        </div>
        <div className="economy-card">
          <div className="economy-card-label">Equipment owned</div>
          <div className="economy-card-value">{equipCount}</div>
          <div className="economy-card-sub">≈ {fmt(equipValue)}c if sold</div>
        </div>
      </div>

      <h3 style={{ marginTop: 14, marginBottom: 6 }}>Economic modifiers</h3>
      <div className="economy-modifier-list">
        <div className="economy-modifier-row">
          <span>Coin Find (from gear)</span>
          <span className="stat-value">{formatStat('coin_find', stats.coin_find ?? 0)}</span>
        </div>
        <div className="economy-modifier-row">
          <span>Drop Rate (from gear)</span>
          <span className="stat-value">{formatStat('drop_rate', stats.drop_rate ?? 0)}</span>
        </div>
        <div className="economy-modifier-row">
          <span>Sell Bonus (permanent)</span>
          <span className="stat-value">{formatStat('coin_find', perm.sellBonus ?? 0)}</span>
        </div>
        <div className="economy-modifier-row">
          <span>Gather Speed (permanent)</span>
          <span className="stat-value">{formatStat('gather_speed', (perm.wcSpeed ?? 0) + (perm.mnSpeed ?? 0))}</span>
        </div>
        <div className="economy-modifier-row">
          <span>Craft Speed (permanent)</span>
          <span className="stat-value">{formatStat('craft_speed', (perm.cvSpeed ?? 0) + (perm.smSpeed ?? 0))}</span>
        </div>
      </div>

      <h3 style={{ marginTop: 14, marginBottom: 6 }}>Counter purchases</h3>
      <div className="economy-counter-list">
        {Object.keys(state.counterPurchases ?? {}).length === 0 ? (
          <div style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>No permanent upgrades yet. Visit Maggie's Counter.</div>
        ) : (
          Object.entries(state.counterPurchases ?? {}).map(([id, n]) => (
            <div key={id} className="economy-counter-row">
              <span>{id.replace(/_/g, ' ')}</span>
              <span className="stat-value">×{n}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

/* ---------- Town: Shop ---------- */
function ShopTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Maggie's selection is limited but earnest. Daily stock resets every 24 hours.
      </p>
      {SHOP_ITEMS.map((item) => {
        const def = ITEMS[item.id];
        const stock = getShopStock(state, item.id);
        const canBuy = state.coin >= item.cost && stock > 0;
        return (
          <div key={item.id} className="action-card">
            <div className="card-icon">{getItemIcon(item.id, 56) ?? <GenericIcon size={56} />}</div>
            <div className="card-body">
              <h4>{def.name}</h4>
              <div className="flavor">{def.flavor ?? ''}</div>
              <div className="reqs">
                {item.cost} coin
                {item.stockType === 'daily' && ` · stock: ${stock}/${item.dailyStock}`}
              </div>
              {def.consume?.description && (
                <div className="reqs" style={{ color: 'var(--green)' }}>{def.consume.description}</div>
              )}
            </div>
            <div className="card-actions">
              <button
                disabled={!canBuy}
                onClick={() => { buyFromShop(state, item.id); onAction(); }}
              >Buy</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Town: Helpers ---------- */
function HelpersTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  // Group helpers by skill. Skills the player hasn't unlocked are hidden
  // entirely (mining/smithing before Greystone). Empty groups also hidden.
  type SkillGroupId = 'woodcutting' | 'carving' | 'mining' | 'smithing';
  const groups: { id: SkillGroupId; label: string; floorTag?: string }[] = [
    { id: 'woodcutting', label: 'Woodcutting' },
    { id: 'carving',     label: 'Carving' },
    { id: 'mining',      label: 'Mining',   floorTag: 'Greystone Reach' },
    { id: 'smithing',    label: 'Smithing', floorTag: 'Greystone Reach' },
  ];

  const visited = !!state.questFlags.visited_greystone;

  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Hire someone to do the boring parts. They work slower than you would, but they work while you're elsewhere.
      </p>
      {groups.map((g) => {
        // Hide Greystone-tied groups until the player has visited
        if ((g.id === 'mining' || g.id === 'smithing') && !visited) return null;

        const groupHelpers = HELPERS.filter((h) => h.requiredSkill === g.id);
        if (groupHelpers.length === 0) return null;

        const collapsed = !!state.satchelCollapsed['helpers_' + g.id];
        const hiredCount = groupHelpers.filter((h) => state.helpersHired[h.id]).length;

        return (
          <div key={g.id} className="satchel-section helpers-section">
            <div
              className="satchel-section-header"
              onClick={() => {
                state.satchelCollapsed['helpers_' + g.id] = !collapsed;
                onAction();
              }}
            >
              <span>{collapsed ? '▸' : '▾'} {g.label}{g.floorTag && <span className="helpers-group-floor"> · {g.floorTag}</span>}</span>
              <span className="satchel-section-meta">{hiredCount} / {groupHelpers.length} hired</span>
            </div>
            {!collapsed && groupHelpers.map((h) => {
              const hired = !!state.helpersHired[h.id];
              const meetsLevel = !h.requiredLevel || !h.requiredSkill ||
                state.skills[h.requiredSkill].level >= h.requiredLevel;
              const canHire = !hired && state.coin >= h.hireCost && meetsLevel;
              return (
                <div key={h.id} className={`action-card ${!meetsLevel ? 'locked' : ''} ${hired ? 'active-task' : ''}`}>
                  <div>
                    <h4>{h.name}</h4>
                    <div className="flavor">{h.flavor}</div>
                    <div className="reqs">
                      {h.description} · {Math.round(h.speedMultiplier * 100)}% your speed
                      {h.requiredLevel && ` · req. ${h.requiredSkill} Lv ${h.requiredLevel}`}
                    </div>
                  </div>
                  <div>
                    {hired
                      ? <span className="locked-label">Hired</span>
                      : !meetsLevel
                        ? <span className="locked-label">Locked</span>
                        : <button disabled={!canHire} onClick={() => { hireHelper(state, h.id); onAction(); }}>
                            Hire ({fmt(h.hireCost)}c)
                          </button>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/* ---------- Self: Perks ---------- */
function PerksTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Each skill grants a perk point every 5 levels. Spend wisely. Or don't.
      </p>
      {(['woodcutting', 'carving', 'combat'] as SkillId[]).map((skillId) => {
        const sk = state.skills[skillId];
        const normalPerks = PERK_TREES[skillId].filter(p => !p.exclusive);
        const pathPerks = PERK_TREES[skillId].filter(p => p.exclusive);
        return (
          <div key={skillId}>
            <h3>
              {skillId[0].toUpperCase() + skillId.slice(1)}
              <span className="perk-points-badge">{sk.perkPoints} points</span>
            </h3>
            <div className="skill-tree-wrap">
              {normalPerks.map((perk) => (
                <PerkCard key={perk.id} state={state} skillId={skillId} perkId={perk.id} onAction={onAction} />
              ))}
            </div>

            {pathPerks.length > 0 && (
              <div className="path-section">
                <div className="path-header">⚔ Choose Your Path — only one ⚔</div>
                <div className="skill-tree-wrap path-grid">
                  {pathPerks.map((perk) => (
                    <PerkCard key={perk.id} state={state} skillId={skillId} perkId={perk.id} onAction={onAction} isPath />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function PerkCard({ state, skillId, perkId, onAction, isPath }: {
  state: GameState; skillId: SkillId; perkId: string; onAction: () => void; isPath?: boolean;
}) {
  const sk = state.skills[skillId];
  const perk = PERK_TREES[skillId].find(p => p.id === perkId)!;
  const owned = !!sk.owned[perkId];
  const reqMet = !perk.requires || !!sk.owned[perk.requires];
  const exclusiveTaken = perk.exclusive && PERK_TREES[skillId].some(
    (p) => p.exclusive === perk.exclusive && p.id !== perk.id && sk.owned[p.id]
  );
  const canBuy = !owned && reqMet && !exclusiveTaken && sk.perkPoints >= perk.cost;
  const cls = owned ? 'owned' : !canBuy ? 'locked' : '';
  return (
    <div
      className={`perk ${cls} ${isPath ? 'path-perk' : ''}`}
      onClick={() => { if (canBuy) { buyPerk(state, skillId, perkId); onAction(); } }}
    >
      <h5>{perk.name}</h5>
      <div className="perk-cost">
        {owned ? 'OWNED' : `${perk.cost} pp`}
        {perk.requires && ` · needs ${PERK_TREES[skillId].find((p) => p.id === perk.requires)?.name}`}
        {exclusiveTaken && ' · path closed'}
      </div>
      <div className="perk-desc">{perk.desc}</div>
    </div>
  );
}

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
        const visibleSteps = npcSteps.filter(q => q.visible(state));
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
        <QuestGiverModal
          state={state}
          npc={openGiver}
          onClose={() => setOpenGiver(null)}
        />
      )}
    </>
  );
}

function QuestGiverModal({ state, npc, onClose }: {
  state: GameState; npc: string; onClose: () => void;
}) {
  const npcSteps = QUEST_STEPS.filter(q => q.npc === npc);
  const activeStep = activeStepForGiver(state, npc);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal quest-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>{npc}</h3>
        {activeStep ? (
          <div className="quest-npc">
            <span className="speaker">{npc}:</span> {activeStep.text}
          </div>
        ) : (
          <div className="quest-npc" style={{ fontStyle: 'italic' }}>
            <span className="speaker">{npc}:</span> "Nothing for you right now. Come back later."
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          {npcSteps.map((step) => {
            const claimed = !!state.questClaimed[step.id];
            const visible = step.visible(state);
            if (!visible && !claimed) return null;
            const cls = claimed ? 'done' : (step === activeStep ? 'active' : '');
            return (
              <div key={step.id} className={`quest-step ${cls}`}>
                {claimed ? step.text : (step === activeStep ? step.text : '???')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Death modal ---------- */
function DeathModal({ event, onDismiss }: { event: { coinLost: number; foeName: string; line: string }; onDismiss: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onDismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>An Account of the Incident</h3>
        <p className="modal-body">
          Returned to Splinterwood {event.line}. Pockets lighter by <strong>{event.coinLost} coin</strong>.
          The <em>{event.foeName}</em> yet lives. So, regrettably, do I.
        </p>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}

/* ---------- Random Event modal ---------- */
function EventModal({ event, state, onClose, onAction }: {
  event: RandomEventDef;
  state: GameState;
  onClose: () => void;
  onAction: () => void;
}) {
  // After a choice is made, show the resolution text briefly
  const [resolution, setResolution] = useState<string | null>(null);

  function pick(choice: { resolve: (s: GameState, h: any) => string }) {
    const text = choice.resolve(state, {
      addCoin:    (n: number) => { state.coin += n; },
      addItem:    (id: string, n: number) => { state.inv[id] = (state.inv[id] ?? 0) + n; },
      removeCoin: (n: number) => {
        if (state.coin < n) return false;
        state.coin -= n;
        return true;
      },
      showToast,
    });
    setResolution(text);
    onAction();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal event-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>{event.title}</h3>
        <p className="modal-body" style={{ fontStyle: 'italic' }}>{event.flavor}</p>

        {resolution === null ? (
          <div className="event-choices">
            {event.choices.map((c, i) => {
              const enabled = c.enabled ? c.enabled(state) : true;
              return (
                <button
                  key={i}
                  className="event-choice"
                  disabled={!enabled}
                  onClick={() => pick(c)}
                >
                  <span className="event-choice-label">{c.label}</span>
                  {c.description && <span className="event-choice-desc">{c.description}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <p className="event-resolution">{resolution}</p>
            <button onClick={onClose}>Continue</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Letter Node (pulses beside the status banner) ---------- */
function LetterNode({ state, onOpen }: { state: GameState; onOpen: () => void }) {
  const [, setTick] = useState(0);
  // Tick once per second so the countdown text refreshes
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (shouldOfferLetter(state)) {
    return (
      <button
        className="letter-node pulsing"
        onClick={onOpen}
        title="A letter from Maggie. Click to open."
      >
        <i className="ti ti-mail" aria-hidden="true"></i>
        <span className="letter-node-label">Letter</span>
      </button>
    );
  }
  // Show countdown if a letter has been claimed already today
  const remaining = timeUntilNextLetterMs(state);
  if (remaining === 0) return null;
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return (
    <div className="letter-node dormant" title="Next letter pending">
      <i className="ti ti-mail-off" aria-hidden="true"></i>
      <span className="letter-node-label">
        {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
      </span>
    </div>
  );
}

/* ---------- Letter Modal (Maggie's daily letter) ---------- */
function LetterModal({ letter, onClaim, onClose }: {
  letter: LetterContents; onClaim: () => void; onClose: () => void;
}) {
  // Wax-seal animation: clicked = unsealed, reveals contents
  const [opened, setOpened] = useState(false);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal letter-modal" onClick={(e) => e.stopPropagation()}>
        {!opened ? (
          <div className="letter-sealed" onClick={() => setOpened(true)}>
            <div className="wax-seal">
              <span>M</span>
            </div>
            <div className="letter-sealed-prompt">A letter. Sealed in wax. Click to open.</div>
          </div>
        ) : (
          <>
            <div className="letter-header">
              <i className="ti ti-mail-opened" aria-hidden="true"></i>
              <span>From: Maggie · Day {letter.streakAfter} of your streak</span>
            </div>
            <p className="letter-intro">{letter.intro}</p>
            <p className="letter-body">{letter.body}</p>
            <p className="letter-outro">{letter.outro}</p>
            <div className="letter-rewards">
              <div className="letter-reward"><i className="ti ti-coin" aria-hidden="true"></i> {letter.coin} coin</div>
              <div className="letter-reward"><i className="ti ti-bread" aria-hidden="true"></i> {letter.dailyBread} Daily Bread</div>
              {letter.doodleId && (
                <div className="letter-reward gold-text">
                  <i className="ti ti-feather" aria-hidden="true"></i>{' '}
                  Margin Doodle: {MARGIN_DOODLES.find(d => d.id === letter.doodleId)?.name}
                </div>
              )}
              {letter.perkPoint && (
                <div className="letter-reward gold-text">
                  <i className="ti ti-star" aria-hidden="true"></i> +1 perk point
                </div>
              )}
            </div>
            <button className="letter-claim-btn" onClick={onClaim}>Take it all</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Hire Celebration Modal ---------- */
// Shown once when a helper is hired. Confetti has already burst from the
// game loop; the modal frames the moment with the helper's intro line.
function HireCelebrationModal({ helperId, onClose }: { helperId: string; onClose: () => void }) {
  const helper = HELPERS.find(h => h.id === helperId);
  if (!helper) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal hire-celebration-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hire-celebration-badge">★ HIRED ★</div>
        <h3>{helper.name}</h3>
        <p className="modal-body" style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-soft)' }}>
          {helper.flavor}
        </p>
        <div className="hire-celebration-intro">
          {helper.introLine}
        </div>
        <p className="modal-body" style={{ textAlign: 'center', fontSize: '0.9em', color: 'var(--ink-soft)' }}>
          They begin work immediately. You never need to touch this node again.
        </p>
        <button onClick={onClose}>Welcome aboard</button>
      </div>
    </div>
  );
}

/* ---------- Realm Map Modal ---------- */
function RealmMapModal({ state, onClose, onTravel }: {
  state: GameState;
  onClose: () => void;
  onTravel: (floorId: FloorId) => void;
}) {
  const current = getCurrentFloor(state);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal realm-map-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>The Realm</h3>
        <p className="modal-body" style={{ fontStyle: 'italic', textAlign: 'center' }}>
          A folding map. The ink shifts where you haven't been.
        </p>
        <div className="realm-grid">
          {FLOORS.map((floor) => {
            const unlocked = floor.isUnlocked(state);
            const isCurrent = current.id === floor.id;
            return (
              <div
                key={floor.id}
                className={`realm-card theme-${floor.theme} ${unlocked ? 'unlocked' : 'fogged'} ${isCurrent ? 'current' : ''}`}
                onClick={() => { if (unlocked) onTravel(floor.id); }}
              >
                <div className="realm-card-number">Floor {floor.number}</div>
                <div className="realm-card-name">{unlocked ? floor.name : '???'}</div>
                {unlocked && floor.npc && (
                  <div className="realm-card-npc">{floor.npc}</div>
                )}
                <div className="realm-card-flavor">{floor.flavor}</div>
                {!unlocked && floor.unlockHint && (
                  <div className="realm-card-hint">{floor.unlockHint}</div>
                )}
                {unlocked && (
                  <button
                    className="realm-travel-btn"
                    disabled={isCurrent}
                    onClick={(e) => { e.stopPropagation(); if (!isCurrent) onTravel(floor.id); }}
                  >
                    {isCurrent ? 'You are here' : 'Visit'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Innkeep's Counter (spend Daily Bread on permanent buffs) ---------- */
function InnkeepCounterTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Maggie watches you from behind the counter, arms crossed. Spend Daily Bread on permanent improvements.
      </p>
      <div className="bread-balance">
        <i className="ti ti-bread" aria-hidden="true"></i>
        <span>Daily Bread: <strong>{state.dailyBread ?? 0}</strong></span>
      </div>
      {COUNTER_BUFFS.map((buff) => {
        const owned = counterPurchaseCount(state, buff.id);
        const capped = owned >= buff.cap;
        const canBuy = !capped && (state.dailyBread ?? 0) >= buff.cost;
        return (
          <div key={buff.id} className="action-card">
            <div className="card-body">
              <h4>{buff.name} <span className="lv-tag">{owned}/{buff.cap}</span></h4>
              <div className="flavor">{buff.flavor}</div>
              <div className="reqs">{buff.description}</div>
              <div className="reqs" style={{ color: 'var(--gold)' }}>{buff.cost} Daily Bread</div>
            </div>
            <div className="card-actions">
              <button
                disabled={!canBuy}
                onClick={() => {
                  const r = buyCounterBuff(state, buff.id);
                  if (r.ok) onAction();
                }}
              >{capped ? 'Capped' : 'Buy'}</button>
            </div>
          </div>
        );
      })}
    </>
  );
}


function ActiveBuffsPanel({ state }: { state: GameState }) {
  const now = Date.now();
  const active = state.activeBuffs.filter(b => b.expiresAt > now);
  if (active.length === 0) return null;
  return (
    <div className="panel buffs-panel">
      <h2>Active Effects</h2>
      {active.map((b, i) => {
        const remaining = Math.max(0, (b.expiresAt - now) / 1000);
        const def = ITEMS[b.source];
        const skillLabel = b.skill === 'all' ? 'all skills' : b.skill;
        return (
          <div key={i} className="buff-row">
            <div className="buff-name">{def?.name ?? b.source}</div>
            <div className="buff-effect">+{Math.round(b.multiplier * 100)}% XP · {skillLabel}</div>
            <div className="buff-time">{formatTime(remaining)} left</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Item tooltip (hover popup with details + image slot) ---------- */
function InvItemRow({ id, state, onAction, cat, equipped, locked, isConsumable }: {
  id: string;
  state: GameState;
  onAction: () => void;
  cat: string;
  equipped: boolean;
  locked: boolean;
  isConsumable: boolean;
}) {
  const def = ITEMS[id];
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  function show() {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ x: rect.left - 12, y: rect.top });
  }
  function hide() { setCoords(null); }

  return (
    <div
      ref={rowRef}
      className="inv-item has-tooltip"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <span>
        {def.name}
        {equipped && <span title="Equipped"> ★</span>}
        {locked && <span title="Locked"> 🔒</span>}
      </span>
      <span className="count">
        {state.inv[id]}{' '}
        {isConsumable && (
          <button
            className="mini use-btn"
            onClick={() => { consumeItem(state, id); onAction(); }}
            title={def.consume?.description}
          >Use</button>
        )}
        <button
          className="mini"
          onClick={() => { toggleItemLock(state, id); onAction(); }}
          title={locked ? 'Unlock' : 'Lock'}
        >{locked ? '🔓' : '🔒'}</button>
        <button
          className="mini"
          onClick={() => { sellItem(state, id); onAction(); }}
          disabled={cat === 'quest'}
        >Sell</button>
      </span>
      {coords && createPortal(
        <ItemTooltipFloater itemId={id} equipped={equipped} locked={locked} x={coords.x} y={coords.y} />,
        document.body
      )}
    </div>
  );
}

function ItemTooltipFloater({ itemId, equipped, locked, x, y }: {
  itemId: string; equipped: boolean; locked: boolean; x: number; y: number;
}) {
  const def = ITEMS[itemId];
  if (!def) return null;
  return (
    <div className="item-tooltip floating" role="tooltip" style={{ left: x, top: y }}>
      <div className="tooltip-header">
        <div className="tooltip-image-slot" data-item-id={itemId}>
          {getItemIcon(itemId, 56) ?? <GenericIcon size={56} />}
        </div>
        <div className="tooltip-title-block">
          <div className="tooltip-name">{def.name}</div>
          <div className="tooltip-category">{def.category}</div>
        </div>
      </div>
      {def.flavor && <div className="tooltip-flavor">"{def.flavor}"</div>}
      <div className="tooltip-stats">
        {def.equip?.atk !== undefined && (
          <div className="tooltip-stat-line">Attack: <strong>+{def.equip.atk}</strong></div>
        )}
        {def.equip?.def !== undefined && (
          <div className="tooltip-stat-line">Defense: <strong>+{def.equip.def}</strong></div>
        )}
        {def.consume?.description && (
          <div className="tooltip-stat-line green">Use: {def.consume.description}</div>
        )}
        <div className="tooltip-stat-line">Sell value: <strong>{def.sell} coin</strong></div>
        {equipped && <div className="tooltip-stat-line gold">★ Currently equipped</div>}
        {locked && <div className="tooltip-stat-line">🔒 Locked from bulk sell</div>}
        {def.category === 'quest' && <div className="tooltip-stat-line red">Cannot be sold</div>}
      </div>
    </div>
  );
}

/* ---------- Helper progress display ---------- */
function activeHelperFor(state: GameState, kind: TaskKind, taskId: string) {
  for (const h of HELPERS) {
    if (state.helpersHired[h.id] && h.kind === kind && h.taskId === taskId) return h;
  }
  return null;
}

function HelperProgressBar({ state, helperId }: { state: GameState; helperId: string }) {
  const helper = HELPERS.find(h => h.id === helperId);
  if (!helper) return null;
  const def = getTaskDef(helper.kind, helper.taskId);
  if (!def) return null;
  const baseTime = getTaskTime(state, helper.kind, def);
  const helperTime = baseTime / helper.speedMultiplier;
  const progress = state.helpersProgress[helperId] ?? 0;
  const rawPct = (progress / helperTime) * 100;
  const pct = rawPct > 92 ? 100 : rawPct;
  return (
    <div className="helper-bar-wrap">
      <div className="helper-bar-label">⛏ Helper</div>
      <div className="progress-wrap helper-progress-wrap">
        <div className="progress-fill helper" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Active mode "swing" button. Click to add immediate progress/damage to the
// current task, then cools down for SWING_COOLDOWN_MS. Re-renders on a short
// interval so the cooldown ring updates smoothly.
function SwingButton({ state, label, onAction }: {
  state: GameState; label: string; onAction: () => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60);
    return () => window.clearInterval(id);
  }, []);
  const ready = canSwing(state);
  const remainingMs = swingCooldownRemaining(state);
  const pct = ready ? 100 : 100 - (remainingMs / SWING_COOLDOWN_MS) * 100;

  function handleClick() {
    if (!ready) return;
    const ok = doSwing(state);
    if (ok) onAction();
  }

  return (
    <button
      className={`swing-btn ${ready ? 'ready' : 'cooling'}`}
      onClick={handleClick}
      disabled={!ready}
      aria-label={`Active swing: ${label}`}
      title="Active mode: click to push the task forward. Has a short cooldown."
    >
      <span className="swing-label">{label}!</span>
      <span className="swing-cooldown-ring" style={{ width: `${pct}%` }} />
    </button>
  );
}
