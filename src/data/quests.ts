import type { GameState } from '../types';
import { bGte } from '../util/bignum';

export interface QuestObjective {
  label: string;
  cur: number;
  target: number;
}

export interface QuestReward {
  coin?: number;
  perks?: { skill: 'woodcutting' | 'carving' | 'combat'; n: number }[];
  note?: string;   // for non-numeric rewards (e.g. "Greystone appears on your map")
}

export interface QuestStepData {
  id: string;
  npc: string;
  title: string;                 // short quest name (shown in the log list)
  text: string;                  // the NPC's flavor quote
  objective: string;             // plain one-line description of the task
  objectives: (s: GameState) => QuestObjective[];  // live progress for the log
  rewards: QuestReward;          // shown in the log (claim() actually grants them)
  // Linear order within a giver's chain is implicit by array position.
  visible: (s: GameState) => boolean;
  check: (s: GameState) => boolean;
  claim: (s: GameState, helpers: QuestHelpers) => void;
}

export interface QuestHelpers {
  addCoin: (n: number) => void;
  addPerkPoint: (skill: 'woodcutting' | 'carving' | 'combat', n: number) => void;
  showToast: (msg: string) => void;
}

// Helper predicates for common visibility / completion patterns.
const hasEverItem = (id: string) => (s: GameState) => (s.inv[id] ?? 0) >= 1 || !!s.questFlags[`had_${id}`];
// Equipment never lives in state.inv (it's auto-equipped / stacked). Detect crafted
// gear by the persistent had_ flag OR current ownership in instances/stacks.
const hasEquipEver = (baseId: string) => (s: GameState) =>
  !!s.questFlags[`had_${baseId}`] ||
  (s.equipInstances?.[baseId]?.length ?? 0) > 0 ||
  Object.values(s.equipStacks?.[baseId] ?? {}).some((t) => ((t as { count?: number })?.count ?? 0) > 0);
const skillLv = (skill: 'woodcutting' | 'carving' | 'combat', lv: number) =>
  (s: GameState) => s.skills[skill].level >= lv;

// Small helper for boolean objectives shown as 0/1.
const bool = (label: string, done: boolean): QuestObjective => ({ label, cur: done ? 1 : 0, target: 1 });

export const QUEST_STEPS: QuestStepData[] = [
  {
    id: 'q1',
    npc: 'Maggie the Innkeep',
    title: 'A Groaning in the Wood',
    text: `"OH. It's YOU. Ugh, fine, listen — the FOREST has been GROANING at night and the Innkeep's cat can't SLEEP. Bring me 10 Oak Logs, and don't ASK why I want them. JUST DO IT."`,
    objective: 'Gather 10 Oak Logs and bring them to Maggie.',
    objectives: (s) => [{ label: 'Oak Logs', cur: Math.min(s.inv.log_oak ?? 0, 10), target: 10 }],
    rewards: { coin: 300, perks: [{ skill: 'combat', n: 1 }] },
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
    title: "The Oak Council's Amusement",
    text: `"OKAY so the groaning, it's the OAK COUNCIL. They're BORED. Apparently I have to FIX THIS now. Carve a 'Pinewood Sword' — yes, I KNOW it's a toothpick — and go THWACK a Recreational Boar. The Council will think it's HILARIOUS. Don't make it weird."`,
    objective: 'Carve a Pinewood Sword and defeat a Recreational Boar.',
    objectives: (s) => [
      bool('Carve a Pinewood Sword', hasEquipEver('item_sword')(s)),
      bool('Defeat a Recreational Boar', !!s.questFlags.boarSlain),
    ],
    rewards: { coin: 1500, perks: [{ skill: 'woodcutting', n: 2 }] },
    visible: hasEquipEver('item_sword'),
    check: (s) => !!s.questFlags.boarSlain && hasEquipEver('item_sword')(s),
    claim: (_s, h) => {
      h.addCoin(1500);
      h.addPerkPoint('woodcutting', 2);
    },
  },
  {
    id: 'q3',
    npc: 'The Oak Council',
    title: "The Elder's Permission",
    text: `"Mortal. We are entertained. As recompense, the Ironbark Elder permits you to chop her. She insists. Bring proof: one Ironbark Log."`,
    objective: 'Chop the Ironbark Elder and bring back one Ironbark Log.',
    objectives: (s) => [{ label: 'Ironbark Log', cur: Math.min(s.inv.log_ironbark ?? 0, 1), target: 1 }],
    rewards: { coin: 5000, perks: [{ skill: 'carving', n: 2 }, { skill: 'combat', n: 1 }] },
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
    title: 'The Toll Road',
    text: `"OKAY listen. THERE'S A TROLL on the bridge demanding coin and he's RUINING my DELIVERIES. Either give him 1000 coin or — and I would PREFER this option — END HIM. I don't CARE which. Just FIX IT. Lump."`,
    objective: 'Pay the Bridge Toll Troll 1000 coin, or defeat it.',
    objectives: (s) => [bool('Deal with the Bridge Troll', !!s.questFlags.trollSlain || !!s.questFlags.trollPaid)],
    rewards: { coin: 8000, perks: [{ skill: 'combat', n: 3 }] },
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
    title: "Maggie's Weird Cousin",
    text: `"OKAY. New thing. My COUSIN runs a quarry north of here. Sort of. He's WEIRD. He's also USEFUL. Go bother him, he needs help and is too RUDE to ASK. Tell him I said you're 'fine, I GUESS.' He'll know what that means. Find his place on your MAP."`,
    objective: 'Open your map and travel to Greystone Reach.',
    objectives: (s) => [bool('Visit Greystone Reach', !!s.questFlags.visited_greystone)],
    rewards: { coin: 2500, note: 'Greystone Reach stays open on your map' },
    visible: (s) => s.skills.woodcutting.level >= 25 || s.skills.combat.level >= 25,
    check: (s) => !!s.questFlags.visited_greystone,
    claim: (s, h) => {
      s.questFlags.greystone_unlocked = true;
      h.addCoin(2500);
      h.showToast('Greystone Reach is now visible on your map.');
    },
  },

  // ===== Brock's quests =====
  {
    id: 'b1',
    npc: 'Brock the Stonewright',
    title: 'Sandstone, Ten',
    text: `"You. Sandstone. Ten."`,
    objective: 'Mine 10 Sandstone Chunks for Brock.',
    objectives: (s) => [{ label: 'Sandstone Chunks', cur: Math.min(s.inv.ore_sandstone ?? 0, 10), target: 10 }],
    rewards: { coin: 1500, perks: [{ skill: 'combat', n: 1 }] },
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
    title: 'Make a Pick',
    text: `"Pick. Make one."`,
    objective: 'Forge an Iron Pick.',
    objectives: (s) => [bool('Forge an Iron Pick', hasEquipEver('item_pick')(s))],
    rewards: { coin: 3500, perks: [{ skill: 'combat', n: 1 }] },
    visible: hasEverItem('ore_sandstone'),
    check: (s) => hasEquipEver('item_pick')(s),
    claim: (_s, h) => {
      h.addCoin(3500);
      h.addPerkPoint('combat', 1);
    },
  },
  {
    id: 'b3',
    npc: 'Brock the Stonewright',
    title: 'Hit Harder',
    text: `"Greystone. Five blocks. Hit harder."`,
    objective: 'Mine 5 Greystone Blocks.',
    objectives: (s) => [{ label: 'Greystone Blocks', cur: Math.min(s.inv.ore_greystone ?? 0, 5), target: 5 }],
    rewards: { coin: 10000, perks: [{ skill: 'combat', n: 2 }] },
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
    title: 'Stone Notices',
    text: `"You work hard. Stone notices. So do I. Don't tell Maggie. Now: a Veinforged Blade. Forge one. Bring it. Then go."`,
    objective: 'Forge a Veinforged Blade.',
    objectives: (s) => [bool('Forge a Veinforged Blade', hasEquipEver('item_veinblade')(s))],
    rewards: { coin: 50000, perks: [{ skill: 'combat', n: 3 }] },
    visible: (s) => s.skills.smithing.level >= 20,
    check: (s) => hasEquipEver('item_veinblade')(s),
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
