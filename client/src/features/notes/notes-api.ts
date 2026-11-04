import { isBoolean, isInteger, isObject, isText, readList, readOne } from '../../api/guards';
import { send } from '../../api/http';

export type SessionNote = {
  id: number;
  campaignId: number;
  authorId: number;
  title: string;
  body: string;
  sessionDate: string;
  isGmOnly: boolean;
  updatedAt: string;
};

export type NoteFields = Pick<SessionNote, 'title' | 'body' | 'sessionDate' | 'isGmOnly'>;

export const NOTE_LIMITS = {
  title: 120,
  body: 20000,
} as const;

const ROUTES = {
  notes: (campaignId: number) => `/api/campaigns/${campaignId}/notes`,
  note: (campaignId: number, id: number) => `/api/campaigns/${campaignId}/notes/${id}`,
} as const;

function isSessionNote(value: unknown): value is SessionNote {
  return (
    isObject(value) &&
    isInteger(value.id) &&
    isInteger(value.campaignId) &&
    isInteger(value.authorId) &&
    isText(value.title) &&
    isText(value.body) &&
    isText(value.sessionDate) &&
    isBoolean(value.isGmOnly) &&
    isText(value.updatedAt)
  );
}

export const notesApi = {
  list: (campaignId: number) => send('GET', ROUTES.notes(campaignId)).then((data) => readList(data, isSessionNote, 'note list')),
  get: (campaignId: number, id: number) => send('GET', ROUTES.note(campaignId, id)).then((data) => readOne(data, isSessionNote, 'note')),
  create: (campaignId: number, fields: NoteFields) => send('POST', ROUTES.notes(campaignId), fields).then((data) => readOne(data, isSessionNote, 'note')),
  update: (campaignId: number, id: number, fields: NoteFields) =>
    send('PATCH', ROUTES.note(campaignId, id), fields).then((data) => readOne(data, isSessionNote, 'note')),
};
