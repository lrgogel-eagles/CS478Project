const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createStorage } = require('./storage');
const registerAccountRoutes = require('./routes/accountRoutes');

function createApp(options = {}) {
  const app = express();
  const dataFile = options.dataFile || path.join(__dirname, '../data/campaigns.json');
  const clients = new Map();
  const storage = createStorage(dataFile);
  const read = storage.read;
  const save = storage.save;

  const id = () => crypto.randomUUID();
  const code = () => crypto.randomBytes(4).toString('hex').toUpperCase();

  function clean(value, max = 200) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, max);
  }

  function fail(res, status, message) {
    return res.status(status).json({ error: message });
  }

  function find(data, campaignId) {
    return data.campaigns.find(campaign =>
      campaign.id === campaignId || campaign.code === String(campaignId).toUpperCase()
    );
  }

  function member(campaign, token) {
    return campaign.members.find(person => person.token === token);
  }

  function tokenOf(req) {
    return req.get('x-player-token') || '';
  }

  const publicCampaign = (c, token) => {
    const me = member(c, token);
    const gm = me && me.role === 'gm';
    return {
      id: c.id, code: c.code, name: c.name, description: c.description, system: c.system,
      status: c.status, createdAt: c.createdAt, sessionNumber: c.sessionNumber,
      members: c.members.map(m => ({ id: m.id, name: m.name, role: m.role, ready: !!m.ready })),
      characters: c.characters.filter(x => gm || !x.private).map(x => ({...x})),
      quests: c.quests.filter(x => gm || !x.private).map(x => ({...x})),
      notes: c.notes.filter(x => gm || !x.private).map(x => ({...x})),
      events: c.events.filter(x => gm || !x.private).map(x => ({...x})),
      activity: (c.activity || []).filter(x => gm || !x.private).slice(-150).map(x => ({...x})),
      me: me ? { id: me.id, name: me.name, role: me.role } : null
    };
  };
  const record = (campaign, actor, kind, message, privateEntry = false, detail = {}) => {
    campaign.activity ||= [];
    campaign.activity.push({ id: id(), at: new Date().toISOString(), actor: actor.name, kind, message, private: privateEntry, ...detail });
    if (campaign.activity.length > 500) campaign.activity.splice(0, campaign.activity.length - 500);
  };
  const numeric = (value, fallback, max = 99999) => {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 && n <= max ? n : null;
  };
  const hpState = item => {
    const max = numeric(item.maxHp, numeric(item.hitPoints, 10));
    const current = numeric(item.currentHp, max);
    const temp = numeric(item.tempHp, 0);
    return { max, current, temp };
  };
  const mayEdit = (req, item) => req.me.role === 'gm' || item.ownerId === req.me.id;
  const broadcast = campaign => {
    for (const client of clients.get(campaign.id) || []) {
      client.res.write(`event: update\ndata: ${JSON.stringify(publicCampaign(campaign, client.token))}\n\n`);
    }
  };
  const auth = (req, res, next) => {
    const data = read();
    const campaign = find(data, req.params.id);
    if (!campaign) return fail(res, 404, 'Campaign not found');
    const me = member(campaign, tokenOf(req));
    if (!me) return fail(res, 401, 'Join this campaign first');
    req.data = data; req.campaign = campaign; req.me = me;
    next();
  };
  const gmOnly = (req, res, next) => req.me.role === 'gm' ? next() : fail(res, 403, 'Only the Game Master can do that');
  app.use(express.json({ limit: '100kb' }));
  app.use('/vendor/three', express.static(path.join(__dirname, '../node_modules/three')));
  app.use('/dice-models', express.static(path.join(__dirname, '../public/dice-models')));
  app.get('/dice3d.js', (req, res) => res.sendFile(path.join(__dirname, '../public/dice3d.js')));
  registerAccountRoutes({ app, read, save, clean, fail, code, id, crypto, publicCampaign, find, record, broadcast });
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  const routes = { app, read, save, clean, fail, code, id, crypto, publicCampaign, find, record, broadcast, auth, gmOnly, member, tokenOf, clients, hpState, numeric, mayEdit, express };
  require('./routes/campaignRoutes')(routes);
  require('./routes/diceRoutes')(routes);
  require('./routes/characterRoutes')(routes);
  require('./routes/resourceRoutes')(routes);
  app.get(/^(?!\/api\/|\/vendor\/|\/dice-models\/).*/, (req, res) => {
    const frontend = path.join(clientDist, 'index.html');
    if (!fs.existsSync(frontend)) return res.status(503).send('Frontend not built. Run npm install and npm run build in the project root.');
    res.sendFile(frontend);
  });
  app.initializeStorage = storage.initialize;
  return app;
}
const app = createApp();
module.exports = app;
module.exports.createApp = createApp;
