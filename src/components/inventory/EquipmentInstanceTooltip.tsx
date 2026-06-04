// Floating tooltip for an equipment instance.
// Positioned via fixed coordinates supplied by the caller (typically via
// createPortal so it can break out of clipping parents).
import type { ItemInstance, StatKey } from '../../types';
import { ITEMS } from '../../data/items';
import { instanceStats, getInstanceSellPrice } from '../../systems/playerStats';
import { fullItemName, getModifier, QUALITY_LABEL } from '../../data/modifiers';
import { getItemIcon, GenericIcon } from '../../data/icons';
import { STAT_LABELS, formatStat } from '../shared/statFormatting';

export function EquipmentInstanceTooltip({ inst, equipped, x, y }: {
  inst: ItemInstance; equipped: boolean; x: number; y: number;
}) {
  const def = ITEMS[inst.id];
  if (!def) return null;
  const full = fullItemName(def.name, inst.tier, inst.modifier);
  const stats = instanceStats(inst);
  const mod = getModifier(inst.modifier);
  const sellPrice = getInstanceSellPrice(inst);
  return (
    <div className="item-tooltip floating" role="tooltip" style={{ left: x, top: y }}>
      <div className="tooltip-header">
        <div className="tooltip-image-slot">
          {getItemIcon(inst.id, 56) ?? <GenericIcon size={56} />}
        </div>
        <div className="tooltip-title-block">
          <div className={`tooltip-name tier-${inst.tier}`}>{full}</div>
          <div className="tooltip-category">{def.equip?.slot ? def.equip.slot : 'equipment'}</div>
        </div>
      </div>
      {def.flavor && <div className="tooltip-flavor">"{def.flavor}"</div>}
      <div className="tooltip-stats">
        <div className="tooltip-stat-line"><strong>Quality: {QUALITY_LABEL[inst.tier]}</strong></div>
        {mod && mod.name && (
          <div className="tooltip-stat-line"><em>Modifier: {mod.name}</em></div>
        )}
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className={`tooltip-stat-line ${(v as number) >= 0 ? '' : 'red'}`}>
            {STAT_LABELS[k as StatKey] ?? k}: <strong>{formatStat(k, v as number)}</strong>
          </div>
        ))}
        <div className="tooltip-stat-line">Sell value: <strong>{sellPrice} coin</strong></div>
        {equipped && <div className="tooltip-stat-line gold">★ Currently equipped</div>}
        {inst.locked && <div className="tooltip-stat-line">🔒 Locked from bulk sell</div>}
      </div>
    </div>
  );
}
