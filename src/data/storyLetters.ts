// =============================================================================
// STORY LETTERS — narrative-triggered letters from NPCs
// =============================================================================
//
// Story letters are triggered by gameplay thresholds (e.g., "first time you
// hit Woodcutting 10," "after collecting 3 pages"), not on a daily cadence.
// Daily rewards are now a separate system — see data/dailyRewards.ts.
//
// Each letter has:
//   id          — unique identifier
//   sender      — which NPC wrote it ('maggie', 'brock', 'laileb', etc.)
//   intro/body/outro — letter copy (same fields as the old LetterContents
//                     so we reuse LetterModal directly)
//   onClaim     — optional side effect (rare; story letters are usually pure
//                 narrative, not reward-delivery)
//
// To author a new story letter:
//   1. Append a StoryLetter to STORY_LETTERS here
//   2. Wire its trigger in engine.ts (call queueStoryLetter at the trigger site)
//
// Triggers are NOT defined here — they're wired in code where they belong
// (e.g., a "first kill" trigger lives where combat-kill is handled).

export interface StoryLetter {
  id: string;
  sender: 'maggie' | 'brock' | 'laileb' | 'unknown';
  senderLabel: string;     // displayed in the letter header (e.g., "From: Maggie")
  intro: string;
  body: string;
  outro: string;
  // Optional reader observation — the player's thoughts about the artifact.
  // Renders in italic serif (different from the letter's handwritten voice).
  // If omitted, no empty block is rendered.
  observation?: string;
  // Reward delivery is optional for story letters and usually empty.
  // Use sparingly — story letters are mostly about narrative beats.
  reward?: {
    coin?: number;
    perkPoint?: boolean;
  };
}

// STORY LETTERS — empty for now. Add entries here when authoring.
//
// Future content from the story bible — for reference when authoring:
//   - Maggie writes when player reaches certain thresholds (Woodcutting 10,
//     first kill, reaching Greystone, etc.)
//   - Brock's final scene letter (after Floor 5 mostly complete)
//   - Laileb's introduction (arriving at Floor 3)
//   - The trapped soul's panicked warning (Floor 4)
//
// Bible rules apply: funny if naive, ominous if you know (for Maggie);
// 1-5 words per sentence (for Brock); raunchy + bitter (for Laileb).
export const STORY_LETTERS: StoryLetter[] = [
  // Authored content goes here.
];

export const STORY_LETTERS_BY_ID: Record<string, StoryLetter> =
  Object.fromEntries(STORY_LETTERS.map(l => [l.id, l]));

// Queue a story letter for the player to see. Idempotent — won't queue the
// same letter twice if already pending or already claimed.
export function queueStoryLetter(
  state: import('../types').GameState,
  letterId: string,
): boolean {
  if (!STORY_LETTERS_BY_ID[letterId]) return false;
  state.pendingStoryLetters = state.pendingStoryLetters ?? [];
  // Skip if already queued
  if (state.pendingStoryLetters.includes(letterId)) return false;
  state.pendingStoryLetters.push(letterId);
  return true;
}
