const request = require('supertest');
const { useTestDatabase } = require('../helpers/database');
const { app, signUp, startCampaign, joinCampaign } = require('../helpers/accounts');

useTestDatabase();

async function tableWithPlayer() {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const keep = await startCampaign(mira);
  await joinCampaign(sam, keep);
  return { mira, sam, keep };
}

function notesPath(campaign) {
  return `/api/campaigns/${campaign.id}/notes`;
}

function writeNote(member, campaign, body) {
  return request(app).post(notesPath(campaign)).set('Authorization', member.auth).send(body);
}

function editNote(member, campaign, note, body) {
  return request(app).patch(`${notesPath(campaign)}/${note.id}`).set('Authorization', member.auth).send(body);
}

function listNotes(member, campaign) {
  return request(app).get(notesPath(campaign)).set('Authorization', member.auth);
}

test('the GM writes a session note and gets it back', async () => {
  const { mira, keep } = await tableWithPlayer();
  const res = await writeNote(mira, keep, { title: ' Session 1 ', body: 'The party reached the gate.', sessionDate: '2026-10-17' });
  expect(res.status).toBe(201);
  expect(res.body).toEqual({
    id: expect.any(Number),
    campaignId: keep.id,
    authorId: mira.user.id,
    title: 'Session 1',
    body: 'The party reached the gate.',
    sessionDate: '2026-10-17',
    isGmOnly: false,
    updatedAt: expect.any(String),
  });
});

test('players only see shared notes, and the GM sees all of them newest first', async () => {
  const { mira, sam, keep } = await tableWithPlayer();
  await writeNote(mira, keep, { title: 'Session 1', sessionDate: '2026-10-17' });
  await writeNote(mira, keep, { title: 'Session 2', sessionDate: '2026-10-24' });
  await writeNote(mira, keep, { title: 'Who the traitor is', sessionDate: '2026-10-24', isGmOnly: true });
  const gm = await listNotes(mira, keep);
  const player = await listNotes(sam, keep);
  expect(gm.status).toBe(200);
  expect(gm.body.map((note) => note.title)).toEqual(['Who the traitor is', 'Session 2', 'Session 1']);
  expect(player.status).toBe(200);
  expect(player.body.map((note) => note.title)).toEqual(['Session 2', 'Session 1']);
});

test("a player can't open a GM-only note, but the GM can", async () => {
  const { mira, sam, keep } = await tableWithPlayer();
  const { body: secret } = await writeNote(mira, keep, { title: 'Who the traitor is', sessionDate: '2026-10-24', isGmOnly: true });
  const player = await request(app).get(`${notesPath(keep)}/${secret.id}`).set('Authorization', sam.auth);
  const gm = await request(app).get(`${notesPath(keep)}/${secret.id}`).set('Authorization', mira.auth);
  expect(player.status).toBe(404);
  expect(JSON.stringify(player.body)).not.toContain('traitor');
  expect(gm.status).toBe(200);
  expect(gm.body.title).toBe('Who the traitor is');
});

test('a player can open a shared note', async () => {
  const { mira, sam, keep } = await tableWithPlayer();
  const { body: note } = await writeNote(mira, keep, { title: 'Session 1', sessionDate: '2026-10-17' });
  const res = await request(app).get(`${notesPath(keep)}/${note.id}`).set('Authorization', sam.auth);
  expect(res.status).toBe(200);
  expect(res.body).toEqual(note);
});

test('the GM edits a note and sharing it shows it to players', async () => {
  const { mira, sam, keep } = await tableWithPlayer();
  const { body: note } = await writeNote(mira, keep, { title: 'Draft', sessionDate: '2026-10-31', isGmOnly: true });
  const res = await editNote(mira, keep, note, { title: 'Session 3', body: 'The keep flooded.', isGmOnly: false });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ...note, title: 'Session 3', body: 'The keep flooded.', isGmOnly: false, updatedAt: expect.any(String) });
  const player = await listNotes(sam, keep);
  expect(player.body.map((shared) => shared.title)).toEqual(['Session 3']);
});

test("a player can't write or edit notes", async () => {
  const { mira, sam, keep } = await tableWithPlayer();
  const { body: note } = await writeNote(mira, keep, { title: 'Session 1', sessionDate: '2026-10-17' });
  const write = await writeNote(sam, keep, { title: 'My notes', sessionDate: '2026-10-17' });
  const edit = await editNote(sam, keep, note, { title: 'Hacked' });
  expect(write.status).toBe(403);
  expect(write.body).toEqual({ error: 'Only the GM can write session notes' });
  expect(edit.status).toBe(403);
  expect(edit.body).toEqual({ error: 'Only the GM can edit session notes' });
  const after = await listNotes(mira, keep);
  expect(after.body.map((saved) => saved.title)).toEqual(['Session 1']);
});

test("someone outside the campaign can't list its notes", async () => {
  const { mira, keep } = await tableWithPlayer();
  await writeNote(mira, keep, { title: 'Session 1', sessionDate: '2026-10-17' });
  const outsider = await signUp('outsider');
  const res = await listNotes(outsider, keep);
  expect(res.status).toBe(403);
});

test("a note can't be reached through another campaign", async () => {
  const { mira, keep } = await tableWithPlayer();
  const { body: note } = await writeNote(mira, keep, { title: 'Session 1', sessionDate: '2026-10-17' });
  const other = await startCampaign(mira, 'Other Table');
  const open = await request(app).get(`${notesPath(other)}/${note.id}`).set('Authorization', mira.auth);
  const edit = await editNote(mira, other, note, { title: 'Moved' });
  expect(open.status).toBe(404);
  expect(edit.status).toBe(404);
});

test.each(['0', 'abc', '99999999999', '12345'])('opening note %s returns 404', async (id) => {
  const { mira, keep } = await tableWithPlayer();
  const res = await request(app).get(`${notesPath(keep)}/${id}`).set('Authorization', mira.auth);
  expect(res.status).toBe(404);
});

test.each([
  ['no title', { sessionDate: '2026-10-17' }],
  ['a blank title', { title: '   ', sessionDate: '2026-10-17' }],
  ['a title over 120 characters', { title: 't'.repeat(121), sessionDate: '2026-10-17' }],
  ['a body over 20000 characters', { title: 'Session 1', body: 'b'.repeat(20001), sessionDate: '2026-10-17' }],
  ['no session date', { title: 'Session 1' }],
  ['February 30th', { title: 'Session 1', sessionDate: '2026-02-30' }],
  ['a date in another format', { title: 'Session 1', sessionDate: '10/17/2026' }],
  ['a date with a time', { title: 'Session 1', sessionDate: '2026-10-17T19:00:00Z' }],
  ['GM-only sent as text', { title: 'Session 1', sessionDate: '2026-10-17', isGmOnly: 'yes' }],
  ['a field that is not on a note', { title: 'Session 1', sessionDate: '2026-10-17', authorId: 1 }],
])('writing a note with %s returns 400', async (_, body) => {
  const { mira, keep } = await tableWithPlayer();
  const res = await writeNote(mira, keep, body);
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('a note at the title and body limits is saved as sent', async () => {
  const { mira, keep } = await tableWithPlayer();
  const res = await writeNote(mira, keep, { title: 't'.repeat(120), body: 'b'.repeat(20000), sessionDate: '2026-02-28' });
  expect(res.status).toBe(201);
  expect(res.body.title).toHaveLength(120);
  expect(res.body.body).toHaveLength(20000);
});

test('editing a note with no fields returns 400', async () => {
  const { mira, keep } = await tableWithPlayer();
  const { body: note } = await writeNote(mira, keep, { title: 'Session 1', sessionDate: '2026-10-17' });
  const res = await editNote(mira, keep, note, {});
  expect(res.status).toBe(400);
});
