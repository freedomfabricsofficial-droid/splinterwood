// AdventurerPanel — the "Adventurer" subtab of the right rail.
//
// Compact summary: coin, HP, attack/defense, crit, speed; then a per-skill
// level/XP block; then any active buffs at the bottom.
//
// ActiveBuffsPanel lives in this file because it's only consumed here. If
// other UI needs it later, promote to a top-level panel file.
import type { GameState } from '../../types';
import { ITEMS } from '../../data/items';
import { getVisibleSkills } from '../../data/skillInfo';
import { ABILITIES } from '../../systems/abilities';
import { computePlayerStats } from '../../systems/playerStats';
import { totalAtk, totalDef, xpForLevel, cumulativeXpToLevel } from '../../systems/engine';
import { fmt, formatTime } from '../../systems/format';
import { formatStat } from '../shared/statFormatting';
import { AnimatedNumber } from '../../ui/AnimatedNumber';
import { bToNumber, bSub } from '../../util/bignum';

export function AdventurerPanel({ state }: { state: GameState }) {
  const stats = computePlayerStats(state);
  return (
    <>
      <div className="adventurer-section">
        <div className="stat-row"><span>Coin</span><AnimatedNumber value={state.coin} /></div>
        <div className="stat-row"><span>Health</span><AnimatedNumber value={Math.max(0, Math.floor(bToNumber(state.hp)))} format={(n) => `${n} / ${fmt(state.maxHp)}`} /></div>
        <div className="stat-row"><span>Attack</span><span>{totalAtk(state)}</span></div>
        <div className="stat-row"><span>Defense</span><span>{totalDef(state)}</span></div>
        <div className="stat-row"><span>Crit Chance</span><span>{formatStat('crit', stats.crit ?? 0)}</span></div>
        <div className="stat-row"><span>Crit Damage</span><span>{formatStat('crit_dmg', stats.crit_dmg ?? 0.5)}</span></div>
        <div className="stat-row"><span>Speed</span><span>{formatStat('speed', stats.speed ?? 0)}</span></div>
      </div>
      <h3>Skills</h3>
      {getVisibleSkills(state).map((id) => {
        const sk = state.skills[id];
        const need = xpForLevel(sk.level);
        const xpInLvl = Math.floor(Math.max(0, bToNumber(bSub(sk.xp, cumulativeXpToLevel(sk.level)))));
        const pct = Math.min(100, (xpInLvl / need) * 100);
        return (
          <div key={id}>
            <div className="stat-row">
              <span>
                {id[0].toUpperCase() + id.slice(1)}
                {sk.perkPoints > 0 && <span className="perk-points-badge">{sk.perkPoints} pp</span>}
              </span>
              <span>Lv {sk.level}</span>
            </div>
            <div className="xp-bar-wrap">
              <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
              <span className="xp-bar-label">{fmt(xpInLvl)} / {fmt(need)} XP</span>
            </div>
          </div>
        );
      })}
      <ActiveBuffsPanel state={state} />
    </>
  );
}

function ActiveBuffsPanel({ state }: { state: GameState }) {
  const now = Date.now();
  const active = state.activeBuffs.filter(b => b.expiresAt > now);
  if (active.length === 0) return null;
  return (
    <div className="panel buffs-panel">
      <h2>Active Effects</h2>
      {active.map((b, i) => {
        const remaining = Math.max(0, (b.expiresAt - now) / 1000);

        // Ability buff: source is "ability_<id>"
        if (typeof b.source === 'string' && b.source.startsWith('ability_')) {
          const abilityId = b.source.slice('ability_'.length);
          const ability = ABILITIES.find(a => a.id === abilityId);
          return (
            <div key={i} className="buff-row">
              <div className="buff-name">{ability?.name ?? abilityId}</div>
              <div className="buff-effect">{ability?.description ?? ''}</div>
              <div className="buff-time">{formatTime(remaining)} left</div>
            </div>
          );
        }

        // Legacy XP-multiplier buff from items
        const def = ITEMS[b.source];
        const skillLabel = b.skill === 'all' ? 'all skills' : b.skill;
        return (
          <div key={i} className="buff-row">
            <div className="buff-name">{def?.name ?? b.source}</div>
            <div className="buff-effect">+{Math.round(b.multiplier * 100)}% XP · {skillLabel}</div>
            <div className="buff-time">{formatTime(remaining)} left</div>
          </div>
        );
      })}
    </div>
  );
}
