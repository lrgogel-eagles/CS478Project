const { query } = require('../db/pool');

const MAX_RECENT_ROLLS = 100;

function toDiceRoll(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    userId: row.user_id,
    displayName: row.display_name,
    expression: row.expression,
    results: row.results,
    modifier: row.modifier,
    total: row.total,
    rolledAt: row.rolled_at,
  };
}

async function saveDiceRoll({ campaignId, userId, expression, results, modifier, total }) {
  const { rows } = await query(
    `WITH saved AS (
       INSERT INTO dice_rolls (campaign_id, user_id, expression, results, modifier, total)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
     )
     SELECT saved.*, u.display_name FROM saved JOIN users u ON u.id = saved.user_id`,
    [campaignId, userId, expression, results, modifier, total]
  );
  return toDiceRoll(rows[0]);
}

async function listRecentRolls(campaignId, limit = 20) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RECENT_ROLLS) {
    throw new RangeError(`limit must be a whole number from 1 to ${MAX_RECENT_ROLLS}, got ${limit}.`);
  }
  const { rows } = await query(
    `SELECT r.*, u.display_name FROM dice_rolls r
     JOIN users u ON u.id = r.user_id
     WHERE r.campaign_id = $1
     ORDER BY r.rolled_at DESC, r.id DESC
     LIMIT $2`,
    [campaignId, limit]
  );
  return rows.map(toDiceRoll);
}

module.exports = { saveDiceRoll, listRecentRolls };
