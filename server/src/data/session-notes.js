const { query } = require('../db/pool');
const { buildUpdate } = require('./columns');

const EDITABLE_COLUMNS = new Map([
  ['title', 'title'],
  ['body', 'body'],
  ['sessionDate', 'session_date'],
  ['isGmOnly', 'is_gm_only'],
]);

function toSessionNote(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    sessionDate: row.session_date,
    isGmOnly: row.is_gm_only,
    updatedAt: row.updated_at,
  };
}

async function createSessionNote({ campaignId, authorId, title, body = '', sessionDate, isGmOnly = false }) {
  const { rows } = await query(
    `INSERT INTO session_notes (campaign_id, author_id, title, body, session_date, is_gm_only)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [campaignId, authorId, title.trim(), body, sessionDate, isGmOnly]
  );
  return toSessionNote(rows[0]);
}

async function findSessionNoteById(id) {
  const { rows } = await query('SELECT * FROM session_notes WHERE id = $1', [id]);
  return rows.length > 0 ? toSessionNote(rows[0]) : undefined;
}

async function listSessionNotes(campaignId, { includeGmOnly }) {
  if (typeof includeGmOnly !== 'boolean') {
    throw new TypeError('listSessionNotes needs includeGmOnly set to true (GM) or false (player).');
  }
  const { rows } = await query(
    `SELECT * FROM session_notes
     WHERE campaign_id = $1 AND ($2 OR NOT is_gm_only)
     ORDER BY session_date DESC, id DESC`,
    [campaignId, includeGmOnly]
  );
  return rows.map(toSessionNote);
}

async function updateSessionNote(id, changes) {
  const update = buildUpdate('session_notes', id, changes, EDITABLE_COLUMNS, 'Session note');
  if (update === undefined) {
    return findSessionNoteById(id);
  }
  const { rows } = await query(update.text, update.values);
  return rows.length > 0 ? toSessionNote(rows[0]) : undefined;
}

module.exports = { createSessionNote, findSessionNoteById, listSessionNotes, updateSessionNote };
