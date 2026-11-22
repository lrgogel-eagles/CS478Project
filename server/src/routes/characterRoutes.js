function registerRoutes({ app, auth, fail, id, clean, hpState, record, save, broadcast, numeric, mayEdit, express }) {
  const portableFields = ['name', 'portrait', 'className', 'level', 'ancestry', 'background', 'alignment', 'hitPoints', 'maxHp', 'currentHp', 'tempHp', 'armorClass', 'speed', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'inventory', 'abilities', 'description'];
  app.post('/api/campaigns/:id/characters/import', auth, (req, res) => {
    const input = req.body;
    if (!input || input.format !== 'campaign-keeper-character' || input.version !== 1 || !input.character || typeof input.character !== 'object' || Array.isArray(input.character)) return fail(res, 400, 'Invalid Campaign Keeper character file (version 1 required)');
    const source = input.character;
    if (typeof source.name !== 'string' || !source.name.trim() || source.name.length > 100) return fail(res, 400, 'Character name is required (100 characters max)');
    if (req.campaign.characters.length >= 100) return fail(res, 409, 'Campaign character limit reached');
    for (const field of portableFields) {
      if (source[field] !== undefined && typeof source[field] !== 'string' && typeof source[field] !== 'number') return fail(res, 400, `Invalid ${field} value`);
    }
    const item = { id: id(), ownerId: req.me.id, createdAt: new Date().toISOString(), private: false };
    for (const field of portableFields) item[field] = clean(source[field], field === 'description' ? 4000 : 1000);
    const hp = hpState(item);
    if (Object.values(hp).some(v => v === null)) return fail(res, 400, 'Invalid character HP');
    item.maxHp = hp.max; item.currentHp = Math.min(hp.current, hp.max); item.tempHp = hp.temp;
    if (source.portraitImage !== undefined) {
      const picture = source.portraitImage;
      if (typeof picture !== 'string' || picture.length > 1500000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(picture)) return fail(res, 400, 'Invalid portrait image');
      item.portraitImage = picture;
    }
    req.campaign.characters.push(item);
    record(req.campaign, req.me, 'import', `Imported character: ${item.name}`);
    save(req.data); broadcast(req.campaign);
    res.status(201).json(item);
  });
  app.post('/api/campaigns/:id/characters/:itemId/hp', auth, (req, res) => {
    const item = req.campaign.characters.find(x => x.id === req.params.itemId);
    if (!item) return fail(res, 404, 'Character not found');
    if (!mayEdit(req, item)) return fail(res, 403, 'Permission denied');
    const { max, current, temp } = hpState(item);
    if ([max, current, temp].some(x => x === null)) return fail(res, 400, 'Invalid character HP');
    const amount = numeric(req.body.amount, null, 9999);
    const action = req.body.action;
    if (amount === null || !['damage','heal','temp','set'].includes(action)) return fail(res, 400, 'Invalid HP action or amount');
    let next = current, shield = temp;
    if (action === 'damage') { const absorbed = Math.min(shield, amount); shield -= absorbed; next = Math.max(0, current - (amount - absorbed)); }
    if (action === 'heal') next = Math.min(max, current + amount);
    if (action === 'temp') shield = amount;
    if (action === 'set') next = Math.min(max, amount);
    item.maxHp = max; item.currentHp = next; item.tempHp = shield;
    record(req.campaign, req.me, 'hp', `${item.name}: ${action} ${amount} HP (${next}/${max}, ${shield} temporary)`, !!item.private, { characterId: item.id });
    save(req.data); broadcast(req.campaign);
    res.json({ character: item, hp: { current: next, max, temp: shield } });
  });
  app.post('/api/campaigns/:id/characters/:itemId/portrait', auth, express.raw({ type: ['image/png','image/jpeg','image/webp'], limit: '1mb' }), (req, res) => {
    const item = req.campaign.characters.find(x => x.id === req.params.itemId);
    if (!item) return fail(res, 404, 'Character not found');
    if (!mayEdit(req, item)) return fail(res, 403, 'Permission denied');
    const bytes = req.body;
    if (!Buffer.isBuffer(bytes) || !bytes.length) return fail(res, 400, 'Upload a PNG, JPEG or WebP image (under 1 MB)');
    const png = bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
    const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const webp = bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
    const mime = png ? 'image/png' : jpg ? 'image/jpeg' : webp ? 'image/webp' : null;
    if (!mime) return fail(res, 400, 'Invalid image file');
    item.portraitImage = `data:${mime};base64,${bytes.toString('base64')}`;
    record(req.campaign, req.me, 'portrait', `Updated portrait for ${item.name}`, !!item.private);
    save(req.data); broadcast(req.campaign);
    res.json({ success: true });
  });
}

module.exports = registerRoutes;
