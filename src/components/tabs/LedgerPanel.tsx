// LedgerPanel — Save/Export/Import/Burn controls.
//
// Lives in the right-rail "ledger" subtab. Pure save-management UI: no game
// state read except passing through to importSave. Reload on "Burn" wipes
// localStorage entirely (including the intro-seen flag).
import React from 'react';
import type { GameState } from '../../types';
import { saveGame, exportSave, importSave, wipeSave } from '../../state/save';
import { showToast } from '../../systems/engine';

export function LedgerPanel({ state, onAction }: { state: GameState; onAction: () => void }) {
  return (
    <>
      <button style={{ width: '100%', marginBottom: 6 }} onClick={() => { saveGame(state); showToast('Saved.'); }}>Save Now</button>
      <button style={{ width: '100%', marginBottom: 6 }} onClick={() => {
        const data = exportSave(state);
        window.prompt('Copy this save string:', data);
      }}>Export Save</button>
      <button style={{ width: '100%', marginBottom: 6 }} onClick={() => {
        const raw = window.prompt('Paste save string:');
        if (!raw) return;
        try {
          const next = importSave(raw);
          Object.assign(state, next);
          saveGame(state);
          onAction();
          showToast('Save imported.');
        } catch (_e) {
          alert('That save string is gibberish.');
        }
      }}>Import Save</button>
      <button className="danger" style={{ width: '100%' }} onClick={() => {
        if (!window.confirm('Burn the ledger? All progress lost.')) return;
        wipeSave();
        localStorage.removeItem('splinterwood_intro_seen');
        window.location.reload();
      }}>Burn the Ledger</button>
      <div style={{ fontSize: '0.78em', fontStyle: 'italic', marginTop: 8, color: 'var(--ink-soft)' }}>
        Auto-saves every 15s. Offline progress is granted on return.
      </div>
    </>
  );
}
