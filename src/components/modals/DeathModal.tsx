// Shown after the player dies in combat. Death stops combat, applies coin
// penalty, and surfaces this modal with a Restaurant-of-Sad-Lessons summary.
import React from "react";
export function DeathModal({ event, onDismiss }: {
  event: { coinLost: number; foeName: string; line: string };
  onDismiss: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onDismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>An Account of the Incident</h3>
        <p className="modal-body">
          Returned to Splinterwood {event.line}. Pockets lighter by <strong>{event.coinLost} coin</strong>.
          The <em>{event.foeName}</em> yet lives. So, regrettably, do I.
        </p>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
