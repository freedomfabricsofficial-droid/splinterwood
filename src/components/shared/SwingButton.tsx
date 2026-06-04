// Active mode "swing" button. Click to add immediate progress/damage to the
// current task, then cools down for SWING_COOLDOWN_MS. Re-renders on a short
// interval so the cooldown ring updates smoothly.
//
// `slot` controls which task slot it acts on:
//   - 'task' (default) → gather/craft swings
//   - 'combatTask' → combat swings (the only slot that has a real cooldown)
//
// Per-skill swing sound plays on each successful press.
import { useState, useEffect } from 'react';
import type { GameState } from '../../types';
import { canSwing, swingCooldownRemaining, doSwing, SWING_COOLDOWN_MS } from '../../systems/engine';
import { playSfx } from '../../systems/audio';

export function SwingButton({ state, label, onAction, slot = 'task' }: {
  state: GameState; label: string; onAction: () => void; slot?: 'task' | 'combatTask';
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60);
    return () => window.clearInterval(id);
  }, []);
  const ready = canSwing(state, slot);
  const remainingMs = swingCooldownRemaining(state, slot);
  const pct = ready ? 100 : 100 - (remainingMs / SWING_COOLDOWN_MS) * 100;

  function handleClick() {
    if (!ready) return;
    const ok = doSwing(state, slot);
    if (ok) {
      const kind = state[slot]?.kind;
      if (kind === 'wc') playSfx('chop');
      else if (kind === 'mn') playSfx('mine');
      else if (kind === 'cv') playSfx('craft');
      else if (kind === 'sm') playSfx('smith');
      else if (kind === 'al') playSfx('craft');
      // combat already plays 'hit' via the foe_hit event
      onAction();
    }
  }

  return (
    <button
      className={`swing-btn no-click-sfx ${ready ? 'ready' : 'cooling'}`}
      onClick={handleClick}
      disabled={!ready}
      aria-label={`Active swing: ${label}`}
      title="Active mode: click to push the task forward."
    >
      <span className="swing-label">{label}!</span>
      <span className="swing-cooldown-ring" style={{ width: `${pct}%` }} />
    </button>
  );
}
