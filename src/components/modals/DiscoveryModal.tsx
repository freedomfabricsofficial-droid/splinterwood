// Blocking modal shown when the player finds a lore item: a journal page,
// curio, note, etc. Reads from state.pendingDiscoveries queue (engine
// pushes, modal shifts on dismiss).
//
// Voice rendering is per-block (see PageBlockRenderer) so writing and
// reader observations look distinct.
//
// To add a new discovery kind ('curio', 'note', etc):
//   1. Add the kind to PendingDiscovery in types.ts
//   2. Add a branch below that resolves refId → display fields
//   3. The engine pushes onto state.pendingDiscoveries — no other UI wiring needed.

import React from "react";
import { PAGES_BY_ID } from '../../data/pages';
import type { PendingDiscovery } from '../../types';
import { PageBlockRenderer } from '../shared/PageBlockRenderer';

export function DiscoveryModal({ discovery, onClose }: {
  discovery: PendingDiscovery; onClose: () => void;
}) {
  if (discovery.kind === 'page') {
    const page = PAGES_BY_ID[discovery.refId];
    if (!page) return null;
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal discovery-modal" onClick={(e) => e.stopPropagation()}>
          <div className="discovery-header">
            <i className="ti ti-file-text" aria-hidden="true"></i>
            <span>A page found</span>
          </div>
          <h3 className="discovery-title">{page.title}</h3>
          <div className="discovery-body">
            {page.body.map((block, i) => (
              <PageBlockRenderer key={i} block={block} />
            ))}
          </div>
          <button className="discovery-close-btn" onClick={onClose}>I see.</button>
        </div>
      </div>
    );
  }
  // Future: handle 'curio' and 'note' here when those exist.
  return null;
}
