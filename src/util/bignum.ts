// bignum.ts — wraps break_eternity.js with the helpers Splinterwood uses.
//
// What this module does:
//   - Decimal is the big-number type used for coin, XP, and combat numbers.
//     Stats like crit chance / speed stay as plain JS numbers (they're 0-1.x).
//   - Provides arithmetic + comparison helpers that accept plain numbers OR
//     Decimal instances on either side, so existing call sites don't all need
//     to be touched at once.
//   - formatBig() is the canonical number formatter — short suffix names from
//     million up through centillion (1e303). Beyond that, fall back to
//     "vigintillion" combos. Players should never see scientific notation.
//
// Performance:
//   - Decimal operations are ~100x slower than plain number ops. Don't use
//     them in tight per-frame loops. Use them for state values; convert to
//     number for display / percent math at the call site.

import Decimal from 'break_eternity.js';

export type BigLike = Decimal | number | string;

export function Big(x: BigLike): Decimal {
  if (x instanceof Decimal) return x;
  return new Decimal(x);
}

export function bAdd(a: BigLike, b: BigLike): Decimal { return Big(a).add(Big(b)); }
export function bSub(a: BigLike, b: BigLike): Decimal { return Big(a).sub(Big(b)); }
export function bMul(a: BigLike, b: BigLike): Decimal { return Big(a).mul(Big(b)); }
export function bDiv(a: BigLike, b: BigLike): Decimal { return Big(a).div(Big(b)); }

export function bGte(a: BigLike, b: BigLike): boolean { return Big(a).gte(Big(b)); }
export function bGt(a: BigLike, b: BigLike): boolean  { return Big(a).gt(Big(b));  }
export function bLte(a: BigLike, b: BigLike): boolean { return Big(a).lte(Big(b)); }
export function bLt(a: BigLike, b: BigLike): boolean  { return Big(a).lt(Big(b));  }
export function bEq(a: BigLike, b: BigLike): boolean  { return Big(a).eq(Big(b));  }
export function bMax(a: BigLike, b: BigLike): Decimal { return Big(a).max(Big(b)); }
export function bMin(a: BigLike, b: BigLike): Decimal { return Big(a).min(Big(b)); }

// Round down to integer
export function bFloor(a: BigLike): Decimal { return Big(a).floor(); }

// Raise a number to a power. Used heavily for the per-level multiplier
// (e.g. 1.025^level for coin gain). The base can be a plain number; the
// exponent must also be a plain number for break_eternity.js's API.
export function bPow(base: BigLike, exponent: number): Decimal {
  return Big(base).pow(exponent);
}

// Convert Decimal -> JS number. Returns Infinity if the value is too large
// to fit in a JS number. Use only for percentages, display fractions, or
// when you've already bounded the magnitude.
export function bToNumber(a: BigLike): number {
  return Big(a).toNumber();
}

// JSON serialization: store as a string to preserve precision.
// Parses back with Big() on load.
export function bSerialize(a: BigLike): string {
  return Big(a).toString();
}

// Tag prefix used in JSON serialization to mark Decimal-backed fields.
const BIG_TAG = '__BIG__';

// break_eternity.js Decimals have their own .toJSON() which fires during
// JSON.stringify BEFORE any replacer runs, returning a plain string or
// number. That means a custom replacer-based approach won't catch them.
//
// Instead, we walk the state object explicitly: known Decimal fields are
// pre-tagged into the format "__BIG__<number>" before stringifying, and
// the matching parser walks the object after parsing and converts tagged
// strings back to Decimal instances. This is brittle in that it requires
// listing the Decimal-holding paths, but it's bulletproof at runtime.
//
// Decimal field paths (relative to state root):
//   coin
//   hp
//   maxHp
//   skills.<id>.xp        — for each skill
//   task?.foeHp
//   combatTask?.foeHp
//   task?.playerHp
//   combatTask?.playerHp

// Deep-clone helper that converts every Decimal at a known path to a tagged
// string. Mutates a copy so the caller's state isn't touched.
function tagDecimalFields(state: any): any {
  // Shallow clone the top object so we can re-assign tagged fields without
  // touching the original.
  const out: any = { ...state };

  out.coin = tagOne(state.coin);
  out.hp = tagOne(state.hp);
  out.maxHp = tagOne(state.maxHp);
  out.slush = tagOne(state.slush);
  out.slushLifetime = tagOne(state.slushLifetime);

  if (state.skills) {
    out.skills = {};
    for (const k of Object.keys(state.skills)) {
      const sk = state.skills[k];
      out.skills[k] = { ...sk, xp: tagOne(sk.xp) };
    }
  }
  if (state.task) {
    out.task = { ...state.task };
    if (state.task.foeHp !== null && state.task.foeHp !== undefined) {
      out.task.foeHp = tagOne(state.task.foeHp);
    }
    if (state.task.playerHp !== undefined) {
      out.task.playerHp = tagOne(state.task.playerHp);
    }
  }
  if (state.combatTask) {
    out.combatTask = { ...state.combatTask };
    if (state.combatTask.foeHp !== null && state.combatTask.foeHp !== undefined) {
      out.combatTask.foeHp = tagOne(state.combatTask.foeHp);
    }
    if (state.combatTask.playerHp !== undefined) {
      out.combatTask.playerHp = tagOne(state.combatTask.playerHp);
    }
  }
  return out;
}

function tagOne(v: any): string {
  // Accept Decimal, number, or string. Always emit a tagged string so the
  // reverse step doesn't have to guess.
  if (v === null || v === undefined) return v;
  if (typeof v === 'string' && v.startsWith(BIG_TAG)) return v;
  // Decimal has .toString(); plain numbers also stringify naturally.
  const s = typeof v === 'object' && v && typeof v.toString === 'function'
    ? v.toString()
    : String(v);
  return BIG_TAG + s;
}

// Walk a parsed object and turn tagged strings back into Decimal instances.
function revivetagged(state: any): any {
  if (!state) return state;
  if (state.coin !== undefined) state.coin = reviveOne(state.coin);
  if (state.hp !== undefined) state.hp = reviveOne(state.hp);
  if (state.maxHp !== undefined) state.maxHp = reviveOne(state.maxHp);
  if (state.slush !== undefined) state.slush = reviveOne(state.slush);
  if (state.slushLifetime !== undefined) state.slushLifetime = reviveOne(state.slushLifetime);
  if (state.skills) {
    for (const k of Object.keys(state.skills)) {
      if (state.skills[k] && state.skills[k].xp !== undefined) {
        state.skills[k].xp = reviveOne(state.skills[k].xp);
      }
    }
  }
  if (state.task) {
    if (state.task.foeHp !== null && state.task.foeHp !== undefined) {
      state.task.foeHp = reviveOne(state.task.foeHp);
    }
    if (state.task.playerHp !== undefined) {
      state.task.playerHp = reviveOne(state.task.playerHp);
    }
  }
  if (state.combatTask) {
    if (state.combatTask.foeHp !== null && state.combatTask.foeHp !== undefined) {
      state.combatTask.foeHp = reviveOne(state.combatTask.foeHp);
    }
    if (state.combatTask.playerHp !== undefined) {
      state.combatTask.playerHp = reviveOne(state.combatTask.playerHp);
    }
  }
  return state;
}

function reviveOne(v: any): any {
  if (v === null || v === undefined) return v;
  if (typeof v === 'string' && v.startsWith(BIG_TAG)) {
    return new Decimal(v.slice(BIG_TAG.length));
  }
  // Plain number or untagged string — could happen if save was written by
  // a buggy serializer in v0.81. Coerce to Decimal anyway.
  if (typeof v === 'number' || typeof v === 'string') {
    return new Decimal(v);
  }
  return v;
}

// Legacy: kept as no-op replacer/reviver in case anyone calls them directly,
// but the explicit walkers above are what stringifyState/parseState use.
export function bignumReplacer(_key: string, value: any): any { return value; }
export function bignumReviver(_key: string, value: any): any { return value; }

// Full-state serializer. Tags Decimal fields explicitly before stringify.
export function stringifyState(state: any): string {
  return JSON.stringify(tagDecimalFields(state));
}

// Full-state parser. Revives tagged strings back to Decimal instances.
export function parseState(raw: string): any {
  return revivetagged(JSON.parse(raw));
}

// ---------- Display formatter ----------
//
// Short-suffix scale names. Index 0 = "" (less than 1000), 1 = "thousand", etc.
// Each step is 1000x the previous. Goes up through centillion (10^303).
// Beyond centillion we synthesize "vigintillion"-style combos so the player
// never sees scientific notation.
const SHORT_SCALE: string[] = [
  '',
  'thousand',     // 1e3
  'million',      // 1e6
  'billion',      // 1e9
  'trillion',     // 1e12
  'quadrillion',  // 1e15
  'quintillion',  // 1e18
  'sextillion',   // 1e21
  'septillion',   // 1e24
  'octillion',    // 1e27
  'nonillion',    // 1e30
  'decillion',    // 1e33
  'undecillion',  // 1e36
  'duodecillion', // 1e39
  'tredecillion',
  'quattuordecillion',
  'quindecillion',
  'sexdecillion',
  'septendecillion',
  'octodecillion',
  'novemdecillion',
  'vigintillion',     // 1e63
  'unvigintillion',
  'duovigintillion',
  'trevigintillion',
  'quattuorvigintillion',
  'quinvigintillion',
  'sexvigintillion',
  'septenvigintillion',
  'octovigintillion',
  'novemvigintillion',
  'trigintillion',    // 1e93
  'untrigintillion',
  'duotrigintillion',
  'tretrigintillion',
  'quattuortrigintillion',
  'quintrigintillion',
  'sextrigintillion',
  'septentrigintillion',
  'octotrigintillion',
  'novemtrigintillion',
  'quadragintillion',  // 1e123
  'quinquagintillion', // 1e153
  'sexagintillion',    // 1e183
  'septuagintillion',  // 1e213
  'octogintillion',    // 1e243
  'nonagintillion',    // 1e273
  'centillion',        // 1e303
];

// Returns "1.42 quintillion" or "847" or "12.5K" depending on magnitude.
//
// Modes:
//   - Below 10,000: plain number, no suffix ("123", "9,847")
//   - 10K to 999K: short form with K ("23.4K", "847K")
//   - 1 million+: long-form name ("1.42 million", "847 quintillion")
//
// Precision: 2 decimal places when needed, omitted when value is a clean integer.
export function formatBig(value: BigLike, opts?: { short?: boolean }): string {
  const d = Big(value);
  if (d.lt(0)) return '-' + formatBig(d.neg(), opts);
  if (d.eq(0)) return '0';

  // Below 10,000 — show as plain integer with commas
  if (d.lt(10000)) {
    const n = d.toNumber();
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toFixed(1);
  }

  // Short K/M/B mode (for compact UI)
  if (opts?.short) {
    return shortFormat(d);
  }

  // 10K to under 1M — short form with K
  if (d.lt(1e6)) {
    const n = d.toNumber() / 1000;
    return n.toFixed(n < 100 ? 1 : 0) + 'K';
  }

  // 1M+ — long-form scale name
  // Get magnitude: how many groups of 3 zeros (1M = 2, 1B = 3, etc.)
  const log10 = d.log10().toNumber();
  const magnitudeIdx = Math.floor(log10 / 3);

  if (magnitudeIdx < SHORT_SCALE.length) {
    // We have a name for this magnitude
    const divisor = new Decimal(10).pow(magnitudeIdx * 3);
    const mantissa = d.div(divisor).toNumber();
    const suffix = SHORT_SCALE[magnitudeIdx];
    return formatMantissa(mantissa) + ' ' + suffix;
  }

  // Beyond our list — synthesize "centillion" + extra zeros
  // (very rare, but never show scientific notation)
  const lastIdx = SHORT_SCALE.length - 1;
  const divisor = new Decimal(10).pow(lastIdx * 3);
  const mantissa = d.div(divisor).toNumber();
  return formatMantissa(mantissa) + ' ' + SHORT_SCALE[lastIdx];
}

function formatMantissa(n: number): string {
  if (n >= 100) return n.toFixed(0);
  if (n >= 10)  return n.toFixed(1);
  return n.toFixed(2);
}

function shortFormat(d: Decimal): string {
  if (d.lt(1000)) return Math.floor(d.toNumber()).toString();
  if (d.lt(1e6)) {
    const n = d.toNumber() / 1000;
    return n.toFixed(n < 100 ? 1 : 0) + 'K';
  }
  if (d.lt(1e9)) {
    const n = d.toNumber() / 1e6;
    return n.toFixed(n < 100 ? 1 : 0) + 'M';
  }
  if (d.lt(1e12)) {
    const n = d.toNumber() / 1e9;
    return n.toFixed(n < 100 ? 1 : 0) + 'B';
  }
  if (d.lt(1e15)) {
    const n = d.toNumber() / 1e12;
    return n.toFixed(n < 100 ? 1 : 0) + 'T';
  }
  // Beyond trillion: fall back to long-form names so the player sees
  // "4.27 quintillion" instead of running out of single-letter suffixes
  // or showing scientific notation.
  return formatBigLong(d);
}

// Internal: long-form formatter used as short's fallback past trillion.
function formatBigLong(d: Decimal): string {
  const log10 = d.log10().toNumber();
  const magnitudeIdx = Math.floor(log10 / 3);
  if (magnitudeIdx < SHORT_SCALE.length) {
    const divisor = new Decimal(10).pow(magnitudeIdx * 3);
    const mantissa = d.div(divisor).toNumber();
    return formatMantissa(mantissa) + ' ' + SHORT_SCALE[magnitudeIdx];
  }
  const lastIdx = SHORT_SCALE.length - 1;
  const divisor = new Decimal(10).pow(lastIdx * 3);
  const mantissa = d.div(divisor).toNumber();
  return formatMantissa(mantissa) + ' ' + SHORT_SCALE[lastIdx];
}
