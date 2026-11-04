const express = require('express');
const { saveDiceRoll, listRecentRolls } = require('../data/dice-rolls');
const { parseNotation, formatNotation, rollDice } = require('../dice');
const { HttpError } = require('../http/errors');
const { readText } = require('../http/input');
const { requireMember } = require('./membership');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const router = express.Router({ mergeParams: true });

function readLimit(value) {
  if (value === undefined) {
    return DEFAULT_LIMIT;
  }
  const limit = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!(limit >= 1 && limit <= MAX_LIMIT)) {
    throw new HttpError(400, `Limit must be a whole number from 1 to ${MAX_LIMIT}`);
  }
  return limit;
}

router.post('/', requireMember, async (req, res) => {
  const notation = parseNotation(readText(req.body?.expression, 'Dice notation'));
  const { results, total } = rollDice(notation);
  const roll = await saveDiceRoll({
    campaignId: req.membership.campaign.id,
    userId: req.user.id,
    expression: formatNotation(notation),
    results,
    modifier: notation.modifier,
    total,
  });
  res.status(201).json(roll);
});

router.get('/', requireMember, async (req, res) => {
  res.json(await listRecentRolls(req.membership.campaign.id, readLimit(req.query.limit)));
});

module.exports = router;
