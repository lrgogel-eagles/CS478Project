const { query, withTransaction } = require('../db/pool');
const { AlreadyMemberError, InviteCodeTakenError, isUniqueViolation } = require('./errors');

function toCampaign(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  };
}

async function createCampaign({ name, description = '', inviteCode, gmUserId }) {
  try {
    return await withTransaction(async (client) => {
      const { rows } = await client.query('INSERT INTO campaigns (name, description, invite_code) VALUES ($1, $2, $3) RETURNING *', [
        name.trim(),
        description.trim(),
        inviteCode,
      ]);
      const campaign = toCampaign(rows[0]);
      await client.query("INSERT INTO memberships (user_id, campaign_id, role) VALUES ($1, $2, 'GM')", [gmUserId, campaign.id]);
      return campaign;
    });
  } catch (err) {
    if (isUniqueViolation(err, 'campaigns_invite_code_key')) {
      throw new InviteCodeTakenError(inviteCode, { cause: err });
    }
    throw err;
  }
}

async function findCampaignById(id) {
  const { rows } = await query('SELECT * FROM campaigns WHERE id = $1', [id]);
  return rows.length > 0 ? toCampaign(rows[0]) : undefined;
}

async function findCampaignByInviteCode(inviteCode) {
  const { rows } = await query('SELECT * FROM campaigns WHERE invite_code = $1', [inviteCode.trim()]);
  return rows.length > 0 ? toCampaign(rows[0]) : undefined;
}

async function listCampaignsForUser(userId) {
  const { rows } = await query(
    `SELECT c.*, m.role FROM campaigns c
     JOIN memberships m ON m.campaign_id = c.id
     WHERE m.user_id = $1
     ORDER BY c.name, c.id`,
    [userId]
  );
  return rows.map((row) => ({ ...toCampaign(row), role: row.role }));
}

async function addPlayer(campaignId, userId) {
  try {
    const { rows } = await query("INSERT INTO memberships (user_id, campaign_id, role) VALUES ($1, $2, 'PLAYER') RETURNING *", [userId, campaignId]);
    return { userId: rows[0].user_id, campaignId: rows[0].campaign_id, role: rows[0].role, joinedAt: rows[0].joined_at };
  } catch (err) {
    if (isUniqueViolation(err, 'memberships_pkey')) {
      throw new AlreadyMemberError(userId, campaignId, { cause: err });
    }
    throw err;
  }
}

async function findRole(campaignId, userId) {
  const { rows } = await query('SELECT role FROM memberships WHERE campaign_id = $1 AND user_id = $2', [campaignId, userId]);
  return rows.length > 0 ? rows[0].role : undefined;
}

async function listMembers(campaignId) {
  const { rows } = await query(
    `SELECT u.id, u.display_name, m.role, m.joined_at FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.campaign_id = $1
     ORDER BY m.role, m.joined_at`,
    [campaignId]
  );
  return rows.map((row) => ({ userId: row.id, displayName: row.display_name, role: row.role, joinedAt: row.joined_at }));
}

async function replaceInviteCode(campaignId, inviteCode) {
  try {
    const { rows } = await query('UPDATE campaigns SET invite_code = $2 WHERE id = $1 RETURNING *', [campaignId, inviteCode]);
    return rows.length > 0 ? toCampaign(rows[0]) : undefined;
  } catch (err) {
    if (isUniqueViolation(err, 'campaigns_invite_code_key')) {
      throw new InviteCodeTakenError(inviteCode, { cause: err });
    }
    throw err;
  }
}

async function deleteCampaign(campaignId) {
  const { rowCount } = await query('DELETE FROM campaigns WHERE id = $1', [campaignId]);
  return rowCount > 0;
}

module.exports = {
  createCampaign,
  findCampaignById,
  findCampaignByInviteCode,
  listCampaignsForUser,
  addPlayer,
  findRole,
  listMembers,
  replaceInviteCode,
  deleteCampaign,
};
