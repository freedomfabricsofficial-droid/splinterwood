import { useState } from 'react';
import type { GameState, SkillId } from '../types';
import { tickTask, log, showToast } from '../systems/engine';
import { saveGame, wipeSave } from '../state/save';
import { PERK_TREES } from '../data/perks';
import { HELPERS } from '../data/helpers';
import { QUEST_STEPS } from '../data/quests';
import { ITEMS } from '../data/items';
import { playSfx, getAudioSettings, setAudioSettings } from '../systems/audio';
import { RANDOM_EVENTS, devFireEvent } from '../data/events';
import { bAdd } from '../util/bignum';
import { cumulativeXpToLevelBig } from '../systems/leveling';
import { FLOORS, setCurrentFloor } from '../data/floors';
import type { FloorId } from '../data/floors';

export function DevPanel({ state, onAction }: { state: GameState; onAction: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [fastForwardOn, setFastForwardOn] = useState(false);

  // Fast-forward: each tick, simulate extra seconds of game time.
  // We attach this to window so the main loop can read it without prop drilling.
  (window as any).__devFastForward = fastForwardOn;

  function skipTime(seconds: number) {
    if (!state.task) {
      showToast('Start a task first to skip time on it.');
      return;
    }
    let remaining = seconds;
    const STEP = 1.0;
    while (remaining > 0 && state.task) {
      tickTask(state, Math.min(STEP, remaining));
      remaining -= STEP;
    }
    log(`[DEV] Skipped ${seconds}s of task time.`, 'gold');
    saveGame(state);
    onAction();
  }

  function addCoin(n: number) {
    state.coin = bAdd(state.coin, n);
    log(`[DEV] +${n} coin`, 'gold');
    onAction();
  }

  function setLevel(skill: SkillId, lvl: number) {
    state.skills[skill].level = Math.max(1, lvl);
    // Set XP to the cumulative for the target level via the Decimal helper
    // so high levels don't lose precision.
    state.skills[skill].xp = cumulativeXpToLevelBig(state.skills[skill].level);
    log(`[DEV] ${skill} -> Lv ${state.skills[skill].level}`, 'gold');
    onAction();
  }

  function addPerkPoints(skill: SkillId, n: number) {
    state.skills[skill].perkPoints += n;
    log(`[DEV] +${n} ${skill} perk points`, 'gold');
    onAction();
  }

  function unlockAllPerks() {
    for (const skill of Object.keys(PERK_TREES) as SkillId[]) {
      for (const perk of PERK_TREES[skill]) {
        // skip exclusives - they conflict
        if (!perk.exclusive) {
          state.skills[skill].owned[perk.id] = true;
        }
      }
    }
    log(`[DEV] All non-path perks unlocked.`, 'gold');
    onAction();
  }

  function giveAllItems(n: number) {
    for (const id of Object.keys(ITEMS)) {
      state.inv[id] = (state.inv[id] ?? 0) + n;
    }
    log(`[DEV] +${n} of every item.`, 'gold');
    onAction();
  }

  function hireAllHelpers() {
    for (const h of HELPERS) {
      state.helpersHired[h.id] = true;
      state.helpersProgress[h.id] = state.helpersProgress[h.id] ?? 0;
    }
    log(`[DEV] All helpers hired (free).`, 'gold');
    onAction();
  }

  function advanceQuest() {
    if (state.questIndex >= QUEST_STEPS.length) {
      showToast('Quest already done.');
      return;
    }
    const step = QUEST_STEPS[state.questIndex];
    state.questClaimed[step.id] = true;
    state.questIndex++;
    log(`[DEV] Skipped quest step: ${step.id}`, 'gold');
    onAction();
  }

  function fullHeal() {
    state.hp = state.maxHp;
    if (state.task) (state.task as any).playerHp = state.hp;
    onAction();
  }

  function resetIntro() {
    localStorage.removeItem('splinterwood_intro_seen');
    showToast('Intro flag cleared. Refresh to see it again.');
  }

  function fullReset() {
    if (!window.confirm('FULL RESET: wipe save, intro, audio settings, and reload?')) return;
    wipeSave();
    localStorage.removeItem('splinterwood_intro_seen');
    localStorage.removeItem('splinterwood_audio_v1');
    window.location.reload();
  }

  function advanceDays(n: number) {
    // Rewind the last-claim timestamp by n days so the next letter is offered
    // and the streak treats it as the appropriate gap.
    const ms = n * 24 * 60 * 60 * 1000;
    if (state.dailyLetterLastClaim) {
      state.dailyLetterLastClaim -= ms;
    }
    showToast(`Wound clock back ${n} day${n > 1 ? 's' : ''}.`);
    onAction();
  }

  function resetLetter() {
    state.dailyLetterLastClaim = 0;
    state.dailyLetterStreak = 0;
    showToast('Letter state reset.');
    onAction();
  }

  function addBread(n: number) {
    state.dailyBread = (state.dailyBread ?? 0) + n;
    showToast(`+${n} Daily Bread`);
    onAction();
  }

  function visitFloor(id: FloorId) {
    if (id === 'greystone_reach') state.questFlags.visited_greystone = true;
    setCurrentFloor(state, id);
    showToast(`Visited ${id}`);
    onAction();
  }

  function unlockGreystone() {
    state.questFlags.visited_greystone = true;
    state.questFlags.greystone_unlocked = true;
    showToast('Greystone unlocked');
    onAction();
  }

  if (collapsed) {
    return (
      <div className="dev-panel collapsed">
        <button className="dev-toggle" onClick={() => setCollapsed(false)}>⚙ DEV</button>
      </div>
    );
  }

  return (
    <div className="dev-panel">
      <div className="dev-header">
        <span>⚙ Dev Tools</span>
        <button className="dev-toggle" onClick={() => setCollapsed(true)}>×</button>
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Time</div>
        <div className="dev-row">
          <button onClick={() => skipTime(60)}>+1 min</button>
          <button onClick={() => skipTime(600)}>+10 min</button>
          <button onClick={() => skipTime(3600)}>+1 hr</button>
          <button onClick={() => skipTime(14400)}>+4 hr</button>
        </div>
        <label className="dev-toggle-row">
          <input
            type="checkbox"
            checked={fastForwardOn}
            onChange={(e) => setFastForwardOn(e.target.checked)}
          />
          10× game speed
        </label>
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Coin</div>
        <div className="dev-row">
          <button onClick={() => addCoin(100)}>+100</button>
          <button onClick={() => addCoin(1000)}>+1k</button>
          <button onClick={() => addCoin(10000)}>+10k</button>
          <button onClick={() => addCoin(1000000)}>+1M</button>
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Levels</div>
        {(['woodcutting', 'carving', 'combat'] as SkillId[]).map((skill) => (
          <div key={skill} className="dev-row dev-level-row">
            <span className="dev-skill-label">{skill}</span>
            <button onClick={() => setLevel(skill, state.skills[skill].level + 1)}>+1</button>
            <button onClick={() => setLevel(skill, state.skills[skill].level + 5)}>+5</button>
            <button onClick={() => setLevel(skill, 25)}>25</button>
            <button onClick={() => setLevel(skill, 50)}>50</button>
            <button onClick={() => setLevel(skill, 99)}>99</button>
          </div>
        ))}
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Perks</div>
        <div className="dev-row">
          <button onClick={() => {
            for (const s of ['woodcutting', 'carving', 'combat'] as SkillId[]) addPerkPoints(s, 5);
          }}>+5 to each</button>
          <button onClick={unlockAllPerks}>Unlock all (non-path)</button>
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Other</div>
        <div className="dev-row">
          <button onClick={() => giveAllItems(50)}>+50 each item</button>
          <button onClick={hireAllHelpers}>Hire all helpers</button>
        </div>
        <div className="dev-row">
          <button onClick={advanceQuest}>Skip quest step</button>
          <button onClick={fullHeal}>Full heal</button>
        </div>
        <div className="dev-row">
          <button onClick={resetIntro}>Reset intro flag</button>
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Audio (placeholder sounds)</div>
        <div className="dev-row">
          <button onClick={() => playSfx('click')}>click</button>
          <button onClick={() => playSfx('chop')}>chop</button>
          <button onClick={() => playSfx('craft')}>craft</button>
          <button onClick={() => playSfx('hit')}>hit</button>
        </div>
        <div className="dev-row">
          <button onClick={() => playSfx('defeat')}>defeat</button>
          <button onClick={() => playSfx('player_hit')}>player_hit</button>
          <button onClick={() => playSfx('levelup')}>levelup</button>
          <button onClick={() => playSfx('coin')}>coin</button>
        </div>
        <AudioVolumeSlider />
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Random events</div>
        <div className="dev-row" style={{ flexWrap: 'wrap', gap: 4 }}>
          {RANDOM_EVENTS.map((ev) => (
            <button
              key={ev.id}
              style={{ fontSize: '0.75em', padding: '3px 6px' }}
              onClick={() => { devFireEvent(ev.id); showToast(`Queued: ${ev.title}`); }}
            >{ev.id}</button>
          ))}
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Daily letter</div>
        <div className="dev-row">
          <button onClick={() => advanceDays(1)}>+1 day</button>
          <button onClick={() => advanceDays(2)}>+2 days</button>
          <button onClick={() => advanceDays(7)}>+1 week</button>
          <button onClick={resetLetter}>Reset claim</button>
        </div>
        <div className="dev-row">
          <button onClick={() => addBread(10)}>+10 Bread</button>
          <button onClick={() => addBread(100)}>+100 Bread</button>
        </div>
        <div style={{ fontSize: '0.78em', fontStyle: 'italic', color: 'var(--ink-soft)', marginTop: 4 }}>
          Streak: {state.dailyLetterStreak ?? 0} · Bread: {state.dailyBread ?? 0}
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Floors</div>
        <div className="dev-row" style={{ flexWrap: 'wrap', gap: 4 }}>
          {FLOORS.map((f) => (
            <button
              key={f.id}
              style={{ fontSize: '0.78em', padding: '3px 6px' }}
              onClick={() => visitFloor(f.id)}
            >{f.number}. {f.name === '???' ? `Floor ${f.number}` : f.name}</button>
          ))}
        </div>
        <div className="dev-row">
          <button onClick={unlockGreystone}>Unlock Greystone</button>
        </div>
        <div style={{ fontSize: '0.78em', fontStyle: 'italic', color: 'var(--ink-soft)', marginTop: 4 }}>
          Current: {state.currentFloor ?? 'splinterwood'}
        </div>
      </div>

      <div className="dev-section">
        <div className="dev-section-label">Danger zone</div>
        <div className="dev-row">
          <button className="danger" onClick={fullReset}>FULL RESET</button>
        </div>
        <div style={{ fontSize: '0.78em', fontStyle: 'italic', color: 'var(--ink-soft)', marginTop: 4 }}>
          Wipes save, intro flag, and audio settings. Reloads the page.
        </div>
      </div>
    </div>
  );
}

function AudioVolumeSlider() {
  const [settings, setLocalSettings] = useState(getAudioSettings());
  function update(patch: Partial<typeof settings>) {
    setAudioSettings(patch);
    setLocalSettings(getAudioSettings());
  }
  return (
    <>
      <div className="dev-row" style={{ alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: '0.85em' }}>
          <input
            type="checkbox"
            checked={settings.masterEnabled}
            onChange={(e) => update({ masterEnabled: e.target.checked })}
          /> Sound on
        </label>
      </div>
      <div className="dev-row" style={{ alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.8em', width: 60 }}>Master</span>
        <input
          type="range" min="0" max="1" step="0.05"
          value={settings.masterVolume}
          onChange={(e) => update({ masterVolume: Number(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '0.75em', width: 30, fontFamily: 'monospace' }}>{Math.round(settings.masterVolume * 100)}</span>
      </div>
      <div className="dev-row" style={{ alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.8em', width: 60 }}>SFX</span>
        <input
          type="range" min="0" max="1" step="0.05"
          value={settings.sfxVolume}
          onChange={(e) => update({ sfxVolume: Number(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '0.75em', width: 30, fontFamily: 'monospace' }}>{Math.round(settings.sfxVolume * 100)}</span>
      </div>
      <div className="dev-row" style={{ alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: '0.85em' }}>
          <input
            type="checkbox"
            checked={settings.musicEnabled}
            onChange={(e) => update({ musicEnabled: e.target.checked })}
          /> Music on
        </label>
      </div>
      <div className="dev-row" style={{ alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.8em', width: 60 }}>Music</span>
        <input
          type="range" min="0" max="1" step="0.05"
          value={settings.musicVolume}
          onChange={(e) => update({ musicVolume: Number(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '0.75em', width: 30, fontFamily: 'monospace' }}>{Math.round(settings.musicVolume * 100)}</span>
      </div>
    </>
  );
}
