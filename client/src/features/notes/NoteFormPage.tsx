import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorText } from '../../api/http';
import { useCampaign } from '../campaigns/CampaignLayout';
import { isDateText, todayText } from './note-dates';
import { NOTE_LIMITS, notesApi, type NoteFields } from './notes-api';
import './notes.css';

function blankNote(): NoteFields {
  return { title: '', body: '', sessionDate: todayText(), isGmOnly: false };
}

export function NoteFormPage() {
  const { noteId } = useParams();
  const { membership } = useCampaign();
  const navigate = useNavigate();
  const campaignId = membership.campaign.id;
  const isGm = membership.role === 'GM';
  const editingId = noteId === undefined ? undefined : Number(noteId);
  const [draft, setDraft] = useState<NoteFields>(blankNote);
  const [isLoading, setIsLoading] = useState(isGm && editingId !== undefined);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const backTo = `/campaigns/${campaignId}#notes`;

  useEffect(() => {
    if (!isGm || editingId === undefined) return;
    let isActive = true;
    notesApi
      .get(campaignId, editingId)
      .then((note) => {
        if (isActive) setDraft({ title: note.title, body: note.body, sessionDate: note.sessionDate, isGmOnly: note.isGmOnly });
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
  }, [campaignId, editingId, isGm]);

  function setField<Key extends keyof NoteFields>(key: Key, value: NoteFields[Key]) {
    setDraft((old) => ({ ...old, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    const fields = { ...draft, title: draft.title.trim(), body: draft.body.trim() };
    if (fields.title === '') {
      setError('Give the note a title.');
      return;
    }
    if (!isDateText(fields.sessionDate)) {
      setError('Pick the date you played.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingId === undefined) await notesApi.create(campaignId, fields);
      else await notesApi.update(campaignId, editingId, fields);
      navigate(backTo);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setIsSaving(false);
    }
  }

  const title = editingId === undefined ? 'New session note' : 'Edit session note';

  return (
    <div className="form-page">
      <h1 className="tape tape-label page-title">{title}</h1>
      {!isGm ? (
        <div className="sticky-note lost-note">
          <p role="alert">Only the Game Master can write session notes.</p>
          <Link className="pencil-link" to={backTo}>
            Back to the table
          </Link>
        </div>
      ) : isLoading ? (
        <p className="on-wood-note">Finding the note...</p>
      ) : (
        <form className="note-form" onSubmit={save} noValidate>
          <div className="note-form-head">
            <div className="note-form-title">
              <label className="field-label" htmlFor="noteTitle">
                Title
              </label>
              <input
                id="noteTitle"
                className="pencil-input"
                value={draft.title}
                maxLength={NOTE_LIMITS.title}
                onChange={(event) => setField('title', event.target.value)}
                required
              />
            </div>
            <div className="note-form-date">
              <label className="field-label" htmlFor="noteDate">
                Played on
              </label>
              <input
                id="noteDate"
                className="pencil-input"
                type="date"
                value={draft.sessionDate}
                onChange={(event) => setField('sessionDate', event.target.value)}
                required
              />
            </div>
          </div>
          <label className="field-label" htmlFor="noteBody">
            What happened
          </label>
          <textarea
            id="noteBody"
            className="pencil-input note-form-body"
            rows={10}
            value={draft.body}
            maxLength={NOTE_LIMITS.body}
            onChange={(event) => setField('body', event.target.value)}
          />
          <label className="note-form-secret">
            <input type="checkbox" checked={draft.isGmOnly} onChange={(event) => setField('isGmOnly', event.target.checked)} />
            <span className="pencil">Keep this note from the players</span>
          </label>
          {error && (
            <p role="alert" className="paper-alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="ink-btn" disabled={isSaving}>
              {editingId === undefined ? 'Pin it up' : 'Save the note'}
            </button>
            <Link className="pencil-link" to={backTo}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
