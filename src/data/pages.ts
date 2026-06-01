// =============================================================================
// FOUND PAGES — narrative lore drops
// =============================================================================
//
// Found pages drop rarely from gather/mine/carve/smith/combat tasks.
// Stored in state.pagesFound as a map of pageId -> true. Read in the
// Tome's "Pages" section.
//
// Bible rules for writing pages:
//   - Past tense. Always.
//   - NO dates. NO references to specific times.
//   - Writers express CONFUSION about duration ("it has been some time...",
//     "I don't know how long", "I can't remember when")
//   - References to people the writer knew, names that feel almost-familiar
//   - Handwriting/ink descriptions add atmosphere
//   - Pages become more frantic across floors
//   - Time confusion is itself a CLUE — players who notice it across many
//     pages will piece something together
//
// Each page has:
//   id        — unique identifier, e.g. "page_splinterwood_01"
//   title     — short heading the player sees in the Pages list
//   floor     — which floor it can drop on (1=Splinterwood, 2=Greystone, ...)
//   dropChance — chance per applicable task completion. Keep RARE.
//   body      — the lore text. Read in the Tome.
//   sources   — which task kinds can drop this page (wc/mn/cv/sm/cb)
//
// Adding a new page: append to JOURNAL_PAGES with the floor and sources
// it should drop from. No other code changes required.

// A block of text within a page. Different kinds render with different
// visual styles to make voice immediately clear:
//   - 'content' — the writer's actual writing on the page (Schoolbell cursive)
//   - 'observation' — the reader's thoughts about the artifact (italic serif)
//   - 'maggie' — handwriting from Maggie specifically (Indie Flower)
// More kinds can be added as new voices appear (Laileb's scrawl, Brock's notes).
export type PageBlockKind = 'content' | 'observation' | 'maggie';

export interface PageBlock {
  kind: PageBlockKind;
  text: string;  // paragraph breaks via \n\n inside the text
}

export interface JournalPage {
  id: string;
  title: string;
  floor: number;
  dropChance: number;
  body: PageBlock[];   // ordered list of voice blocks
  sources: Array<'wc' | 'mn' | 'cv' | 'sm' | 'cb'>;
}

export const JOURNAL_PAGES: JournalPage[] = [
  // ===== FLOOR 1 — Splinterwood =====
  {
    id: 'page_splinterwood_01',
    title: 'A torn page, found among the woodchips',
    floor: 1,
    dropChance: 0.003,
    sources: ['wc'],
    body: [
      { kind: 'content', text:
        "—and the oaks here are the same as the oaks I knew before. " +
        "I don't mean similar. The same. The same one I cut on my " +
        "first day, I keep finding it. I keep cutting it." },
      { kind: 'observation', text:
        "The handwriting is hurried. The ink is darker at the start " +
        "and lighter at the end, as if the writer was trying to make " +
        "it last." },
    ],
  },
  {
    id: 'page_splinterwood_02',
    title: 'A page rolled inside a hollow log',
    floor: 1,
    dropChance: 0.003,
    sources: ['wc', 'cv'],
    body: [
      { kind: 'content', text:
        "Maggie is so kind. She is so kind. I don't know how long I " +
        "have been here but Maggie has been here longer and she is " +
        "still so kind. I'm writing this down because I keep meaning " +
        "to ask her something and forgetting what it was." },
      { kind: 'observation', text:
        "There is a smudge across the bottom of the page. It could be " +
        "a tear. It could be water." },
    ],
  },

  // ===== FLOOR 2 — Greystone Reach =====
  {
    id: 'page_greystone_01',
    title: 'A folded page from inside a vein',
    floor: 2,
    dropChance: 0.003,
    sources: ['mn'],
    body: [
      { kind: 'content', text:
        "It has been some time since I saw the sun. I'm not sure how " +
        "long. The count never seems to add up.\n\n" +
        "Brock doesn't speak much. I tried to ask him a question once " +
        "and he just looked at me. Not unkindly. He looked at me the " +
        "way you look at a story you've already heard the ending of.\n\n" +
        "I keep meaning to write more carefully. My letters are getting " +
        "smaller." },
    ],
  },
  {
    id: 'page_greystone_02',
    title: 'A page wedged between two greystone blocks',
    floor: 2,
    dropChance: 0.003,
    sources: ['mn', 'sm'],
    body: [
      { kind: 'content', text:
        "Maggie checks in often. She is very kind.\n\n" +
        "I find I am writing more carefully now.\n\n" +
        "I don't know who I am writing this for." },
    ],
  },
];

export const PAGES_BY_ID: Record<string, JournalPage> =
  Object.fromEntries(JOURNAL_PAGES.map(p => [p.id, p]));

/**
 * Roll for a page drop given a task kind and current floor.
 * Returns the dropped page ID, or null.
 *
 * Only rolls pages the player doesn't already have. Each page drops once.
 */
export function rollPageDrop(
  kind: 'wc' | 'mn' | 'cv' | 'sm' | 'cb',
  currentFloor: number,
  pagesFound: Record<string, boolean>,
): string | null {
  const eligible = JOURNAL_PAGES.filter(p =>
    p.floor <= currentFloor &&
    p.sources.includes(kind) &&
    !pagesFound[p.id]
  );
  if (eligible.length === 0) return null;
  for (const page of eligible) {
    if (Math.random() < page.dropChance) return page.id;
  }
  return null;
}
