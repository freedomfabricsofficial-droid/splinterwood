// Hand-drawn SVG icons in the "player-sketched ledger" style.
// Each illustration uses a turbulence-displacement filter for the wobble effect.
//
// IMPORTANT: when adding new items/foes/trees/recipes, also add an icon here.
// If an icon is missing, the renderer falls back to a generic placeholder.

import type { JSX } from 'react';

// Shared filter definition - placed once at the document level by IconDefs component below.
const FILTER_PREFIX = 'sw-rough-';

function HandDrawn({
  seed,
  scale = 1.5,
  size = 64,
  children,
}: {
  seed: number;
  scale?: number;
  size?: number;
  children: JSX.Element | JSX.Element[];
}) {
  const filterId = `${FILTER_PREFIX}${seed}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale={scale} />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`} fill="none" stroke="#2b1d10" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

// ============================================================
// ITEMS
// ============================================================

export const ITEM_ICONS: Record<string, (size?: number) => JSX.Element> = {
  // Logs
  log_twig: (size = 64) => (
    <HandDrawn seed={101} size={size}>
      <path d="M20 80 L80 40" />
      <path d="M30 70 L38 66" />
      <path d="M50 56 L58 50" />
      <path d="M70 46 L78 48" />
      <path d="M72 42 Q76 36 76 30" />
    </HandDrawn>
  ),
  log_oak: (size = 64) => (
    <HandDrawn seed={102} size={size}>
      <ellipse cx="50" cy="30" rx="28" ry="10" />
      <path d="M22 30 L22 70 Q22 80 50 80 Q78 80 78 70 L78 30" />
      <ellipse cx="50" cy="30" rx="22" ry="7" strokeWidth="0.8" />
      <ellipse cx="50" cy="30" rx="16" ry="5" strokeWidth="0.8" />
      <ellipse cx="50" cy="30" rx="10" ry="3" strokeWidth="0.8" />
      <ellipse cx="50" cy="30" rx="4" ry="1.5" strokeWidth="0.8" />
      <path d="M30 40 L31 70 M40 38 L41 75 M60 38 L60 75 M70 40 L69 70" strokeWidth="0.6" />
    </HandDrawn>
  ),
  log_pine: (size = 64) => (
    <HandDrawn seed={103} size={size}>
      <ellipse cx="50" cy="26" rx="26" ry="9" />
      <path d="M24 26 L24 74 Q24 82 50 82 Q76 82 76 74 L76 26" />
      <ellipse cx="50" cy="26" rx="20" ry="6" strokeWidth="0.8" />
      <ellipse cx="50" cy="26" rx="13" ry="4" strokeWidth="0.8" />
      <ellipse cx="50" cy="26" rx="6" ry="2" strokeWidth="0.8" />
      {/* Sap drip detail */}
      <path d="M68 50 Q66 56 70 60 Q72 56 70 52" strokeWidth="0.7" />
    </HandDrawn>
  ),
  log_ironbark: (size = 64) => (
    <HandDrawn seed={104} size={size} scale={2}>
      <ellipse cx="50" cy="28" rx="30" ry="10" strokeWidth="2" />
      <path d="M20 28 L20 72 Q20 82 50 82 Q80 82 80 72 L80 28" strokeWidth="2" />
      <ellipse cx="50" cy="28" rx="23" ry="7" strokeWidth="1" />
      <ellipse cx="50" cy="28" rx="15" ry="4.5" strokeWidth="1" />
      <ellipse cx="50" cy="28" rx="7" ry="2" strokeWidth="1" />
      {/* Heavy bark */}
      <path d="M28 42 L30 78 M40 40 L41 80 M58 40 L60 80 M70 42 L72 78" strokeWidth="0.9" />
      <path d="M34 56 L38 60 M52 54 L56 58 M64 58 L68 62" strokeWidth="0.5" />
    </HandDrawn>
  ),

  // Equipment
  item_club: (size = 64) => (
    <HandDrawn seed={201} size={size}>
      <path d="M32 78 Q35 70 38 64 Q35 50 42 40 Q50 28 64 28 Q76 30 76 42 Q74 54 64 56 Q56 56 50 60 L42 70 L44 76 Z" />
      <path d="M50 50 L56 56 M54 48 L60 54 M58 46 L64 52" strokeWidth="0.6" />
      <circle cx="55" cy="38" r="3" />
      <circle cx="64" cy="44" r="2.5" />
      <circle cx="50" cy="46" r="2" />
    </HandDrawn>
  ),
  item_shield: (size = 64) => (
    <HandDrawn seed={202} size={size}>
      <path d="M50 14 Q26 20 26 36 Q26 60 50 86 Q74 60 74 36 Q74 20 50 14 Z" />
      <path d="M50 22 Q34 26 34 38 Q34 56 50 76 Q66 56 66 38 Q66 26 50 22 Z" strokeWidth="1" />
      {/* Bark texture lines */}
      <path d="M40 36 L46 42 M54 36 L60 42 M42 50 L48 56 M52 50 L58 56" strokeWidth="0.6" />
      <line x1="50" y1="22" x2="50" y2="76" strokeWidth="0.6" />
    </HandDrawn>
  ),
  item_sword: (size = 64) => (
    <HandDrawn seed={203} size={size}>
      <path d="M50 14 L54 68 L50 74 L46 68 Z" />
      <line x1="50" y1="18" x2="50" y2="64" strokeWidth="0.8" />
      <path d="M32 68 L68 68 L64 74 L36 74 Z" />
      <line x1="38" y1="69" x2="42" y2="73" />
      <line x1="48" y1="69" x2="52" y2="73" />
      <line x1="58" y1="69" x2="62" y2="73" />
      <rect x="46" y="74" width="8" height="12" />
      <line x1="46" y1="78" x2="54" y2="78" />
      <line x1="46" y1="82" x2="54" y2="82" />
      <circle cx="50" cy="90" r="4" />
      <path d="M48 30 L50 34 L52 30 M48 44 L50 48 L52 44" strokeWidth="0.6" />
    </HandDrawn>
  ),
  item_greatbow: (size = 64) => (
    <HandDrawn seed={204} size={size}>
      {/* Curved bow */}
      <path d="M30 14 Q14 50 30 86" strokeWidth="2.2" />
      <path d="M30 14 Q22 18 22 22" />
      <path d="M30 86 Q22 82 22 78" />
      {/* Bowstring */}
      <line x1="22" y1="22" x2="22" y2="78" strokeWidth="0.8" />
      {/* Arrow nocked */}
      <line x1="22" y1="50" x2="80" y2="50" />
      <path d="M80 50 L74 46 M80 50 L74 54" />
      <path d="M22 50 L26 47 L26 53 Z" strokeWidth="0.8" />
      {/* Grip wrap */}
      <line x1="26" y1="46" x2="26" y2="54" strokeWidth="0.8" />
      <line x1="28" y1="44" x2="28" y2="56" strokeWidth="0.8" />
    </HandDrawn>
  ),

  // Consumables
  potion_minor: (size = 64) => (
    <HandDrawn seed={301} size={size}>
      <rect x="42" y="14" width="16" height="12" />
      <path d="M38 26 Q39 30 42 32 L42 78 Q42 88 50 88 Q58 88 58 78 L58 32 Q61 30 62 26 Z" />
      <path d="M44 50 Q50 47 56 50 Q56 55 50 55 Q44 55 44 50 Z" strokeWidth="1" />
      <circle cx="47" cy="42" r="1.5" />
      <circle cx="52" cy="38" r="1" />
      <circle cx="55" cy="44" r="1.2" />
      <rect x="44" y="60" width="12" height="10" />
      <line x1="46" y1="64" x2="54" y2="64" strokeWidth="0.8" />
      <line x1="46" y1="67" x2="54" y2="67" strokeWidth="0.8" />
    </HandDrawn>
  ),
  potion_greater: (size = 64) => (
    <HandDrawn seed={302} size={size}>
      <rect x="40" y="12" width="20" height="12" />
      <path d="M36 24 Q38 30 42 32 L40 78 Q40 90 50 90 Q60 90 60 78 L58 32 Q62 30 64 24 Z" />
      <path d="M42 44 Q50 40 58 44 Q58 52 50 52 Q42 52 42 44 Z" strokeWidth="1" />
      <path d="M42 56 Q50 53 58 56" strokeWidth="0.8" />
      <circle cx="46" cy="40" r="1.5" />
      <circle cx="54" cy="36" r="1.2" />
      <circle cx="50" cy="38" r="1" />
      {/* Wax seal on cork */}
      <ellipse cx="50" cy="18" rx="6" ry="2" strokeWidth="0.8" />
      <rect x="42" y="64" width="16" height="12" />
      <line x1="44" y1="68" x2="56" y2="68" strokeWidth="0.8" />
      <line x1="44" y1="71" x2="56" y2="71" strokeWidth="0.8" />
      <line x1="44" y1="74" x2="56" y2="74" strokeWidth="0.8" />
    </HandDrawn>
  ),
  potion_full: (size = 64) => (
    <HandDrawn seed={303} size={size} scale={1.8}>
      <rect x="38" y="10" width="24" height="12" strokeWidth="2" />
      <path d="M32 22 Q34 28 40 32 L36 80 Q36 92 50 92 Q64 92 64 80 L60 32 Q66 28 68 22 Z" strokeWidth="2" />
      <path d="M38 38 Q50 32 62 38 Q62 50 50 50 Q38 50 38 38 Z" strokeWidth="1.2" />
      <path d="M38 54 Q50 48 62 54" strokeWidth="1" />
      <path d="M38 64 Q50 60 62 64" strokeWidth="1" />
      <path d="M40 74 Q50 70 60 74" strokeWidth="1" />
      <circle cx="44" cy="36" r="1.6" />
      <circle cx="52" cy="32" r="1.4" />
      <circle cx="56" cy="40" r="1.2" />
      {/* Ornate label */}
      <rect x="40" y="60" width="20" height="16" />
      <path d="M44 66 L56 66 M44 70 L56 70 M44 74 L56 74" strokeWidth="0.8" />
      <path d="M50 56 L52 60 L48 60 Z" />
    </HandDrawn>
  ),
  potion_xp: (size = 64) => (
    <HandDrawn seed={304} size={size}>
      {/* Scroll / page rolled */}
      <path d="M24 26 Q24 22 28 22 L72 22 Q76 22 76 26 Q76 30 72 30 L28 30 Q24 30 24 26 Z" />
      <path d="M28 30 L28 78 Q28 82 32 82 L68 82 Q72 82 72 78 L72 30" />
      <path d="M24 78 Q24 82 28 82 L24 90 Q20 86 24 78 Z" />
      {/* Scribbles */}
      <path d="M34 42 Q40 40 46 42 Q52 40 58 42 Q64 40 66 42" strokeWidth="0.8" />
      <path d="M34 50 Q42 48 50 50 Q58 48 66 50" strokeWidth="0.8" />
      <path d="M34 58 Q40 56 46 58 Q52 56 60 58" strokeWidth="0.8" />
      <path d="M34 66 Q44 64 54 66 Q62 64 64 66" strokeWidth="0.8" />
      {/* Scratched-out */}
      <line x1="36" y1="42" x2="44" y2="42" strokeWidth="1.5" />
    </HandDrawn>
  ),
  lucky_penny: (size = 64) => (
    <HandDrawn seed={305} size={size}>
      <circle cx="50" cy="50" r="28" />
      <circle cx="50" cy="50" r="22" strokeWidth="0.8" />
      {/* Crude $ symbol */}
      <path d="M50 36 L50 64" strokeWidth="2" />
      <path d="M58 42 Q50 38 44 44 Q44 50 50 50 Q56 50 56 56 Q56 62 48 60 Q42 58 42 56" />
      {/* "Lucky" arrow annotation */}
      <path d="M76 30 L86 22 M84 22 L86 22 L86 25" strokeWidth="0.8" />
    </HandDrawn>
  ),

  // Alchemy tonics
  tonic_swiftroot: (size = 64) => (
    <HandDrawn seed={311} size={size}>
      {/* Round-bottomed flask */}
      <rect x="45" y="14" width="10" height="14" />
      <path d="M45 28 L45 44 Q30 56 30 70 Q30 86 50 86 Q70 86 70 70 Q70 56 55 44 L55 28 Z" />
      <path d="M34 66 Q50 60 66 66 Q66 78 50 80 Q34 78 34 66 Z" strokeWidth="1" />
      {/* Sprout / root motif */}
      <path d="M50 44 Q50 36 46 32 M50 40 Q56 36 58 32" strokeWidth="0.8" />
      <circle cx="44" cy="72" r="1.2" />
      <circle cx="56" cy="70" r="1" />
    </HandDrawn>
  ),
  tonic_ember: (size = 64) => (
    <HandDrawn seed={312} size={size}>
      <rect x="44" y="12" width="12" height="12" />
      <path d="M40 24 Q42 30 44 32 L40 76 Q40 88 50 88 Q60 88 60 76 L56 32 Q58 30 60 24 Z" />
      {/* Flame inside */}
      <path d="M50 44 Q46 52 50 58 Q54 52 52 46 Q56 50 54 58 Q58 54 56 48" strokeWidth="0.9" />
      <path d="M42 64 Q50 60 58 64 Q58 74 50 76 Q42 74 42 64 Z" strokeWidth="1" />
      <ellipse cx="50" cy="18" rx="6" ry="2" strokeWidth="0.8" />
    </HandDrawn>
  ),
  tonic_veil: (size = 64) => (
    <HandDrawn seed={313} size={size} scale={1.4}>
      <rect x="42" y="10" width="16" height="12" strokeWidth="1.5" />
      <path d="M34 22 Q36 28 42 32 L38 78 Q38 90 50 90 Q62 90 62 78 L58 32 Q64 28 66 22 Z" strokeWidth="1.5" />
      {/* Swirling veil contents */}
      <path d="M40 46 Q50 40 60 46 Q56 54 50 50 Q44 54 40 46 Z" strokeWidth="1" />
      <path d="M40 60 Q50 54 60 60 Q56 68 50 64 Q44 68 40 60 Z" strokeWidth="0.9" />
      <circle cx="46" cy="40" r="1.2" />
      <circle cx="55" cy="38" r="1" />
      {/* Faint question-mark wisp */}
      <path d="M48 70 Q52 68 52 72 Q52 74 50 75" strokeWidth="0.6" />
    </HandDrawn>
  ),

  // --- Alchemy reagents (rare gathering drops) ---
  reagent_twig_burl: (size = 64) => (
    <HandDrawn seed={321} size={size}>
      <path d="M24 70 Q40 60 52 46 Q60 36 74 28" strokeWidth="2" />
      <path d="M44 50 Q52 42 60 48 Q60 58 50 58 Q42 56 44 50 Z" />
      <path d="M30 64 L26 72 M58 38 L64 34" strokeWidth="0.8" />
    </HandDrawn>
  ),
  reagent_oak_bulb: (size = 64) => (
    <HandDrawn seed={322} size={size}>
      <path d="M50 24 L50 36" strokeWidth="1.5" />
      <path d="M50 36 Q30 40 32 60 Q34 80 50 80 Q66 80 68 60 Q70 40 50 36 Z" />
      <path d="M42 54 Q50 50 58 54" strokeWidth="0.8" />
      <circle cx="46" cy="60" r="1" /><circle cx="56" cy="62" r="1" />
    </HandDrawn>
  ),
  reagent_pinecone: (size = 64) => (
    <HandDrawn seed={323} size={size}>
      <path d="M50 22 Q40 30 40 50 Q40 72 50 82 Q60 72 60 50 Q60 30 50 22 Z" />
      <path d="M44 36 Q50 40 56 36 M42 48 Q50 53 58 48 M44 60 Q50 64 56 60" strokeWidth="0.8" />
      <path d="M50 30 L50 78" strokeWidth="0.6" />
    </HandDrawn>
  ),
  reagent_ironbud: (size = 64) => (
    <HandDrawn seed={324} size={size}>
      <path d="M50 20 Q38 40 40 60 Q42 78 50 82 Q58 78 60 60 Q62 40 50 20 Z" strokeWidth="2" />
      <path d="M50 30 L50 76" strokeWidth="1" />
      <path d="M44 50 L56 50" strokeWidth="0.8" />
    </HandDrawn>
  ),
  reagent_sand_pearl: (size = 64) => (
    <HandDrawn seed={325} size={size}>
      <circle cx="50" cy="52" r="24" />
      <path d="M40 44 Q46 38 54 42" strokeWidth="1" />
      <circle cx="42" cy="46" r="1.5" />
    </HandDrawn>
  ),
  reagent_grey_geode: (size = 64) => (
    <HandDrawn seed={326} size={size}>
      <path d="M28 50 Q24 32 44 28 Q66 24 74 44 Q80 64 60 74 Q36 80 28 50 Z" />
      <path d="M44 44 L52 38 L60 44 L56 56 L48 56 Z" strokeWidth="1" />
      <path d="M52 38 L52 56 M44 44 L60 44" strokeWidth="0.6" />
    </HandDrawn>
  ),
  reagent_blue_gem: (size = 64) => (
    <HandDrawn seed={327} size={size}>
      <path d="M50 22 L72 44 L50 82 L28 44 Z" strokeWidth="1.5" />
      <path d="M28 44 L72 44 M50 22 L50 82 M38 44 L50 60 L62 44" strokeWidth="0.7" />
    </HandDrawn>
  ),
  reagent_veinheart: (size = 64) => (
    <HandDrawn seed={328} size={size}>
      <path d="M50 78 Q26 58 26 42 Q26 28 38 28 Q48 28 50 40 Q52 28 62 28 Q74 28 74 42 Q74 58 50 78 Z" />
      <path d="M50 40 L44 56 L54 58 L48 70" strokeWidth="0.9" />
    </HandDrawn>
  ),

  // --- Enchanting reagents (rare enemy drops) ---
  reagent_goblin_eye: (size = 64) => (
    <HandDrawn seed={331} size={size}>
      <path d="M22 50 Q50 28 78 50 Q50 72 22 50 Z" />
      <circle cx="50" cy="50" r="11" />
      <circle cx="50" cy="50" r="4" />
      <path d="M30 40 Q26 36 24 38 M70 40 Q74 36 76 38" strokeWidth="0.7" />
    </HandDrawn>
  ),
  reagent_boar_tusk: (size = 64) => (
    <HandDrawn seed={332} size={size}>
      <path d="M64 24 Q40 30 32 56 Q30 72 42 74 Q46 60 52 48 Q60 32 70 30 Q68 26 64 24 Z" />
      <circle cx="30" cy="34" r="1.2" /><circle cx="24" cy="44" r="1" /><circle cx="34" cy="26" r="1" />
      <circle cx="22" cy="36" r="0.9" />
    </HandDrawn>
  ),
  reagent_bandit_knuckle: (size = 64) => (
    <HandDrawn seed={333} size={size}>
      <path d="M34 30 Q26 30 26 38 Q26 46 34 44 L62 56 Q70 58 70 50 Q70 42 62 44 Z" />
      <path d="M30 28 Q24 24 22 30 Q24 36 30 34 M30 40 Q24 44 26 50 Q32 50 32 44" strokeWidth="0.8" />
      <path d="M66 54 Q72 50 74 56 Q72 62 66 60 M66 46 Q72 42 74 48" strokeWidth="0.8" />
    </HandDrawn>
  ),
  reagent_brigand_brand: (size = 64) => (
    <HandDrawn seed={334} size={size}>
      <path d="M28 28 L70 30 L72 70 L30 72 Z" />
      <path d="M34 34 L34 66 M66 34 L66 66" strokeWidth="0.5" />
      <path d="M44 44 Q50 38 56 44 Q56 52 50 52 Q44 52 44 60" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="1.2" />
    </HandDrawn>
  ),
  reagent_taxman_seal: (size = 64) => (
    <HandDrawn seed={335} size={size}>
      <path d="M30 48 Q26 30 46 28 Q68 26 72 46 Q74 64 54 70 Q34 74 30 48 Z" />
      <path d="M44 42 L56 42 L52 50 L58 58 L42 58 L48 50 Z" strokeWidth="0.9" />
      <path d="M40 64 Q38 72 44 70" strokeWidth="0.7" />
    </HandDrawn>
  ),
  reagent_troll_toe: (size = 64) => (
    <HandDrawn seed={336} size={size}>
      <path d="M38 30 Q30 34 32 54 Q34 76 52 76 Q70 74 68 54 Q66 38 56 30 Q48 26 38 30 Z" />
      <path d="M42 34 Q40 30 46 28 Q52 30 50 36" strokeWidth="0.9" />
      <path d="M40 66 Q50 70 60 66" strokeWidth="0.7" />
    </HandDrawn>
  ),
  reagent_golem_core: (size = 64) => (
    <HandDrawn seed={337} size={size}>
      <path d="M32 36 L50 26 L68 36 L68 60 L50 72 L32 60 Z" strokeWidth="1.5" />
      <path d="M50 26 L50 72 M32 36 L50 48 L68 36" strokeWidth="0.6" />
      <path d="M44 50 L56 50 M50 44 L50 60" strokeWidth="1.2" />
    </HandDrawn>
  ),

  // Loot
  meat_scrap: (size = 64) => (
    <HandDrawn seed={401} size={size}>
      <path d="M28 50 Q26 36 38 32 Q48 24 60 30 Q74 32 76 46 Q78 60 68 66 Q56 74 44 70 Q30 68 28 50 Z" />
      {/* Bone poking out */}
      <path d="M68 32 L80 22 Q86 22 84 28 L74 38" strokeWidth="1.2" />
      <circle cx="82" cy="24" r="2" />
      {/* Texture */}
      <path d="M40 44 Q48 42 56 44 M40 54 Q48 52 56 54 M44 62 Q50 60 56 62" strokeWidth="0.5" />
    </HandDrawn>
  ),
  coin_purse: (size = 64) => (
    <HandDrawn seed={402} size={size}>
      <path d="M28 38 Q28 30 38 28 L62 28 Q72 30 72 38 L78 78 Q78 86 70 86 L30 86 Q22 86 22 78 Z" />
      <path d="M38 28 Q40 22 50 22 Q60 22 62 28" />
      <circle cx="50" cy="56" r="9" strokeWidth="1.2" />
      <path d="M50 50 L50 62 M46 53 Q52 51 54 56 Q52 60 46 58" strokeWidth="0.8" />
      {/* Drawstring */}
      <path d="M44 22 L42 16 L48 18 M56 22 L58 16 L52 18" strokeWidth="0.8" />
    </HandDrawn>
  ),
  troll_tooth: (size = 64) => (
    <HandDrawn seed={403} size={size}>
      {/* Curved tooth */}
      <path d="M44 18 Q40 20 38 28 Q34 50 38 72 Q40 84 50 84 Q60 84 62 72 Q66 50 62 28 Q60 20 56 18 Q50 14 44 18 Z" />
      {/* Cracks */}
      <path d="M48 30 L46 50 M52 32 L54 56" strokeWidth="0.6" />
      <path d="M45 42 L48 44 M52 48 L55 50" strokeWidth="0.5" />
    </HandDrawn>
  ),

  // Ores (Greystone Reach)
  ore_sandstone: (size = 64) => (
    <HandDrawn seed={801} size={size}>
      <path d="M26 70 L20 56 L28 42 L42 36 L58 38 L74 50 L78 64 L70 78 L36 80 Z" />
      <path d="M30 60 L36 56 M44 50 L48 54 M58 52 L62 58 M50 64 L54 70" strokeWidth="0.5" />
      <circle cx="38" cy="64" r="1.2" />
      <circle cx="60" cy="64" r="1" />
      <circle cx="52" cy="56" r="0.8" />
    </HandDrawn>
  ),
  ore_greystone: (size = 64) => (
    <HandDrawn seed={802} size={size}>
      <path d="M22 64 L26 46 L40 36 L56 32 L72 40 L80 56 L74 76 L34 80 Z" />
      <path d="M26 46 L40 36 L56 32" strokeWidth="0.6" />
      <path d="M40 36 L46 56 L34 70" strokeWidth="0.6" />
      <path d="M56 32 L58 50 L70 60" strokeWidth="0.6" />
      <path d="M46 56 L58 50" strokeWidth="0.6" />
    </HandDrawn>
  ),
  ore_bluerock: (size = 64) => (
    <HandDrawn seed={803} size={size}>
      <path d="M24 66 L22 48 L36 34 L54 30 L72 40 L80 58 L72 78 L32 80 Z" />
      <path d="M30 56 L36 48 L46 58 L42 70" strokeWidth="0.8" />
      <path d="M54 38 L62 50 L72 56" strokeWidth="0.8" />
      <path d="M50 60 L60 68 L66 78" strokeWidth="0.8" />
      <path d="M30 56 L36 48 M46 58 L42 70" stroke="#2050a0" strokeWidth="0.8" />
    </HandDrawn>
  ),
  ore_veinstone: (size = 64) => (
    <HandDrawn seed={804} size={size}>
      <path d="M22 60 L26 42 L42 30 L60 30 L76 44 L80 62 L70 78 L30 80 Z" />
      <path d="M28 50 L36 42 L50 50 L56 60 L70 56" stroke="#a07a23" strokeWidth="1.2" />
      <path d="M40 70 L50 60 L62 70 L70 64" stroke="#a07a23" strokeWidth="1.2" />
      <circle cx="38" cy="48" r="1.5" fill="#a07a23" stroke="none" />
      <circle cx="62" cy="58" r="1.2" fill="#a07a23" stroke="none" />
      <circle cx="52" cy="68" r="1" fill="#a07a23" stroke="none" />
    </HandDrawn>
  ),

  // Smithed Equipment (Greystone Reach)
  item_pick: (size = 64) => (
    <HandDrawn seed={901} size={size}>
      {/* Head */}
      <path d="M14 36 Q26 24 50 22 Q74 24 86 36 Q74 30 50 30 Q26 30 14 36 Z" />
      {/* Haft */}
      <line x1="50" y1="30" x2="40" y2="86" strokeWidth="2" />
      <line x1="44" y1="60" x2="48" y2="62" strokeWidth="0.7" />
      <line x1="42" y1="72" x2="46" y2="74" strokeWidth="0.7" />
    </HandDrawn>
  ),
  item_buckler: (size = 64) => (
    <HandDrawn seed={902} size={size}>
      <circle cx="50" cy="50" r="32" />
      <circle cx="50" cy="50" r="24" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="6" />
      <path d="M50 22 L50 78 M22 50 L78 50" strokeWidth="0.6" />
      <path d="M32 32 L68 68 M68 32 L32 68" strokeWidth="0.5" />
    </HandDrawn>
  ),
  item_maul: (size = 64) => (
    <HandDrawn seed={903} size={size}>
      {/* Head: blocky hammer */}
      <rect x="22" y="14" width="56" height="22" />
      <line x1="30" y1="14" x2="30" y2="36" strokeWidth="0.6" />
      <line x1="70" y1="14" x2="70" y2="36" strokeWidth="0.6" />
      <line x1="22" y1="25" x2="78" y2="25" strokeWidth="0.4" />
      {/* Haft */}
      <line x1="50" y1="36" x2="50" y2="88" strokeWidth="3" />
      <rect x="46" y="78" width="8" height="10" />
    </HandDrawn>
  ),
  item_veinblade: (size = 64) => (
    <HandDrawn seed={904} size={size}>
      {/* Blade with vein */}
      <path d="M50 8 L56 70 L50 76 L44 70 Z" />
      <line x1="50" y1="14" x2="50" y2="68" stroke="#a07a23" strokeWidth="1.5" />
      {/* Crossguard */}
      <path d="M30 70 L70 70 L66 76 L34 76 Z" />
      {/* Grip */}
      <rect x="46" y="76" width="8" height="14" />
      <line x1="46" y1="80" x2="54" y2="80" strokeWidth="0.6" />
      <line x1="46" y1="84" x2="54" y2="84" strokeWidth="0.6" />
      <circle cx="50" cy="94" r="4" />
    </HandDrawn>
  ),
  // --- Floor 3 cloud-gear ---
  item_cloudhelm: (size = 64) => (
    <HandDrawn seed={905} size={size}>
      {/* Domed helm with brow ridge and plume */}
      <path d="M24 58 Q24 24 50 22 Q76 24 76 58 Z" />
      <line x1="24" y1="58" x2="76" y2="58" strokeWidth="0.8" />
      <path d="M38 58 Q38 44 50 44 Q62 44 62 58" strokeWidth="0.7" />
      <line x1="50" y1="22" x2="50" y2="12" strokeWidth="0.8" />
      <path d="M50 12 Q58 10 60 16" strokeWidth="0.6" />
    </HandDrawn>
  ),
  item_skycuirass: (size = 64) => (
    <HandDrawn seed={906} size={size}>
      {/* Breastplate */}
      <path d="M30 22 Q50 30 70 22 L74 60 Q50 74 26 60 Z" />
      <line x1="50" y1="30" x2="50" y2="70" strokeWidth="0.7" />
      <path d="M34 30 Q40 44 36 58" strokeWidth="0.5" />
      <path d="M66 30 Q60 44 64 58" strokeWidth="0.5" />
      <line x1="30" y1="22" x2="24" y2="28" strokeWidth="0.8" />
      <line x1="70" y1="22" x2="76" y2="28" strokeWidth="0.8" />
    </HandDrawn>
  ),
  item_wovengloves: (size = 64) => (
    <HandDrawn seed={907} size={size}>
      {/* Gauntlet/glove */}
      <path d="M36 40 L36 78 Q36 86 50 86 Q64 86 64 78 L64 44" />
      <line x1="40" y1="40" x2="40" y2="24" strokeWidth="2" />
      <line x1="48" y1="40" x2="48" y2="20" strokeWidth="2" />
      <line x1="56" y1="42" x2="56" y2="24" strokeWidth="2" />
      <path d="M64 50 Q72 48 70 58" strokeWidth="2" />
      <line x1="38" y1="60" x2="62" y2="60" strokeWidth="0.4" />
      <line x1="38" y1="68" x2="62" y2="68" strokeWidth="0.4" />
    </HandDrawn>
  ),
  item_driftcharm: (size = 64) => (
    <HandDrawn seed={908} size={size}>
      {/* Pendant on a cord */}
      <path d="M30 18 Q50 30 70 18" strokeWidth="0.8" />
      <line x1="50" y1="26" x2="50" y2="38" strokeWidth="0.8" />
      {/* charm: a knot of driftwood */}
      <path d="M50 38 Q34 48 42 64 Q50 80 58 64 Q66 48 50 38 Z" />
      <path d="M44 52 Q50 58 56 52" strokeWidth="0.5" />
      <circle cx="50" cy="60" r="3" strokeWidth="0.6" />
    </HandDrawn>
  ),
};

// ============================================================
// WOODCUTTING NODES (trees)
// ============================================================

export const WOODCUTTING_ICONS: Record<string, (size?: number) => JSX.Element> = {
  twig: (size = 64) => (
    <HandDrawn seed={501} size={size}>
      <path d="M50 88 Q48 70 52 50 Q50 35 56 22" />
      <path d="M52 50 L60 42" />
      <path d="M50 60 L42 56" />
      <path d="M55 30 L62 26" />
      <path d="M62 26 Q66 22 64 18 Q60 22 62 26" />
    </HandDrawn>
  ),
  oak: (size = 64) => (
    <HandDrawn seed={502} size={size}>
      <path d="M30 50 Q20 46 22 36 Q14 30 20 22 Q22 14 32 16 Q38 8 48 14 Q58 8 66 16 Q76 14 78 22 Q86 30 78 36 Q80 46 70 50 Q66 56 60 52 Q54 58 48 52 Q42 58 36 52 Q32 56 30 50 Z" />
      {/* Surly face */}
      <line x1="40" y1="32" x2="44" y2="34" strokeWidth="1.6" />
      <line x1="56" y1="34" x2="60" y2="32" strokeWidth="1.6" />
      <path d="M42 44 Q48 42 54 44" />
      <path d="M44 56 L42 88" />
      <path d="M56 56 L58 88" />
      <path d="M42 88 L58 88" />
      <path d="M46 70 L50 74 M50 70 L54 74" strokeWidth="0.6" />
    </HandDrawn>
  ),
  pine: (size = 64) => (
    <HandDrawn seed={503} size={size}>
      <path d="M50 8 L36 26 L44 26 L30 44 L42 44 L26 62 L74 62 L58 44 L70 44 L56 26 L64 26 Z" />
      <line x1="40" y1="32" x2="44" y2="32" />
      <line x1="56" y1="32" x2="60" y2="32" />
      <line x1="36" y1="50" x2="42" y2="50" />
      <line x1="58" y1="50" x2="64" y2="50" />
      <rect x="46" y="62" width="8" height="22" />
      <line x1="48" y1="68" x2="52" y2="68" strokeWidth="0.6" />
      <line x1="48" y1="74" x2="52" y2="74" strokeWidth="0.6" />
    </HandDrawn>
  ),
  ironbark: (size = 64) => (
    <HandDrawn seed={504} size={size} scale={2}>
      <path d="M22 48 Q16 38 22 28 Q14 20 28 14 Q34 6 46 12 Q54 4 64 12 Q78 8 76 22 Q86 30 78 42 Q84 52 76 56 Q70 62 64 58 Q60 64 52 60 Q44 64 38 58 Q30 60 22 48 Z" strokeWidth="2" />
      {/* Stern face */}
      <path d="M38 30 L46 34" strokeWidth="1.6" />
      <path d="M54 34 L62 30" strokeWidth="1.6" />
      <path d="M44 46 L50 48 L56 46" strokeWidth="2" />
      {/* Heavy trunk */}
      <path d="M38 60 L36 88" strokeWidth="2" />
      <path d="M62 60 L64 88" strokeWidth="2" />
      <line x1="36" y1="68" x2="64" y2="68" strokeWidth="1.2" />
      <line x1="36" y1="76" x2="64" y2="76" strokeWidth="1.2" />
      <path d="M42 70 L46 74 M50 70 L54 74 M58 70 L62 74" strokeWidth="0.6" />
    </HandDrawn>
  ),
};

// ============================================================
// MINING NODES (Greystone Reach)
// ============================================================

export const MINING_ICONS: Record<string, (size?: number) => JSX.Element> = {
  sandstone: (size = 64) => (
    <HandDrawn seed={1001} size={size}>
      <path d="M14 78 L22 50 L32 36 L52 28 L74 36 L86 56 L82 80 L20 84 Z" />
      <path d="M22 50 L32 36 L40 50 L52 44" strokeWidth="0.7" />
      <path d="M52 28 L52 44 L70 48 L74 36" strokeWidth="0.7" />
      <path d="M40 50 L48 70 L74 64" strokeWidth="0.7" />
      <circle cx="30" cy="62" r="1.2" />
      <circle cx="58" cy="56" r="1" />
    </HandDrawn>
  ),
  greystone: (size = 64) => (
    <HandDrawn seed={1002} size={size}>
      <path d="M12 80 L18 56 L28 42 L50 32 L72 38 L84 56 L80 82 Z" />
      <path d="M18 56 L34 50 L40 64 L28 42" strokeWidth="0.8" />
      <path d="M50 32 L48 50 L64 56 L72 38" strokeWidth="0.8" />
      <path d="M48 50 L40 64 L52 74 L72 70 L64 56" strokeWidth="0.8" />
      <line x1="36" y1="76" x2="38" y2="80" strokeWidth="0.5" />
      <line x1="60" y1="76" x2="62" y2="80" strokeWidth="0.5" />
    </HandDrawn>
  ),
  bluerock: (size = 64) => (
    <HandDrawn seed={1003} size={size}>
      <path d="M12 78 L16 50 L30 36 L50 28 L72 36 L86 54 L80 82 Z" />
      <path d="M16 50 L30 42 L42 56 L30 36" strokeWidth="0.8" />
      <path d="M50 28 L52 50 L68 54 L72 36" strokeWidth="0.8" />
      <path d="M42 56 L36 76 L60 78 L68 54" strokeWidth="0.8" />
      {/* Blue veins */}
      <path d="M22 60 L32 56 L42 60" stroke="#2050a0" strokeWidth="1.2" />
      <path d="M52 38 L60 50 L66 62" stroke="#2050a0" strokeWidth="1.2" />
      <path d="M44 70 L54 68 L62 72" stroke="#2050a0" strokeWidth="1.2" />
    </HandDrawn>
  ),
  veinstone: (size = 64) => (
    <HandDrawn seed={1004} size={size}>
      <path d="M10 80 L14 50 L26 32 L50 22 L74 30 L88 50 L82 82 Z" />
      <path d="M14 50 L28 44 L42 58 L26 32" strokeWidth="0.8" />
      <path d="M50 22 L52 48 L72 52 L74 30" strokeWidth="0.8" />
      <path d="M42 58 L40 76 L60 78 L72 52" strokeWidth="0.8" />
      {/* Golden veins shimmering */}
      <path d="M20 64 L30 58 L42 66 L52 60 L66 68 L78 64" stroke="#a07a23" strokeWidth="1.5" />
      <path d="M28 44 L42 50 L58 44 L72 50" stroke="#a07a23" strokeWidth="1.2" />
      <circle cx="36" cy="62" r="1.5" fill="#a07a23" stroke="none" />
      <circle cx="58" cy="56" r="1.8" fill="#a07a23" stroke="none" />
      <circle cx="68" cy="68" r="1.2" fill="#a07a23" stroke="none" />
    </HandDrawn>
  ),
};

// ============================================================
// CARVING RECIPES (use the same icon as what they produce)
// ============================================================
// Carving recipes are keyed by recipe id, mapping to the icon of what they produce.
// We don't need a separate map - the renderer can look up the produced item's icon.

// ============================================================
// COMBAT FOES
// ============================================================

export const FOE_ICONS: Record<string, (size?: number) => JSX.Element> = {
  goblin: (size = 64) => (
    <HandDrawn seed={601} size={size}>
      <ellipse cx="50" cy="60" rx="18" ry="16" />
      <ellipse cx="50" cy="38" rx="13" ry="13" />
      <path d="M40 30 L36 18 L44 26" />
      <path d="M60 30 L64 18 L56 26" />
      {/* Drowsy X-eyes */}
      <path d="M42 36 L46 40 M46 36 L42 40" />
      <path d="M54 36 Q56 38 58 36 Q56 40 54 38" />
      <path d="M44 46 Q50 50 56 46" />
      <path d="M50 50 Q50 54 48 56" strokeWidth="0.8" />
      <path d="M34 60 Q26 70 24 78" />
      <path d="M66 60 Q74 72 72 80" />
    </HandDrawn>
  ),
  boar: (size = 64) => (
    <HandDrawn seed={602} size={size}>
      <ellipse cx="54" cy="56" rx="26" ry="16" />
      <path d="M30 56 Q22 54 18 48 Q22 60 26 62 L24 68 L30 66 Q28 72 34 74" />
      <circle cx="26" cy="52" r="1.2" />
      <path d="M22 60 L16 64 M22 60 L18 58" />
      <line x1="42" y1="72" x2="40" y2="84" />
      <line x1="52" y1="72" x2="52" y2="84" />
      <line x1="62" y1="72" x2="64" y2="84" />
      <line x1="72" y1="72" x2="72" y2="84" />
      <path d="M78 48 Q86 46 86 54 Q84 50 80 54" />
      <path d="M40 40 L42 36 M46 38 L48 34 M52 38 L54 34 M58 40 L60 36 M64 42 L66 38" strokeWidth="0.6" />
    </HandDrawn>
  ),
  bandit: (size = 64) => (
    <HandDrawn seed={603} size={size}>
      <path d="M50 16 Q26 18 24 50 L30 84 L70 84 L76 50 Q74 18 50 16 Z" />
      <path d="M32 44 Q40 38 50 38 Q60 38 68 44 L66 56 Q60 60 50 60 Q40 60 34 56 Z" />
      <path d="M34 48 L66 48 L66 54 L34 54 Z" />
      <line x1="40" y1="51" x2="44" y2="51" strokeWidth="1.4" />
      <line x1="56" y1="51" x2="60" y2="51" strokeWidth="1.4" />
      <path d="M44 76 L40 70 L52 66" strokeWidth="0.8" />
    </HandDrawn>
  ),
  troll: (size = 64) => (
    <HandDrawn seed={604} size={size} scale={1.7}>
      <ellipse cx="50" cy="64" rx="22" ry="20" />
      <ellipse cx="50" cy="38" rx="16" ry="14" />
      <circle cx="44" cy="36" r="2" />
      <circle cx="56" cy="36" r="2" />
      <path d="M44 46 L42 52 L46 50 L48 54 L50 50 L52 54 L54 50 L58 52 L56 46" />
      <line x1="40" y1="32" x2="48" y2="30" />
      <line x1="52" y1="30" x2="60" y2="32" />
      <path d="M28 64 L18 80" strokeWidth="2" />
      <path d="M72 64 L82 80" strokeWidth="2" />
      <path d="M40 84 L36 92" strokeWidth="2" />
      <path d="M60 84 L64 92" strokeWidth="2" />
    </HandDrawn>
  ),
  brigand: (size = 64) => (
    <HandDrawn seed={605} size={size}>
      {/* hooded figure */}
      <path d="M50 16 Q30 18 28 46 L32 82 L62 82 L66 48 Q66 18 50 16 Z" />
      <path d="M34 40 Q42 34 50 34 Q58 34 64 40 L62 50 Q56 54 48 54 Q40 54 36 50 Z" />
      <line x1="40" y1="46" x2="46" y2="46" strokeWidth="1.4" />
      <line x1="52" y1="46" x2="58" y2="46" strokeWidth="1.4" />
      {/* coin sack slung over the shoulder */}
      <ellipse cx="70" cy="68" rx="10" ry="11" />
      <path d="M63 60 Q70 55 77 60" />
      <text x="70" y="72" textAnchor="middle" fontFamily="Special Elite, monospace" fontSize="10" fill="#5a3f24" stroke="none">¢</text>
    </HandDrawn>
  ),
  taxman: (size = 64) => (
    <HandDrawn seed={606} size={size}>
      {/* tall thin body */}
      <path d="M43 26 L57 26 L59 84 L41 84 Z" />
      {/* head + tall hat */}
      <circle cx="50" cy="20" r="8" />
      <path d="M42 14 L58 14 L56 2 L44 2 Z" />
      <circle cx="47" cy="19" r="1" />
      <circle cx="53" cy="19" r="1" />
      <path d="M46 24 Q50 26 54 24" />
      {/* ledger held in one hand */}
      <rect x="28" y="50" width="16" height="20" />
      <line x1="32" y1="56" x2="40" y2="56" strokeWidth="0.7" />
      <line x1="32" y1="60" x2="40" y2="60" strokeWidth="0.7" />
      <line x1="32" y1="64" x2="40" y2="64" strokeWidth="0.7" />
      {/* the pointing arm of authority */}
      <path d="M59 44 L76 40" />
    </HandDrawn>
  ),
  golem: (size = 64) => (
    <HandDrawn seed={607} size={size} scale={1.4}>
      {/* heavy blocky body */}
      <path d="M30 50 L34 84 L66 84 L70 50 Z" />
      {/* bowed stone head */}
      <rect x="38" y="30" width="24" height="22" />
      {/* sad eyes + frown */}
      <path d="M43 39 Q46 42 49 39" />
      <path d="M53 39 Q56 42 59 39" />
      <path d="M44 44 Q50 50 56 44" />
      {/* cracks */}
      <path d="M50 52 L47 66 L51 74" strokeWidth="0.8" />
      <path d="M40 60 L35 67" strokeWidth="0.8" />
      {/* slumped heavy arms */}
      <path d="M30 52 L21 70 L28 74" strokeWidth="2" />
      <path d="M70 52 L79 70 L72 74" strokeWidth="2" />
    </HandDrawn>
  ),
};

// ============================================================
// LOOKUP HELPERS
// ============================================================

export function getItemIcon(itemId: string, size?: number): JSX.Element | null {
  const fn = ITEM_ICONS[itemId];
  return fn ? fn(size) : null;
}

export function getTreeIcon(nodeId: string, size?: number): JSX.Element | null {
  const fn = WOODCUTTING_ICONS[nodeId];
  return fn ? fn(size) : null;
}

export function getMineIcon(nodeId: string, size?: number): JSX.Element | null {
  const fn = MINING_ICONS[nodeId];
  return fn ? fn(size) : null;
}

// Foes with hand-drawn PNG art live in /public/foes/<id>.png and override
// any inline SVG definition. To swap a foe's art, drop a new PNG with the
// same id into public/foes/ — no code change needed.
const FOE_PNG_IDS = new Set(['goblin', 'boar', 'bandit', 'troll', 'brigand', 'taxman', 'golem']);

export function getFoeIcon(foeId: string, size?: number): JSX.Element | null {
  if (FOE_PNG_IDS.has(foeId)) {
    const px = size ?? 64;
    return (
      <img
        src={`/foes/${foeId}.png`}
        alt=""
        width={px}
        height={px}
        style={{ width: px, height: px, objectFit: 'contain', imageRendering: 'auto' }}
      />
    );
  }
  const fn = FOE_ICONS[foeId];
  return fn ? fn(size) : null;
}

// Generic placeholder when an icon hasn't been authored yet
export function GenericIcon({ size = 64 }: { size?: number }) {
  return (
    <HandDrawn seed={999} size={size}>
      <rect x="20" y="20" width="60" height="60" strokeDasharray="4 3" />
      <text x="50" y="58" textAnchor="middle" fontFamily="Special Elite, monospace" fontSize="20" fill="#5a3f24" stroke="none">?</text>
    </HandDrawn>
  );
}
