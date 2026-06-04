// Horizontal-scrolling 30-day track. Player sees what each day offers,
// today's day is highlighted, past days are checked. Click "Claim" to take
// today's reward.
import type { GameState } from '../../types';
import { DAILY_REWARD_TRACK, nextStreakDay } from '../../data/dailyRewards';
import { shouldOfferLetter } from '../../data/letter';

export function DailyRewardsModal({ state, onClose, onClaim }: {
  state: GameState; onClose: () => void; onClaim: () => void;
}) {
  const lastStreak = state.dailyLetterStreak ?? 0;
  const canClaim = shouldOfferLetter(state);
  const nextDay = nextStreakDay(state);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal daily-rewards-modal" onClick={(e) => e.stopPropagation()}>
        <div className="daily-rewards-header">
          <i className="ti ti-gift" aria-hidden="true"></i>
          <span>Daily Rewards</span>
        </div>
        <p className="daily-rewards-subtitle">
          {canClaim
            ? (lastStreak === 0
                ? 'Welcome. Claim your first day.'
                : `Day ${nextDay} is ready. Don't miss it.`)
            : `Streak at day ${lastStreak}. Come back later for the next.`}
        </p>

        <div className="daily-rewards-track">
          {DAILY_REWARD_TRACK.map((reward) => {
            const isPast    = reward.day <= lastStreak;
            const isToday   = canClaim && reward.day === nextDay;
            const isFuture  = !isPast && !isToday;
            const cls = `daily-reward-chip ${isPast ? 'past' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${reward.milestoneNote ? 'milestone' : ''}`;
            return (
              <div key={reward.day} className={cls}>
                <div className="daily-reward-day">Day {reward.day}</div>
                <div className="daily-reward-contents">
                  <div className="daily-reward-line"><i className="ti ti-coin" aria-hidden="true"></i> {reward.coin}</div>
                  <div className="daily-reward-line"><i className="ti ti-bread" aria-hidden="true"></i> {reward.dailyBread}</div>
                  {reward.doodleId && (
                    <div className="daily-reward-line"><i className="ti ti-feather" aria-hidden="true"></i> doodle</div>
                  )}
                  {reward.perkPoint && (
                    <div className="daily-reward-line gold-text"><i className="ti ti-star" aria-hidden="true"></i> perk pt</div>
                  )}
                </div>
                {reward.milestoneNote && (
                  <div className="daily-reward-milestone">{reward.milestoneNote}</div>
                )}
                {isPast && <div className="daily-reward-check">✓</div>}
              </div>
            );
          })}
        </div>

        <div className="daily-rewards-actions">
          {canClaim ? (
            <button className="daily-rewards-claim-btn no-click-sfx" onClick={() => { onClaim(); onClose(); }}>
              Claim Day {nextDay}
            </button>
          ) : (
            <button className="daily-rewards-claim-btn no-click-sfx" disabled>
              Already claimed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
