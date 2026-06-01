// Stat formatting — display labels and value formatters.
// Pure utility, no React. Used by character sheet, tooltips, ledger.
import type { StatKey } from '../../types';

export const STAT_LABELS: Record<StatKey, string> = {
  hp: 'Max HP',
  atk: 'Attack',
  def: 'Defense',
  crit: 'Crit Chance',
  crit_dmg: 'Crit Damage',
  speed: 'Combat Speed',
  gather_speed: 'Gather Speed',
  craft_speed: 'Craft Speed',
  coin_find: 'Coin Find',
  drop_rate: 'Drop Rate',
  xp_gain: 'XP Gain',
  combat_coin_bonus: 'Combat Coin Bonus',
  combat_drop_bonus: 'Combat Drop Bonus',
};

// Format a stat value with its proper unit (% or flat)
export function formatStat(key: string, v: number): string {
  const k = key as StatKey;
  const isPct = [
    'crit', 'crit_dmg', 'speed', 'gather_speed', 'craft_speed',
    'coin_find', 'drop_rate', 'xp_gain',
    'combat_coin_bonus', 'combat_drop_bonus',
  ].includes(k);
  if (isPct) {
    const pct = Math.round(v * 1000) / 10;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct}%`;
  }
  return `${v >= 0 ? '+' : ''}${Math.round(v * 10) / 10}`;
}
