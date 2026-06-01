// =============================================================================
// AVATAR — paper-doll character viewer
// =============================================================================
//
// One hand-drawn pencil-sketch accountant character in a weapons-ready pose.
// Equipment items are layered on top as SVG overlays anchored to the
// character's hand/body positions.
//
// HOW TO ADD A NEW EQUIPMENT OVERLAY:
//   1. Add a function below following the pattern of WeaponOverlay (or whatever).
//      Each overlay returns an SVG group <g>...</g> positioned in the avatar's
//      coordinate space (viewBox 0 0 400 600).
//   2. Add a mapping in EQUIPMENT_OVERLAYS at the bottom of the file from the
//      item's base id (e.g., 'item_sword') to your new function.
//   3. The Avatar component will automatically render it when that item is
//      equipped — no other file touched.
//
// ANCHOR POINTS (in viewBox coords):
//   Weapon hand (right hand, viewer's left): (140, 305)
//   Offhand hand (left hand, viewer's right): (260, 305)
//   Head top:    (200, 80)
//   Body chest:  (200, 280)
//   Trinket:     (200, 245) — sits at neck/chest
//
// We're intentionally drawing in a deliberately-crude pencil-sketch style.
// The wobble filter does most of the heavy lifting on that feel.

import React from 'react';
import type { GameState, ItemInstance } from '../types';
import { findInstanceById } from '../systems/playerStats';

// =============================================================================
// BASE CHARACTER — the accountant himself
// =============================================================================
// Weapons-ready pose: feet slightly apart, body upright, arms forward at chest
// height with palms turned upward to receive a weapon.

function BaseCharacter() {
  return (
    <g filter="url(#avatar-wobble)">
      {/* Head — oval, slightly tilted, deliberately too big */}
      <ellipse cx="200" cy="130" rx="40" ry="48" fill="#efe2c4" stroke="#2b1d10" strokeWidth="2.2"/>

      {/* Hair tufts */}
      <path d="M 168 96 Q 168 84 178 86" stroke="#2b1d10" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M 188 88 Q 190 76 198 82" stroke="#2b1d10" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M 210 84 Q 214 74 222 80" stroke="#2b1d10" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M 228 90 Q 232 82 236 86" stroke="#2b1d10" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

      {/* Eyebrows — asymmetric, slightly worried */}
      <path d="M 178 120 Q 186 116 196 120" stroke="#2b1d10" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d="M 208 116 Q 218 112 226 116" stroke="#2b1d10" strokeWidth="2.2" fill="none" strokeLinecap="round"/>

      {/* Eyes */}
      <circle cx="188" cy="134" r="2.5" fill="#2b1d10"/>
      <circle cx="218" cy="132" r="2" fill="#2b1d10"/>

      {/* Round glasses */}
      <circle cx="188" cy="134" r="9" fill="none" stroke="#2b1d10" strokeWidth="1.6"/>
      <circle cx="218" cy="132" r="9" fill="none" stroke="#2b1d10" strokeWidth="1.6"/>
      <line x1="197" y1="134" x2="209" y2="133" stroke="#2b1d10" strokeWidth="1.4"/>

      {/* Nose */}
      <path d="M 202 142 Q 200 154 206 158" stroke="#2b1d10" strokeWidth="1.6" fill="none" strokeLinecap="round"/>

      {/* Mouth — slightly uncertain */}
      <path d="M 192 168 Q 200 165 212 168" stroke="#2b1d10" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

      {/* Ears */}
      <path d="M 158 138 Q 152 148 160 158" stroke="#2b1d10" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M 242 138 Q 248 148 240 158" stroke="#2b1d10" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

      {/* Neck — thin */}
      <line x1="190" y1="180" x2="188" y2="200" stroke="#2b1d10" strokeWidth="1.8"/>
      <line x1="212" y1="180" x2="214" y2="200" stroke="#2b1d10" strokeWidth="1.8"/>

      {/* Body / tunic — boxy, with a little flare at hips */}
      <path d="M 156 210 Q 150 204 162 202 L 240 202 Q 254 204 246 210 L 256 340 Q 260 350 246 350 L 154 350 Q 142 350 144 340 Z"
            stroke="#2b1d10" strokeWidth="2.2" fill="#efe2c4" strokeLinejoin="round"/>

      {/* Drawstring detail down center */}
      <line x1="201" y1="218" x2="201" y2="320" stroke="#2b1d10" strokeWidth="1.4" strokeDasharray="3,4"/>

      {/* Pouch on right side of tunic */}
      <rect x="222" y="270" width="18" height="22" fill="none" stroke="#2b1d10" strokeWidth="1.6" rx="2"/>
      <line x1="222" y1="276" x2="240" y2="276" stroke="#2b1d10" strokeWidth="1.4"/>

      {/* === ARMS — weapons-ready pose === */}
      {/* Right arm (viewer's left) - goes out from shoulder, bends at elbow, hand at chest level */}
      <path d="M 156 215 Q 130 250 130 280 Q 132 298 140 305"
            stroke="#2b1d10" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
      {/* Right hand — palm forward */}
      <ellipse cx="140" cy="313" rx="14" ry="11" fill="#efe2c4" stroke="#2b1d10" strokeWidth="2"/>
      <line x1="134" y1="307" x2="132" y2="320" stroke="#2b1d10" strokeWidth="1.4"/>
      <line x1="142" y1="305" x2="140" y2="322" stroke="#2b1d10" strokeWidth="1.4"/>
      <line x1="150" y1="307" x2="150" y2="320" stroke="#2b1d10" strokeWidth="1.4"/>

      {/* Left arm (viewer's right) - mirrors the right */}
      <path d="M 246 215 Q 272 250 272 280 Q 270 298 262 305"
            stroke="#2b1d10" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
      {/* Left hand — palm forward */}
      <ellipse cx="262" cy="313" rx="14" ry="11" fill="#efe2c4" stroke="#2b1d10" strokeWidth="2"/>
      <line x1="252" y1="307" x2="252" y2="320" stroke="#2b1d10" strokeWidth="1.4"/>
      <line x1="260" y1="305" x2="262" y2="322" stroke="#2b1d10" strokeWidth="1.4"/>
      <line x1="268" y1="307" x2="270" y2="320" stroke="#2b1d10" strokeWidth="1.4"/>

      {/* Legs — straight with feet */}
      <path d="M 170 350 L 164 470 Q 162 482 172 482 L 196 482 Q 206 482 204 470 L 204 352"
            stroke="#2b1d10" strokeWidth="2.2" fill="none" strokeLinejoin="round"/>
      <path d="M 206 352 L 208 470 Q 208 482 218 482 L 240 482 Q 250 482 248 470 L 244 350"
            stroke="#2b1d10" strokeWidth="2.2" fill="none" strokeLinejoin="round"/>

      {/* Boots */}
      <ellipse cx="184" cy="498" rx="22" ry="10" fill="none" stroke="#2b1d10" strokeWidth="2.2"/>
      <line x1="184" y1="496" x2="184" y2="502" stroke="#2b1d10" strokeWidth="1.2"/>
      <ellipse cx="228" cy="498" rx="22" ry="10" fill="none" stroke="#2b1d10" strokeWidth="2.2"/>
      <line x1="228" y1="496" x2="228" y2="502" stroke="#2b1d10" strokeWidth="1.2"/>
    </g>
  );
}

// =============================================================================
// EQUIPMENT OVERLAYS — one per item base ID
// =============================================================================
// Each overlay is a function returning an <g> positioned in the avatar's
// viewBox coordinates. Anchored to hand positions (140, 313) for weapon and
// (262, 313) for offhand.

// ---- Weapons (right hand) ----

function ClubOverlay() {
  // Knobbly Club — a thick wooden club with knobs
  return (
    <g filter="url(#avatar-wobble)" transform="translate(-2, 0)">
      {/* Handle in hand */}
      <rect x="135" y="310" width="10" height="20" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1.4"/>
      {/* Club body — wider at top */}
      <path d="M 132 310 L 128 240 Q 126 230 136 226 L 148 226 Q 158 230 156 240 L 152 310 Z"
            fill="#5a3f24" stroke="#2b1d10" strokeWidth="1.8" strokeLinejoin="round"/>
      {/* Knobs */}
      <circle cx="135" cy="250" r="3" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1"/>
      <circle cx="148" cy="262" r="3" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1"/>
      <circle cx="138" cy="278" r="3" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1"/>
      <circle cx="150" cy="290" r="3" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1"/>
    </g>
  );
}

function SwordOverlay() {
  // Pinewood Sword — bigger blade, classic crossguard
  return (
    <g filter="url(#avatar-wobble)" transform="translate(-2, 0)">
      {/* Crossguard */}
      <rect x="120" y="304" width="42" height="6" fill="#5a3f24" stroke="#2b1d10" strokeWidth="1.6" rx="1"/>
      {/* Handle (below the crossguard, in the hand) */}
      <rect x="137" y="310" width="8" height="18" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1.4"/>
      {/* Pommel */}
      <circle cx="141" cy="332" r="5" fill="#5a3f24" stroke="#2b1d10" strokeWidth="1.6"/>
      {/* Blade extending up from crossguard */}
      <path d="M 138 304 L 134 220 L 141 208 L 148 220 L 144 304 Z"
            fill="#d9c79c" stroke="#2b1d10" strokeWidth="1.8" strokeLinejoin="round"/>
      <line x1="141" y1="304" x2="141" y2="222" stroke="#2b1d10" strokeWidth="1" strokeDasharray="2,3"/>
    </g>
  );
}

function PickOverlay() {
  // Iron Pick — handle with a metal pick head at top
  return (
    <g filter="url(#avatar-wobble)" transform="translate(-2, 0)">
      {/* Handle */}
      <rect x="138" y="240" width="6" height="92" fill="#5a3f24" stroke="#2b1d10" strokeWidth="1.4"/>
      {/* Pick head — angular metal piece */}
      <path d="M 110 244 L 141 232 L 172 244 L 168 252 L 141 244 L 114 252 Z"
            fill="#a0a0a8" stroke="#2b1d10" strokeWidth="1.8" strokeLinejoin="round"/>
      {/* Pommel */}
      <circle cx="141" cy="336" r="4" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1.4"/>
    </g>
  );
}

function GreatbowOverlay() {
  // Ironbark Greatbow — tall curved bow with string
  return (
    <g filter="url(#avatar-wobble)" transform="translate(-2, 0)">
      {/* Bow stave — large C curve */}
      <path d="M 140 200 Q 100 250 100 320 Q 100 380 140 420"
            fill="none" stroke="#3a2a18" strokeWidth="5" strokeLinecap="round"/>
      <path d="M 140 200 Q 100 250 100 320 Q 100 380 140 420"
            fill="none" stroke="#5a3f24" strokeWidth="3" strokeLinecap="round"/>
      {/* String — straight from one tip to the other */}
      <line x1="140" y1="200" x2="140" y2="420" stroke="#2b1d10" strokeWidth="1.2"/>
      {/* Grip wrap */}
      <rect x="135" y="305" width="10" height="18" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1.4"/>
    </g>
  );
}

function MaulOverlay() {
  // Greystone Maul — massive stone hammer head, long handle
  return (
    <g filter="url(#avatar-wobble)" transform="translate(-2, 0)">
      {/* Handle */}
      <rect x="138" y="225" width="6" height="110" fill="#5a3f24" stroke="#2b1d10" strokeWidth="1.4"/>
      {/* Hammer head — big rectangular stone */}
      <rect x="116" y="200" width="50" height="30" rx="2"
            fill="#7a7a82" stroke="#2b1d10" strokeWidth="2"/>
      {/* Stone texture marks */}
      <line x1="124" y1="208" x2="130" y2="214" stroke="#2b1d10" strokeWidth="0.6" opacity="0.6"/>
      <line x1="138" y1="206" x2="142" y2="212" stroke="#2b1d10" strokeWidth="0.6" opacity="0.6"/>
      <line x1="152" y1="210" x2="158" y2="216" stroke="#2b1d10" strokeWidth="0.6" opacity="0.6"/>
      {/* Bindings around handle/head */}
      <line x1="116" y1="222" x2="166" y2="222" stroke="#2b1d10" strokeWidth="1.4"/>
      {/* Pommel */}
      <circle cx="141" cy="338" r="5" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1.6"/>
    </g>
  );
}

function VeinbladeOverlay() {
  // Veinforged Blade — ornate blade with glowing vein motif
  return (
    <g filter="url(#avatar-wobble)" transform="translate(-2, 0)">
      {/* Ornate crossguard */}
      <path d="M 116 304 Q 110 296 116 290 L 166 290 Q 172 296 166 304 Z"
            fill="#7a3f24" stroke="#2b1d10" strokeWidth="1.8" strokeLinejoin="round"/>
      {/* Handle wrapped */}
      <rect x="137" y="304" width="8" height="22" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1.4"/>
      <line x1="137" y1="310" x2="145" y2="310" stroke="#2b1d10" strokeWidth="0.8"/>
      <line x1="137" y1="316" x2="145" y2="316" stroke="#2b1d10" strokeWidth="0.8"/>
      <line x1="137" y1="322" x2="145" y2="322" stroke="#2b1d10" strokeWidth="0.8"/>
      {/* Pommel — ornate */}
      <circle cx="141" cy="330" r="6" fill="#5a3f24" stroke="#2b1d10" strokeWidth="1.6"/>
      <circle cx="141" cy="330" r="3" fill="#a07a23"/>
      {/* Blade — slimmer, elegant */}
      <path d="M 137 290 L 132 195 L 141 180 L 150 195 L 145 290 Z"
            fill="#e8e0d0" stroke="#2b1d10" strokeWidth="1.8" strokeLinejoin="round"/>
      {/* Glowing vein down the middle (gold) */}
      <path d="M 141 290 L 141 195" stroke="#a07a23" strokeWidth="1.6" opacity="0.85"/>
      <path d="M 141 230 Q 138 240 141 250 Q 144 260 141 270" stroke="#a07a23" strokeWidth="0.8" opacity="0.6" fill="none"/>
    </g>
  );
}

// ---- Offhand (left hand) ----

function BarkShieldOverlay() {
  // Bark Shield — round, made of bark, has tree-rings showing
  return (
    <g filter="url(#avatar-wobble)">
      <ellipse cx="286" cy="306" rx="40" ry="44"
               fill="#8a6033" stroke="#2b1d10" strokeWidth="2.4"/>
      {/* Inner rim */}
      <ellipse cx="286" cy="306" rx="32" ry="36"
               fill="none" stroke="#2b1d10" strokeWidth="1.2"/>
      {/* Tree-ring lines */}
      <ellipse cx="286" cy="306" rx="22" ry="26" fill="none" stroke="#3a2a18" strokeWidth="0.8" opacity="0.6"/>
      <ellipse cx="286" cy="306" rx="14" ry="18" fill="none" stroke="#3a2a18" strokeWidth="0.8" opacity="0.6"/>
      {/* Center knob */}
      <circle cx="286" cy="306" r="4" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1.4"/>
    </g>
  );
}

function BucklerOverlay() {
  // Stone Buckler — smaller, denser, gray-stone with cross marking
  return (
    <g filter="url(#avatar-wobble)">
      <ellipse cx="284" cy="306" rx="34" ry="38"
               fill="#7a7a82" stroke="#2b1d10" strokeWidth="2.4"/>
      {/* Inner rim */}
      <ellipse cx="284" cy="306" rx="26" ry="30"
               fill="none" stroke="#2b1d10" strokeWidth="1.2"/>
      {/* Cross marking */}
      <line x1="284" y1="280" x2="284" y2="332" stroke="#3a2a18" strokeWidth="2.2"/>
      <line x1="262" y1="306" x2="306" y2="306" stroke="#3a2a18" strokeWidth="2.2"/>
      {/* Center boss */}
      <circle cx="284" cy="306" r="5" fill="#3a2a18" stroke="#2b1d10" strokeWidth="1.6"/>
      {/* Stone texture marks */}
      <line x1="266" y1="290" x2="270" y2="294" stroke="#2b1d10" strokeWidth="0.6" opacity="0.5"/>
      <line x1="298" y1="320" x2="302" y2="324" stroke="#2b1d10" strokeWidth="0.6" opacity="0.5"/>
    </g>
  );
}

// =============================================================================
// REGISTRY — maps base item id to overlay function
// =============================================================================
// Adding a new equipment overlay: implement the overlay function above, add one
// line here. That's the entire addition cost per future equipment item.

const EQUIPMENT_OVERLAYS: Record<string, () => React.ReactElement> = {
  item_club:      ClubOverlay,
  item_sword:     SwordOverlay,
  item_pick:      PickOverlay,
  item_greatbow:  GreatbowOverlay,
  item_maul:      MaulOverlay,
  item_veinblade: VeinbladeOverlay,
  item_shield:    BarkShieldOverlay,
  item_buckler:   BucklerOverlay,
};

// =============================================================================
// AVATAR COMPONENT
// =============================================================================

export function Avatar({ state }: { state: GameState }) {
  // Pull equipped items from state
  const equipped = state.equippedInst ?? {};
  const overlays: { instId: string; baseId: string }[] = [];
  for (const slotKey of Object.keys(equipped)) {
    const instId = equipped[slotKey as keyof typeof equipped];
    if (!instId) continue;
    const inst: ItemInstance | null = findInstanceById(state, instId);
    if (!inst) continue;
    if (EQUIPMENT_OVERLAYS[inst.id]) {
      overlays.push({ instId, baseId: inst.id });
    }
  }

  return (
    <div className="avatar-frame">
      <svg viewBox="0 0 400 540" className="avatar-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="avatar-wobble" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="5"/>
            <feDisplacementMap in="SourceGraphic" scale="1.5"/>
          </filter>
        </defs>

        {/* Breathing wrapper — animation pulses scale and vertical position. */}
        <g className="avatar-breathing">
          <BaseCharacter />
          {/* Overlays render in order. Offhand and weapon are on opposite sides
              of the body so layering ordering rarely matters visually. */}
          {overlays.map((o) => {
            const OverlayComp = EQUIPMENT_OVERLAYS[o.baseId];
            return <OverlayComp key={o.instId} />;
          })}
        </g>
      </svg>
    </div>
  );
}
