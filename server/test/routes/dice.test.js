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

function roll(member, campaign, expression) {
  return request(app).post(`/api/campaigns/${campaign.id}/rolls`).set('Authorization', member.auth).send({ expression });
}

test('a roll returns 201 with who rolled, each die and the total', async () => {
  const { sam, keep } = await tableWithPlayer();
  const res = await roll(sam, keep, '2d6+3');
  expect(res.status).toBe(201);
  expect(res.body).toEqual({
    id: expect.any(Number),
    campaignId: keep.id,
    userId: sam.user.id,
    displayName: 'sam',
    expression: '2d6+3',
    results: [expect.any(Number), expect.any(Number)],
    modifier: 3,
    total: res.body.results[0] + res.body.results[1] + 3,
    rolledAt: expect.any(String),
  });
});

test('2d6+3 always lands between 5 and 15', async () => {
  const { sam, keep } = await tableWithPlayer();
  for (let i = 0; i < 100; i += 1) {
    const { body } = await roll(sam, keep, '2d6+3');
    expect(body.results).toHaveLength(2);
    for (const die of body.results) expect(die).toBeGreaterThanOrEqual(1);
    for (const die of body.results) expect(die).toBeLessThanOrEqual(6);
    expect(body.total).toBe(body.results[0] + body.results[1] + 3);
    expect(body.total).toBeGreaterThanOrEqual(5);
    expect(body.total).toBeLessThanOrEqual(15);
  }
});

test.each([4, 6, 8, 10, 12, 20, 100])('every die of 100d%i stays between 1 and %i', async (sides) => {
  const { sam, keep } = await tableWithPlayer();
  const res = await roll(sam, keep, `100d${sides}`);
  expect(res.status).toBe(201);
  expect(res.body.results).toHaveLength(100);
  expect(Math.min(...res.body.results)).toBeGreaterThanOrEqual(1);
  expect(Math.max(...res.body.results)).toBeLessThanOrEqual(sides);
});

test('a negative modifier is subtracted from the total', async () => {
  const { sam, keep } = await tableWithPlayer();
  const { body } = await roll(sam, keep, '1d20-1');
  expect(body.modifier).toBe(-1);
  expect(body.total).toBe(body.results[0] - 1);
});

test.each(['', 'abc', '2d7', '0d6', '101d6', '2d6+', 'd', '1d20+1d6'])('bad notation %p returns 400', async (expression) => {
  const { sam, keep } = await tableWithPlayer();
  const res = await roll(sam, keep, expression);
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('rolling in a campaign you are not in returns 403', async () => {
  const { keep } = await tableWithPlayer();
  const ana = await signUp('ana');
  const res = await roll(ana, keep, '1d20');
  expect(res.status).toBe(403);
});

test('recent rolls come back newest first', async () => {
  const { mira, sam, keep } = await tableWithPlayer();
  await roll(sam, keep, '1d4');
  await roll(mira, keep, '1d6');
  await roll(sam, keep, '1d8');
  const res = await request(app).get(`/api/campaigns/${keep.id}/rolls?limit=20`).set('Authorization', mira.auth);
  expect(res.status).toBe(200);
  expect(res.body.map(({ displayName, expression }) => [displayName, expression])).toEqual([
    ['sam', '1d8'],
    ['mira', '1d6'],
    ['sam', '1d4'],
  ]);
});

test('the limit caps how many recent rolls come back', async () => {
  const { sam, keep } = await tableWithPlayer();
  await roll(sam, keep, '1d4');
  await roll(sam, keep, '1d6');
  const res = await request(app).get(`/api/campaigns/${keep.id}/rolls?limit=1`).set('Authorization', sam.auth);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].expression).toBe('1d6');
});

test.each(['0', '101', 'abc'])('a limit of %p returns 400', async (limit) => {
  const { sam, keep } = await tableWithPlayer();
  const res = await request(app).get(`/api/campaigns/${keep.id}/rolls?limit=${limit}`).set('Authorization', sam.auth);
  expect(res.status).toBe(400);
});

test('reading the rolls of a campaign you are not in returns 403', async () => {
  const { keep } = await tableWithPlayer();
  const ana = await signUp('ana');
  const res = await request(app).get(`/api/campaigns/${keep.id}/rolls`).set('Authorization', ana.auth);
  expect(res.status).toBe(403);
});
