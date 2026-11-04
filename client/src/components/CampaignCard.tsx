import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText, type Campaign, type Membership, type Role } from '../api/client';

export const ROLE_LABELS = { GM: 'Game Master', PLAYER: 'Player' } as const satisfies Record<Role, string>;

const CLAMPED_DESCRIPTION: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  whiteSpace: 'pre-line',
};

const FULL_DESCRIPTION: CSSProperties = { whiteSpace: 'pre-line' };

type CampaignCardProps = {
  membership: Membership;
  onCampaignChange: (campaign: Campaign) => void;
};

export function CampaignCard({ membership: { campaign, role }, onCampaignChange }: CampaignCardProps) {
  const descriptionId = useId();
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const [isReplacingCode, setIsReplacingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  useLayoutEffect(() => {
    const element = descriptionRef.current;
    if (!element || isExpanded) return;
    const measure = () => setIsClamped(element.scrollHeight > element.clientHeight);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [campaign.description, isExpanded]);

  async function replaceInviteCode() {
    setCodeError('');
    setIsReplacingCode(true);
    try {
      onCampaignChange(await api.newInviteCode(campaign.id));
    } catch (caught) {
      setCodeError(errorText(caught));
    } finally {
      setIsReplacingCode(false);
    }
  }

  return (
    <div className="card h-100">
      <div className="card-body d-flex flex-column">
        <h2 className="h5 text-break">{campaign.name}</h2>
        <div>
          <span className="badge bg-secondary">{ROLE_LABELS[role]}</span>
        </div>
        {campaign.description && (
          <>
            <p
              id={descriptionId}
              ref={descriptionRef}
              className="text-body-secondary text-break mt-2 mb-1"
              style={isExpanded ? FULL_DESCRIPTION : CLAMPED_DESCRIPTION}
            >
              {campaign.description}
            </p>
            {(isClamped || isExpanded) && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 align-self-start"
                aria-controls={descriptionId}
                aria-expanded={isExpanded}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        )}
        {role === 'GM' && (
          <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
            <span className="text-break">
              Invite code: <strong>{campaign.inviteCode}</strong>
            </span>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={replaceInviteCode} disabled={isReplacingCode}>
              New code
            </button>
          </div>
        )}
        {codeError && (
          <div role="alert" className="alert alert-danger mt-2 mb-0 py-2 text-break">
            {codeError}
          </div>
        )}
        <div className="mt-auto pt-3">
          <Link className="btn btn-sm btn-outline-primary" to={`/campaigns/${campaign.id}/dice`}>
            Dice roller
          </Link>
        </div>
      </div>
    </div>
  );
}
