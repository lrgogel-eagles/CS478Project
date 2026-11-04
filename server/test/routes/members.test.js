const request = require('supertest');
const { useTestDatabase } = require('../helpers/database');
const { app, signUp, startCampaign, joinCampaign } = require('../helpers/accounts');

useTestDatabase();

test('a member sees everyone at the table, GM first, then players in the order they joined', async () => {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const alex = await signUp('alex');
  const keep = await startCampaign(mira);
  await joinCampaign(sam, keep);
  await joinCampaign(alex, keep);
  const res = await request(app).get(`/api/campaigns/${keep.id}/members`).set('Authorization', alex.auth);
  expect(res.status).toBe(200);
  expect(res.body).toEqual([
    { userId: mira.user.id, displayName: 'mira', role: 'GM', joinedAt: expect.any(String) },
    { userId: sam.user.id, displayName: 'sam', role: 'PLAYER', joinedAt: expect.any(String) },
    { userId: alex.user.id, displayName: 'alex', role: 'PLAYER', joinedAt: expect.any(String) },
  ]);
});

test('the member list leaves out email addresses', async () => {
  const mira = await signUp('mira');
  const keep = await startCampaign(mira);
  const res = await request(app).get(`/api/campaigns/${keep.id}/members`).set('Authorization', mira.auth);
  expect(res.status).toBe(200);
  expect(JSON.stringify(res.body)).not.toContain('@example.com');
});

test('someone outside the campaign gets 403 for its member list', async () => {
  const mira = await signUp('mira');
  const sam = await signUp('sam');
  const keep = await startCampaign(mira);
  const res = await request(app).get(`/api/campaigns/${keep.id}/members`).set('Authorization', sam.auth);
  expect(res.status).toBe(403);
  expect(res.body).toEqual({ error: 'You are not in this campaign' });
});

test('the member list of a campaign that does not exist returns 404', async () => {
  const mira = await signUp('mira');
  const res = await request(app).get('/api/campaigns/999999/members').set('Authorization', mira.auth);
  expect(res.status).toBe(404);
});

test('the member list needs a login', async () => {
  const mira = await signUp('mira');
  const keep = await startCampaign(mira);
  const res = await request(app).get(`/api/campaigns/${keep.id}/members`);
  expect(res.status).toBe(401);
});
