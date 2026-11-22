const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../src/app');

test('GM exports and imports a campaign without copying lobby tokens', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-backup-'));
  try {
    const app = createApp({ dataFile: path.join(folder, 'data.json') });
    const created = await request(app).post('/api/campaigns').send({ name: 'Original', host: 'GM' });
    expect(created.status).toBe(201);
    const { token, campaign } = created.body;
    const forbidden = await request(app).get(`/api/campaigns/${campaign.id}/export`);
    expect(forbidden.status).toBe(401);
    const player = await request(app).post('/api/campaigns/join').send({ code: campaign.code, name: 'Player' });
    const forbiddenPlayer = await request(app).get(`/api/campaigns/${campaign.id}/export`).set('x-player-token', player.body.token);
    expect(forbiddenPlayer.status).toBe(403);
    const exported = await request(app).get(`/api/campaigns/${campaign.id}/export`).set('x-player-token', token);
    expect(exported.status).toBe(200);
    expect(exported.body.format).toBe('campaign-keeper-campaign');
    expect(JSON.stringify(exported.body)).not.toContain(token);
    expect(JSON.stringify(exported.body)).not.toContain(player.body.token);
    const imported = await request(app).post('/api/campaigns/import?host=NewGM').send(exported.body);
    expect(imported.status).toBe(201);
    expect(imported.body.campaign.name).toBe('Original');
    expect(imported.body.campaign.code).not.toBe(campaign.code);
    expect(imported.body.campaign.members).toHaveLength(1);
    expect(imported.body.campaign.me.role).toBe('gm');
    expect(imported.body.token).not.toBe(token);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
