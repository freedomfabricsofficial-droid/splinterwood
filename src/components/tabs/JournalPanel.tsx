// JournalPanel — the "Tome" (Journal) tab of the right rail.
//
// Six expandable sections: Help (game mechanics explainer), Pages (lore
// drops), Tales (achievements), Bestiary (foes), Atlas (trees/mines),
// Catalogue (items ever held). Help is collapse-by-default open; the rest
// open on click. Each section's body is a sibling component below.
//
// Add a new section by extending sectionDefs and adding a branch in the
// JSX that picks the matching body component. Adding a new help topic =
// editing the topics array in HelpSectionBody.
import { useState } from 'react';
import type { GameState } from '../../types';
import { JOURNAL_PAGES } from '../../data/pages';
import type { JournalSection } from '../../data/journal';
import {
  getJournalCounts, ACHIEVEMENTS,
  getBestiaryEntries, getAtlasEntries, getCatalogueEntries,
} from '../../data/journal';
import { PageBlockRenderer } from '../shared/PageBlockRenderer';

export function JournalPanel({ state }: { state: GameState }) {
  const counts = getJournalCounts(state);
  const [openSection, setOpenSection] = useState<JournalSection | 'help' | 'pages' | null>('help');

  const pagesFound = state.pagesFound ?? {};
  const pagesFoundCount = Object.keys(pagesFound).filter(k => pagesFound[k]).length;
  const pagesTotal = JOURNAL_PAGES.length;

  const sectionDefs: { id: JournalSection | 'help' | 'pages'; label: string; flavor: string }[] = [
    { id: 'help',      label: 'Help',      flavor: 'Notes and explanations. The rules of how this ledger works.' },
    { id: 'pages',     label: 'Pages',     flavor: 'Loose pages found in the world. Some are torn. Some are smudged.' },
    { id: 'tales',     label: 'Tales',     flavor: 'Accounts of notable moments.' },
    { id: 'bestiary',  label: 'Bestiary',  flavor: 'Foes encountered, with attached opinions.' },
    { id: 'atlas',     label: 'Atlas',     flavor: 'Trees of Splinterwood. Sketched, sometimes accurately.' },
    { id: 'catalogue', label: 'Catalogue', flavor: 'A list of everything you have ever held.' },
  ];

  return (
    <>
      {sectionDefs.map((sec) => {
        const open = openSection === sec.id;
        let countLabel: string | null = null;
        if (sec.id === 'pages') {
          countLabel = `${pagesFoundCount} / ${pagesTotal}`;
        } else if (sec.id !== 'help') {
          const c = counts[sec.id as JournalSection];
          countLabel = `${c.unlocked} / ${c.total}`;
        }
        return (
          <div key={sec.id} className="journal-section">
            <div
              className="journal-section-header"
              onClick={() => setOpenSection(open ? null : sec.id)}
            >
              <span className="journal-section-title">{sec.label}</span>
              {countLabel && <span className="journal-section-count">{countLabel}</span>}
            </div>
            {open && (
              sec.id === 'help'  ? <HelpSectionBody />
            : sec.id === 'pages' ? <PagesSectionBody state={state} />
            : <JournalSectionBody state={state} section={sec.id as JournalSection} flavor={sec.flavor} />
            )}
          </div>
        );
      })}
    </>
  );
}

// Lists all found journal pages. Click a page title to read its body in place.
// Empty state shown when nothing has been found yet.
function PagesSectionBody({ state }: { state: GameState }) {
  const pagesFound = state.pagesFound ?? {};
  const pagesUnread = state.pagesUnread ?? {};
  const collected = JOURNAL_PAGES.filter(p => pagesFound[p.id]);
  const [openPageId, setOpenPageId] = useState<string | null>(null);

  if (collected.length === 0) {
    return (
      <div className="journal-section-body">
        <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>
          You haven't found any pages yet. They turn up sometimes — wedged in logs,
          tucked between blocks of stone, caught on the edge of a tool. Keep working.
        </p>
      </div>
    );
  }

  const openPage = (pageId: string) => {
    if (openPageId === pageId) {
      setOpenPageId(null);
    } else {
      setOpenPageId(pageId);
      if (state.pagesUnread?.[pageId]) {
        delete state.pagesUnread[pageId];
      }
    }
  };

  return (
    <div className="journal-section-body">
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Loose pages found in the world. Some are torn. Some are smudged.
      </p>
      {collected.map(page => {
        const open = openPageId === page.id;
        const unread = !!pagesUnread[page.id];
        return (
          <div key={page.id} className="page-entry">
            <div
              className={`page-entry-title ${unread ? 'unread' : ''}`}
              onClick={() => openPage(page.id)}
            >
              {open ? '▼' : '▶'} {page.title}
              {unread && <span className="page-unread-dot" aria-label="new">●</span>}
            </div>
            {open && (
              <div className="page-entry-body">
                {page.body.map((block, i) => (
                  <PageBlockRenderer key={i} block={block} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Plain explanations of the game's main mechanics. Add new entries here as
// the game grows. Stays in the Tome so it doesn't take a top-level slot.
function HelpSectionBody() {
  const topics: { title: string; body: string }[] = [
    {
      title: 'Hiring Help',
      body: 'In the Town district there is "Hired Help." Spending coin to hire someone permanently automates that gather or craft node at full player speed. You never need to manage it again. Tier-1 helpers are cheap. Tier-4 helpers cost real money. The goal: have someone working everywhere below your cutting edge.',
    },
    {
      title: 'Equipment & Quality',
      body: 'Every weapon, shield, or armor piece rolls a Quality Tier (Regrettable / Forgettable / Adequate / Suspicious / Unreasonable) and sometimes a Modifier like Sharp, Hasty, or Cursed. Two of the same item can be very different. Check the Self district\'s Adventurer tab to see your stats.',
    },
    {
      title: 'Stats',
      body: 'Attack and Defense are the obvious ones. Crit Chance triggers a damage bonus on hits. Speed makes you swing faster in combat. Gather/Craft Speed affects out-of-combat tasks. Drop Rate and Coin Find improve loot from foes. All shown on the Adventurer sheet, with zeros included so you know what\'s available to build toward.',
    },
    {
      title: 'Combat Abilities',
      body: 'Each ability has a cooldown. Unlock them by leveling Combat. Use them whenever — they continue ticking down even outside combat, so a wise adventurer enters fights already prepared.',
    },
    {
      title: 'Floors',
      body: 'The world has multiple realms ("floors"). Splinterwood is your starting home. Greystone Reach unlocks once Maggie writes to you about it. Skills you unlock on one floor stay with you forever — they don\'t reset when you change locations. The realm map (top of screen) lets you visit any unlocked floor.',
    },
    {
      title: "Maggie's Letters",
      body: "Every 20 hours or so, Maggie sends a letter with coin and Daily Bread tokens. Streak counts up if you claim consistently. Miss two days in a row and the streak resets. Spend Daily Bread at Maggie's Counter (Town district) on permanent buffs.",
    },
    {
      title: 'Selling Equipment',
      body: 'In the Satchel, equipment is grouped by name. Click to expand and see each instance. Sell the rolls you don\'t want — equipped items, locked items, and Suspicious-or-better items are all safe from "Sell all unprotected gear."',
    },
    {
      title: 'Random Events',
      body: 'Roughly every 8-12 minutes of active play, something interesting may happen. A trader, a coin in the dirt, a goblin pickpocket. Click choices to respond. None of them are required.',
    },
    {
      title: 'Music & Credits',
      body: 'Music by Vindsvept — used under the Creative Commons Attribution 4.0 License (CC BY 4.0). More of his work at youtube.com/Vindsvept and vindsvept.se. Tracks may include "Onward" and others. If you enjoy the music, consider supporting him at patreon.com/Vindsvept.',
    },
  ];
  return (
    <div className="journal-section-body help-section-body">
      <div className="journal-section-flavor">Notes and explanations. The rules of how this ledger works.</div>
      {topics.map((t) => (
        <div key={t.title} className="help-topic">
          <div className="help-topic-title">{t.title}</div>
          <div className="help-topic-body">{t.body}</div>
        </div>
      ))}
    </div>
  );
}

// Generic body for tales/bestiary/atlas/catalogue. Pulls entries from journal
// data and gates each by state.journalUnlocked[entry.id].
function JournalSectionBody({ state, section, flavor }: {
  state: GameState; section: JournalSection; flavor: string;
}) {
  const u = state.journalUnlocked ?? {};
  let entries: { id: string; name: string; description: string; hint?: string; category?: string }[] = [];
  if (section === 'tales') {
    entries = ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name, description: a.description, hint: a.hint }));
  } else if (section === 'bestiary') {
    entries = getBestiaryEntries();
  } else if (section === 'atlas') {
    entries = getAtlasEntries();
  } else if (section === 'catalogue') {
    entries = getCatalogueEntries();
  }
  return (
    <div className="journal-section-body">
      <div className="journal-section-flavor">{flavor}</div>
      {entries.map((e) => {
        const unlocked = !!u[e.id];
        return (
          <div key={e.id} className={`journal-entry ${unlocked ? 'unlocked' : 'locked'}`}>
            <div className="journal-entry-name">
              {unlocked ? e.name : '???'}
              {e.category && <span className="journal-entry-category"> · {e.category}</span>}
            </div>
            <div className="journal-entry-desc">
              {unlocked ? e.description : (e.hint ?? 'Not yet discovered.')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
