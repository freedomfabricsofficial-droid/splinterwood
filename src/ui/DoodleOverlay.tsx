// Renders all owned margin doodles at fixed positions around the page edges.
// The overlay is pointer-events: none so it never blocks UI interaction.

import type { GameState } from '../types';
import { MARGIN_DOODLES } from '../data/letter';
import { DOODLE_RENDERERS, DOODLE_SLOTS } from '../data/doodleIcons';

export function DoodleOverlay({ state }: { state: GameState }) {
  const owned = state.doodlesOwned ?? {};
  return (
    <div className="doodle-overlay" aria-hidden="true">
      {MARGIN_DOODLES.map((d, idx) => {
        if (!owned[d.id]) return null;
        const slot = DOODLE_SLOTS[idx];
        if (!slot) return null;
        const renderer = DOODLE_RENDERERS[d.id];
        if (!renderer) return null;
        const positionStyle: React.CSSProperties = {
          position: 'fixed',
          transform: `rotate(${slot.rotate}deg)`,
          pointerEvents: 'none',
          opacity: 0.55,
          top: slot.top, right: slot.right, bottom: slot.bottom, left: slot.left,
        };
        return (
          <div key={d.id} className="doodle-mark" style={positionStyle} title={d.name}>
            {renderer(72)}
          </div>
        );
      })}
    </div>
  );
}
