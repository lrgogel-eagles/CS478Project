const { query } = require('../db/pool');
const { toColumnValues, buildUpdate } = require('./columns');

const EDITABLE_COLUMNS = new Map([
  ['name', 'name'],
  ['race', 'race'],
  ['charClass', 'char_class'],
  ['level', 'level'],
  ['hitPoints', 'hit_points'],
  ['abilityScores', 'ability_scores'],
  ['gold', 'gold'],
]);

function toCharacter(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    ownerId: row.owner_id,
    name: row.name,
    race: row.race,
    charClass: row.char_class,
    level: row.level,
    hitPoints: row.hit_points,
    abilityScores: row.ability_scores,
    gold: row.gold,
    updatedAt: row.updated_at,
  };
}

async function createCharacter({ campaignId, ownerId, ...fields }) {
  const { columns, values } = toColumnValues(fields, EDITABLE_COLUMNS, 'Character');
  const allColumns = ['campaign_id', 'owner_id', ...columns];
  const placeholders = allColumns.map((_, index) => `$${index + 1}`);
  const { rows } = await query(`INSERT INTO characters (${allColumns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`, [
    campaignId,
    ownerId,
    ...values,
  ]);
  return toCharacter(rows[0]);
}

async function findCharacterById(id) {
  const { rows } = await query('SELECT * FROM characters WHERE id = $1', [id]);
  return rows.length > 0 ? toCharacter(rows[0]) : undefined;
}

async function listCharactersInCampaign(campaignId) {
  const { rows } = await query('SELECT * FROM characters WHERE campaign_id = $1 ORDER BY name, id', [campaignId]);
  return rows.map(toCharacter);
}

async function updateCharacter(id, changes) {
  const update = buildUpdate('characters', id, changes, EDITABLE_COLUMNS, 'Character');
  if (update === undefined) {
    return findCharacterById(id);
  }
  const { rows } = await query(update.text, update.values);
  return rows.length > 0 ? toCharacter(rows[0]) : undefined;
}

module.exports = { createCharacter, findCharacterById, listCharactersInCampaign, updateCharacter };
