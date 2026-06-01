import React from 'react';
import type { GameState } from '../../types';
import { TaskTabRenderer } from './TaskTabRenderer';

export function CarvingTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  return <TaskTabRenderer
    state={state}
    onAction={onAction}
    kind="cv"
    intro="Whittle raw logs into useful (or sellable) goods."
  />;
}
