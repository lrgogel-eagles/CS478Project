const request = require('supertest');
const app = require('../../src/app');

const PASSWORD = 'dragon-keep';

async function signUp(name) {
  const res = await request(app).post('/api/auth/register').send({ email: `${name}@example.com`, password: PASSWORD, displayName: name });
  if (res.status !== 201) throw new Error(`signing up ${name} returned ${res.status}`);
  return { user: res.body.user, auth: `Bearer ${res.body.token}` };
}

async function startCampaign(gm, name = 'Sunken Keep') {
  const res = await request(app).post('/api/campaigns').set('Authorization', gm.auth).send({ name });
  if (res.status !== 201) throw new Error(`creating ${name} returned ${res.status}`);
  return res.body.campaign;
}

async function joinCampaign(player, campaign) {
  const res = await request(app).post('/api/campaigns/join').set('Authorization', player.auth).send({ inviteCode: campaign.inviteCode });
  if (res.status !== 201) throw new Error(`joining ${campaign.name} returned ${res.status}`);
  return res.body;
}

module.exports = { app, PASSWORD, signUp, startCampaign, joinCampaign };
