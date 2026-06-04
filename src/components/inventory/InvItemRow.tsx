// InvItemRow — one row in a satchel category section.
//
// Displays item name (with equipped/locked markers), count, and the action
// buttons (Use/Lock/Sell). Hovering opens a floating tooltip.
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameState } from '../../types';
import { ITEMS } from '../../data/items';
import { consumeItem, toggleItemLock, sellItem } from '../../systems/engine';
import { ItemTooltipFloater } from './ItemTooltipFloater';

export function InvItemRow({ id, state, onAction, cat, equipped, locked, isConsumable }: {
  id: string;
  state: GameState;
  onAction: () => void;
  cat: string;
  equipped: boolean;
  locked: boolean;
  isConsumable: boolean;
}) {
  const def = ITEMS[id];
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  function show() {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ x: rect.left - 12, y: rect.top });
  }
  function hide() { setCoords(null); }

  return (
    <div
      ref={rowRef}
      className="inv-item has-tooltip"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <span>
        {def.name}
        {equipped && <span title="Equipped"> ★</span>}
        {locked && <span title="Locked"> 🔒</span>}
      </span>
      <span className="count">
        {state.inv[id]}{' '}
        {isConsumable && (
          <button
            className="mini use-btn"
            onClick={() => { consumeItem(state, id); onAction(); }}
            title={def.consume?.description}
          >Use</button>
        )}
        <button
          className="mini"
          onClick={() => { toggleItemLock(state, id); onAction(); }}
          title={locked ? 'Unlock' : 'Lock'}
        >{locked ? '🔓' : '🔒'}</button>
        <button
          className="mini no-click-sfx"
          onClick={() => { sellItem(state, id); onAction(); }}
          disabled={cat === 'quest'}
        >Sell</button>
      </span>
      {coords && createPortal(
        <ItemTooltipFloater itemId={id} equipped={equipped} locked={locked} x={coords.x} y={coords.y} />,
        document.body
      )}
    </div>
  );
}
