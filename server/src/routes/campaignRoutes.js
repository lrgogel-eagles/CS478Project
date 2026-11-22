function registerRoutes({ app, read, save, clean, fail, code, id, crypto, publicCampaign, find, record, broadcast, auth, gmOnly, member, tokenOf, clients }) {
  app.post('/api/campaigns', (req, res) => {
    const name = clean(req.body.name, 80), host = clean(req.body.host, 40);
    if (!name || !host) return fail(res, 400, 'Campaign and Game Master names are required');
    const data = read();
    let joinCode = code();
    while (data.campaigns.some(c => c.code === joinCode)) joinCode = code();
    const token = crypto.randomBytes(32).toString('hex');
    const campaign = {
      id: id(), code: joinCode, name, description: clean(req.body.description, 500),
      system: clean(req.body.system, 60) || 'Tabletop RPG', status: 'lobby', sessionNumber: 0,
      createdAt: new Date().toISOString(), members: [{ id: id(), name: host, role: 'gm', token, ready: true }],
      characters: [], quests: [], notes: [], events: [], activity: []
    };
    data.campaigns.push(campaign); save(data);
    res.status(201).json({ token, campaign: publicCampaign(campaign, token) });
  });
  app.get('/api/campaigns/:id/export', auth, gmOnly, (req, res) => {
    const campaign = req.campaign;
    const backup = {
      format: 'campaign-keeper-campaign',
      version: 1,
      exportedAt: new Date().toISOString(),
      campaign: {
        name: campaign.name,
        description: campaign.description,
        system: campaign.system,
        sessionNumber: campaign.sessionNumber,
        characters: campaign.characters,
        quests: campaign.quests,
        notes: campaign.notes,
        events: campaign.events,
        activity: campaign.activity || []
      }
    };
    res.setHeader('Content-Disposition', 'attachment; filename="campaign-backup.json"');
    res.json(backup);
  });

  app.post('/api/campaigns/import', (req, res) => {
    const backup = req.body;
    if (backup?.format !== 'campaign-keeper-campaign' || backup.version !== 1) {
      return fail(res, 400, 'Select a Campaign Keeper campaign export (version 1)');
    }
    const source = backup.campaign;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return fail(res, 400, 'Campaign data is missing');
    }
    const name = clean(source.name, 80);
    const host = clean(req.query.host, 40);
    if (!name || !host) return fail(res, 400, 'Campaign name and GM name are required');
    const types = ['characters', 'quests', 'notes', 'events', 'activity'];
    if (types.some(type => !Array.isArray(source[type]) || source[type].length > 500)) {
      return fail(res, 400, 'Campaign collections are missing or too large');
    }
    if (JSON.stringify(source).length > 1500000) return fail(res, 413, 'Campaign backup is too large');
    const data = read();
    let joinCode = code();
    while (data.campaigns.some(c => c.code === joinCode)) joinCode = code();
    const token = crypto.randomBytes(32).toString('hex');
    const gmId = id();
    const copyItems = type => source[type].map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const result = JSON.parse(JSON.stringify(item));
      delete result.token;
      delete result.ownerToken;
      result.id = id();
      if (type === 'characters') result.ownerId = gmId;
      return result;
    });
    const collections = Object.fromEntries(types.map(type => [type, copyItems(type)]));
    if (types.some(type => collections[type].includes(null))) return fail(res, 400, 'Invalid campaign entries');
    const campaign = {
      id: id(), code: joinCode, name,
      description: clean(source.description, 500),
      system: clean(source.system, 60) || 'Tabletop RPG',
      status: 'lobby', sessionNumber: Number.isSafeInteger(source.sessionNumber) ? Math.max(0, Math.min(9999, source.sessionNumber)) : 0,
      createdAt: new Date().toISOString(),
      members: [{ id: gmId, name: host, role: 'gm', token, ready: true }],
      ...collections
    };
    record(campaign, { name: host }, 'import', 'Imported campaign backup');
    data.campaigns.push(campaign);
    save(data);
    res.status(201).json({ token, campaign: publicCampaign(campaign, token) });
  });

  app.post('/api/campaigns/join', (req, res) => {
    const data = read();
    const campaign = find(data, clean(req.body.code, 40));
    if (!campaign) return fail(res, 404, 'No campaign found for that code');
    const name = clean(req.body.name, 40);
    if (!name) return fail(res, 400, 'Enter a player name');
    if (campaign.members.length >= 16) return fail(res, 409, 'Lobby is full');
    const token = crypto.randomBytes(32).toString('hex');
    campaign.members.push({ id: id(), name, role: 'player', token, ready: false });
    record(campaign, {name}, 'join', `${name} joined the party`);
    save(data); broadcast(campaign);
    res.status(201).json({ token, campaign: publicCampaign(campaign, token) });
  });
  app.get('/api/campaigns/:id', auth, (req, res) => res.json(publicCampaign(req.campaign, tokenOf(req))));
  app.get('/api/campaigns/:id/stream', (req, res) => {
    const data = read(), campaign = find(data, req.params.id);
    const token = clean(req.query.token, 128);
    if (!campaign || !member(campaign, token)) return fail(res, 401, 'Unauthorized');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`event: update\ndata: ${JSON.stringify(publicCampaign(campaign, token))}\n\n`);
    const entry = { res, token };
    if (!clients.has(campaign.id)) clients.set(campaign.id, new Set());
    clients.get(campaign.id).add(entry);
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
    req.on('close', () => { clearInterval(heartbeat); clients.get(campaign.id)?.delete(entry); });
  });
  app.patch('/api/campaigns/:id/ready', auth, (req, res) => {
    if (req.me.role !== 'player') return fail(res, 403, 'Only players can toggle ready');
    if (req.campaign.status === 'active') return fail(res, 409, 'Cannot change readiness during a session');
    req.me.ready = req.body.ready === true;
    save(req.data); broadcast(req.campaign);
    res.json(publicCampaign(req.campaign, tokenOf(req)));
  });
  app.delete('/api/campaigns/:id/members/:memberId', auth, gmOnly, (req, res) => {
    const target = req.campaign.members.find(m => m.id === req.params.memberId);
    if (!target) return fail(res, 404, 'Player not found');
    if (target.role === 'gm') return fail(res, 403, 'Cannot remove the Game Master');
    req.campaign.members = req.campaign.members.filter(m => m.id !== target.id);
    save(req.data); broadcast(req.campaign);
    res.json(publicCampaign(req.campaign, tokenOf(req)));
  });
  app.patch('/api/campaigns/:id/status' , auth, gmOnly, (req, res) => {
    const status = clean(req.body.status, 20);
    if (!['lobby', 'active', 'ended'].includes(status)) return fail(res, 400, 'Invalid status');
    if (status === 'active' && req.campaign.status !== 'active') {
      if (req.campaign.members.some(m => m.role === 'player' && !m.ready)) return fail(res, 409, 'All players must be ready before starting');
      req.campaign.sessionNumber++;

    }
    if (status === 'ended' && req.campaign.status === 'active') {
      req.campaign.members.forEach(m => { if (m.role === 'player') m.ready = false; });
    }
    req.campaign.status = status; record(req.campaign, req.me, 'session', status === 'active' ? `Started session ${req.campaign.sessionNumber}` : `Session ${status}`); save(req.data); broadcast(req.campaign);
    res.json(publicCampaign(req.campaign, tokenOf(req)));
  });
}

module.exports = registerRoutes;
