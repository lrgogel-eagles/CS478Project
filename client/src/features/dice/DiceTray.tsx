import { useState, type FormEvent } from 'react';
import { errorText } from '../../api/http';
import { useAuth } from '../auth/auth-context';
import { diceApi, DICE_LIMITS, type Roll } from './dice-api';
import { DieIcon } from './DieIcon';
import { DIE_KINDS, dieKindOf, validNotation, type DieKind } from './notation';
import { RollLog } from './RollLog';
import { RollResult } from './RollResult';
import { useLiveRolls } from './use-live-rolls';
import './dice.css';

const NOTATION_HELP = 'That roll needs to look like 1d20, 2d6+3 or 4d8-1, with up to 100 of d4, d6, d8, d10, d12, d20 or d100.';
const FACE_LABELS = { d4: '4', d6: '6', d8: '8', d10: '10', d12: '12', d20: '20', d100: '%' } as const satisfies Record<DieKind, string>;

export function lastRollKey(campaignId: number) {
  return `ck_last_roll_${campaignId}`;
}

function rememberedExpression(campaignId: number) {
  const saved = localStorage.getItem(lastRollKey(campaignId));
  return saved !== null && validNotation(saved) ? saved : '1d20';
}

export function DiceTray({ campaignId }: { campaignId: number }) {
  const { user } = useAuth();
  const { rolls, isLoading, syncError, addRoll } = useLiveRolls(campaignId);
  const [expression, setExpression] = useState(() => rememberedExpression(campaignId));
  const [result, setResult] = useState<Roll | null>(null);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const pickedKind = dieKindOf(expression);

  async function rollDice(text: string) {
    setError('');
    const trimmed = text.trim();
    if (!validNotation(trimmed)) {
      setError(NOTATION_HELP);
      return;
    }
    setIsBusy(true);
    try {
      const saved = await diceApi.roll(campaignId, trimmed);
      setResult(saved);
      addRoll(saved);
      localStorage.setItem(lastRollKey(campaignId), trimmed);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setIsBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void rollDice(expression);
  }

  function rollOne(kind: DieKind) {
    setExpression(`1${kind}`);
    void rollDice(`1${kind}`);
  }

  return (
    <aside className="dice-side" id="dice" aria-labelledby="dice-head">
      <h2 id="dice-head" className="visually-hidden">
        Dice
      </h2>
      <div className="tray">
        <div className="felt" aria-live="polite">
          <RollResult roll={result} expression={expression} />
        </div>
      </div>
      <div className="dice-row" role="group" aria-label="Roll one die">
        {DIE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="die-btn"
            aria-label={`Roll 1${kind}`}
            data-picked={kind === pickedKind ? 'true' : undefined}
            disabled={isBusy}
            onClick={() => rollOne(kind)}
          >
            <DieIcon kind={kind} value={FACE_LABELS[kind]} />
            <span aria-hidden="true">{kind}</span>
          </button>
        ))}
      </div>
      <form className="roll-pad" onSubmit={submit}>
        <label className="field-label" htmlFor="notation">
          What are you rolling?
        </label>
        <input
          id="notation"
          className="pencil-input"
          value={expression}
          maxLength={DICE_LIMITS.expression}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setExpression(event.target.value)}
        />
        <button className="chip" type="submit" disabled={isBusy}>
          <span>Roll</span>
        </button>
        {error && (
          <p role="alert" className="paper-alert roll-error">
            {error}
          </p>
        )}
      </form>
      <RollLog rolls={rolls} isLoading={isLoading} syncError={syncError} currentUserId={user?.id} />
    </aside>
  );
}
