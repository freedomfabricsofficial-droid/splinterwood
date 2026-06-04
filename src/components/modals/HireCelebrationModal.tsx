// Shown once when a helper is hired. Confetti has already burst from the
// game loop; the modal frames the moment with the helper's intro line.
import { HELPERS } from '../../data/helpers';

export function HireCelebrationModal({ helperId, onClose }: { helperId: string; onClose: () => void }) {
  const helper = HELPERS.find(h => h.id === helperId);
  if (!helper) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal hire-celebration-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hire-celebration-badge">★ HIRED ★</div>
        <h3>{helper.name}</h3>
        <p className="modal-body" style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-soft)' }}>
          {helper.flavor}
        </p>
        <div className="hire-celebration-intro">
          {helper.introLine}
        </div>
        <p className="modal-body" style={{ textAlign: 'center', fontSize: '0.9em', color: 'var(--ink-soft)' }}>
          They begin work immediately. You never need to touch this node again.
        </p>
        <button onClick={onClose}>Welcome aboard</button>
      </div>
    </div>
  );
}
