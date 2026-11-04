import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { errorText } from '../../api/http';
import { ClampedText } from '../../theme/ClampedText';
import { useAuth } from '../auth/auth-context';
import { CharacterSheet } from '../characters/CharacterSheet';
import { charactersApi, type Character } from '../characters/characters-api';
import { DiceTray } from '../dice/DiceTray';
import { NotesBoard } from '../notes/NotesBoard';
import { notesApi, type SessionNote } from '../notes/notes-api';
import { useCampaign } from './CampaignLayout';
import { InviteTicket } from './InviteTicket';
import { MemberLine } from './MemberLine';
import '../characters/characters.css';
import './ticket.css';
import './campaign-table.css';

const SHEETS_SHOWN = 6;

type TableData = {
  characters: Character[];
  notes: SessionNote[];
};

export function CampaignTablePage() {
  const { membership, members, onCampaignChange } = useCampaign();
  const { user } = useAuth();
  const location = useLocation();
  const campaign = membership.campaign;
  const isGm = membership.role === 'GM';
  const [data, setData] = useState<TableData | null>(null);
  const [error, setError] = useState('');
  const [isShowingAllSheets, setIsShowingAllSheets] = useState(false);
  const playerNames = useMemo(() => new Map(members.map((member) => [member.userId, member.displayName])), [members]);

  useEffect(() => {
    let isActive = true;
    Promise.all([charactersApi.list(campaign.id), notesApi.list(campaign.id)])
      .then(([characters, notes]) => {
        if (isActive) setData({ characters, notes });
      })
      .catch((caught: unknown) => {
        if (isActive) setError(errorText(caught));
      });
    return () => {
      isActive = false;
    };
  }, [campaign.id]);

  useEffect(() => {
    if (location.hash === '' || (data === null && location.hash !== '#dice')) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [data, location.hash, location.key]);

  const characters = data?.characters ?? [];
  const sheets = isShowingAllSheets ? characters : characters.slice(0, SHEETS_SHOWN);
  const hiddenSheets = characters.length - sheets.length;

  return (
    <div className="table-layout">
      <div className="table-main-col">
        <div className="campaign-head">
          <div className="taped-card campaign-card">
            <h1 className="marker campaign-name">{campaign.name}</h1>
            <div className="ruled-lines campaign-lines">
              {campaign.description.trim() !== '' && <ClampedText text={campaign.description} lines={4} className="pencil campaign-text" />}
              <MemberLine members={members} currentUserId={user?.id} />
            </div>
          </div>
          {isGm && <InviteTicket campaign={campaign} onCampaignChange={onCampaignChange} />}
        </div>

        {error ? (
          <div className="sticky-note lost-note">
            <p role="alert">{error}</p>
          </div>
        ) : data === null ? (
          <p className="on-wood-note table-loading">Laying out the character sheets...</p>
        ) : (
          <>
            <section id="party" className="table-section" aria-labelledby="party-title">
              <div className="group-head">
                <h2 id="party-title" className="tape tape-label">
                  The party
                </h2>
                <Link className="pencil-link" to="characters/new">
                  + New character
                </Link>
              </div>
              {characters.length === 0 ? (
                <div className="sticky-note empty-note">
                  <p>No characters yet. Make the first one.</p>
                </div>
              ) : (
                <>
                  <div className="sheets">
                    {sheets.map((character) => (
                      <CharacterSheet
                        key={character.id}
                        character={character}
                        playerName={playerNames.get(character.ownerId) ?? 'A former player'}
                        canEdit={isGm || character.ownerId === user?.id}
                      />
                    ))}
                  </div>
                  {hiddenSheets > 0 && (
                    <button type="button" className="pencil-btn more-sheets" onClick={() => setIsShowingAllSheets(true)}>
                      {hiddenSheets === 1 ? 'Show 1 more character' : `Show ${hiddenSheets} more characters`}
                    </button>
                  )}
                </>
              )}
            </section>

            <section id="notes" className="table-section" aria-labelledby="notes-title">
              <div className="group-head">
                <h2 id="notes-title" className="tape tape-label">
                  Session notes
                </h2>
                {isGm && (
                  <Link className="pencil-link" to="notes/new">
                    + Write a note
                  </Link>
                )}
              </div>
              {data.notes.length === 0 ? (
                <div className="sticky-note empty-note">
                  <p>{isGm ? 'No notes yet. Write one up after you play.' : "Your Game Master hasn't written any notes yet."}</p>
                </div>
              ) : (
                <NotesBoard notes={data.notes} canEdit={isGm} />
              )}
            </section>
          </>
        )}
      </div>
      <DiceTray campaignId={campaign.id} />
    </div>
  );
}
