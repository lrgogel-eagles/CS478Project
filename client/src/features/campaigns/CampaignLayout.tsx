import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { AppShell } from '../../app/AppShell';
import { errorText } from '../../api/http';
import { campaignsApi, type Campaign, type Member, type Membership } from './campaigns-api';

export type CampaignContext = {
  membership: Membership;
  members: Member[];
  onCampaignChange: (campaign: Campaign) => void;
};

export function useCampaign() {
  return useOutletContext<CampaignContext>();
}

export function CampaignLayout() {
  const { campaignId } = useParams();
  const id = Number(campaignId);
  const isValidId = Number.isInteger(id) && id > 0;
  const [membership, setMembership] = useState<Membership | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isValidId) return;
    let isActive = true;
    setMembership(null);
    setError('');
    Promise.all([campaignsApi.get(id), campaignsApi.members(id)])
      .then(([found, people]) => {
        if (!isActive) return;
        setMembership(found);
        setMembers(people);
      })
      .catch((caught: unknown) => {
        if (isActive) setError(errorText(caught));
      });
    return () => {
      isActive = false;
    };
  }, [id, isValidId]);

  if (!isValidId) return <Navigate to="/campaigns" replace />;

  const context: CampaignContext | null = membership && {
    membership,
    members,
    onCampaignChange: (campaign) => setMembership({ ...membership, campaign }),
  };

  return (
    <AppShell campaign={membership ? { id, role: membership.role } : undefined}>
      {error ? (
        <div className="sticky-note lost-note">
          <p role="alert">{error}</p>
          <Link className="pencil-link" to="/campaigns">
            Back to your campaigns
          </Link>
        </div>
      ) : context ? (
        <Outlet context={context} />
      ) : (
        <p className="on-wood-note">Setting up the table...</p>
      )}
    </AppShell>
  );
}
