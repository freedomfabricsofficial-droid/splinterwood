// Letter Modal (Maggie's daily letter — legacy daily-letter system).
// Dead UI path in current builds (daily rewards moved to dedicated button)
// but kept around in case the old letter flow gets reused. Story letters use
// StoryLetterModal instead.
import { useState } from 'react';
import { MARGIN_DOODLES, type LetterContents } from '../../data/letter';

export function LetterModal({ letter, onClaim, onClose }: {
  letter: LetterContents; onClaim: () => void; onClose: () => void;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal letter-modal" onClick={(e) => e.stopPropagation()}>
        {!opened ? (
          <div className="letter-sealed" onClick={() => setOpened(true)}>
            <div className="wax-seal">
              <span>M</span>
            </div>
            <div className="letter-sealed-prompt">A letter. Sealed in wax. Click to open.</div>
          </div>
        ) : (
          <>
            <div className="letter-header">
              <i className="ti ti-mail-opened" aria-hidden="true"></i>
              <span>From: Maggie · Day {letter.streakAfter} of your streak</span>
            </div>
            <p className="letter-intro">{letter.intro}</p>
            <p className="letter-body">{letter.body}</p>
            <p className="letter-outro">{letter.outro}</p>
            <div className="letter-rewards">
              <div className="letter-reward"><i className="ti ti-coin" aria-hidden="true"></i> {letter.coin} coin</div>
              <div className="letter-reward"><i className="ti ti-bread" aria-hidden="true"></i> {letter.dailyBread} Daily Bread</div>
              {letter.doodleId && (
                <div className="letter-reward gold-text">
                  <i className="ti ti-feather" aria-hidden="true"></i>{' '}
                  Margin Doodle: {MARGIN_DOODLES.find(d => d.id === letter.doodleId)?.name}
                </div>
              )}
              {letter.perkPoint && (
                <div className="letter-reward gold-text">
                  <i className="ti ti-star" aria-hidden="true"></i> +1 perk point
                </div>
              )}
            </div>
            <button className="letter-claim-btn" onClick={onClaim}>Take it all</button>
          </>
        )}
      </div>
    </div>
  );
}
