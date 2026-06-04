// Small progress bar shown on a task card when a helper is working that task.
// Mirrors the AdCap "manager" style — the player sees their helper grinding
// alongside (or instead of) them.
import type { GameState } from '../../types';
import { HELPERS } from '../../data/helpers';
import { getTaskDef, getTaskTime } from '../../systems/engine';

export function HelperProgressBar({ state, helperId }: { state: GameState; helperId: string }) {
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
