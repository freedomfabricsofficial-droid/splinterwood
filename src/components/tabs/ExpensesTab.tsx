// Expenses — a within-run coin sink in Town.
//
// Spend coin on operational upgrades that speed up the current run. Resets every
// loop (when the books are cooked), so coin always has a purpose. Reuses the
// prestige/investment card styling for a consistent look.

import type { GameState } from '../../types';
import { fmt } from '../../systems/format';
import { Big, bGte } from '../../util/bignum';
import {
  EXPENSES, expenseLevel, expenseCost, expenseNextDesc, expenseCurrentDesc, buyExpense,
} from '../../data/expenses';

export function ExpensesTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const coin = state.coin ?? Big(0);

  return (
    <div className="prestige">
      <div className="prestige-banner">
        <div>
          <div className="prestige-title">Expenses</div>
          <div className="prestige-subtitle">Pour earnings back into the operation. Resets when you cook the books.</div>
        </div>
        <div className="prestige-slush">
          <span className="prestige-slush-label">Coin</span>
          <span className="prestige-slush-value">{fmt(coin)}</span>
        </div>
      </div>

      <div className="prestige-investments">
        {EXPENSES.map((def) => {
          const lvl = expenseLevel(state, def.id);
          const maxed = lvl >= def.maxLevel;
          const cost = expenseCost(def, lvl);
          const affordable = !maxed && bGte(coin, cost);
          const current = expenseCurrentDesc(def, lvl);
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
                <span className="investment-perlevel">{expenseNextDesc(def)}</span>
                {current && <span className="investment-current">{current}</span>}
              </div>
              <div className="investment-flavor">{def.flavor}</div>
              <button
                className="investment-buy-btn"
                disabled={!affordable}
                onClick={() => {
                  if (buyExpense(state, def.id)) onAction();
                }}
              >
                {maxed ? 'Maxed out' : `Buy — ${fmt(cost)} coin`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
