const request = require('supertest');
const { useTestDatabase } = require('../helpers/database');
const { app, signUp, startCampaign, joinCampaign } = require('../helpers/accounts');

useTestDatabase();

const campaignShape = {
  id: expect.any(Number),
  name: 'Sunken Keep',
  description: '',
  inviteCode: expect.any(String),
  createdAt: expect.any(String),
};

test('creating a campaign returns 201 with the campaign and makes you its GM', async () => {
  const mira = await signUp('mira');
  const res = await request(app).post('/api/campaigns').set('Authorization', mira.auth).send({ name: 'Sunken Keep' });
  expect(res.status).toBe(201);
  expect(res.body).toEqual({ campaign: campaignShape, role: 'GM' });
  expect(res.body.campaign.inviteCode).not.toBe('');
});

test('a campaign keeps the description it was created with', async () => {
  const mira = await signUp('mira');
  const res = await request(app)
    .post('/api/campaigns')
    .set('Authorization', mira.auth)
    .send({ name: 'Sunken Keep', description: 'A drowned fortress.' });
  expect(res.status).toBe(201);
  expect(res.body.campaign.description).toBe('A drowned fortress.');
});

test.each([
  ['no name', {}],
  ['an empty name', { name: '' }],
  ['a name over 80 characters', { name: 'k'.repeat(81) }],
  ['a description over 2000 characters', { name: 'Sunken Keep', description: 'd'.repeat(2001) }],
])('creating a campaign with %s returns 400', async (_, body) => {
  const mira = await signUp('mira');
  const res = await request(app).post('/api/campaigns').set('Authorization', mira.auth).send(body);
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('each new campaign gets its own invite code', async () => {
  const mira = await signUp('mira');
  const first = await startCampaign(mira, 'Sunken Keep');
  const second = await startCampaign(mira, 'Ashen Road');
  expect(first.inviteCode).not.toBe(second.inviteCode);
});

test('the campaign list shows only your campaigns, each with your role', async () => {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const keep = await startCampaign(mira, 'Sunken Keep');
  await startCampaign(sam, 'Ashen Road');
  const tower = await startCampaign(sam, 'Glass Tower');
  await joinCampaign(mira, tower);
  const res = await request(app).get('/api/campaigns').set('Authorization', mira.auth);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.map(({ name, role }) => [name, role]).sort()).toEqual([
    ['Glass Tower', 'PLAYER'],
    ['Sunken Keep', 'GM'],
  ]);
  expect(res.body.find((item) => item.id === keep.id)).toEqual({ ...keep, role: 'GM' });
});

test('joining with a good invite code returns 201 and makes you a player', async () => {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const keep = await startCampaign(mira);
  const res = await request(app).post('/api/campaigns/join').set('Authorization', sam.auth).send({ inviteCode: keep.inviteCode });
  expect(res.status).toBe(201);
  expect(res.body).toEqual({ campaign: keep, role: 'PLAYER' });
});

test('joining with an unknown invite code returns 404', async () => {
  const sam = await signUp('sam');
  const res = await request(app).post('/api/campaigns/join').set('Authorization', sam.auth).send({ inviteCode: 'NOPE00' });
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('joining a campaign you are already in returns 409', async () => {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const keep = await startCampaign(mira);
  await joinCampaign(sam, keep);
  const asPlayer = await request(app).post('/api/campaigns/join').set('Authorization', sam.auth).send({ inviteCode: keep.inviteCode });
  const asGm = await request(app).post('/api/campaigns/join').set('Authorization', mira.auth).send({ inviteCode: keep.inviteCode });
  expect(asPlayer.status).toBe(409);
  expect(asGm.status).toBe(409);
});

test('a member can open the campaign and sees their role', async () => {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const keep = await startCampaign(mira);
  await joinCampaign(sam, keep);
  const gm = await request(app).get(`/api/campaigns/${keep.id}`).set('Authorization', mira.auth);
  const player = await request(app).get(`/api/campaigns/${keep.id}`).set('Authorization', sam.auth);
  expect(gm.status).toBe(200);
  expect(gm.body).toEqual({ campaign: keep, role: 'GM' });
  expect(player.body).toEqual({ campaign: keep, role: 'PLAYER' });
});

test('opening a campaign you are not in returns 403', async () => {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const keep = await startCampaign(mira);
  const res = await request(app).get(`/api/campaigns/${keep.id}`).set('Authorization', sam.auth);
  expect(res.status).toBe(403);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('opening a campaign that does not exist returns 404', async () => {
  const mira = await signUp('mira');
  const res = await request(app).get('/api/campaigns/999999').set('Authorization', mira.auth);
  expect(res.status).toBe(404);
});

test('the GM can replace the invite code, and the old one stops working', async () => {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const keep = await startCampaign(mira);
  const res = await request(app).post(`/api/campaigns/${keep.id}/invite-code`).set('Authorization', mira.auth);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ campaign: { ...keep, inviteCode: expect.any(String) } });
  expect(res.body.campaign.inviteCode).not.toBe(keep.inviteCode);
  const old = await request(app).post('/api/campaigns/join').set('Authorization', sam.auth).send({ inviteCode: keep.inviteCode });
  expect(old.status).toBe(404);
  const fresh = await request(app).post('/api/campaigns/join').set('Authorization', sam.auth).send({ inviteCode: res.body.campaign.inviteCode });
  expect(fresh.status).toBe(201);
});

test('a player calling the GM-only invite code route gets 403 and the code stays the same', async () => {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const keep = await startCampaign(mira);
  await joinCampaign(sam, keep);
  const res = await request(app).post(`/api/campaigns/${keep.id}/invite-code`).set('Authorization', sam.auth);
  expect(res.status).toBe(403);
  expect(res.body).toEqual({ error: expect.any(String) });
  const after = await request(app).get(`/api/campaigns/${keep.id}`).set('Authorization', mira.auth);
  expect(after.body.campaign.inviteCode).toBe(keep.inviteCode);
});
