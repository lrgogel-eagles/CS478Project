import { Link } from 'react-router-dom';
import { ClampedText } from '../../theme/ClampedText';
import { formatSessionDate } from './note-dates';
import type { SessionNote } from './notes-api';

const BODY_LINES = 6;

type NoteCardProps = {
  note: SessionNote;
  canEdit: boolean;
};

export function NoteCard({ note, canEdit }: NoteCardProps) {
  const titleId = `note-${note.id}`;
  return (
    <article className="note-card" data-gm-only={note.isGmOnly ? 'true' : undefined} aria-labelledby={titleId}>
      <div className="note-head">
        <h3 id={titleId} className="pencil note-title">
          {note.title}
        </h3>
        <time className="note-date" dateTime={note.sessionDate}>
          {formatSessionDate(note.sessionDate)}
        </time>
      </div>
      <div className="ruled-lines note-lines">
        {note.body.trim() !== '' && <ClampedText text={note.body} lines={BODY_LINES} className="pencil note-body" />}
        {(note.isGmOnly || canEdit) && (
          <div className="note-foot">
            {note.isGmOnly && <span className="note-secret">Only you can see this note.</span>}
            {canEdit && (
              <Link className="pencil-link note-edit" to={`notes/${note.id}`} aria-label={`Edit ${note.title}`}>
                Edit
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
