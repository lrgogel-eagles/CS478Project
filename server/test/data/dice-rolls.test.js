const { useTestDatabase } = require('../helpers/database');
const { createUser } = require('../../src/data/users');
const { createCampaign } = require('../../src/data/campaigns');
const { saveDiceRoll, listRecentRolls } = require('../../src/data/dice-rolls');

useTestDatabase();

async function setUp() {
  const player = await createUser({ email: 'sam@example.com', passwordHash: 'hash', displayName: 'Sam' });
  const campaign = await createCampaign({ name: 'Sunken Keep', inviteCode: 'KEEP42', gmUserId: player.id });
  return { player, campaign };
}

test('saves each die and the total with the roller\'s name', async () => {
  const { player, campaign } = await setUp();
  const roll = await saveDiceRoll({ campaignId: campaign.id, userId: player.id, expression: '2d6+3', results: [4, 6], modifier: 3, total: 13 });
  expect(roll).toMatchObject({ expression: '2d6+3', results: [4, 6], modifier: 3, total: 13, displayName: 'Sam' });
});

test('recent rolls come newest first and stop at the limit', async () => {
  const { player, campaign } = await setUp();
  for (const total of [1, 2, 3]) {
    await saveDiceRoll({ campaignId: campaign.id, userId: player.id, expression: '1d4', results: [total], modifier: 0, total });
  }
  const recent = await listRecentRolls(campaign.id, 2);
  expect(recent.map((roll) => roll.total)).toEqual([3, 2]);
});

test('rejects a limit outside 1 to 100', async () => {
  const { campaign } = await setUp();
  await expect(listRecentRolls(campaign.id, 0)).rejects.toBeInstanceOf(RangeError);
  await expect(listRecentRolls(campaign.id, 101)).rejects.toBeInstanceOf(RangeError);
});

test('rejects a roll of more than 100 dice', async () => {
  const { player, campaign } = await setUp();
  const results = Array.from({ length: 101 }, () => 1);
  await expect(saveDiceRoll({ campaignId: campaign.id, userId: player.id, expression: '101d4', results, modifier: 0, total: 101 })).rejects.toMatchObject({
    code: '23514',
  });
});
