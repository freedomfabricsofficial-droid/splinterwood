// TaskCard — renders one task in a gather/workshop tab.
//
// Pulls task-specific data from the existing data files via taskData(), and
// uniform structural data from the registry entry. Adding a new task to
// TASK_REGISTRY makes it appear in the right tab automatically.
import React from 'react';
import type { GameState } from '../../types';
import type { TaskRegistryEntry } from '../../data/tasks';
import { taskData } from '../../data/tasks';
import { ITEMS } from '../../data/items';
import { canAfford, getTaskTime, startTask, stopTask } from '../../systems/engine';
import { getTreeIcon, getMineIcon, getItemIcon, GenericIcon } from '../../data/icons';
import { activeHelperFor, HelperProgressBar, SwingButton } from '../shared';
import { fmt } from '../../systems/format';
import { bPow, bMul, bToNumber } from '../../util/bignum';

interface TaskCardProps {
  state: GameState;
  onAction: () => void;
  entry: TaskRegistryEntry;
  iconForTask?: (taskId: string) => React.ReactElement | null;
}

export function TaskCard({ state, onAction, entry, iconForTask }: TaskCardProps) {
  const def = taskData(entry.kind, entry.taskId);
  if (!def) return null;

  const skillState = state.skills[entry.skill];
  const unlocked = skillState.level >= def.level;
  const active = state.task?.kind === entry.kind && state.task.id === entry.taskId;
  const time = unlocked ? getTaskTime(state, entry.kind, def) : def.time;

  const rawPct = active && state.task ? (state.task.progress / state.task.totalTime) * 100 : 0;
  const pct = rawPct > 92 ? 100 : rawPct;

  const hasCost = !!def.cost;
  const affordable = !hasCost || canAfford(state, def.cost);

  const helper = entry.noHelper ? null : activeHelperFor(state, entry.kind, entry.taskId);

  // Display the XP the player will actually earn — applies the per-level
  // multiplier (1.02^skillLevel). This is the same compounding factor used
  // in giveXp at gain time, so the displayed number matches what they get.
  // We don't include perk/buff multipliers here to keep the number stable.
  const xpMult = bPow(1.02, skillState.level);
  const displayedXp = bToNumber(bMul(def.xp, xpMult));

  let reqsText: string;
  if (hasCost) {
    const costStr = Object.entries(def.cost).map(([k, n]) => `${n} ${ITEMS[k]?.name ?? k}`).join(' + ');
    reqsText = `${time.toFixed(2)}s · +${fmt(displayedXp)} XP · costs ${costStr}`;
  } else {
    reqsText = `${time.toFixed(2)}s · +${fmt(displayedXp)} XP · yields ${ITEMS[def.yield].name}`;
  }

  const icon = iconForTask
    ? iconForTask(entry.taskId)
    : defaultIconForTask(entry, def);

  return (
    <div
      className={`action-card ${!unlocked ? 'locked' : ''} ${active ? 'active-task' : ''} ${helper ? 'has-helper' : ''}`}
      data-task-id={entry.taskId}
    >
      <div className="card-icon">{icon}</div>
      <div className="card-body">
        <h4>
          {def.name} <span className="lv-tag">Lv {def.level}</span>
          {helper && <span className="helper-tag">· {helper.name} working</span>}
        </h4>
        <div className="flavor">{def.flavor}</div>
        <div className="reqs">{reqsText}</div>
        {active && (
          <div className="progress-wrap">
            <div className={`progress-fill ${entry.category === 'gather' ? 'skill' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        )}
        {helper && <HelperProgressBar state={state} helperId={helper.id} />}
      </div>
      <div className="card-actions">
        {!unlocked ? (
          <span className="locked-label">Locked</span>
        ) : active ? (
          <>
            <SwingButton state={state} label={entry.swingLabel} onAction={onAction} />
            <button onClick={() => { stopTask(state); onAction(); }}>Stop</button>
          </>
        ) : (
          <button
            disabled={!affordable}
            onClick={() => { startTask(state, entry.kind, entry.taskId); onAction(); }}
          >
            {entry.buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Picks a sensible default icon based on the task's kind. Override per-call
// only if you have a specialized icon function.
function defaultIconForTask(entry: TaskRegistryEntry, def: any): React.ReactElement {
  if (entry.kind === 'wc') return getTreeIcon(entry.taskId, 56) ?? <GenericIcon size={56} />;
  if (entry.kind === 'mn') return getMineIcon(entry.taskId, 56) ?? <GenericIcon size={56} />;
  if (def?.produces) return getItemIcon(def.produces, 56) ?? <GenericIcon size={56} />;
  return <GenericIcon size={56} />;
}
