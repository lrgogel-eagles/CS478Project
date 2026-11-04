const { useTestDatabase } = require('../helpers/database');
const { createUser } = require('../../src/data/users');
const { createCampaign } = require('../../src/data/campaigns');
const characters = require('../../src/data/characters');

useTestDatabase();

async function setUp() {
  const owner = await createUser({ email: 'sam@example.com', passwordHash: 'hash', displayName: 'Sam' });
  const campaign = await createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: owner.id });
  return { owner, campaign };
}

test('a new character starts at level 1 with 10 in every ability', async () => {
  const { owner, campaign } = await setUp();
  const character = await characters.createCharacter({ campaignId: campaign.id, ownerId: owner.id, name: 'Thorne' });
  expect(character).toMatchObject({ level: 1, gold: 0, race: '', charClass: '', ownerId: owner.id, campaignId: campaign.id });
  expect(character.abilityScores).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
});

test('updates only the fields it is given', async () => {
  const { owner, campaign } = await setUp();
  const created = await characters.createCharacter({ campaignId: campaign.id, ownerId: owner.id, name: 'Thorne', charClass: 'Fighter' });
  const scores = { str: 16, dex: 12, con: 15, int: 8, wis: 11, cha: 10 };
  const updated = await characters.updateCharacter(created.id, { level: 3, hitPoints: 31, abilityScores: scores });
  expect(updated).toMatchObject({ name: 'Thorne', charClass: 'Fighter', level: 3, hitPoints: 31, abilityScores: scores });
});

test('refuses fields that are not on the character sheet', async () => {
  const { owner, campaign } = await setUp();
  const created = await characters.createCharacter({ campaignId: campaign.id, ownerId: owner.id, name: 'Thorne' });
  await expect(characters.updateCharacter(created.id, { ownerId: 999 })).rejects.toThrow('Character field "ownerId" can\'t be set');
});

test('rejects a level above 20', async () => {
  const { owner, campaign } = await setUp();
  const created = await characters.createCharacter({ campaignId: campaign.id, ownerId: owner.id, name: 'Thorne' });
  await expect(characters.updateCharacter(created.id, { level: 21 })).rejects.toMatchObject({ code: '23514' });
});

test('rejects a name longer than 60 characters', async () => {
  const { owner, campaign } = await setUp();
  await expect(characters.createCharacter({ campaignId: campaign.id, ownerId: owner.id, name: 'x'.repeat(61) })).rejects.toMatchObject({ code: '23514' });
});

test('updating a character that does not exist returns undefined', async () => {
  expect(await characters.updateCharacter(12345, { level: 2 })).toBeUndefined();
});

test('lists a campaign\'s characters by name', async () => {
  const { owner, campaign } = await setUp();
  await characters.createCharacter({ campaignId: campaign.id, ownerId: owner.id, name: 'Thorne' });
  await characters.createCharacter({ campaignId: campaign.id, ownerId: owner.id, name: 'Pip' });
  expect((await characters.listCharactersInCampaign(campaign.id)).map((character) => character.name)).toEqual(['Pip', 'Thorne']);
});
