// Quest dialog modal. Shows the active step in the NPC's quest chain plus
// prior completed steps. Per-NPC class controls voice font on quest text
// (Maggie's Indie Flower handwriting, Brock's Special Elite typewriter, etc.)
import type { GameState } from '../../types';
import { QUEST_STEPS } from '../../data/quests';
import { activeStepForGiver } from '../../systems/engine';

export function QuestGiverModal({ state, npc, onClose }: {
  state: GameState; npc: string; onClose: () => void;
}) {
  const npcSteps = QUEST_STEPS.filter(q => q.npc === npc);
  const activeStep = activeStepForGiver(state, npc);
  const npcClass =
      npc.includes('Maggie') ? 'quest-from-maggie'
    : npc.includes('Brock')  ? 'quest-from-brock'
    : npc.includes('Laileb') ? 'quest-from-laileb'
    : '';
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal quest-modal ${npcClass}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>{npc}</h3>
        {activeStep ? (
          <div className="quest-npc">
            <span className="speaker">{npc}:</span> {activeStep.text}
          </div>
        ) : (
          <div className="quest-npc" style={{ fontStyle: 'italic' }}>
            <span className="speaker">{npc}:</span> "Nothing for you right now. Come back later."
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          {npcSteps.map((step) => {
            const claimed = !!state.questClaimed[step.id];
            const visible = step.visible(state);
            if (!visible && !claimed) return null;
            const cls = claimed ? 'done' : (step === activeStep ? 'active' : '');
            return (
              <div key={step.id} className={`quest-step ${cls}`}>
                {claimed ? step.text : (step === activeStep ? step.text : '???')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
