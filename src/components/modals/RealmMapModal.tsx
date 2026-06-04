// Folding map of the realm. Each floor renders as a card; locked floors show
// unlock hints, unlocked floors offer travel. Clicking the active floor is a
// no-op (you're already there).
import type { GameState } from '../../types';
import { FLOORS, getCurrentFloor } from '../../data/floors';
import type { FloorId } from '../../data/floors';

export function RealmMapModal({ state, onClose, onTravel }: {
  state: GameState;
  onClose: () => void;
  onTravel: (floorId: FloorId) => void;
}) {
  const current = getCurrentFloor(state);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal realm-map-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>The Realm</h3>
        <p className="modal-body" style={{ fontStyle: 'italic', textAlign: 'center' }}>
          A folding map. The ink shifts where you haven't been.
        </p>
        <div className="realm-grid">
          {FLOORS.map((floor) => {
            const unlocked = floor.isUnlocked(state);
            const isCurrent = current.id === floor.id;
            return (
              <div
                key={floor.id}
                className={`realm-card theme-${floor.theme} ${unlocked ? 'unlocked' : 'fogged'} ${isCurrent ? 'current' : ''}`}
                onClick={() => { if (unlocked) onTravel(floor.id); }}
              >
                <div className="realm-card-number">Floor {floor.number}</div>
                <div className="realm-card-name">{unlocked ? floor.name : '???'}</div>
                {unlocked && floor.npc && (
                  <div className="realm-card-npc">{floor.npc}</div>
                )}
                <div className="realm-card-flavor">{floor.flavor}</div>
                {!unlocked && floor.unlockHint && (
                  <div className="realm-card-hint">{floor.unlockHint}</div>
                )}
                {unlocked && (
                  <button
                    className="realm-travel-btn"
                    disabled={isCurrent}
                    onClick={(e) => { e.stopPropagation(); if (!isCurrent) onTravel(floor.id); }}
                  >
                    {isCurrent ? 'You are here' : 'Visit'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
