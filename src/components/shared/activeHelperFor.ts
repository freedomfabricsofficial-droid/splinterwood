// Returns the currently-active helper for a given task slot, or null.
// Used by gather/craft tab cards to show "X is working" tags and progress bars.
import { HELPERS } from '../../data/helpers';
import type { GameState, TaskKind } from '../../types';

export function activeHelperFor(state: GameState, kind: TaskKind, taskId: string) {
  for (const h of HELPERS) {
    if (state.helpersHired[h.id] && h.kind === kind && h.taskId === taskId) return h;
  }
  return null;
}
