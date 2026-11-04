import { useEffect, useState } from 'react';
import { errorText } from '../../api/http';
import { campaignsApi, type Campaign } from './campaigns-api';

const COPIED_MS = 2500;

type InviteTicketProps = {
  campaign: Campaign;
  onCampaignChange: (campaign: Campaign) => void;
};

export function InviteTicket({ campaign, onCampaignChange }: InviteTicketProps) {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);

  useEffect(() => {
    if (status === '') return;
    const timer = window.setTimeout(() => setStatus(''), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copy() {
    setError('');
    try {
      await navigator.clipboard.writeText(campaign.inviteCode);
      setStatus('Copied');
    } catch (caught) {
      if (!(caught instanceof Error)) throw caught;
      setError("Couldn't copy it. Select the code and copy it yourself.");
    }
  }

  async function replace() {
    setError('');
    setIsReplacing(true);
    try {
      onCampaignChange(await campaignsApi.newInviteCode(campaign.id));
      setStatus('New code made');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setIsReplacing(false);
    }
  }

  return (
    <aside className="ticket-wrap" aria-label="Invite code">
      <div className="ticket">
        <span className="ticket-label">Invite code</span>
        <span className="ticket-code">{campaign.inviteCode}</span>
        <span className="ticket-actions">
          <button type="button" className="pencil-btn" onClick={() => void copy()}>
            Copy
          </button>
          <button type="button" className="pencil-btn" onClick={() => void replace()} disabled={isReplacing}>
            New code
          </button>
        </span>
        <span className="ticket-status" role="status">
          {status}
        </span>
        {error && (
          <span role="alert" className="ticket-error">
            {error}
          </span>
        )}
      </div>
    </aside>
  );
}
