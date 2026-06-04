// Cook the Books — the prestige screen.
//
// Available once the player has reached Greystone Reach (and permanently after).
// Lets them wipe the run for Slush, and spend Slush on permanent Investments.
// Always previews the payout, requires a confirm, and surfaces the narrative
// beat visibly when the books are cooked.

import { useState } from 'react';
import type { GameState } from '../../types';
import { fmt } from '../../systems/format';
import { Big, bGte } from '../../util/bignum';
import { prestigeUnlocked, slushReward, canCookBooks, cookTheBooks, buyInvestment } from '../../systems/prestige';
import {
  INVESTMENTS, investmentLevel, investmentCost, investmentNextDesc, investmentCurrentDesc,
} from '../../data/investments';
import { log, showToast } from '../../systems/engine';

export function PrestigeTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [lastCook, setLastCook] = useState<{ reward: number; line: string } | null>(null);

  if (!prestigeUnlocked(state)) {
    return (
      <div className="prestige-locked">
        <i className="ti ti-book-2" aria-hidden="true"></i>
        <p>You keep one honest ledger. The <em>other</em> one stays in a locked drawer.</p>
        <p className="prestige-locked-hint">Reach Greystone Reach to begin keeping a second set of books.</p>
      </div>
    );
  }

  const slush = state.slush ?? Big(0);
  const loop = state.loopCount ?? 0;
  const reward = slushReward(state);
  const canCook = canCookBooks(state);

  function doCook() {
    const r = cookTheBooks(state);
    if (r) {
      setLastCook(r);
      log(r.line, 'gold');
      showToast(`You cooked the books. +${fmt(r.reward)} Slush.`);
    }
    setConfirming(false);
    onAction();
  }

  return (
    <div className="prestige">
      <div className="prestige-banner">
        <div>
          <div className="prestige-title">Cook the Books</div>
          <div className="prestige-subtitle">Currently keeping Volume {loop + 1}.</div>
        </div>
        <div className="prestige-slush">
          <span className="prestige-slush-label">Slush</span>
          <span className="prestige-slush-value">{fmt(slush)}</span>
        </div>
      </div>

      {lastCook && (
        <div className="prestige-result">
          <div className="prestige-result-line">{lastCook.line}</div>
          <div className="prestige-result-reward">+{fmt(lastCook.reward)} Slush set aside.</div>
        </div>
      )}

      <div className="prestige-cook">
        <div className="prestige-cook-yield">
          Cooking the books now yields <strong>{fmt(reward)} Slush</strong>.
        </div>
        <div className="prestige-cook-detail">
          <span className="prestige-resets">Wipes:</span> skills, coin, gear, helpers, quest progress.
          <br />
          <span className="prestige-keeps">Keeps:</span> Slush, Investments, your map, your Tome, daily rewards.
        </div>
        {!confirming ? (
          <button
            className="prestige-cook-btn"
            disabled={!canCook}
            onClick={() => setConfirming(true)}
          >
            {canCook ? 'Cook the Books' : 'Nothing worth cooking yet'}
          </button>
        ) : (
          <div className="prestige-confirm">
            <span className="prestige-confirm-text">This wipes the current run. You're sure?</span>
            <div className="prestige-confirm-actions">
              <button className="prestige-cook-btn danger" onClick={doCook}>Yes — cook them</button>
              <button className="prestige-cancel-btn" onClick={() => setConfirming(false)}>Not yet</button>
            </div>
          </div>
        )}
      </div>

      <h3 className="prestige-investments-header">Investments</h3>
      <p className="prestige-investments-flavor">
        Slush, sensibly invested, pays out forever. <em>Forever</em> being the operative word.
      </p>
      <div className="prestige-investments">
        {INVESTMENTS.map((def) => {
          const lvl = investmentLevel(state, def.id);
          const maxed = lvl >= def.maxLevel;
          const cost = investmentCost(def, lvl);
          const affordable = !maxed && bGte(slush, cost);
          const current = investmentCurrentDesc(def, lvl);
          return (
            <div key={def.id} className={`investment-card ${maxed ? 'maxed' : ''}`}>
              <div className="investment-head">
                <span className="investment-name">{def.name}</span>
                <span className="investment-level">
                  {maxed ? `MAX · ${def.maxLevel}` : `Lv ${lvl} / ${def.maxLevel}`}
                </span>
              </div>
              <div className="investment-effect-label">{def.effectLabel}</div>
              <div className="investment-numbers">
                <span className="investment-perlevel">{investmentNextDesc(def)}</span>
                {current && <span className="investment-current">{current}</span>}
              </div>
              <div className="investment-flavor">{def.flavor}</div>
              <button
                className="investment-buy-btn"
                disabled={!affordable}
                onClick={() => {
                  if (buyInvestment(state, def.id)) onAction();
                }}
              >
                {maxed ? 'Maxed out' : `Invest — ${fmt(cost)} Slush`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
