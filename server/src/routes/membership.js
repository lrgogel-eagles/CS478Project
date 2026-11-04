const { findCampaignById, findRole } = require('../data/campaigns');
const { HttpError } = require('../http/errors');
const { readId } = require('../http/input');

async function requireMember(req, res, next) {
  const id = readId(req.params.id);
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
