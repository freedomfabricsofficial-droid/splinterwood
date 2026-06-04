import type { GameState } from '../../types';
import { TaskTabRenderer } from './TaskTabRenderer';

export function WoodcuttingTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  return <TaskTabRenderer
    state={state}
    onAction={onAction}
    kind="wc"
    intro="Choose a tree to chop. You will keep chopping until told otherwise."
  />;
}
