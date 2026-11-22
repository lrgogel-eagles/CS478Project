function registerRoutes({ app, auth, numeric, fail, crypto, record, save, broadcast }) {
  app.post('/api/campaigns/:id/dice', auth, (req, res) => {
    const count = numeric(req.body.count, null, 20), sides = numeric(req.body.sides, null, 1000);
    const bonus = Number(req.body.bonus ?? 0);
    if (count === null || count < 1 || sides === null || sides < 2 || !Number.isSafeInteger(bonus) || Math.abs(bonus) > 10000) return fail(res, 400, 'Invalid dice roll');
    const rolls = Array.from({ length: count }, () => crypto.randomInt(1, sides + 1));
    const total = rolls.reduce((a,b) => a+b, bonus);
    record(req.campaign, req.me, 'dice', `Rolled ${count}d${sides}${bonus ? (bonus > 0 ? '+' : '') + bonus : ''}: ${rolls.join(', ')} = ${total}`, false, { rolls, sides, count, bonus, total });
    save(req.data); broadcast(req.campaign);
    res.json({ rolls, sides, count, bonus, total });
  });
}

module.exports = registerRoutes;
