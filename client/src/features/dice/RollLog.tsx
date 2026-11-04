import { useState } from 'react';
import { HandRing } from '../../theme/HandRing';
import type { Roll } from './dice-api';
import { isNaturalTwenty } from './notation';
import { rollDetail } from './roll-words';

export const ROLLS_SHOWN = 8;

type RollLogProps = {
  rolls: Roll[];
  isLoading: boolean;
  syncError: string;
  currentUserId: number | undefined;
};

export function RollLog({ rolls, isLoading, syncError, currentUserId }: RollLogProps) {
  const [isShowingAll, setIsShowingAll] = useState(false);
  const shown = isShowingAll ? rolls : rolls.slice(0, ROLLS_SHOWN);
  const hiddenCount = rolls.length - shown.length;
  const isExpanded = isShowingAll && rolls.length > ROLLS_SHOWN;
  return (
    <section className="legal-pad" aria-labelledby="rolls-head" data-expanded={isExpanded ? '' : undefined}>
      <h2 id="rolls-head" className="pencil">
        Rolls at the table
      </h2>
      {isLoading ? (
        <p className="pencil legal-line">Gathering the dice...</p>
      ) : rolls.length === 0 ? (
        <p className="pencil legal-line">No rolls yet.</p>
      ) : (
        <ol className="legal-lines" aria-label="Recent rolls">
          {shown.map((roll) => {
            const isTwenty = isNaturalTwenty(roll.expression, roll.results);
            const who = roll.userId === currentUserId ? 'You' : roll.displayName;
            return (
              <li key={roll.id}>
                <span className="pencil roll-who">
                  {who}, {roll.expression}
                  {rollDetail(roll)}
                </span>
                <span className="pencil roll-total">
                  {isTwenty ? (
                    <>
                      <span className="roll-crit">natural 20</span>
                      <span className="ringed">
                        {roll.total}
                        <HandRing size="small" />
                      </span>
                    </>
                  ) : (
                    roll.total
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {hiddenCount > 0 && (
        <p className="legal-line">
          <button type="button" className="pencil-btn" onClick={() => setIsShowingAll(true)}>
            {hiddenCount === 1 ? 'Show 1 older roll' : `Show ${hiddenCount} older rolls`}
          </button>
        </p>
      )}
      {syncError && (
        <p role="status" className="paper-alert legal-line">
          Lost touch with the server, trying again.
        </p>
      )}
    </section>
  );
}
