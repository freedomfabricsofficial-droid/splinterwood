// TaskTabRenderer — single rendering implementation for all gather/workshop tabs.
//
// Every gather/workshop tab is a thin wrapper around this. Adding a new
// task to TASK_REGISTRY automatically renders correctly on its tab; adding
// a new task tab is a one-line wrapper.
//
// The renderer pulls all uniform behavior in one place:
//   - Helper detection
//   - Active-task progress display
//   - Active swing button + stop button
//   - Start button with affordability check (for craft tasks)
//   - Locked label when level requirement not met
import React from 'react';
import type { GameState, TaskKind } from '../../types';
import { tasksForKind } from '../../data/tasks';
import { TaskCard } from './TaskCard';

interface TaskTabRendererProps {
  state: GameState;
  onAction: () => void;
  kind: TaskKind;
  intro: string;
  iconForTask?: (taskId: string) => React.ReactElement | null;
}

export function TaskTabRenderer({ state, onAction, kind, intro, iconForTask }: TaskTabRendererProps) {
  const tasks = tasksForKind(kind);
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        {intro}
      </p>
      {tasks.map((entry) => (
        <TaskCard
          key={entry.taskId}
          state={state}
          onAction={onAction}
          entry={entry}
          iconForTask={iconForTask}
        />
      ))}
    </>
  );
}
