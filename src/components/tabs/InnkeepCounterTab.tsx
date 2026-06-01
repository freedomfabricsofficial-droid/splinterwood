// InnkeepCounterTab — spend Daily Bread on permanent buffs at Maggie's counter.
//
// Each buff has a cap (max purchases). Once capped, the row shows "Capped"
// rather than the buy button. Maggie's permanent bonuses now apply
// multiplicatively to the rest of the stat stack (see stats-rules.md
// Section 3 + the permBonuses pass in computePlayerStats).
import React from 'react';
import type { GameState } from '../../types';
import { COUNTER_BUFFS, counterPurchaseCount, buyCounterBuff } from '../../data/letter';

export function InnkeepCounterTab({ state, onAction }: { state: GameState; onAction: () => void }) {
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
