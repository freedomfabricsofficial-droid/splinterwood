// Random event modal — a pop-up with branching choices. Driven by
// EVENT_DEFS in src/data/events.ts.
import React, { useState } from 'react';
import type { GameState } from '../../types';
import type { RandomEventDef } from '../../data/events';
import { showToast } from '../../systems/engine';
import { bAdd, bSub, bLt } from '../../util/bignum';

export function EventModal({ event, state, onClose, onAction }: {
  event: RandomEventDef;
  state: GameState;
  onClose: () => void;
  onAction: () => void;
}) {
  const [resolution, setResolution] = useState<string | null>(null);

  function pick(choice: { resolve: (s: GameState, h: any) => string }) {
    const text = choice.resolve(state, {
      addCoin:    (n: number) => { state.coin = bAdd(state.coin, n); },
      addItem:    (id: string, n: number) => { state.inv[id] = (state.inv[id] ?? 0) + n; },
      removeCoin: (n: number) => {
        if (bLt(state.coin, n)) return false;
        state.coin = bSub(state.coin, n);
        return true;
      },
      showToast,
    });
    setResolution(text);
    onAction();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal event-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>{event.title}</h3>
        <p className="modal-body" style={{ fontStyle: 'italic' }}>{event.flavor}</p>

        {resolution === null ? (
          <div className="event-choices">
            {event.choices.map((c, i) => {
              const enabled = c.enabled ? c.enabled(state) : true;
              return (
                <button
                  key={i}
                  className="event-choice"
                  disabled={!enabled}
                  onClick={() => pick(c)}
                >
                  <span className="event-choice-label">{c.label}</span>
                  {c.description && <span className="event-choice-desc">{c.description}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <p className="event-resolution">{resolution}</p>
            <button onClick={onClose}>Continue</button>
          </>
        )}
      </div>
    </div>
  );
}
