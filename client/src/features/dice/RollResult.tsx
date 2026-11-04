import type { Roll } from './dice-api';
import { DieIcon } from './DieIcon';
import { dieKindOf, isNaturalOne, isNaturalTwenty } from './notation';
import { MAX_DICE_SHOWN, rollMath } from './roll-words';

export function RollResult({ roll, expression }: { roll: Roll | null; expression: string }) {
  if (!roll) {
    return (
      <>
        <span className="result-dice" data-count="1">
          <DieIcon kind={dieKindOf(expression)} />
        </span>
        <p className="result-empty">Tap a die, or type a roll below.</p>
      </>
    );
  }
  const kind = dieKindOf(roll.expression);
  const shown = roll.results.slice(0, MAX_DICE_SHOWN);
  const hidden = roll.results.length - shown.length;
  const math = rollMath(roll);
  const crit = isNaturalTwenty(roll.expression, roll.results) ? 'Natural 20' : isNaturalOne(roll.expression, roll.results) ? 'Natural 1' : '';
  return (
    <>
      <span key={roll.id} className="result-dice" data-count={Math.min(roll.results.length, 2)}>
        {shown.map((value, index) => (
          <DieIcon key={index} kind={kind} value={String(value)} />
        ))}
        {hidden > 0 && <span className="result-more">+{hidden} more</span>}
      </span>
      <div className="result-math">
        <span className="result-line">{roll.expression}</span>
        {math && <span className="result-line">{math}</span>}
        <strong className="chalk">{roll.total}</strong>
        {crit && <span className="result-crit">{crit}</span>}
      </div>
    </>
  );
}
