import { formatBig, type BigLike } from '../util/bignum';

// Display formatter for any numeric value in the game UI.
//
// Default behavior (fmt): short form — "23.4K", "1.4M", "847B", etc.
// This matches the original game's UI density.
//
// For headline displays where we want the full name ("1.42 quintillion"),
// use fmtLong. The full-name formatter never falls back to scientific
// notation — it goes all the way through centillion.
export function fmt(n: BigLike): string {
  return formatBig(n, { short: true });
}

export function fmtLong(n: BigLike): string {
  return formatBig(n);
}

// Compact short form alias kept for backward compatibility — equivalent to fmt.
export const fmtShort = fmt;

export function formatTime(s: number): string {
  if (s < 60) return Math.floor(s) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + Math.floor(s % 60) + 's';
  if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  return Math.floor(s / 86400) + 'd ' + Math.floor((s % 86400) / 3600) + 'h';
}
