const { findCampaignById, findRole } = require('../data/campaigns');
const { HttpError } = require('../http/errors');

const MAX_ID = 2147483647;

function readCampaignId(text) {
  if (!/^\d+$/.test(text)) {
    return undefined;
  }
  const id = Number(text);
  return id >= 1 && id <= MAX_ID ? id : undefined;
}

async function requireMember(req, res, next) {
  const id = readCampaignId(req.params.id);
  const campaign = id === undefined ? undefined : await findCampaignById(id);
  if (!campaign) {
    throw new HttpError(404, 'Campaign not found');
  }
  const role = await findRole(campaign.id, req.user.id);
  if (!role) {
    throw new HttpError(403, 'You are not in this campaign');
  }
  req.membership = { campaign, role };
  next();
}

module.exports = { requireMember };
