// =============================================================================
// DAILY REWARDS — 30-day reward track
// =============================================================================
//
// 30 individual reward days on a horizontal scrolling track. Player can claim
// one reward per day. Streak resets if a day is missed (44h grace period
// matches the existing letter system). After day 30, the cycle restarts.
//
// To add a new reward type:
//   1. Add the field to DailyRewardContents below
//   2. Add a kind to the union here
//   3. Handle it in grantDailyReward (engine-side) and renderDailyRewardChip (UI)
//
// To change the schedule:
//   Edit DAILY_REWARD_TRACK below. Each entry is what the player gets on
//   that day of the streak.

import { MARGIN_DOODLES } from './letter';

// What's granted on a given day
export interface DailyRewardContents {
  day: number;            // 1..30
  coin: number;           // coin awarded
  dailyBread: number;     // currency for Maggie's counter
  perkPoint?: boolean;    // +1 combat perk point (rare milestone reward)
  doodleId?: string;      // margin doodle (every day)
  milestoneNote?: string; // brief description for milestone days
}

// Builds the standard 30-day schedule.
// Doodles cycle through MARGIN_DOODLES — one per day, looping if there are
// fewer than 30 doodles defined.
function buildSchedule(): DailyRewardContents[] {
  const schedule: DailyRewardContents[] = [];
  for (let day = 1; day <= 30; day++) {
    const isMilestone7  = day === 7;
    const isMilestone14 = day === 14;
    const isMilestone30 = day === 30;

    // Coin scales gently; milestones bump it
    let coin = 100 + Math.floor((day - 1) * 25);
    if (isMilestone7)  coin += 500;
    if (isMilestone14) coin += 1500;
    if (isMilestone30) coin += 5000;

    // Daily Bread: 1/day, milestones give extra
    let dailyBread = 1;
    if (isMilestone7)  dailyBread = 3;
    if (isMilestone14) dailyBread = 5;
    if (isMilestone30) dailyBread = 10;

    // Perk point on milestones only
    const perkPoint = isMilestone7 || isMilestone14 || isMilestone30;

    // Doodle every day (looping if needed)
    const doodleId = MARGIN_DOODLES[(day - 1) % MARGIN_DOODLES.length].id;

    let milestoneNote: string | undefined;
    if (isMilestone7)  milestoneNote = 'One week';
    if (isMilestone14) milestoneNote = 'Two weeks';
    if (isMilestone30) milestoneNote = 'Thirty days';

    schedule.push({ day, coin, dailyBread, perkPoint, doodleId, milestoneNote });
  }
  return schedule;
}

export const DAILY_REWARD_TRACK: DailyRewardContents[] = buildSchedule();

// Look up a single day's reward
export function getDayReward(day: number): DailyRewardContents | null {
  if (day < 1 || day > 30) return null;
  return DAILY_REWARD_TRACK[day - 1];
}

// Calculate which day's reward the player would receive if they claim now.
// - Never claimed: day 1
// - Claimed within grace window: continue streak (day = lastStreak+1, wraps to 1 after 30)
// - Claimed too long ago: streak resets to 1
export function nextStreakDay(state: import('../types').GameState): number {
  const lastStreak = state.dailyLetterStreak ?? 0;
  const lastClaim = state.dailyLetterLastClaim ?? 0;
  if (lastClaim === 0) return 1;
  const GRACE_MS = 44 * 60 * 60 * 1000;   // 44h grace before streak resets
  const elapsed = Date.now() - lastClaim;
  if (elapsed > GRACE_MS) return 1;       // streak broken
  // Wrap after 30
  return (lastStreak >= 30) ? 1 : lastStreak + 1;
}
