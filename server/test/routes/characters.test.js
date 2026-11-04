const request = require('supertest');
const { useTestDatabase } = require('../helpers/database');
const { app, signUp, startCampaign, joinCampaign } = require('../helpers/accounts');

useTestDatabase();

const thorne = {
  name: 'Thorne',
  race: 'Dwarf',
  charClass: 'Fighter',
  level: 3,
  hitPoints: 31,
  abilityScores: { str: 16, dex: 12, con: 15, int: 8, wis: 11, cha: 10 },
  gold: 45,
};

async function tableWithTwoPlayers() {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const alex = await signUp('alex');
  const keep = await startCampaign(mira);
  await joinCampaign(sam, keep);
  await joinCampaign(alex, keep);
  return { mira, sam, alex, keep };
}

function charactersPath(campaign) {
  return `/api/campaigns/${campaign.id}/characters`;
}

function createCharacter(member, campaign, body) {
  return request(app).post(charactersPath(campaign)).set('Authorization', member.auth).send(body);
}

function editCharacter(member, campaign, character, body) {
  return request(app).patch(`${charactersPath(campaign)}/${character.id}`).set('Authorization', member.auth).send(body);
}

test('a player creates a character with a full sheet and owns it', async () => {
  const { sam, keep } = await tableWithTwoPlayers();
  const res = await createCharacter(sam, keep, thorne);
  expect(res.status).toBe(201);
  expect(res.body).toEqual({ id: expect.any(Number), campaignId: keep.id, ownerId: sam.user.id, ...thorne, updatedAt: expect.any(String) });
});

test('a character with only a name starts at level 1 with 10 in every ability', async () => {
  const { sam, keep } = await tableWithTwoPlayers();
  const res = await createCharacter(sam, keep, { name: '  Pip  ' });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ name: 'Pip', race: '', charClass: '', level: 1, hitPoints: 0, gold: 0 });
  expect(res.body.abilityScores).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
});

test('everyone in the campaign sees its characters, sorted by name', async () => {
  const { mira, sam, alex, keep } = await tableWithTwoPlayers();
  await createCharacter(sam, keep, thorne);
  await createCharacter(alex, keep, { name: 'Pip' });
  for (const member of [mira, sam, alex]) {
    const res = await request(app).get(charactersPath(keep)).set('Authorization', member.auth);
    expect(res.status).toBe(200);
    expect(res.body.map((character) => character.name)).toEqual(['Pip', 'Thorne']);
  }
});

test('a member can open one character', async () => {
  const { mira, sam, keep } = await tableWithTwoPlayers();
  const { body: created } = await createCharacter(sam, keep, thorne);
  const res = await request(app).get(`${charactersPath(keep)}/${created.id}`).set('Authorization', mira.auth);
  expect(res.status).toBe(200);
  expect(res.body).toEqual(created);
});

test('the owner edits their character and only the sent fields change', async () => {
  const { sam, keep } = await tableWithTwoPlayers();
  const { body: created } = await createCharacter(sam, keep, thorne);
  const res = await editCharacter(sam, keep, created, { level: 4, hitPoints: 38 });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ...created, level: 4, hitPoints: 38, updatedAt: expect.any(String) });
});

test("the GM can edit a player's character", async () => {
  const { mira, sam, keep } = await tableWithTwoPlayers();
  const { body: created } = await createCharacter(sam, keep, thorne);
  const res = await editCharacter(mira, keep, created, { gold: 0 });
  expect(res.status).toBe(200);
  expect(res.body.gold).toBe(0);
  expect(res.body.ownerId).toBe(sam.user.id);
});

test("another player can't edit your character and it stays the same", async () => {
  const { sam, alex, keep } = await tableWithTwoPlayers();
  const { body: created } = await createCharacter(sam, keep, thorne);
  const res = await editCharacter(alex, keep, created, { gold: 999999 });
  expect(res.status).toBe(403);
  expect(res.body).toEqual({ error: "Only the character's owner or the GM can edit it" });
  const after = await request(app).get(`${charactersPath(keep)}/${created.id}`).set('Authorization', sam.auth);
  expect(after.body.gold).toBe(45);
});

test("someone outside the campaign can't list, create or open its characters", async () => {
  const { sam, keep } = await tableWithTwoPlayers();
  const { body: created } = await createCharacter(sam, keep, thorne);
  const outsider = await signUp('outsider');
  const list = await request(app).get(charactersPath(keep)).set('Authorization', outsider.auth);
  const create = await createCharacter(outsider, keep, { name: 'Spy' });
  const open = await request(app).get(`${charactersPath(keep)}/${created.id}`).set('Authorization', outsider.auth);
  expect([list.status, create.status, open.status]).toEqual([403, 403, 403]);
});

test("a character can't be reached through another campaign", async () => {
  const { mira, sam, keep } = await tableWithTwoPlayers();
  const { body: created } = await createCharacter(sam, keep, thorne);
  const other = await startCampaign(sam, 'Other Table');
  const open = await request(app).get(`${charactersPath(other)}/${created.id}`).set('Authorization', sam.auth);
  const edit = await editCharacter(sam, other, created, { level: 20 });
  expect(open.status).toBe(404);
  expect(edit.status).toBe(404);
  const list = await request(app).get(charactersPath(other)).set('Authorization', sam.auth);
  expect(list.body).toEqual([]);
  const after = await request(app).get(`${charactersPath(keep)}/${created.id}`).set('Authorization', mira.auth);
  expect(after.body.level).toBe(3);
});

test.each(['0', 'abc', '99999999999', '12345'])('opening character %s returns 404', async (id) => {
  const { sam, keep } = await tableWithTwoPlayers();
  const res = await request(app).get(`${charactersPath(keep)}/${id}`).set('Authorization', sam.auth);
  expect(res.status).toBe(404);
});

test.each([
  ['no name', {}],
  ['an empty name', { name: '   ' }],
  ['a name over 60 characters', { name: 'n'.repeat(61) }],
  ['a race over 40 characters', { name: 'Thorne', race: 'r'.repeat(41) }],
  ['a class over 40 characters', { name: 'Thorne', charClass: 'c'.repeat(41) }],
  ['level 0', { name: 'Thorne', level: 0 }],
  ['level 21', { name: 'Thorne', level: 21 }],
  ['a fractional level', { name: 'Thorne', level: 2.5 }],
  ['a level sent as text', { name: 'Thorne', level: '3' }],
  ['hit points below -999', { name: 'Thorne', hitPoints: -1000 }],
  ['hit points above 9999', { name: 'Thorne', hitPoints: 10000 }],
  ['negative gold', { name: 'Thorne', gold: -1 }],
  ['more gold than the database holds', { name: 'Thorne', gold: 2147483648 }],
  ['a missing ability', { name: 'Thorne', abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10 } }],
  ['an extra ability', { name: 'Thorne', abilityScores: { ...thorne.abilityScores, luck: 10 } }],
  ['an ability of 0', { name: 'Thorne', abilityScores: { ...thorne.abilityScores, str: 0 } }],
  ['an ability of 31', { name: 'Thorne', abilityScores: { ...thorne.abilityScores, cha: 31 } }],
  ['ability scores as a list', { name: 'Thorne', abilityScores: [10, 10, 10, 10, 10, 10] }],
  ['a field that is not on the sheet', { name: 'Thorne', ownerId: 1 }],
])('creating a character with %s returns 400', async (_, body) => {
  const { sam, keep } = await tableWithTwoPlayers();
  const res = await createCharacter(sam, keep, body);
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('editing a character with no fields returns 400', async () => {
  const { sam, keep } = await tableWithTwoPlayers();
  const { body: created } = await createCharacter(sam, keep, thorne);
  const res = await editCharacter(sam, keep, created, {});
  expect(res.status).toBe(400);
});

test("editing can't move a character to another owner or campaign", async () => {
  const { sam, alex, keep } = await tableWithTwoPlayers();
  const { body: created } = await createCharacter(sam, keep, thorne);
  for (const body of [{ ownerId: alex.user.id }, { campaignId: 999 }]) {
    const res = await editCharacter(sam, keep, created, body);
    expect(res.status).toBe(400);
  }
});

test('a character sheet at every upper limit is saved as sent', async () => {
  const { sam, keep } = await tableWithTwoPlayers();
  const sheet = {
    name: 'n'.repeat(60),
    race: 'r'.repeat(40),
    charClass: 'c'.repeat(40),
    level: 20,
    hitPoints: 9999,
    abilityScores: { str: 30, dex: 30, con: 30, int: 30, wis: 30, cha: 30 },
    gold: 2147483647,
  };
  const res = await createCharacter(sam, keep, sheet);
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject(sheet);
});
