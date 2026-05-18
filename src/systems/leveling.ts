export const MAX_LEVEL = 99;

export function xpForLevel(lvl: number): number {
  return Math.floor(50 * Math.pow(lvl, 1.7));
}

export function cumulativeXpToLevel(lvl: number): number {
  let sum = 0;
  for (let i = 1; i < lvl; i++) sum += xpForLevel(i);
  return sum;
}

export function levelFromTotalXp(xp: number): number {
  let lvl = 1;
  let accum = 0;
  while (lvl < MAX_LEVEL) {
    const need = xpForLevel(lvl);
    if (accum + need > xp) break;
    accum += need;
    lvl++;
  }
  return lvl;
}
