import { useEffect, useState, type FormEvent } from 'react';
import { api, errorText, LIMITS, type Campaign, type Membership } from '../api/client';
import { CampaignCard } from '../components/CampaignCard';

export function Campaigns() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    api
      .campaigns()
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

  function replace(campaign: Campaign) {
    setMemberships((old) => old.map((m) => (m.campaign.id === campaign.id ? { ...m, campaign } : m)));
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      add(await api.createCampaign(name.trim(), description.trim()));
      setName('');
      setDescription('');
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    setJoinError('');
    try {
      add(await api.joinCampaign(code.trim()));
      setCode('');
    } catch (caught) {
      setJoinError(errorText(caught));
    }
  }

  return (
    <>
      <h1 className="mb-4">My Campaigns</h1>
      {isLoading ? (
        <p>Loading campaigns...</p>
      ) : (
        <div className="row g-3 mb-4">
          {memberships.length === 0 ? (
            <p>No campaigns yet. Create or join one below.</p>
          ) : (
            memberships.map((membership) => (
              <div className="col-md-4" key={membership.campaign.id}>
                <CampaignCard membership={membership} onCampaignChange={replace} />
              </div>
            ))
          )}
        </div>
      )}
      <div className="row g-4">
        <section className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h2 className="h5">Start a campaign</h2>
              <form onSubmit={create}>
                <label htmlFor="campaignName" className="form-label">
                  Campaign name
                </label>
                <input
                  id="campaignName"
                  className="form-control mb-3"
                  value={name}
                  maxLength={LIMITS.campaignName}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
                <label htmlFor="campaignDescription" className="form-label">
                  Description (optional)
                </label>
                <textarea
                  id="campaignDescription"
                  className="form-control mb-3"
                  rows={3}
                  value={description}
                  maxLength={LIMITS.campaignDescription}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <button className="btn btn-primary">Create campaign</button>
              </form>
              {error && (
                <div role="alert" className="alert alert-danger mt-3 text-break">
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h2 className="h5">Join a campaign</h2>
              <form onSubmit={join}>
                <label htmlFor="inviteCode" className="form-label">
                  Invite code
                </label>
                <input
                  id="inviteCode"
                  className="form-control mb-3"
                  value={code}
                  maxLength={LIMITS.inviteCode}
                  onChange={(event) => setCode(event.target.value)}
                  required
                />
                <button className="btn btn-outline-primary">Join campaign</button>
              </form>
              {joinError && (
                <div role="alert" className="alert alert-danger mt-3 text-break">
                  {joinError}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
