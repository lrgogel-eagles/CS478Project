import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorText } from '../../api/http';
import { ClampedText } from '../../theme/ClampedText';
import { CAMPAIGN_LIMITS, campaignsApi, ROLE_LABELS, type Membership } from './campaigns-api';
import './campaigns.css';

export function CampaignsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    campaignsApi
      .list()
      .then((list) => {
        if (isActive) setMemberships(list);
      })
      .catch((caught: unknown) => {
        if (isActive) setError(errorText(caught));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  function add(membership: Membership) {
    setMemberships((old) => (old.some((m) => m.campaign.id === membership.campaign.id) ? old : [...old, membership]));
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setCreateError('');
    try {
      add(await campaignsApi.create(name.trim(), description.trim()));
      setName('');
      setDescription('');
    } catch (caught) {
      setCreateError(errorText(caught));
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    setJoinError('');
    try {
      add(await campaignsApi.join(code.trim()));
      setCode('');
    } catch (caught) {
      setJoinError(errorText(caught));
    }
  }

  return (
    <>
      <h1 className="tape tape-label page-title">Your campaigns</h1>
      {isLoading ? (
        <p className="on-wood-note">Finding your campaigns...</p>
      ) : error ? (
        <div className="sticky-note lost-note">
          <p role="alert">{error}</p>
        </div>
      ) : memberships.length === 0 ? (
        <div className="sticky-note empty-note">
          <p>No campaigns yet. Start one below, or ask your Game Master for an invite code.</p>
        </div>
      ) : (
        <ul className="campaign-pins" aria-label="Your campaigns">
          {memberships.map(({ campaign, role }) => (
            <li key={campaign.id} className="campaign-pin">
              <h2 className="marker campaign-pin-name">
                <Link className="hit-area" to={`/campaigns/${campaign.id}`}>
                  {campaign.name}
                </Link>
              </h2>
              <div className="ruled-lines campaign-pin-body">
                <span className="role-stamp" data-role={role}>
                  {ROLE_LABELS[role]}
                </span>
                {campaign.description && <ClampedText text={campaign.description} lines={3} className="pencil campaign-pin-text" />}
                <Link className="pencil-link campaign-pin-open" to={`/campaigns/${campaign.id}`} aria-label={`Open ${campaign.name}`}>
                  Open the table
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="campaign-forms">
        <form className="taped-card start-card" onSubmit={create} aria-labelledby="start-head">
          <h2 id="start-head" className="marker">
            Start a campaign
          </h2>
          <label htmlFor="campaignName" className="field-label">
            Campaign name
          </label>
          <input
            id="campaignName"
            className="pencil-input"
            value={name}
            maxLength={CAMPAIGN_LIMITS.name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <label htmlFor="campaignDescription" className="field-label">
            What's it about? (optional)
          </label>
          <textarea
            id="campaignDescription"
            className="pencil-input"
            rows={3}
            value={description}
            maxLength={CAMPAIGN_LIMITS.description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <button className="ink-btn">Start it</button>
          {createError && (
            <p role="alert" className="paper-alert">
              {createError}
            </p>
          )}
        </form>
        <form className="join-ticket" onSubmit={join} aria-labelledby="join-head">
          <h2 id="join-head" className="ticket-label">
            Got an invite code?
          </h2>
          <label htmlFor="inviteCode" className="visually-hidden">
            Invite code
          </label>
          <input
            id="inviteCode"
            className="ticket-input"
            value={code}
            maxLength={CAMPAIGN_LIMITS.inviteCode}
            autoComplete="off"
            spellCheck={false}
            placeholder="KEEP42"
            onChange={(event) => setCode(event.target.value)}
            required
          />
          <button className="ink-btn">Join</button>
          {joinError && (
            <p role="alert" className="ticket-error">
              {joinError}
            </p>
          )}
        </form>
      </div>
    </>
  );
}
