const crypto = require('crypto');

function registerAccountRoutes({ app, read, save, clean, fail, code, id, publicCampaign, find, record, broadcast }) {
  const hash = password => {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
  };
  const validPassword = (password, stored) => {
    if (!stored || typeof password !== 'string') return false;
    const [salt, expected] = stored.split(':');
    const actual = crypto.scryptSync(password, salt, 64);
    const saved = Buffer.from(expected, 'hex');
    return saved.length === actual.length && crypto.timingSafeEqual(saved, actual);
  };
  const publicUser = user => ({ id: user.id, name: user.name, email: user.email });
  const signIn = (res, data, user) => {
    const token = crypto.randomBytes(32).toString('hex');
    user.sessions ||= [];
    user.sessions.push(crypto.createHash('sha256').update(token).digest('hex'));
    save(data);
    res.json({ token, user: publicUser(user) });
  };
  function account(req, res, next) {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const digest = crypto.createHash('sha256').update(token).digest('hex');
    const data = read();
    const user = (data.users || []).find(person => (person.sessions || []).includes(digest));
    if (!user) return fail(res, 401, 'Log in first');
    req.account = user; req.accountData = data;
    next();
  }
  app.post('/api/auth/signup', (req, res) => {
    const data = read(); data.users ||= [];
    const name = clean(req.body.name, 60);
    const email = clean(req.body.email, 120).toLowerCase();
    const password = req.body.password;
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 6) return fail(res, 400, 'Enter a name, valid email, and password with at least 6 characters');
    if (data.users.some(user => user.email === email)) return fail(res, 409, 'Email already registered');
    const user = { id: id(), name, email, passwordHash: hash(password), sessions: [], memberships: [] };
    data.users.push(user); signIn(res, data, user);
  });
  app.post('/api/auth/login', (req, res) => {
    const data = read();
    const user = (data.users || []).find(person => person.email === clean(req.body.email, 120).toLowerCase());
    if (!user || !validPassword(req.body.password, user.passwordHash)) return fail(res, 401, 'Incorrect email or password');
    signIn(res, data, user);
  });
  app.get('/api/auth/me', account, (req, res) => res.json({ user: publicUser(req.account) }));
  app.get('/api/account/campaigns', account, (req, res) => {
    const campaigns = (req.account.memberships || []).map(entry => {
      const campaign = find(req.accountData, entry.campaignId);
      if (!campaign) return null;
      const me = campaign.members.find(person => person.token === entry.playerToken);
      if (!me) return null;
      return { id: campaign.id, name: campaign.name, role: me.role === 'gm' ? 'Game Master' : 'Player', inviteCode: campaign.code };
    }).filter(Boolean);
    res.json(campaigns);
  });
  app.post('/api/account/campaigns', account, (req, res) => {
    const data = req.accountData;
    const name = clean(req.body.name, 80);
    const host = clean(req.body.host, 40) || req.account.name;
    const system = clean(req.body.system, 60) || 'Tabletop RPG';
    const description = clean(req.body.description, 500);
    if (!name) return fail(res, 400, 'Campaign name required');
    let inviteCode = code();
    while (data.campaigns.some(c => c.code === inviteCode)) inviteCode = code();
    const playerToken = crypto.randomBytes(32).toString('hex');
    const campaign = { id: id(), code: inviteCode, name, description, system, status: 'lobby', sessionNumber: 0, createdAt: new Date().toISOString(), members: [{ id: id(), name: host, role: 'gm', token: playerToken, ready: true }], characters: [], quests: [], notes: [], events: [], activity: [] };
    data.campaigns.push(campaign);
    req.account.memberships ||= [];
    req.account.memberships.push({ campaignId: campaign.id, playerToken });
    save(data);
    res.status(201).json({ id: campaign.id, name, role: 'Game Master', inviteCode });
  });
  app.post('/api/account/campaigns/join', account, (req, res) => {
    const data = req.accountData;
    const campaign = find(data, clean(req.body.inviteCode, 40));
    if (!campaign) return fail(res, 404, 'Invalid invite code');
    if ((req.account.memberships || []).some(entry => entry.campaignId === campaign.id)) return fail(res, 409, 'You already joined this campaign');
    if (campaign.members.length >= 16) return fail(res, 409, 'Lobby is full');
    const playerToken = crypto.randomBytes(32).toString('hex');
    campaign.members.push({ id: id(), name: req.account.name, role: 'player', token: playerToken, ready: false });
    req.account.memberships ||= [];
    req.account.memberships.push({ campaignId: campaign.id, playerToken });
    record(campaign, { name: req.account.name }, 'join', `${req.account.name} joined the party`);
    save(data); broadcast(campaign);
    res.status(201).json({ id: campaign.id, name: campaign.name, role: 'Player', inviteCode: campaign.code });
  });
  app.get('/api/account/campaigns/:id/open', account, (req, res) => {
    const entry = (req.account.memberships || []).find(m => m.campaignId === req.params.id);
    const campaign = entry && find(req.accountData, entry.campaignId);
    if (!campaign || !campaign.members.some(m => m.token === entry.playerToken)) return fail(res, 404, 'Campaign not found');
    res.json({ id: campaign.id, token: entry.playerToken });
  });
  app.post('/api/account/campaigns/import', account, (req, res) => {
    const backup = req.body;
    if (backup?.format !== 'campaign-keeper-campaign' || backup.version !== 1) return fail(res, 400, 'Choose a Campaign Keeper version 1 backup');
    const source = backup.campaign;
    if (!source || typeof source !== 'object' || Array.isArray(source)) return fail(res, 400, 'Campaign data is missing');
    const name = clean(source.name, 80);
    const types = ['characters', 'quests', 'notes', 'events', 'activity'];
    if (!name || types.some(type => !Array.isArray(source[type]) || source[type].length > 500)) return fail(res, 400, 'Invalid campaign backup');
    if (JSON.stringify(source).length > 90000) return fail(res, 413, 'Backup is too large');
    const data = req.accountData;
    let inviteCode = code();
    while (data.campaigns.some(c => c.code === inviteCode)) inviteCode = code();
    const gmId = id();
    const playerToken = crypto.randomBytes(32).toString('hex');
    const collections = {};
    for (const type of types) {
      if (source[type].some(item => !item || typeof item !== 'object' || Array.isArray(item))) return fail(res, 400, 'Invalid campaign entry');
      collections[type] = source[type].map(item => {
        const copy = JSON.parse(JSON.stringify(item));
        delete copy.token;
        delete copy.ownerToken;
        copy.id = id();
        if (type === 'characters') copy.ownerId = gmId;
        return copy;
      });
    }
    const campaign = {
      id: id(), code: inviteCode, name,
      description: clean(source.description, 500), system: clean(source.system, 60) || 'Tabletop RPG',
      status: 'lobby', sessionNumber: Number.isSafeInteger(source.sessionNumber) ? Math.max(0, Math.min(9999, source.sessionNumber)) : 0,
      createdAt: new Date().toISOString(),
      members: [{ id: gmId, name: req.account.name, role: 'gm', token: playerToken, ready: true }],
      ...collections
    };
    record(campaign, req.account, 'import', 'Imported campaign backup');
    data.campaigns.push(campaign);
    req.account.memberships ||= [];
    req.account.memberships.push({ campaignId: campaign.id, playerToken });
    save(data); broadcast(campaign);
    res.status(201).json({ id: campaign.id, name, role: 'Game Master', inviteCode });
  });
  app.post('/api/account/dice/roll', account, (req, res) => {
    const match = /^(\d*)d(\d+)([+-]\d+)?$/i.exec(String(req.body.notation || '').trim());
    if (!match) return fail(res, 400, 'Invalid dice notation');
    const count = Number(match[1] || 1), sides = Number(match[2]), modifier = Number(match[3] || 0);
    if (!Number.isSafeInteger(count) || count < 1 || count > 100 || !Number.isSafeInteger(sides) || sides < 2 || sides > 1000 || Math.abs(modifier) > 10000) return fail(res, 400, 'Invalid dice notation');
    const dice = Array.from({ length: count }, () => crypto.randomInt(1, sides + 1));
    res.json({ dice, modifier, total: dice.reduce((sum, value) => sum + value, modifier) });
  });
}
module.exports = registerAccountRoutes;
