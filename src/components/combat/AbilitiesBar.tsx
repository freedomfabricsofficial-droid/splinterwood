// AbilitiesBar — horizontal strip of cooldown-based combat abilities.
// Each ability is a button with an icon, name, and cooldown indicator.
// Disabled until level requirements are met; clicking a ready ability
// invokes it via useAbility().
import { useState, useEffect } from 'react';
import type { GameState } from '../../types';
import { ABILITIES, canUseAbility, useAbility, cooldownRemaining } from '../../systems/abilities';
import { showToast } from '../../systems/engine';

export function AbilitiesBar({ state, onAction }: { state: GameState; onAction: () => void }) {
  const [, setTick] = useState(0);
  // Tick once per 500ms so the cooldown timer text refreshes
  useEffect(() => {
    const id = window.setInterval(() => setTick(n => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  const unlocked = ABILITIES.filter(a => a.unlock(state));
  if (unlocked.length === 0) {
    return (
      <div className="abilities-bar empty">
        <span className="abilities-bar-empty-text">No abilities yet. Reach Combat Lv 5 for your first.</span>
      </div>
    );
  }
  return (
    <div className="abilities-bar">
      {unlocked.map((ab) => {
        const check = canUseAbility(state, ab.id);
        const cd = cooldownRemaining(state, ab.id);
        const cdPct = cd > 0 ? (cd / ab.cooldownMs) * 100 : 0;
        const seconds = Math.ceil(cd / 1000);
        return (
          <button
            key={ab.id}
            className={`ability-btn ${check.ok ? 'ready' : 'cooling'}`}
            disabled={!check.ok}
            onClick={() => {
              if (useAbility(state, ab.id)) {
                showToast(`Used ${ab.name}.`);
                onAction();
              } else {
                showToast(`Can't use ${ab.name} right now.`);
              }
            }}
            title={`${ab.name}: ${ab.description}`}
          >
            <i className={`ti ${ab.icon}`} aria-hidden="true"></i>
            <span className="ability-btn-name">{ab.name}</span>
            {cd > 0 && (
              <>
                <div className="ability-cooldown-overlay" style={{ height: `${cdPct}%` }} />
                <span className="ability-cooldown-text">{seconds}s</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
