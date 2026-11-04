import { useState } from 'react';
import { NoteCard } from './NoteCard';
import type { SessionNote } from './notes-api';
import './notes.css';

const NOTES_SHOWN = 6;

type NotesBoardProps = {
  notes: SessionNote[];
  canEdit: boolean;
};

export function NotesBoard({ notes, canEdit }: NotesBoardProps) {
  const [isShowingAll, setIsShowingAll] = useState(false);
  const shown = isShowingAll ? notes : notes.slice(0, NOTES_SHOWN);
  const hiddenCount = notes.length - shown.length;
  return (
    <>
      <div className="notes-board">
        {shown.map((note) => (
          <NoteCard key={note.id} note={note} canEdit={canEdit} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button type="button" className="pencil-btn older-notes" onClick={() => setIsShowingAll(true)}>
          {hiddenCount === 1 ? 'Show 1 older note' : `Show ${hiddenCount} older notes`}
        </button>
      )}
    </>
  );
}
