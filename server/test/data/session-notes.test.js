const { useTestDatabase } = require('../helpers/database');
const { createUser } = require('../../src/data/users');
const { createCampaign } = require('../../src/data/campaigns');
const notes = require('../../src/data/session-notes');

useTestDatabase();

async function setUp() {
  const gm = await createUser({ email: 'mira@example.com', passwordHash: 'hash', displayName: 'Mira' });
  const campaign = await createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: gm.id });
  await notes.createSessionNote({ campaignId: campaign.id, authorId: gm.id, title: 'Session 1', sessionDate: '2026-10-17' });
  await notes.createSessionNote({ campaignId: campaign.id, authorId: gm.id, title: 'Session 2', sessionDate: '2026-10-24' });
  await notes.createSessionNote({ campaignId: campaign.id, authorId: gm.id, title: 'Secret', sessionDate: '2026-10-24', isGmOnly: true });
  return { gm, campaign };
}

test('players do not get GM-only notes', async () => {
  const { campaign } = await setUp();
  const titles = (await notes.listSessionNotes(campaign.id, { includeGmOnly: false })).map((note) => note.title);
  expect(titles).toEqual(['Session 2', 'Session 1']);
});

test('the GM gets every note, newest session first', async () => {
  const { campaign } = await setUp();
  const titles = (await notes.listSessionNotes(campaign.id, { includeGmOnly: true })).map((note) => note.title);
  expect(titles).toEqual(['Secret', 'Session 2', 'Session 1']);
});

test('listing notes without saying who is asking is an error', async () => {
  const { campaign } = await setUp();
  await expect(notes.listSessionNotes(campaign.id, {})).rejects.toBeInstanceOf(TypeError);
});

test('session dates come back as plain dates', async () => {
  const { campaign } = await setUp();
  const [newest] = await notes.listSessionNotes(campaign.id, { includeGmOnly: false });
  expect(newest.sessionDate).toBe('2026-10-24');
});

test('a GM can share a note that was GM-only', async () => {
  const { campaign } = await setUp();
  const [secret] = await notes.listSessionNotes(campaign.id, { includeGmOnly: true });
  const hidden = await notes.listSessionNotes(campaign.id, { includeGmOnly: false });
  expect(hidden.map((note) => note.title)).not.toContain('Secret');
  await notes.updateSessionNote(secret.id, { isGmOnly: false, body: 'Now the players know.' });
  const shared = await notes.listSessionNotes(campaign.id, { includeGmOnly: false });
  expect(shared.map((note) => note.title)).toContain('Secret');
});

test('rejects a note title longer than 120 characters', async () => {
  const { gm, campaign } = await setUp();
  await expect(notes.createSessionNote({ campaignId: campaign.id, authorId: gm.id, title: 'x'.repeat(121), sessionDate: '2026-10-31' })).rejects.toMatchObject({
    code: '23514',
  });
});
