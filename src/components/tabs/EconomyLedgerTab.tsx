// EconomyLedgerTab — the Self tab's economic dashboard.
//
// Reads the player's coin, Daily Bread, streak, total satchel value,
// equipment value, gear-derived modifiers, and Counter purchases.
// Pure read-only view — no actions, no state mutations.
import React from 'react';
import type { GameState } from '../../types';
import { ITEMS } from '../../data/items';
import { computePlayerStats, getInstanceSellPrice } from '../../systems/playerStats';
import { fmt } from '../../systems/format';
import { formatStat } from '../shared/statFormatting';

export function EconomyLedgerTab({ state }: { state: GameState }) {
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
  let equipValue = 0;
  let equipCount = 0;
  for (const insts of Object.values(state.equipInstances ?? {})) {
    for (const inst of insts) {
      equipValue += getInstanceSellPrice(inst);
      equipCount++;
    }
  }

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
          <span className="stat-value">{formatStat('gather_speed', (perm.gatherSpeed ?? 0) + (perm.wcSpeed ?? 0) + (perm.mnSpeed ?? 0))}</span>
        </div>
        <div className="economy-modifier-row">
          <span>Craft Speed (permanent)</span>
          <span className="stat-value">{formatStat('craft_speed', (perm.craftSpeed ?? 0) + (perm.cvSpeed ?? 0) + (perm.smSpeed ?? 0))}</span>
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
