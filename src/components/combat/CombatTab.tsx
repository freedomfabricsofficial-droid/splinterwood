// CombatTab — three-pane combat arena.
//
// Layout:
//   [Tier selector strip across top: ◀ [dropdown ▼] ▶ [Fight here]]
//   [PLAYER PANE] [SWING/CENTER] [FOE PANE]
//   [ABILITIES BAR across bottom]
//
// Combat is its own task slot (state.combatTask), parallel to gather/craft.
// Foes are drawn from pools — when the active foe dies, the next one is
// randomly selected from the same pool.
import React, { useState } from 'react';
import type { GameState } from '../../types';
import { COMBAT_FOES, COMBAT_POOLS } from '../../data/combat';
import { computePlayerStats } from '../../systems/playerStats';
import { totalAtk, totalDef, totalMaxHp } from '../../systems/stats';
import { startPoolCombat, stopCombat } from '../../systems/engine';
import { getFoeIcon, GenericIcon } from '../../data/icons';
import { Avatar } from '../Avatar';
import { SwingButton, FramedPanel } from '../shared';
import { AbilitiesBar } from './AbilitiesBar';
import { bToNumber, bPow, bMul } from '../../util/bignum';
import { fmt } from '../../systems/format';

export function CombatTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const inCombat = state.combatTask?.kind === 'cb';
  const foeDef = inCombat ? COMBAT_FOES.find(f => f.id === state.combatTask!.id) : null;
  const playerStats = computePlayerStats(state);
  // Use the real, combat-level-scaled, whole-number max (not the raw stat, which
  // is unscaled and can carry float dust like 23.5999…).
  const playerMaxHp = totalMaxHp(state) || 1;
  const playerHpNum = bToNumber(state.hp);
  const playerHpPct = Math.max(0, Math.min(100, (playerHpNum / playerMaxHp) * 100));
  // Foe HP bar: read foeHp via bToNumber. Compare to foeDef.hp which is a
  // plain number (data) — but at high levels foeHp may have been scaled up
  // and exceed foeDef.hp. Math.min protects the bar width.
  const foeHpNum = state.combatTask?.foeHp ? bToNumber(state.combatTask.foeHp) : 0;
  const foeHpPct = foeDef && state.combatTask
    ? Math.max(0, Math.min(100, (foeHpNum / foeDef.hp) * 100))
    : 0;

  const combatLevel = state.skills.combat.level;

  const defaultPoolId =
    state.selectedCombatPool ??
    COMBAT_POOLS.find(p => combatLevel >= p.unlockLevel)?.id ??
    COMBAT_POOLS[0].id;
  const [viewingPoolId, setViewingPoolId] = useState<string>(defaultPoolId);
  const viewingPool = COMBAT_POOLS.find(p => p.id === viewingPoolId) ?? COMBAT_POOLS[0];
  const viewingIdx = COMBAT_POOLS.findIndex(p => p.id === viewingPool.id);
  const viewingLocked = combatLevel < viewingPool.unlockLevel;

  const stepTier = (delta: number) => {
    const nextIdx = Math.max(0, Math.min(COMBAT_POOLS.length - 1, viewingIdx + delta));
    setViewingPoolId(COMBAT_POOLS[nextIdx].id);
  };

  const startThisTier = () => {
    if (viewingLocked) return;
    startPoolCombat(state, viewingPool.id);
    onAction();
  };

  return (
    <>
      {/* Tier selector row — dropdown strip + separate Fight Here button.
          Wrapped so they sit side by side with a gap. */}
      <div className="combat-tier-row">
        <div className="combat-tier-selector">
          <button
            className="combat-tier-arrow no-click-sfx"
            onClick={() => stepTier(-1)}
            disabled={viewingIdx === 0}
            aria-label="Previous tier"
          >◀</button>

          <div className="combat-tier-dropdown-wrap">
            <select
              className="combat-tier-dropdown"
              value={viewingPoolId}
              onChange={(e) => setViewingPoolId(e.target.value)}
            >
              {COMBAT_POOLS.map(p => {
                const locked = combatLevel < p.unlockLevel;
                return (
                  <option key={p.id} value={p.id}>
                    Tier {p.tier}: {p.label}{locked ? ` (Locked · Lv ${p.unlockLevel})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            className="combat-tier-arrow no-click-sfx"
            onClick={() => stepTier(1)}
            disabled={viewingIdx === COMBAT_POOLS.length - 1}
            aria-label="Next tier"
          >▶</button>
        </div>

        <button
          className="combat-tier-fight-btn no-click-sfx"
          onClick={startThisTier}
          disabled={viewingLocked || (inCombat && state.selectedCombatPool === viewingPool.id)}
        >
          {viewingLocked
            ? `Locked · Lv ${viewingPool.unlockLevel}`
            : (inCombat && state.selectedCombatPool === viewingPool.id)
              ? 'Fighting'
              : 'Fight here'}
        </button>
      </div>

      {/* THREE-PANE COMBAT LAYOUT */}
      <div className="combat-arena">
        {/* PLAYER PANE */}
        <FramedPanel className="combat-pane player-pane">
          <div className="combat-pane-portrait">
            <Avatar state={state} />
          </div>
          <div className="combat-pane-name">The Adventurer</div>
          <div className="combat-pane-hp-wrap">
            <div className="combat-pane-hp-bar">
              <div className="combat-pane-hp-fill player" style={{ width: `${playerHpPct}%` }} />
            </div>
            <div className="combat-pane-hp-text">{Math.max(0, Math.floor(playerHpNum))} / {playerMaxHp}</div>
          </div>
          <div className="combat-pane-stats">
            <div><span className="combat-pane-stat-label">ATK</span> {totalAtk(state)}</div>
            <div><span className="combat-pane-stat-label">DEF</span> {totalDef(state)}</div>
            {playerStats.crit && playerStats.crit > 0 ? (
              <div><span className="combat-pane-stat-label">CRIT</span> {Math.round(playerStats.crit * 100)}%</div>
            ) : null}
          </div>
        </FramedPanel>

        {/* SWING / CENTER */}
        <div className="combat-center">
          {inCombat && foeDef ? (
            <>
              <SwingButton state={state} label="Strike" onAction={onAction} slot="combatTask" />
              <button className="combat-flee-btn no-click-sfx" onClick={() => { stopCombat(state); onAction(); }}>Flee</button>
            </>
          ) : (
            <div className="combat-center-idle">
              <i className="ti ti-swords" aria-hidden="true"></i>
              <div className="combat-center-prompt">Pick a tier</div>
            </div>
          )}
        </div>

        {/* FOE PANE */}
        <FramedPanel className="combat-pane foe-pane">
          {inCombat && foeDef ? (
            <>
              <div className="combat-pane-portrait">
                {getFoeIcon(foeDef.id, 110) ?? <GenericIcon size={110} />}
              </div>
              <div className="combat-pane-name">{foeDef.name}</div>
              <div className="combat-pane-hp-wrap">
                <div className="combat-pane-hp-bar">
                  <div className="combat-pane-hp-fill foe" style={{ width: `${foeHpPct}%` }} />
                </div>
                <div className="combat-pane-hp-text">{Math.max(0, Math.floor(foeHpNum))} / {foeDef.hp}</div>
              </div>
              <div className="combat-pane-stats">
                <div><span className="combat-pane-stat-label">ATK</span> {foeDef.atk}</div>
                <div><span className="combat-pane-stat-label">XP</span> +{fmt(bToNumber(bMul(foeDef.xp, bPow(1.02, combatLevel))))}</div>
                <div><span className="combat-pane-stat-label">COIN</span> +{fmt(bToNumber(bMul(foeDef.coin, bPow(1.025, combatLevel))))}</div>
              </div>
            </>
          ) : (
            <div className="combat-pane-empty">
              <i className="ti ti-skull" aria-hidden="true"></i>
              <div>Nothing here.</div>
            