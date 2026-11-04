const express = require('express');
const { createSessionNote, findSessionNoteById, listSessionNotes, updateSessionNote } = require('../data/session-notes');
const { HttpError } = require('../http/errors');
const { readBoolean, readDate, readFields, readId, readOptionalText, readText } = require('../http/input');
const { requireMember } = require('./membership');

const TITLE_MAX_LENGTH = 120;
const BODY_MAX_LENGTH = 20000;

const NOTE_FIELDS = new Map([
  ['title', (value) => readText(value, 'Title', TITLE_MAX_LENGTH)],
  ['body', (value) => readOptionalText(value, 'Body', BODY_MAX_LENGTH)],
  ['sessionDate', (value) => readDate(value, 'Session date')],
  ['isGmOnly', (value) => readBoolean(value, 'isGmOnly')],
]);

const router = express.Router({ mergeParams: true });

function isGm(req) {
  return req.membership.role === 'GM';
}

function requireGm(req, action) {
  if (!isGm(req)) {
    throw new HttpError(403, `Only the GM can ${action}`);
  }
}

async function findNoteInCampaign(req) {
  const id = readId(req.params.noteId);
  const note = id === undefined ? undefined : await findSessionNoteById(id);
  if (!note || note.campaignId !== req.membership.campaign.id || (note.isGmOnly && !isGm(req))) {
    throw new HttpError(404, 'Session note not found');
  }
  return note;
}

router.get('/', requireMember, async (req, res) => {
  res.json(await listSessionNotes(req.membership.campaign.id, { includeGmOnly: isGm(req) }));
});

router.post('/', requireMember, async (req, res) => {
  requireGm(req, 'write session notes');
  const fields = readFields(req.body ?? {}, NOTE_FIELDS, 'session note');
  if (fields.title === undefined) {
    throw new HttpError(400, 'Title is required');
  }
  if (fields.sessionDate === undefined) {
    throw new HttpError(400, 'Session date is required');
  }
  const note = await createSessionNote({ campaignId: req.membership.campaign.id, authorId: req.user.id, ...fields });
  res.status(201).json(note);
});

router.get('/:noteId', requireMember, async (req, res) => {
  res.json(await findNoteInCampaign(req));
});

router.patch('/:noteId', requireMember, async (req, res) => {
  requireGm(req, 'edit session notes');
  const note = await findNoteInCampaign(req);
  const changes = readFields(req.body ?? {}, NOTE_FIELDS, 'session note');
  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, 'Send at least one field to change');
  }
  const updated = await updateSessionNote(note.id, changes);
  if (!updated) {
    throw new HttpError(404, 'Session note not found');
  }
  res.json(updated);
});

module.exports = router;
