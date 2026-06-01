import type { GameState } from '../types';
import { bGte } from '../util/bignum';

export interface QuestStepData {
  id: string;
  npc: string;
  text: string;
  // Linear order within the giver's chain is implicit by array position.
  // `visible` controls whether this step is shown in the UI at all.
  // Engine still requires the previous step in this giver's line to be
  // completed first, so this only governs spoiler-prevention.
  visible: (s: GameState) => boolean;
  // Completion condition. Engine claims the step automatically when met.
  check: (s: GameState) => boolean;
  claim: (s: GameState, helpers: QuestHelpers) => void;
}

export interface QuestHelpers {
  addCoin: (n: number) => void;
  addPerkPoint: (skill: 'woodcutting' | 'carving' | 'combat', n: number) => void;
  showToast: (msg: string) => void;
}

// Helper predicates for common visibility patterns
const hasItem = (id: string, n = 1) => (s: GameState) => (s.inv[id] ?? 0) >= n;
const hasEverItem = (id: string) => (s: GameState) => (s.inv[id] ?? 0) >= 1 || !!s.questFlags[`had_${id}`];
const skillLv = (skill: 'woodcutting' | 'carving' | 'combat', lv: number) =>
  (s: GameState) => s.skills[skill].level >= lv;

export const QUEST_STEPS: QuestStepData[] = [
  {
    id: 'q1',
    npc: 'Maggie the Innkeep',
    text: `"OH. It's YOU. Ugh, fine, listen — the FOREST has been GROANING at night and the Innkeep's cat can't SLEEP. Bring me 10 Oak Logs, and don't ASK why I want them. JUST DO IT."`,
    visible: () => true,
    check: (s) => (s.inv.log_oak ?? 0) >= 10,
    claim: (s, h) => {
      s.inv.log_oak -= 10;
      h.addCoin(300);
      h.addPerkPoint('combat', 1);
    },
  },
  {
    id: 'q2',
    npc: 'Maggie the Innkeep',
    text: `"OKAY so the groaning, it's the OAK COUNCIL. They're BORED. Apparently I have to FIX THIS now. Carve a 'Pinewood Sword' — yes, I KNOW it's a toothpick — and go THWACK a Recreational Boar. The Council will think it's HILARIOUS. Don't make it weird."`,
    visible: hasEverItem('item_sword'),
    check: (s) => !!s.questFlags.boarSlain && (s.inv.item_sword ?? 0) >= 1,
    claim: (_s, h) => {
      h.addCoin(1500);
      h.addPerkPoint('woodcutting', 2);
    },
  },
  {
    id: 'q3',
    npc: 'The Oak Council',
    text: `"Mortal. We are entertained. As recompense, the Ironbark Elder permits you to chop her. She insists. Bring proof: one Ironbark Log."`,
    visible: skillLv('woodcutting', 25),
    check: (s) => (s.inv.log_ironbark ?? 0) >= 1,
    claim: (s, h) => {
      s.inv.log_ironbark -= 1;
      h.addCoin(5000);
      h.addPerkPoint('carving', 2);
      h.addPerkPoint('combat', 1);
    },
  },
  {
    id: 'q4',
    npc: 'Maggie the Innkeep',
    text: `"OKAY listen. THERE'S A TROLL on the bridge demanding coin and he's RUINING my DELIVERIES. Either give him 1000 coin or — and I would PREFER this option — END HIM. I don't CARE which. Just FIX IT. Lump."`,
    visible: (s) => s.skills.combat.level >= 25 || bGte(s.coin, 1000),
    check: (s) => !!s.questFlags.trollSlain || !!s.questFlags.trollPaid,
    claim: (_s, h) => {
      h.addCoin(8000);
      h.addPerkPoint('combat', 3);
      h.showToast('The road is yours. Vertical slice complete.');
    },
  },

  // ===== Maggie's Greystone introduction =====
  {
    id: 'm_greystone_intro',
    npc: 'Maggie the Innkeep',
    text: `"OKAY. New thing. My COUSIN runs a quarry north of here. Sort of. He's WEIRD. He's also USEFUL. Go bother him, he needs help and is too RUDE to ASK. Tell him I said you're 'fine, I GUESS.' He'll know what that means. Find his place on your MAP."`,
    visible: (s) => s.skills.woodcutting.level >= 25 || s.skills.combat.level >= 25,
    check: (s) => !!s.questFlags.visited_greystone,
    claim: (s, h) => {
      // Unlock the realm so it stays accessible going forward
      s.questFlags.greystone_unlocked = true;
      h.addCoin(2500);
      h.showToast('Greystone Reach is now visible on your map.');
    },
  },

  // ===== Brock's quests =====
  {
    id: 'b1',
    npc: 'Brock the Stonewright',
    text: `"You. Sandstone. Ten."`,
    visible: (s) => !!s.questFlags.visited_greystone,
    check: (s) => (s.inv.ore_sandstone ?? 0) >= 10,
    claim: (s, h) => {
      s.inv.ore_sandstone -= 10;
      h.addCoin(1500);
      h.addPerkPoint('combat', 1);
    },
  },
  {
    id: 'b2',
    npc: 'Brock the Stonewright',
    text: `"Pick. Make one."`,
    visible: hasEverItem('ore_sandstone'),
    check: (s) => (s.inv.item_pick ?? 0) >= 1 || !!s.questFlags.had_item_pick,
    claim: (_s, h) => {
      h.addCoin(3500);
      h.addPerkPoint('combat', 1);
    },
  },
  {
    id: 'b3',
    npc: 'Brock the Stonewright',
    text: `"Greystone. Five blocks. Hit harder."`,
    visible: (s) => s.skills.mining.level >= 8,
    check: (s) => (s.inv.ore_greystone ?? 0) >= 5,
    claim: (s, h) => {
      s.inv.ore_greystone -= 5;
      h.addCoin(10000);
      h.addPerkPoint('combat', 2);
    },
  },
  // The "human moment" plant — Brock acknowledges the player after real work.
  {
    id: 'b4',
    npc: 'Brock the Stonewright',
    text: `"You work hard. Stone notices. So do I. Don't tell Maggie. Now: a Veinforged Blade. Forge one. Bring it. Then go."`,
    visible: (s) => s.skills.smithing.level >= 20,
    check: (s) => (s.inv.item_veinblade ?? 0) >= 1 || !!s.questFlags.had_item_veinblade,
    claim: (_s, h) => {
      h.addCoin(50000);
      h.addPerkPoint('combat', 3);
      h.showToast("Brock nods. That's something.");
    },
  },
];

// Helpers for the UI to group quests by giver
export function getQuestGivers(): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const q of QUEST_STEPS) {
    if (!seen.has(q.npc)) {
      seen.add(q.npc);
      order.push(q.npc);
    }
  }
  return order;
}

export function questsForGiver(npc: string): QuestStepData[] {
  return QUEST_STEPS.filter(q => q.npc === npc);
}
