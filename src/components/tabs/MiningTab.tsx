import type { GameState } from '../../types';
import { TaskTabRenderer } from './TaskTabRenderer';

export function MiningTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  // Mining is locked entirely until the player has been told about Greystone
  const unlockedSkill = !!state.questFlags.visited_greystone;
  if (!unlockedSkill) {
    return (
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', padding: 12 }}>
        You have no business with stone yet. Speak with Maggie when you've grown.
      </p>
    );
  }
  return <TaskTabRenderer
    state={state}
    onAction={onAction}
    kind="mn"
    intro="Stone breaks. Eventually. Pick what to break first."
  />;
}
