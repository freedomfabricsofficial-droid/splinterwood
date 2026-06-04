// CharacterSheetTab — the Self tab's primary view.
//
// Shows: 6 equipment slot blocks (with current instance or empty), an
// avatar paper-doll on the right, then a full stat block grouped by domain.
//
// Internal helpers EquippedInstanceDisplay and StatBlockDisplay are kept in
// this file because they are only used here. If a future tab needs them,
// promote to src/components/inventory/ instead.
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameState, EquipSlot, ItemInstance, StatKey, StatBlock } from '../../types';
import { ITEMS } from '../../data/items';
import { fullItemName } from '../../data/modifiers';
import { getItemIcon, GenericIcon } from '../../data/icons';
import {
  computePlayerStats, findInstanceById, instanceStats, unequipSlot,
} from '../../systems/playerStats';
import { STAT_LABELS, formatStat } from '../shared/statFormatting';
import { EquipmentInstanceTooltip } from '../inventory/EquipmentInstanceTooltip';
import { Avatar } from '../Avatar';

export function CharacterSheetTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const stats = computePlayerStats(state);
  const equipped = state.equippedInst ?? {};
  const SLOTS: { id: EquipSlot; label: string; icon: string }[] = [
    { id: 'weapon',  label: 'Weapon',  icon: 'ti-sword' },
    { id: 'offhand', label: 'Offhand', icon: 'ti-shield' },
    { id: 'head',    label: 'Head',    icon: 'ti-tools-kitchen' },
    { id: 'body',    label: 'Body',    icon: 'ti-shirt' },
    { id: 'hands',   label: 'Hands',   icon: 'ti-hand-three-fingers' },
    { id: 'trinket', label: 'Trinket', icon: 'ti-diamond' },
  ];

  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Your current account. Every number, with sources.
      </p>

      <h3 style={{ marginTop: 4, marginBottom: 8 }}>Equipment</h3>
      {/* Equipment grid on the left (3 cols × 2 rows fixed), Avatar on the right.
          Avatar frame is set to match the equipment column's height via
          align-items: stretch on the parent flexbox. */}
      <div className="adventurer-grid">
        <div className="equipment-grid">
          {SLOTS.map((slot) => {
            const instId = equipped[slot.id];
            const inst = instId ? findInstanceById(state, instId) : null;
            return (
              <div key={slot.id} className={`equip-slot ${inst ? 'filled' : 'empty'}`}>
                <div className="equip-slot-label">
                  <i className={`ti ${slot.icon}`} aria-hidden="true"></i> {slot.label}
                </div>
                {inst ? (
                  <EquippedInstanceDisplay inst={inst} onUnequip={() => {
                    unequipSlot(state, slot.id);
                    onAction();
                  }} />
                ) : (
                  <div className="equip-slot-empty">— empty —</div>
                )}
              </div>
            );
          })}
        </div>
        {/* Avatar to the right of equipment, frame matches equipment column height */}
        <div className="adventurer-avatar-pane">
          <Avatar state={state} />
        </div>
      </div>

      <h3 style={{ marginTop: 16, marginBottom: 8 }}>Stats</h3>
      <StatBlockDisplay stats={stats} />
    </>
  );
}

// One row in the equipment grid. Hovering pops the floating tooltip with
// the full breakdown; clicking ✕ unequips.
function EquippedInstanceDisplay({ inst, onUnequip }: { inst: ItemInstance; onUnequip: () => void }) {
  const baseDef = ITEMS[inst.id];
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  function show() {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ x: rect.left, y: rect.top + rect.height + 4 });
  }
  function hide() { setCoords(null); }

  if (!baseDef) return null;
  const full = fullItemName(baseDef.name, inst.tier, inst.modifier);
  const stats = instanceStats(inst);
  return (
    <div
      ref={rowRef}
      className="equip-instance has-tooltip"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className="equip-instance-icon">{getItemIcon(inst.id, 40) ?? <GenericIcon size={40} />}</div>
      <div className="equip-instance-info">
        <div className={`equip-instance-name tier-${inst.tier}`}>
          {full}
          {(inst.enchantLevel ?? 0) > 0 && (
            <span className="enchant-badge" title={`Tempered +${inst.enchantLevel}`}> +{inst.enchantLevel}</span>
          )}
        </div>
        <div className="equip-instance-stats">
          {Object.entries(stats).map(([k, v]) => (
            <span key={k} className={`equip-stat ${(v as number) >= 0 ? 'pos' : 'neg'}`}>
              {formatStat(k, v as number)}
            </span>
          ))}
        </div>
      </div>
      <button className="equip-unequip-btn" onClick={onUnequip} title="Unequip">✕</button>
      {coords && createPortal(
        <EquipmentInstanceTooltip inst={inst} equipped={true} x={coords.x} y={coords.y} />,
        document.body
      )}
    </div>
  );
}

// Groups stats for readable display. Shows ALL of them — including 0s — so
// the player can see the full ladder of what's possible to build toward.
function StatBlockDisplay({ stats }: { stats: StatBlock }) {
  const groups: { label: string; keys: StatKey[] }[] = [
    { label: 'Combat',  keys: ['hp', 'atk', 'def', 'crit', 'crit_dmg', 'speed'] },
    { label: 'Skills',  keys: ['gather_speed', 'craft_speed', 'xp_gain'] },
    { label: 'Economy', keys: ['coin_find', 'drop_rate'] },
  ];
  return (
    <div className="stat-block-display">
      {groups.map((g) => (
        <div key={g.label} className="stat-group">
          <div className="stat-group-label">{g.label}</div>
          {g.keys.map((k) => {
            const v = stats[k] ?? 0;
            return (
              <div key={k} className="stat-row">
                <span>{STAT_LABELS[k]}</span>
                <span className="stat-value">{formatStat(k, v)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
