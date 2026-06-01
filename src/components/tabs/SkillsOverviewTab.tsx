// SkillsOverviewTab — the Self tab's progression view.
//
// One card per skill showing what it does, where it's used, and the roadmap
// of what unlocks at each level milestone. Helps the player answer "what do
// these numbers DO?" and plan what to grind next.
//
// SkillSpeedSummary is a child helper that surfaces the breakdown of perks,
// permanent buffs, and equipment contributions for a single skill's speed.
// Provides the visibility the player needs to verify "yes, Sharper Axe is
// doing something."
import React from 'react';
import type { GameState, SkillId } from '../../types';
import { SKILL_INFO, getAllSkillsForDisplay } from '../../data/skillInfo';
import { perkEffect } from '../../systems/perks';
import { fmt } from '../../systems/format';
import { xpForLevel, cumulativeXpToLevel } from '../../systems/engine';
import { bSub, bToNumber } from '../../util/bignum';

export function SkillsOverviewTab({ state }: { state: GameState }) {
  const skills = getAllSkillsForDisplay(state);
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Every skill, every milestone. What you can do, and what's still to come.
      </p>
      {skills.map(({ id, locked }) => {
        const info = SKILL_INFO[id];
        const sk = state.skills[id];
        const lvl = sk?.level ?? 0;
        const need = xpForLevel(lvl);
        // sk.xp is Decimal — subtract the cumulative threshold (number),
        // then bring the remainder back to a JS number for display math.
        const xpInLvl = sk
          ? Math.floor(Math.max(0, bToNumber(bSub(sk.xp, cumulativeXpToLevel(lvl)))))
          : 0;
        const pct = Math.min(100, (xpInLvl / need) * 100);
        return (
          <div key={id} className={`skill-overview-card ${locked ? 'locked' : ''}`}>
            <div className="skill-overview-header">
              <div className="skill-overview-name">
                {info.name}
                <span className="skill-overview-level">Lv {lvl}</span>
              </div>
              {info.introducedOn && (
                <div className="skill-overview-floor">From: {info.introducedOn}</div>
              )}
            </div>
            {!locked && (
              <div className="skill-overview-xp">
                <div className="xp-bar-wrap">
                  <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
                  <span className="xp-bar-label">{fmt(xpInLvl)} / {fmt(need)} XP</span>
                </div>
              </div>
            )}
            <div className="skill-overview-flavor">{info.flavor}</div>
            <div className="skill-overview-description">{info.description}</div>
            {!locked && <SkillSpeedSummary state={state} skillId={id} />}
            <div className="skill-overview-section-label">Used in</div>
            <ul className="skill-overview-list">
              {info.usedIn.map((u, i) => <li key={i}>{u}</li>)}
            </ul>
            <div className="skill-overview-section-label">Milestones</div>
            <ul className="skill-overview-list skill-overview-milestones">
              {info.unlocks.map((u, i) => {
                const reached = lvl >= u.level;
                return (
                  <li key={i} className={reached ? 'reached' : 'pending'}>
                    <span className="milestone-level">Lv {u.level}</span>
                    <span className="milestone-what">{u.what}</span>
                    {reached && <span className="milestone-check">✓</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}

function SkillSpeedSummary({ state, skillId }: { state: GameState; skillId: SkillId }) {
  // Map skill -> perk keys
  const perkKey: Partial<Record<SkillId, string>> = {
    woodcutting: 'wc_speed',
    carving:     'cv_speed',
    mining:      'mn_speed',
    smithing:    'sm_speed',
  };
  const key = perkKey[skillId];
  if (!key) return null; // combat doesn't fit this summary

  const isGather = (skillId === 'woodcutting' || skillId === 'mining');
  const perkBonus = perkEffect(state, key as any);
  const perm = state.permBonuses ?? {};
  const unifiedBuff = isGather ? (perm.gatherSpeed ?? 0) : (perm.craftSpeed ?? 0);
  const legacyKey: Record<SkillId, 'wcSpeed' | 'cvSpeed' | 'mnSpeed' | 'smSpeed' | undefined> = {
    woodcutting: 'wcSpeed', carving: 'cvSpeed', mining: 'mnSpeed', smithing: 'smSpeed',
    combat: undefined,
  };
  const legacyBuff = (legacyKey[skillId] ? perm[legacyKey[skillId] as 'wcSpeed'] : undefined) ?? 0;

  const total = perkBonus + unifiedBuff + legacyBuff;
  const fmtPct = (v: number) => `+${(v * 100).toFixed(1)}%`;

  if (total === 0) return null;

  return (
    <div className="skill-speed-summary">
      <div className="skill-speed-summary-label">{isGather ? 'Gather speed' : 'Craft speed'}</div>
      <div className="skill-speed-summary-rows">
        {perkBonus > 0 && <div className="skill-speed-row"><span>Perks</span><span>{fmtPct(perkBonus)}</span></div>}
        {unifiedBuff > 0 && <div className="skill-speed-row"><span>Counter buffs</span><span>{fmtPct(unifiedBuff)}</span></div>}
        {legacyBuff > 0 && <div className="skill-speed-row"><span>Legacy buffs</span><span>{fmtPct(legacyBuff)}</span></div>}
        <div className="skill-speed-row skill-speed-total"><span>Total</span><span>{fmtPct(total)}</span></div>
      </div>
    </div>
  );
}
