// Narrative letter delivered by an NPC, triggered by gameplay thresholds.
// Different from the legacy daily letter: pure story content (rewards
// optional and rare). Sender-specific class controls the body font.
import React, { useState } from 'react';
import type { StoryLetter } from '../../data/storyLetters';

export function StoryLetterModal({ letter, onClose }: {
  letter: StoryLetter; onClose: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const sealMark = letter.sender === 'maggie'  ? 'M'
                 : letter.sender === 'brock'   ? 'B'
                 : letter.sender === 'laileb'  ? 'L'
                 : '?';
  const senderClass = `letter-from-${letter.sender}`;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal letter-modal" onClick={(e) => e.stopPropagation()}>
        {!opened ? (
          <div className="letter-sealed" onClick={() => setOpened(true)}>
            <div className="wax-seal"><span>{sealMark}</span></div>
            <div className="letter-sealed-prompt">A letter. Sealed in wax. Click to open.</div>
          </div>
        ) : (
          <>
            <div className="letter-header">
              <i className="ti ti-mail-opened" aria-hidden="true"></i>
              <span>{letter.senderLabel}</span>
            </div>
            <div className={`letter-content ${senderClass}`}>
              <p className="letter-intro">{letter.intro}</p>
              <p className="letter-body">{letter.body}</p>
              <p className="letter-outro">{letter.outro}</p>
            </div>
            {letter.observation && (
              <div className="letter-observation">
                {letter.observation.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
            {letter.reward && (
              <div className="letter-rewards">
                {letter.reward.coin && (
                  <div className="letter-reward"><i className="ti ti-coin" aria-hidden="true"></i> {letter.reward.coin} coin</div>
                )}
                {letter.reward.perkPoint && (
                  <div className="letter-reward gold-text"><i className="ti ti-star" aria-hidden="true"></i> +1 perk point</div>
                )}
              </div>
            )}
            <button className="letter-claim-btn no-click-sfx" onClick={onClose}>I see.</button>
          </>
        )}
      </div>
    </div>
  );
}
