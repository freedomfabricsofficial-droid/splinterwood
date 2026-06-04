import type { GameState } from '../../types';
import { TaskTabRenderer } from './TaskTabRenderer';

export function AlchemyTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const unlockedSkill = !!state.questFlags.visited_floor3;
  if (!unlockedSkill) {
    return (
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', padding: 12 }}>
        No cauldron, no clouds, no Laileb. Climb higher first.
      </p>
    );
  }
  return <TaskTabRenderer
    state={state}
    onAction={onAction}
    kind="al"
    intro="Everything is a tonic if you're brave enough. — Laileb"
  />;
}
