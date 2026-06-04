// ItemTooltipFloater — hover popup for non-equipment satchel items.
// Lighter-weight than EquipmentInstanceTooltip (no per-instance tier/modifier
// math). Positioned via fixed coordinates supplied by the caller.
import { ITEMS } from '../../data/items';
import { getItemIcon, GenericIcon } from '../../data/icons';

export function ItemTooltipFloater({ itemId, equipped, locked, x, y }: {
  itemId: string; equipped: boolean; locked: boolean; x: number; y: number;
}) {
  const def = ITEMS[itemId];
  if (!def) return null;
  return (
    <div className="item-tooltip floating" role="tooltip" style={{ left: x, top: y }}>
      <div className="tooltip-header">
        <div className="tooltip-image-slot" data-item-id={itemId}>
          {getItemIcon(itemId, 56) ?? <GenericIcon size={56} />}
        </div>
        <div className="tooltip-title-block">
          <div className="tooltip-name">{def.name}</div>
          <div className="tooltip-category">{def.category}</div>
        </div>
      </div>
      {def.flavor && <div className="tooltip-flavor">"{def.flavor}"</div>}
      <div className="tooltip-stats">
        {def.equip?.atk !== undefined && (
          <div className="tooltip-stat-line">Attack: <strong>+{def.equip.atk}</strong></div>
        )}
        {def.equip?.def !== undefined && (
          <div className="tooltip-stat-line">Defense: <strong>+{def.equip.def}</strong></div>
        )}
        {def.consume?.description && (
          <div className="tooltip-stat-line green">Use: {def.consume.description}</div>
        )}
        <div className="tooltip-stat-line">Sell value: <strong>{def.sell} coin</strong></div>
        {equipped && <div className="tooltip-stat-line gold">★ Currently equipped</div>}
        {locked && <div className="tooltip-stat-line">🔒 Locked from bulk sell</div>}
        {def.category === 'quest' && <div className="tooltip-stat-line red">Cannot be sold</div>}
      </div>
    </div>
  );
}
