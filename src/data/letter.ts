// Daily letter system.
//
// Once per ~20h, Maggie sends the player a letter with rewards. Streak builds
// on consecutive claims; one missed day is forgiven, two breaks the streak.
//
// Architecture:
//  - shouldOfferLetter() checks if a letter is currently available
//  - openLetter() rolls today's contents and stamps the claim time
//  - All Maggie copy lives in this file so the voice stays consistent

import type { GameState } from '../types';

export interface LetterContents {
  coin: number;
  dailyBread: number;
  doodleId: string | null;     // newly unlocked doodle, if any
  perkPoint: boolean;          // milestone reward at day 14, 30, etc.
  intro: string;               // Maggie's opening line for the day
  body: string;                // descriptive middle text
  outro: string;               // her closing line
  streakAfter: number;         // streak value after this claim
}

// ---------- Tunables ----------

const HOURS = 60 * 60 * 1000;
export const LETTER_INTERVAL_MS = 20 * HOURS;   // letter available again after 20h
export const STREAK_GRACE_MS    = 44 * HOURS;   // 1 day grace: must claim within 44h to keep streak

// ---------- Margin Doodles ----------

export interface MarginDoodle {
  id: string;
  name: string;
  description: string;
}

// 15 authored doodles — covers 30 days of consistent claiming (one every 2 days)
export const MARGIN_DOODLES: MarginDoodle[] = [
  { id: 'doodle_grumpy_cat',     name: 'Grumpy Cat',           description: "A cat with one eye squinted in disapproval." },
  { id: 'doodle_oak_shades',     name: 'Surly Oak in Shades',  description: "The Surly Oak, wearing sunglasses, somehow still surly." },
  { id: 'doodle_arguing_coins',  name: 'Arguing Coins',        description: "Two coins, in the middle of a disagreement." },
  { id: 'doodle_boar_hat',       name: 'Boar Shopping for a Hat', description: "A boar gravely considering a hat. The hat does not fit." },
  { id: 'doodle_goblin_flower',  name: 'Goblin with Flower',   description: "A goblin holding a single flower with enormous gravity." },
  { id: 'doodle_maggie_tea',     name: "Maggie's Tea Service", description: "Maggie pouring tea, slightly judgmentally." },
  { id: 'doodle_axe_stump',      name: 'Axe in Stump',         description: "An axe, lodged in a stump, surrounded by question marks." },
  { id: 'doodle_troll_crown',    name: 'Bridge Toll Troll',    description: "A troll wearing a tiny crown. He thinks no one notices." },
  { id: 'doodle_innkeep_cat',    name: "The Innkeep's Cat",    description: "A cat that lives in the inn. It has opinions." },
  { id: 'doodle_eyed_purse',     name: 'Coin Purse with Eyes', description: "A coin purse that is, alarmingly, watching you." },
  { id: 'doodle_complaining_seal', name: 'A Wax Seal, Complaining', description: "A wax seal in the middle of a long complaint." },
  { id: 'doodle_tankard',        name: 'Tankard, Mostly Full', description: "A tankard, mostly full. Recently. Allegedly." },
  { id: 'doodle_reminder',       name: 'REMINDER',             description: 'A note that simply reads "REMINDER" and nothing else.' },
  { id: 'doodle_oak_council',    name: 'The Oak Council',      description: "The Oak Council, formally seated, possibly asleep." },
  { id: 'doodle_stern_sword',    name: 'Sword Being Lectured', description: "A sword being given a very stern talking-to." },
];

// Helper: next doodle to award (in order, only if not already owned)
function nextDoodleId(state: GameState): string | null {
  const owned = state.doodlesOwned ?? {};
  for (const d of MARGIN_DOODLES) {
    if (!owned[d.id]) return d.id;
  }
  return null;
}

// ---------- Maggie copy banks ----------

// Pulled randomly. Should sound like LSP. Always italicized, frequent caps for
// emphasis, dramatic. Insulting but affectionate.

const INTROS_NORMAL = [
  "Ugh, FINE. Another day, another letter. Don't get USED to this.",
  "I almost didn't write today. I had a CRISIS. But you'd never understand.",
  "Listen, I'm only doing this because the Innkeep's cat was judging me.",
  "I wasn't going to send anything but then I felt BAD which is RARE for me.",
  "You're STILL doing this thing where you exist? Whatever. Fine.",
  "I had a dream about you last night. It was AWFUL. Anyway.",
  "Don't read too much into this. I just had leftover stuff and YOU came to mind.",
  "I'm not going to lie, I forgot it was a new day until JUST NOW.",
  "Hello, disaster. Your weekly — DAILY, whatever — letter has ARRIVED.",
  "I'm in the middle of a CRISIS but I made time for this. You're welcome.",
];

const OUTROS_NORMAL = [
  "Don't spend it all on something STUPID. Or do. Whatever. I don't CARE.",
  "Anyway. Try not to die. Or do. — Maggie",
  "I have to go, someone is being annoying. — Maggie",
  "Eat something. Not the bread tokens, those aren't ACTUAL bread, you LITERAL.",
  "If you tell anyone I sent this I will deny it. — Maggie",
  "This was NOT a big deal. Stop making it a big deal. — M.",
  "Bye. Don't write back. Actually do. But not too much. — Maggie",
  "Stay out of trouble. Or get into a SMALL amount, for the stories. — M.",
];

// Streak milestone messages (replaces outro when triggered)
const STREAK_MESSAGE: Record<number, string> = {
  3:  "Three days in a row, huh. I noticed. I'm not, like, COUNTING or anything. But three. — M.",
  7:  "Okay. SEVEN DAYS. I — listen, this means NOTHING, but I wrote your name on a napkin earlier and didn't even cross it out, so. WHATEVER. — Maggie",
  14: "TWO WEEKS. Stop. This is EMBARRASSING for both of us. Take a perk point and never mention this. — M.",
  21: "Three weeks. The Innkeep's cat is also impressed. She told me. With her eyes. — Maggie",
  30: "A MONTH. A WHOLE MONTH. I — I'm not crying, YOU'RE crying. Take everything. I don't care anymore. — M.",
  60: "Two months. You absolute LOSER. (Affectionate.) — Maggie",
  100: "ONE HUNDRED DAYS. Listen. You're my best friend. I will deny this. — M.",
};

// Messages shown when streak resets (in next letter after a miss)
const STREAK_BROKEN_LINES = [
  "You MISSED A DAY. I literally cried. Not because of YOU obviously, I had a THING. But still. Start over, loser.",
  "Your streak is GONE. Hope it was WORTH IT. (It wasn't.) — M.",
  "I waited up. I had wine. It got WEIRD. Anyway, your streak is gone. Try again.",
  "Two days. TWO. Without a letter. I don't know how you LIVE like this.",
];

// Reactive lines — Maggie comments on recent player accomplishments.
// Returned as an ADDITIONAL body paragraph when relevant.
export function getReactiveLine(state: GameState): string | null {
  const reactions: string[] = [];

  // Just hit a major skill level?
  const sw = state.skills.woodcutting.level;
  const sc = state.skills.carving.level;
  const sb = state.skills.combat.level;

  if (sw >= 25 && !state.questFlags.maggie_noticed_wc25) {
    state.questFlags.maggie_noticed_wc25 = true;
    reactions.push(`I HEARD you've been chopping IRONBARK. Excuse me? IRONBARK? Who do you think you are.`);
  }
  if (sc >= 25 && !state.questFlags.maggie_noticed_cv25) {
    state.questFlags.maggie_noticed_cv25 = true;
    reactions.push(`The Innkeep's cat saw one of your carvings. She said it was "fine." That's HUGE for her.`);
  }
  if (sb >= 25 && !state.questFlags.maggie_noticed_cb25) {
    state.questFlags.maggie_noticed_cb25 = true;
    reactions.push(`Someone said you BEAT A TROLL? In a FIGHT? I don't even know who you ARE anymore.`);
  }
  if ((state.inv.item_sword ?? 0) >= 1 && !state.questFlags.maggie_noticed_sword) {
    state.questFlags.maggie_noticed_sword = true;
    reactions.push(`I heard you carved a SWORD, dorkus. Congratulations on the toothpick.`);
  }
  if (state.coin >= 10000 && !state.questFlags.maggie_noticed_rich) {
    state.questFlags.maggie_noticed_rich = true;
    reactions.push(`Word on the street is you have TEN THOUSAND COIN. Hello? Are we sharing? I'm SHORT this month.`);
  }
  if ((state.questFlags.died_once) && !state.questFlags.maggie_noticed_death) {
    state.questFlags.maggie_noticed_death = true;
    reactions.push(`I HEARD you DIED. And then came BACK. That's so EMBARRASSING for you. I would never.`);
  }

  // Hire-related reactions
  const hiredCount = Object.values(state.helpersHired ?? {}).filter(Boolean).length;
  if (hiredCount >= 1 && !state.questFlags.maggie_noticed_first_hire) {
    state.questFlags.maggie_noticed_first_hire = true;
    reactions.push(`So you're DELEGATING now? Fancy. Don't forget who taught you what work LOOKS like.`);
  }
  if (hiredCount >= 5 && !state.questFlags.maggie_noticed_5_hires) {
    state.questFlags.maggie_noticed_5_hires = true;
    reactions.push(`Five workers? You have a CREW now? Excuse me. Excuse ME. I taught you EVERYTHING.`);
  }
  if (hiredCount >= 16 && !state.questFlags.maggie_noticed_full_crew) {
    state.questFlags.maggie_noticed_full_crew = true;
    reactions.push(`SIXTEEN of them. SIXTEEN. You don't even DO anything anymore, do you. You just WATCH. That's so WEIRD. I love it.`);
  }

  if (reactions.length === 0) return null;
  // Pick one at random in case multiple just fired
  return reactions[Math.floor(Math.random() * reactions.length)];
}

// ---------- Letter availability ----------

export function shouldOfferLetter(state: GameState): boolean {
  const lastClaim = state.dailyLetterLastClaim ?? 0;
  if (lastClaim === 0) return true;  // never claimed before
  return Date.now() - lastClaim >= LETTER_INTERVAL_MS;
}

// How much time until next letter is available (for UI display)
export function timeUntilNextLetterMs(state: GameState): number {
  const lastClaim = state.dailyLetterLastClaim ?? 0;
  if (lastClaim === 0) return 0;
  return Math.max(0, lastClaim + LETTER_INTERVAL_MS - Date.now());
}

// ---------- Letter generation ----------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function totalSkillLevels(state: GameState): number {
  return state.skills.woodcutting.level + state.skills.carving.level + state.skills.combat.level;
}

export function rollLetter(state: GameState): LetterContents {
  // Determine new streak
  const now = Date.now();
  const lastClaim = state.dailyLetterLastClaim ?? 0;
  const sinceLast = now - lastClaim;
  let newStreak: number;
  let streakBroke = false;

  if (lastClaim === 0) {
    newStreak = 1;
  } else if (sinceLast > STREAK_GRACE_MS) {
    newStreak = 1;
    streakBroke = true;
  } else {
    newStreak = (state.dailyLetterStreak ?? 0) + 1;
  }

  // Coin scales with total skill levels — keeps gift relevant late-game
  const base = 25 + totalSkillLevels(state) * 3;
  const coin = base + Math.floor(Math.random() * 15);

  // Daily Bread: 1 base, +1 bonus on milestone days
  let dailyBread = 1;
  let perkPoint = false;
  let streakMessage: string | null = STREAK_MESSAGE[newStreak] ?? null;

  if (newStreak === 3)  dailyBread += 1;
  if (newStreak === 7)  dailyBread += 4;
  if (newStreak === 14) { dailyBread += 4; perkPoint = true; }
  if (newStreak === 21) dailyBread += 6;
  if (newStreak === 30) { dailyBread += 10; perkPoint = true; }

  // Doodle every 2 days (on day 2, 4, 6, ...) IF not already owned all
  const doodleId = (newStreak >= 2 && newStreak % 2 === 0) ? nextDoodleId(state) : null;

  // Build copy
  let intro = streakBroke ? pick(STREAK_BROKEN_LINES) : pick(INTROS_NORMAL);

  // Body has fixed structure: list the rewards in Maggie's voice
  const isFirstLetter = lastClaim === 0;
  const bodyParts: string[] = [];
  bodyParts.push(`Here, take ${coin} coin. I had EXTRA. Don't ASK why.`);
  if (isFirstLetter) {
    // First letter: explain what Daily Bread is and where to spend it
    bodyParts.push(`Also ${dailyBread} Daily Bread, which sounds like food but ISN'T. Spend them at MY COUNTER in town. Don't lose them.`);
  } else {
    // Subsequent letters: just mention the amount, no tutorial
    bodyParts.push(`Also ${dailyBread} Daily Bread for the COUNTER. Obviously.`);
  }
  if (doodleId) {
    const d = MARGIN_DOODLES.find(x => x.id === doodleId);
    if (d) bodyParts.push(`I drew this on accident: ${d.name}. Don't make it WEIRD.`);
  }
  if (perkPoint) {
    bodyParts.push(`Also a PERK POINT. Don't waste it. Actually do. I don't CARE.`);
  }

  // Reactive line if applicable
  const reactive = getReactiveLine(state);
  if (reactive) bodyParts.push(reactive);

  const body = bodyParts.join(' ');

  const outro = streakMessage ?? pick(OUTROS_NORMAL);

  return {
    coin,
    dailyBread,
    doodleId,
    perkPoint,
    intro,
    body,
    outro,
    streakAfter: newStreak,
  };
}

// Apply the letter's effects to the state. Called after the player clicks
// "Take it" on the letter modal.
export function claimLetter(state: GameState, contents: LetterContents): void {
  state.coin += contents.coin;
  state.dailyBread = (state.dailyBread ?? 0) + contents.dailyBread;
  if (contents.doodleId) {
    state.doodlesOwned = state.doodlesOwned ?? {};
    state.doodlesOwned[contents.doodleId] = true;
  }
  if (contents.perkPoint) {
    // Award to combat by default - we can let the player choose later
    state.skills.combat.perkPoints += 1;
  }
  state.dailyLetterLastClaim = Date.now();
  state.dailyLetterStreak = contents.streakAfter;
}

// ---------- Innkeep's Counter ----------

export interface CounterBuff {
  id: string;
  name: string;
  flavor: string;
  cost: number;
  cap: number;
  description: string;
  apply: (state: GameState) => void;
}

export const COUNTER_BUFFS: CounterBuff[] = [
  {
    id: 'hearty_stew',
    name: 'Hearty Stew',
    flavor: '"It\'s mostly potato. Don\'t ask."',
    cost: 3, cap: 25,
    description: '+1 max HP, permanently.',
    apply: (s) => { s.permBonuses = s.permBonuses ?? {}; s.permBonuses.maxHp = (s.permBonuses.maxHp ?? 0) + 1; },
  },
  {
    id: 'forester_eye',
    name: "Forester's Eye",
    flavor: '"Squint at the trees properly."',
    cost: 3, cap: 20,
    description: '+1% woodcutting speed, permanently.',
    apply: (s) => { s.permBonuses = s.permBonuses ?? {}; s.permBonuses.wcSpeed = (s.permBonuses.wcSpeed ?? 0) + 0.01; },
  },
  {
    id: 'whittler_calluses',
    name: "Whittler's Calluses",
    flavor: '"Tough hands. Tougher opinions about wood grain."',
    cost: 3, cap: 20,
    description: '+1% carving speed, permanently.',
    apply: (s) => { s.permBonuses = s.permBonuses ?? {}; s.permBonuses.cvSpeed = (s.permBonuses.cvSpeed ?? 0) + 0.01; },
  },
  {
    id: 'quick_hands',
    name: 'Quick Hands',
    flavor: '"For counting coin, OBVIOUSLY. What did you think?"',
    cost: 5, cap: 15,
    description: '+1% coin from sells, permanently.',
    apply: (s) => { s.permBonuses = s.permBonuses ?? {}; s.permBonuses.sellBonus = (s.permBonuses.sellBonus ?? 0) + 0.01; },
  },
  {
    id: 'maggie_favor',
    name: "Maggie's Favor",
    flavor: "\"Ugh, FINE. Take a perk point. I don't even KNOW why I do this.\"",
    cost: 10, cap: 5,
    description: '+1 perk point in Combat (a rare gift).',
    apply: (s) => { s.skills.combat.perkPoints += 1; },
  },
];

export function counterPurchaseCount(state: GameState, buffId: string): number {
  return state.counterPurchases?.[buffId] ?? 0;
}

export function buyCounterBuff(state: GameState, buffId: string): { ok: boolean; reason?: string } {
  const buff = COUNTER_BUFFS.find(b => b.id === buffId);
  if (!buff) return { ok: false, reason: 'no such buff' };
  const owned = counterPurchaseCount(state, buffId);
  if (owned >= buff.cap) return { ok: false, reason: 'capped' };
  const bread = state.dailyBread ?? 0;
  if (bread < buff.cost) return { ok: false, reason: 'not enough bread' };
  state.dailyBread = bread - buff.cost;
  state.counterPurchases = state.counterPurchases ?? {};
  state.counterPurchases[buffId] = owned + 1;
  buff.apply(state);
  return { ok: true };
}
