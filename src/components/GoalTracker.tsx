// Persistent "Pursuing" strip — always shows the player's top current goals with
// live progress, so they always know what they're working toward.

import type { GameState } from '../types';
import { computeGoals } from '../systems/goals';

export function GoalTracker({ state }: { state: GameState }) {
  const goals = computeGoals(state);
  if (goals.length === 0) return null;

  return (
    <div className="goal-tracker">
      <span className="goal-tracker-label">Pursuing</span>
      <div className="goal-list">
        {goals.map((g) => (
          <div key={g.id} className="goal-item">
            <span className="goal-text">{g.label}</span>
            {g.progress !== undefined && (
              <span className="goal-bar"><i style={{ width: `${Math.round(g.progress * 100)}%` }} /></span>
            )}
            {g.cur !== undefined && g.target !== undefined && (
              <span className="goal-count">{g.cur}/{g.target}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
