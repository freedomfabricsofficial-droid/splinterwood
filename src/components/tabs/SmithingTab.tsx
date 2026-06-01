import React from 'react';
import type { GameState } from '../../types';
import { TaskTabRenderer } from './TaskTabRenderer';

export function SmithingTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const unlockedSkill = !!state.questFlags.visited_greystone;
  if (!unlockedSkill) {
    return (
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', padding: 12 }}>
        No forge to work yet. Find Brock.
      </p>
    );
  }
  return <TaskTabRenderer
    state={state}
    onAction={onAction}
    kind="sm"
    intro="Heat. Hammer. Wait. — Brock"
  />;
}
