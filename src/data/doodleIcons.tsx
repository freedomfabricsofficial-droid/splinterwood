// Hand-drawn SVG illustrations for margin doodles.
// Same wobble-filter style as the icons in data/icons.tsx.
// Each renders inside a small fixed-size SVG; the overlay layer places them.

import type { JSX } from 'react';

const FILTER_PREFIX = 'sw-doodle-';

function Doodle({
  seed, size = 80, children,
}: {
  seed: number; size?: number; children: JSX.Element | JSX.Element[];
}) {
  const filterId = `${FILTER_PREFIX}${seed}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale={1.5} />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`} fill="none" stroke="#2b1d10" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

export const DOODLE_RENDERERS: Record<string, (size?: number) => JSX.Element> = {
  doodle_grumpy_cat: (size = 80) => (
    <Doodle seed={701} size={size}>
      <path d="M30 56 Q26 36 38 30 L42 22 L46 30 Q48 28 52 28 L56 22 L60 30 Q72 36 70 56 Q72 70 50 72 Q28 70 30 56 Z" />
      <path d="M42 46 L46 50" strokeWidth="2" />
      <circle cx="58" cy="48" r="2" />
      <path d="M48 56 L52 56" />
      <path d="M44 60 L42 64 M52 60 L52 64 M56 60 L58 64" strokeWidth="0.7" />
      <path d="M30 60 L18 56 M30 64 L20 64 M30 68 L20 72" strokeWidth="0.7" />
      <path d="M70 60 L82 56 M70 64 L80 64 M70 68 L80 72" strokeWidth="0.7" />
    </Doodle>
  ),
  doodle_oak_shades: (size = 80) => (
    <Doodle seed={702} size={size}>
      <path d="M28 48 Q18 44 22 32 Q22 22 32 22 Q40 16 50 22 Q60 16 68 22 Q78 22 78 32 Q82 44 72 48 Q70 56 60 52 Q54 56 50 52 Q46 56 40 52 Q30 56 28 48 Z" />
      <rect x="36" y="36" width="12" height="6" fill="#2b1d10" />
      <rect x="52" y="36" width="12" height="6" fill="#2b1d10" />
      <line x1="48" y1="38" x2="52" y2="38" strokeWidth="1.2" />
      <path d="M42 50 Q48 48 54 50" />
      <path d="M42 58 L40 86" />
      <path d="M58 58 L60 86" />
    </Doodle>
  ),
  doodle_arguing_coins: (size = 80) => (
    <Doodle seed={703} size={size}>
      <circle cx="32" cy="52" r="18" />
      <circle cx="68" cy="52" r="18" />
      <path d="M28 50 L36 50 M32 46 L32 54" strokeWidth="1.8" />
      <path d="M64 46 L72 54 M72 46 L64 54" strokeWidth="1.8" />
      <path d="M40 32 L46 26 M44 22 L48 26 L46 30" strokeWidth="0.8" />
      <path d="M60 32 L54 26 M56 22 L52 26 L54 30" strokeWidth="0.8" />
    </Doodle>
  ),
  doodle_boar_hat: (size = 80) => (
    <Doodle seed={704} size={size}>
      <ellipse cx="50" cy="58" rx="24" ry="14" />
      <path d="M28 56 Q20 56 18 50 Q22 60 26 62" />
      <circle cx="24" cy="54" r="1.2" />
      <line x1="40" y1="70" x2="38" y2="80" strokeWidth="1.5" />
      <line x1="50" y1="70" x2="50" y2="80" strokeWidth="1.5" />
      <line x1="60" y1="70" x2="62" y2="80" strokeWidth="1.5" />
      <path d="M40 44 L62 44 Q66 44 64 38 L62 30 Q50 28 38 30 L36 38 Q34 44 40 44 Z" />
      <path d="M40 44 Q50 42 60 44" strokeWidth="0.7" />
    </Doodle>
  ),
  doodle_goblin_flower: (size = 80) => (
    <Doodle seed={705} size={size}>
      <ellipse cx="50" cy="62" rx="16" ry="14" />
      <ellipse cx="50" cy="42" rx="11" ry="11" />
      <path d="M42 36 L38 26 L44 32 M58 36 L62 26 L56 32" />
      <circle cx="46" cy="42" r="1.2" />
      <circle cx="54" cy="42" r="1.2" />
      <path d="M46 48 Q50 50 54 48" />
      <path d="M36 64 L24 76" />
      <path d="M64 64 L76 56 L76 50 L70 48 L72 42 L66 42 L70 36 L64 38 L66 32 L60 36" />
      <circle cx="76" cy="50" r="3" fill="#fff4d8" />
      <circle cx="72" cy="42" r="3" fill="#fff4d8" />
      <circle cx="70" cy="36" r="3" fill="#fff4d8" />
      <circle cx="66" cy="32" r="3" fill="#fff4d8" />
    </Doodle>
  ),
  doodle_maggie_tea: (size = 80) => (
    <Doodle seed={706} size={size}>
      <path d="M30 30 L34 36 L34 50 Q34 56 30 58" strokeWidth="1" />
      <path d="M34 50 Q36 46 40 46 Q44 46 44 50 Q44 54 40 54 Q36 54 34 50 Z" />
      <path d="M38 38 Q42 32 50 30 Q54 28 60 32 L66 36 Q68 40 66 44 L60 60 Q56 66 50 64 L40 60" />
      <circle cx="50" cy="40" r="2" />
      <path d="M46 46 Q50 44 54 46" />
      <path d="M48 50 L46 56 M52 50 L54 56" strokeWidth="0.6" />
      <path d="M62 32 Q66 28 70 30 Q72 26 72 22" strokeWidth="0.7" />
      <path d="M64 36 Q68 32 72 34 Q74 30 76 28" strokeWidth="0.7" />
    </Doodle>
  ),
  doodle_axe_stump: (size = 80) => (
    <Doodle seed={707} size={size}>
      <ellipse cx="50" cy="68" rx="26" ry="8" />
      <path d="M24 68 L24 80 Q50 84 76 80 L76 68" />
      <ellipse cx="50" cy="68" rx="20" ry="6" strokeWidth="0.8" />
      <ellipse cx="50" cy="68" rx="14" ry="4" strokeWidth="0.8" />
      <path d="M50 68 L46 36" strokeWidth="2" />
      <path d="M42 36 L54 32 L58 26 L46 20 L40 30 Z" />
      <text x="20" y="40" fontFamily="Special Elite, monospace" fontSize="14" fill="#2b1d10" stroke="none">?</text>
      <text x="68" y="44" fontFamily="Special Elite, monospace" fontSize="16" fill="#2b1d10" stroke="none">?</text>
      <text x="32" y="22" fontFamily="Special Elite, monospace" fontSize="12" fill="#2b1d10" stroke="none">?</text>
    </Doodle>
  ),
  doodle_troll_crown: (size = 80) => (
    <Doodle seed={708} size={size}>
      <ellipse cx="50" cy="62" rx="20" ry="18" />
      <ellipse cx="50" cy="42" rx="14" ry="12" />
      <path d="M40 30 L40 24 L46 28 L50 22 L54 28 L60 24 L60 30 Z" />
      <circle cx="45" cy="28" r="1" fill="#a07a23" stroke="none" />
      <circle cx="55" cy="28" r="1" fill="#a07a23" stroke="none" />
      <circle cx="46" cy="42" r="1.5" />
      <circle cx="54" cy="42" r="1.5" />
      <path d="M44 50 L42 56 L46 54 L48 58 L50 54 L52 58 L54 54 L58 56 L56 50" />
    </Doodle>
  ),
  doodle_innkeep_cat: (size = 80) => (
    <Doodle seed={709} size={size}>
      <path d="M28 56 Q24 38 36 32 L40 22 L46 32 Q52 30 56 32 L60 22 L64 32 Q76 38 72 56 Q72 76 50 78 Q28 76 28 56 Z" />
      <circle cx="42" cy="50" r="1.5" />
      <circle cx="58" cy="50" r="1.5" />
      <path d="M48 56 L52 56" />
      <path d="M46 60 L42 62 M44 60 L40 64 M54 60 L58 62 M56 60 L60 64" strokeWidth="0.6" />
      <path d="M30 80 Q22 88 28 92" />
    </Doodle>
  ),
  doodle_eyed_purse: (size = 80) => (
    <Doodle seed={710} size={size}>
      <path d="M28 38 Q28 30 38 28 L62 28 Q72 30 72 38 L78 78 Q78 86 70 86 L30 86 Q22 86 22 78 Z" />
      <path d="M38 28 Q40 22 50 22 Q60 22 62 28" />
      <ellipse cx="40" cy="58" rx="6" ry="4" />
      <circle cx="40" cy="58" r="1.5" fill="#2b1d10" stroke="none" />
      <ellipse cx="60" cy="58" rx="6" ry="4" />
      <circle cx="60" cy="58" r="1.5" fill="#2b1d10" stroke="none" />
      <path d="M40 70 Q50 74 60 70" />
    </Doodle>
  ),
  doodle_complaining_seal: (size = 80) => (
    <Doodle seed={711} size={size}>
      <circle cx="44" cy="56" r="22" fill="#8a1a1a" />
      <circle cx="38" cy="50" r="6" fill="#c92020" opacity="0.4" />
      <path d="M38 52 L42 56 M42 52 L38 56" strokeWidth="2" stroke="#fff4d8" />
      <path d="M48 52 L52 56 M52 52 L48 56" strokeWidth="2" stroke="#fff4d8" />
      <path d="M36 64 Q44 60 52 64" strokeWidth="2" stroke="#fff4d8" />
      <path d="M68 30 Q76 30 80 26 Q78 36 70 38 L62 36 Q70 38 70 30" strokeWidth="1" />
      <text x="74" y="22" fontFamily="Schoolbell, cursive" fontSize="12" fill="#2b1d10" stroke="none">UGH</text>
    </Doodle>
  ),
  doodle_tankard: (size = 80) => (
    <Doodle seed={712} size={size}>
      <path d="M32 28 L32 76 Q32 82 38 82 L62 82 Q68 82 68 76 L68 28 Z" />
      <path d="M32 28 Q50 22 68 28" />
      <path d="M68 40 Q78 38 80 50 Q82 62 70 62" />
      <path d="M34 36 Q50 40 66 36" strokeWidth="0.6" />
      <ellipse cx="38" cy="22" rx="4" ry="2" />
      <ellipse cx="50" cy="20" rx="5" ry="2" />
      <ellipse cx="60" cy="22" rx="4" ry="2" />
      <line x1="38" y1="40" x2="38" y2="78" strokeWidth="0.5" />
      <line x1="62" y1="40" x2="62" y2="78" strokeWidth="0.5" />
    </Doodle>
  ),
  doodle_reminder: (size = 80) => (
    <Doodle seed={713} size={size}>
      <path d="M22 28 L78 28 L78 72 L22 72 Z" />
      <path d="M22 28 L78 72" strokeWidth="0.4" />
      <path d="M78 28 L22 72" strokeWidth="0.4" />
      <text x="50" y="56" textAnchor="middle" fontFamily="Schoolbell, cursive" fontSize="16" fill="#2b1d10" stroke="none">REMINDER</text>
    </Doodle>
  ),
  doodle_oak_council: (size = 80) => (
    <Doodle seed={714} size={size}>
      <path d="M20 60 Q14 50 18 42 Q22 36 28 38 Q32 32 38 36 Q42 30 48 36 Q52 30 58 36 Q64 32 68 36 Q74 36 78 42 Q82 50 76 60 Q70 64 64 60 Q58 64 52 60 Q46 64 40 60 Q34 64 28 60 Q22 64 20 60 Z" />
      <line x1="28" y1="48" x2="30" y2="50" />
      <line x1="38" y1="46" x2="40" y2="48" />
      <line x1="48" y1="46" x2="50" y2="48" />
      <line x1="58" y1="46" x2="60" y2="48" />
      <line x1="68" y1="48" x2="70" y2="50" />
      <path d="M22 64 L24 80 M34 64 L36 80 M46 64 L48 80 M58 64 L60 80 M70 64 L72 80" />
    </Doodle>
  ),
  doodle_stern_sword: (size = 80) => (
    <Doodle seed={715} size={size}>
      <path d="M30 14 L34 60 L30 64 L26 60 Z" />
      <path d="M14 60 L46 60 L42 66 L18 66 Z" />
      <rect x="26" y="66" width="8" height="10" />
      <circle cx="30" cy="80" r="3" />
      <path d="M48 36 Q60 32 70 38 Q66 40 64 38 Q66 44 70 42 Q60 48 50 44" />
      <text x="60" y="60" fontFamily="Schoolbell, cursive" fontSize="11" fill="#2b1d10" stroke="none">!</text>
      <text x="68" y="50" fontFamily="Schoolbell, cursive" fontSize="9" fill="#2b1d10" stroke="none">no</text>
    </Doodle>
  ),
};

// Fixed positions around the screen edges. Each doodle has a slot identified
// by index; an unlocked doodle drops into its slot. Predictable layout
// means new doodles never reshuffle existing ones.
//
// Coordinates are CSS-style: top/right/bottom/left as percentages of viewport.
// Rotation in degrees adds the "scribbled in the margin" feel.
export interface DoodleSlot {
  top?: string; right?: string; bottom?: string; left?: string;
  rotate: number;
}

export const DOODLE_SLOTS: DoodleSlot[] = [
  { top: '12%',  left: '1%',    rotate: -8 },
  { top: '35%',  right: '0.5%', rotate: 6 },
  { bottom: '14%', left: '1%',  rotate: 4 },
  { top: '60%',  left: '0.5%',  rotate: -5 },
  { bottom: '22%', right: '0.5%', rotate: -7 },
  { top: '8%',   right: '1%',   rotate: 10 },
  { bottom: '4%',  left: '6%',  rotate: 2 },
  { top: '78%',  right: '1%',   rotate: -3 },
  { top: '50%',  left: '1%',    rotate: 8 },
  { bottom: '4%',  right: '6%', rotate: -6 },
  { top: '24%',  right: '1%',   rotate: -4 },
  { top: '88%',  left: '1%',    rotate: 9 },
  { top: '4%',   left: '34%',   rotate: -10 },
  { top: '4%',   right: '36%',  rotate: 7 },
  { bottom: '4%', left: '46%',  rotate: -5 },
];
