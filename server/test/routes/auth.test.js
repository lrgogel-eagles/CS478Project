const request = require('supertest');
const { useTestDatabase } = require('../helpers/database');
const { app, PASSWORD, signUp } = require('../helpers/accounts');

useTestDatabase();

const mira = { email: 'mira@example.com', password: PASSWORD, displayName: 'Mira' };

test('sign up returns 201 with the new user and a token', async () => {
  const res = await request(app).post('/api/auth/register').send(mira);
  expect(res.status).toBe(201);
  expect(res.body.user).toEqual({ id: expect.any(Number), email: 'mira@example.com', displayName: 'Mira', createdAt: expect.any(String) });
  expect(res.body.token).toEqual(expect.any(String));
});

test.each(['email', 'password', 'displayName'])('sign up without %s returns 400', async (field) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...mira, [field]: undefined });
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('sign up with a display name over 40 characters returns 400', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...mira, displayName: 'm'.repeat(41) });
  expect(res.status).toBe(400);
});

test('sign up with an email already in use returns 409, whatever its case', async () => {
  await request(app).post('/api/auth/register').send(mira);
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...mira, email: 'MIRA@example.com' });
  expect(res.status).toBe(409);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('log in returns 200 with the user and a token', async () => {
  const { user } = await signUp('mira');
  const res = await request(app).post('/api/auth/login').send({ email: 'mira@example.com', password: PASSWORD });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ user, token: expect.any(String) });
});

test('log in with the wrong password returns 401', async () => {
  await signUp('mira');
  const res = await request(app).post('/api/auth/login').send({ email: 'mira@example.com', password: 'not-the-password' });
  expect(res.status).toBe(401);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('log in with an unknown email returns 401', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
  expect(res.status).toBe(401);
});

test.each(['email', 'password'])('log in without %s returns 400', async (field) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'mira@example.com', password: PASSWORD, [field]: undefined });
  expect(res.status).toBe(400);
});

test('GET /api/me returns the user the token belongs to', async () => {
  const { user, auth } = await signUp('mira');
  const res = await request(app).get('/api/me').set('Authorization', auth);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ user });
});

test.each(['/api/me', '/api/campaigns', '/api/campaigns/1', '/api/campaigns/1/rolls'])('GET %s without a token returns 401', async (path) => {
  const res = await request(app).get(path);
  expect(res.status).toBe(401);
  expect(res.body).toEqual({ error: expect.any(String) });
});

test('a made-up token returns 401', async () => {
  const res = await request(app).get('/api/me').set('Authorization', 'Bearer not-a-real-token');
  expect(res.status).toBe(401);
});
