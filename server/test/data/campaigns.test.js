const { useTestDatabase } = require('../helpers/database');
const { query } = require('../../src/db/pool');
const { createUser } = require('../../src/data/users');
const campaigns = require('../../src/data/campaigns');
const { createCharacter } = require('../../src/data/characters');
const { createSessionNote } = require('../../src/data/session-notes');
const { saveDiceRoll } = require('../../src/data/dice-rolls');
const { AlreadyMemberError, InviteCodeTakenError } = require('../../src/data/errors');

useTestDatabase();

async function makeUser(name) {
  return createUser({ email: `${name}@example.com`, passwordHash: 'hash', displayName: name });
}

test('the creator of a campaign is its GM', async () => {
  const gm = await makeUser('mira');
  const campaign = await campaigns.createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: gm.id });
  expect(campaign).toMatchObject({ name: 'Sunken Keep', description: '', inviteCode: 'KEEP42' });
  expect(await campaigns.findRole(campaign.id, gm.id)).toBe('GM');
});

test('a player joins with the invite code', async () => {
  const gm = await makeUser('mira');
  const player = await makeUser('sam');
  const created = await campaigns.createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: gm.id });
  const found = await campaigns.findCampaignByInviteCode(' KEEP42 ');
  await campaigns.addPlayer(found.id, player.id);
  expect(found.id).toBe(created.id);
  expect(await campaigns.findRole(created.id, player.id)).toBe('PLAYER');
  expect((await campaigns.listMembers(created.id)).map((member) => [member.displayName, member.role])).toEqual([
    ['mira', 'GM'],
    ['sam', 'PLAYER'],
  ]);
});

test('an unknown invite code finds nothing', async () => {
  expect(await campaigns.findCampaignByInviteCode('NOPE00')).toBeUndefined();
});

test('joining the same campaign twice is rejected', async () => {
  const gm = await makeUser('mira');
  const player = await makeUser('sam');
  const campaign = await campaigns.createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: gm.id });
  await campaigns.addPlayer(campaign.id, player.id);
  await expect(campaigns.addPlayer(campaign.id, player.id)).rejects.toBeInstanceOf(AlreadyMemberError);
});

test('two campaigns cannot share an invite code', async () => {
  const gm = await makeUser('mira');
  await campaigns.createCampaign({ name: 'One', inviteCode: 'SAME01', gmUserId: gm.id });
  await expect(campaigns.createCampaign({ name: 'Two', inviteCode: 'SAME01', gmUserId: gm.id })).rejects.toBeInstanceOf(InviteCodeTakenError);
  expect(await campaigns.listCampaignsForUser(gm.id)).toHaveLength(1);
});

test('a campaign has only one GM', async () => {
  const gm = await makeUser('mira');
  const other = await makeUser('sam');
  const campaign = await campaigns.createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: gm.id });
  await expect(query("INSERT INTO memberships (user_id, campaign_id, role) VALUES ($1, $2, 'GM')", [other.id, campaign.id])).rejects.toMatchObject({
    code: '23505',
  });
});

test('the same person can be GM in one campaign and a player in another', async () => {
  const mira = await makeUser('mira');
  const sam = await makeUser('sam');
  const keep = await campaigns.createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: mira.id });
  const road = await campaigns.createCampaign({ name: 'Ash Road', inviteCode: 'ROAD77', gmUserId: sam.id });
  await campaigns.addPlayer(road.id, mira.id);
  expect((await campaigns.listCampaignsForUser(mira.id)).map((campaign) => [campaign.name, campaign.role])).toEqual([
    ['Ash Road', 'PLAYER'],
    ['Sunken Keep', 'GM'],
  ]);
  expect(keep.id).not.toBe(road.id);
});

test('a new invite code replaces the old one', async () => {
  const gm = await makeUser('mira');
  const campaign = await campaigns.createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: gm.id });
  await campaigns.replaceInviteCode(campaign.id, 'KEEP43');
  expect(await campaigns.findCampaignByInviteCode('KEEP42')).toBeUndefined();
  expect((await campaigns.findCampaignByInviteCode('KEEP43')).id).toBe(campaign.id);
});

test('deleting a campaign deletes its characters, notes, rolls and memberships', async () => {
  const gm = await makeUser('mira');
  const campaign = await campaigns.createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: gm.id });
  await createCharacter({ campaignId: campaign.id, ownerId: gm.id, name: 'Thorne' });
  await createSessionNote({ campaignId: campaign.id, authorId: gm.id, title: 'Session 1', sessionDate: '2026-10-17' });
  await saveDiceRoll({ campaignId: campaign.id, userId: gm.id, expression: '1d20', results: [7], modifier: 0, total: 7 });
  expect(await campaigns.deleteCampaign(campaign.id)).toBe(true);
  const { rows } = await query(
    'SELECT (SELECT count(*) FROM characters) + (SELECT count(*) FROM session_notes) + (SELECT count(*) FROM dice_rolls) + (SELECT count(*) FROM memberships) AS left_over'
  );
  expect(Number(rows[0].left_over)).toBe(0);
});

test('rejects a campaign name longer than 80 characters', async () => {
  const gm = await makeUser('mira');
  await expect(campaigns.createCampaign({ name: 'x'.repeat(81), inviteCode: 'LONG01', gmUserId: gm.id })).rejects.toMatchObject({ code: '23514' });
  expect(await campaigns.listCampaignsForUser(gm.id)).toEqual([]);
});
