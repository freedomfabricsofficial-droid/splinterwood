// QuestLogModal — a WoW-style two-pane quest log.
// Left: available quests (+ a completed history). Right: the selected quest's
// full detail — story, objectives with live progress, and rewards.

import { useState } from 'react';
import type { GameState } from '../../types';
import { QUEST_STEPS, getQuestGivers } from '../../data/quests';
import type { QuestStepData } from '../../data/quests';
import { activeStepForGiver } from '../../systems/engine';

function cap(s: string): string { return s[0].toUpperCase() + s.slice(1); }

export function QuestLogModal({
  state, onClose, initialNpc,
}: { state: GameState; onClose: () => void; initialNpc?: string }) {
  // Available now = each giver's current visible, unclaimed step.
  const available: { npc: string; step: QuestStepData }[] = [];
  for (const npc of getQuestGivers()) {
    const step = activeStepForGiver(state, npc);
    if (step) available.push({ npc, step });
  }
  const completed = QUEST_STEPS.filter(q => state.questClaimed[q.id]);

  const firstId =
    (initialNpc && available.find(a => a.npc === initialNpc)?.step.id) ||
    available[0]?.step.id ||
    completed[completed.length - 1]?.id ||
    null;
  const [selectedId, setSelectedId] = useState<string | null>(firstId);

  const selected: QuestStepData | null =
    available.find(a => a.step.id === selectedId)?.step ??
    completed.find(q => q.id === selectedId) ??
    available[0]?.step ?? null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal quest-log-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>Quest Log</h3>

        <div className="quest-log-body">
          {/* LEFT: list */}
          <div className="quest-log-list">
            {available.length === 0 && (
              <div className="quest-log-empty">No one has work for you right now.</div>
            )}
            {available.map(({ npc, step }) => (
              <button
                key={step.id}
                className={`quest-log-item ${selected?.id === step.id ? 'active' : ''}`}
                onClick={() => setSelectedId(step.id)}
              >
                <span className="quest-log-item-title">{step.title}</span>
                <span className="quest-log-item-giver">{npc}</span>
              </button>
            ))}

            {completed.length > 0 && (
              <>
                <div className="quest-log-section">Completed</div>
                {completed.map((q) => (
                  <button
                    key={q.id}
                    className={`quest-log-item done ${selected?.id === q.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(q.id)}
                  >
                    <span className="quest-log-item-title">{q.title}</span>
                    <span className="quest-log-item-giver">{q.npc}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* RIGHT: detail */}
          <div className="quest-log-detail">
            {selected
              ? <QuestDetail state={state} step={selected} done={!!state.questClaimed[selected.id]} />
              : <div className="quest-log-empty">Select a quest to see its details.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestDetail({ state, step, done }: { state: GameState; step: QuestStepData; done: boolean }) {
  const objs = step.objectives(state);
  return (
    <div className="quest-detail">
      <div className="quest-detail-head">
        <span className="quest-detail-title">{step.title}</span>
        {done && <span className="quest-detail-done">Completed</span>}
      </div>
      <div className="quest-detail-giver">{step.npc}</div>

      <p className="quest-detail-quote">{step.text}</p>

      <div className="quest-detail-section">Objective</div>
      <div className="quest-detail-objective">{step.objective}</div>
      <div className="quest-detail-objlist">
        {objs.map((o, i) => {
          const complete = o.cur >= o.target;
          return (
            <div key={i} className={`quest-obj ${complete ? 'done' : ''}`}>
              <span className="quest-obj-check">{complete ? '✓' : '○'}</span>
              <span className="quest-obj-label">{o.label}</span>
              <span className="quest-obj-count">{Math.min(o.cur, o.target)} / {o.target}</span>
            </div>
          );
        })}
      </div>

      <div className="quest-detail-section">Rewards</div>
      <div className="quest-detail-rewards">
        {step.rewards.coin !== undefined && (
          <div className="quest-reward"><i className="ti ti-coin" aria-hidden="true"></i> {step.rewards.coin.toLocaleString()} coin</div>
        )}
        {(step.rewards.perks ?? []).map((p, i) => (
          <div key={i} className="quest-reward"><i className="ti ti-star" aria-hidden="true"></i> +{p.n} {cap(p.skill)} perk point{p.n > 1 ? 's' : ''}</div>
        ))}
        {step.rewards.note && (
          <div className="quest-reward"><i className="ti ti-sparkles" aria-hidden="true"></i> {step.rewards.note}</div>
        )}
      </div>
    </div>
  );
}
