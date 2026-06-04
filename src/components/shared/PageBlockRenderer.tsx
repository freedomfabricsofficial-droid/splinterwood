// Renders a single block of voice-styled text. Used by both DiscoveryModal
// (when a page first drops) and the Tome's Pages section (re-reading).
// Each kind picks up its visual style via a CSS class:
//   - content     → Schoolbell cursive (the actual writing on the page)
//   - observation → IM Fell English italic, dimmer, indented (player thoughts)
//   - maggie      → Indie Flower (handwritten note from Maggie)
import type { PageBlock } from '../../data/pages';

export function PageBlockRenderer({ block }: { block: PageBlock }) {
  return (
    <div className={`page-block page-block-${block.kind}`}>
      {block.text.split('\n\n').map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}
