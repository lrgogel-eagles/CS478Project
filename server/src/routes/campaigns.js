const express = require('express');
const { createCampaign, findCampaignByInviteCode, listCampaignsForUser, addPlayer, replaceInviteCode } = require('../data/campaigns');
const { withNewInviteCode } = require('../invite-codes');
const { HttpError } = require('../http/errors');
const { readText, readOptionalText } = require('../http/input');
const { requireMember } = require('./membership');
const rolls = require('./rolls');

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 2000;

const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await listCampaignsForUser(req.user.id));
});

router.post('/', async (req, res) => {
  const body = req.body ?? {};
  const name = readText(body.name, 'Campaign name', NAME_MAX_LENGTH);
  const description = readOptionalText(body.description, 'Description', DESCRIPTION_MAX_LENGTH);
  const campaign = await withNewInviteCode((inviteCode) => createCampaign({ name, description, inviteCode, gmUserId: req.user.id }));
  res.status(201).json({ campaign, role: 'GM' });
});

router.post('/join', async (req, res) => {
  const inviteCode = readText(req.body?.inviteCode, 'Invite code').toUpperCase();
  const campaign = await findCampaignByInviteCode(inviteCode);
  if (!campaign) {
    throw new HttpError(404, 'No campaign has that invite code');
  }
  await addPlayer(campaign.id, req.user.id);
  res.status(201).json({ campaign, role: 'PLAYER' });
});

router.get('/:id', requireMember, (req, res) => {
  res.json(req.membership);
});

router.post('/:id/invite-code', requireMember, async (req, res) => {
  if (req.membership.role !== 'GM') {
    throw new HttpError(403, 'Only the GM can change the invite code');
  }
  const campaign = await withNewInviteCode((inviteCode) => replaceInviteCode(req.membership.campaign.id, inviteCode));
  if (!campaign) {
    throw new HttpError(404, 'Campaign not found');
  }
  res.json({ campaign });
});

router.use('/:id/rolls', rolls);

module.exports = router;
