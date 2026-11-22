function registerRoutes({ app, auth, fail, id, clean, hpState, record, save, broadcast }) {
  const types = {
    characters: { required: 'name', fields: ['name', 'portrait', 'className', 'level', 'ancestry', 'background', 'alignment', 'hitPoints', 'maxHp', 'currentHp', 'tempHp', 'armorClass', 'speed', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'inventory', 'abilities', 'description', 'private'], player: true },
    quests: { required: 'title', fields: ['title', 'description', 'status', 'private'] },
    notes: { required: 'title', fields: ['title', 'content', 'private'] },
    events: { required: 'title', fields: ['title', 'description', 'date', 'private'] }
  };
  app.post('/api/campaigns/:id/:type', auth, (req, res) => {
    const spec = types[req.params.type];
    if (!spec) return fail(res, 404, 'Unknown resource');
    if (req.me.role !== 'gm' && !spec.player) return fail(res, 403, 'GM access required');
    if (!clean(req.body[spec.required], 100)) return fail(res, 400, `${spec.required} is required`);
    const item = { id: id(), ownerId: req.me.id, createdAt: new Date().toISOString() };
    for (const field of spec.fields) item[field] = field === 'private' ? (req.me.role === 'gm' && req.body.private === true) : clean(req.body[field], field === 'content' ? 4000 : 1000);
    if (req.params.type === 'characters') {
      const hp = hpState(item);
      if (Object.values(hp).some(v => v === null)) return fail(res, 400, 'Invalid HP values');
      item.maxHp = hp.max; item.currentHp = Math.min(hp.current, hp.max); item.tempHp = hp.temp;
    }
    req.campaign[req.params.type].push(item);
    record(req.campaign, req.me, 'create', `Created ${req.params.type.slice(0,-1)}: ${item.name || item.title}`, !!item.private);
    save(req.data); broadcast(req.campaign); res.status(201).json(item);
  });
  app.patch('/api/campaigns/:id/:type/:itemId', auth, (req, res) => {
    const spec = types[req.params.type];
    if (!spec) return fail(res, 404, 'Unknown resource');
    const item = req.campaign[req.params.type].find(x => x.id === req.params.itemId);
    if (!item) return fail(res, 404, 'Item not found');
    if (req.me.role !== 'gm' && !(spec.player && item.ownerId === req.me.id)) return fail(res, 403, 'Permission denied');
    for (const field of spec.fields) if (Object.hasOwn(req.body, field)) item[field] = field === 'private' ? (req.me.role === 'gm' && req.body.private === true) : clean(req.body[field], field === 'content' ? 4000 : 1000);
    if (!clean(item[spec.required], 100)) return fail(res, 400, `${spec.required} is required`);
    if (req.params.type === 'characters') {
      const hp = hpState(item);
      if (Object.values(hp).some(v => v === null)) return fail(res, 400, 'Invalid HP values');
      item.maxHp = hp.max; item.currentHp = Math.min(hp.current, hp.max); item.tempHp = hp.temp;
    }
    record(req.campaign, req.me, 'edit', `Updated ${req.params.type.slice(0,-1)}: ${item.name || item.title}`, !!item.private);
    save(req.data); broadcast(req.campaign); res.json(item);
  });
  app.delete('/api/campaigns/:id/:type/:itemId', auth, (req, res) => {
    const spec = types[req.params.type];
    if (!spec) return fail(res, 404, 'Unknown resource');
    const items = req.campaign[req.params.type];
    const item = items.find(x => x.id === req.params.itemId);
    if (!item) return fail(res, 404, 'Item not found');
    if (req.me.role !== 'gm' && !(spec.player && item.ownerId === req.me.id)) return fail(res, 403, 'Permission denied');
    req.campaign[req.params.type] = items.filter(x => x.id !== item.id);
    save(req.data); broadcast(req.campaign); res.status(204).end();
  });
}

module.exports = registerRoutes;
