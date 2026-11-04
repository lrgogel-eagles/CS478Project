import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { api, errorText, LIMITS, type Campaign, type Roll } from '../api/client';
import { useAuth } from '../auth';

const DIE_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);
const MAX_DICE = 100;

export function validNotation(value: string) {
  const text = value.trim();
  if (text.length > LIMITS.expression) return false;
  const match = /^(\d*)d(\d+)([+-]\d+)?$/i.exec(text);
  if (!match) return false;
  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  return count >= 1 && count <= MAX_DICE && DIE_SIDES.has(sides);
}

function signed(modifier: number) {
  return modifier < 0 ? `${modifier}` : `+${modifier}`;
}

export function Dice() {
  const { campaignId } = useParams();
  const id = Number(campaignId);
  const isValidId = Number.isInteger(id) && id > 0;
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expression, setExpression] = useState('2d6+3');
  const [result, setResult] = useState<Roll | null>(null);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isValidId) return;
    let isActive = true;
    Promise.all([api.campaign(id), api.rolls(id)])
      .then(([membership, recent]) => {
        if (!isActive) return;
        setCampaign(membership.campaign);
        setRolls(recent);
      })
      .catch((caught: unknown) => {
        if (isActive) setLoadError(errorText(caught));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [id, isValidId]);

  if (!isValidId) return <Navigate to="/campaigns" replace />;

  async function roll(event: FormEvent) {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!validNotation(expression)) {
      setError('Invalid dice notation. Roll up to 100 of d4, d6, d8, d10, d12, d20 or d100, like 2d6+3 or 1d20-1.');
      return;
    }
    setIsBusy(true);
    try {
      const saved = await api.roll(id, expression.trim());
      setResult(saved);
      setRolls((old) => [saved, ...old].slice(0, LIMITS.recentRolls));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      {loadError && (
        <div role="alert" className="alert alert-danger text-break">
          {loadError}
        </div>
      )}
      <div className="row g-4">
        <section className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <h1 className="h3">Dice Roller</h1>
              <p className="text-muted text-break">
                {campaign ? `${campaign.name}. ` : ''}Enter dice notation such as 1d20, 2d6+3, or 4d8-1.
              </p>
              <form onSubmit={roll}>
                <label htmlFor="notation" className="form-label">
                  Dice notation
                </label>
                <div className="input-group">
                  <input
                    id="notation"
                    className="form-control"
                    value={expression}
                    maxLength={LIMITS.expression}
                    onChange={(event) => setExpression(event.target.value)}
                  />
                  <button disabled={isBusy} className="btn btn-primary">
                    Roll Dice
                  </button>
                </div>
              </form>
              {error && (
                <div role="alert" className="alert alert-danger mt-3 text-break">
                  {error}
                </div>
              )}
              {result && (
                <div className="mt-4">
                  <h2 className="h5">Individual dice</h2>
                  <div className="d-flex gap-2 flex-wrap">
                    {result.results.map((die, index) => (
                      <span key={index} className="border rounded p-3 fs-4" aria-label={`Die ${index + 1}: ${die}`}>
                        {die}
                      </span>
                    ))}
                  </div>
                  {result.modifier !== 0 && <p className="mt-3">Modifier: {signed(result.modifier)}</p>}
                  <p className="fs-3 mt-3">
                    Total: <strong>{result.total}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5">Recent rolls</h2>
              {isLoading ? (
                <p className="text-muted mb-0">Loading rolls...</p>
              ) : rolls.length === 0 ? (
                <p className="text-muted mb-0">No rolls yet.</p>
              ) : (
                <ul className="list-unstyled mb-0" aria-label="Recent rolls">
                  {rolls.map((entry) => (
                    <li key={entry.id} className={'border-bottom py-2 px-2 text-break' + (entry.userId === user?.id ? ' bg-light' : '')}>
                      <strong>{entry.displayName}</strong> rolled {entry.expression}: {entry.results.join(', ')}
                      {entry.modifier !== 0 && ` (${signed(entry.modifier)})`} = <strong>{entry.total}</strong>
                      <time className="d-block small text-muted" dateTime={entry.rolledAt}>
                        {new Date(entry.rolledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
