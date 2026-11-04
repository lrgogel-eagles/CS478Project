const express = require('express');
const { createCharacter, findCharacterById, listCharactersInCampaign, updateCharacter } = require('../data/characters');
const { HttpError } = require('../http/errors');
const { readFields, readId, readOptionalText, readText, readWholeNumber } = require('../http/input');
const { requireMember } = require('./membership');

const NAME_MAX_LENGTH = 60;
const LABEL_MAX_LENGTH = 40;
const MAX_GOLD = 2147483647;
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function readAbilityScores(value) {
  const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
  const keys = isObject ? Object.keys(value) : [];
  if (!isObject || keys.length !== ABILITIES.length || !ABILITIES.every((ability) => keys.includes(ability))) {
    throw new HttpError(400, `Ability scores need exactly ${ABILITIES.join(', ')}`);
  }
  return Object.fromEntries(ABILITIES.map((ability) => [ability, readWholeNumber(value[ability], ability.toUpperCase(), 1, 30)]));
}

const CHARACTER_FIELDS = new Map([
  ['name', (value) => readText(value, 'Name', NAME_MAX_LENGTH)],
  ['race', (value) => readOptionalText(value, 'Race', LABEL_MAX_LENGTH)],
  ['charClass', (value) => readOptionalText(value, 'Class', LABEL_MAX_LENGTH)],
  ['level', (value) => readWholeNumber(value, 'Level', 1, 20)],
  ['hitPoints', (value) => readWholeNumber(value, 'Hit points', -999, 9999)],
  ['abilityScores', readAbilityScores],
  ['gold', (value) => readWholeNumber(value, 'Gold', 0, MAX_GOLD)],
]);

const router = express.Router({ mergeParams: true });

async function findCharacterInCampaign(req) {
  const id = readId(req.params.characterId);
  const character = id === undefined ? undefined : await findCharacterById(id);
  if (!character || character.campaignId !== req.membership.campaign.id) {
    throw new HttpError(404, 'Character not found');
  }
  return character;
}

router.get('/', requireMember, async (req, res) => {
  res.json(await listCharactersInCampaign(req.membership.campaign.id));
});

router.post('/', requireMember, async (req, res) => {
  const fields = readFields(req.body ?? {}, CHARACTER_FIELDS, 'character');
  if (fields.name === undefined) {
    throw new HttpError(400, 'Name is required');
  }
  const character = await createCharacter({ campaignId: req.membership.campaign.id, ownerId: req.user.id, ...fields });
  res.status(201).json(character);
});

router.get('/:characterId', requireMember, async (req, res) => {
  res.json(await findCharacterInCampaign(req));
});

router.patch('/:characterId', requireMember, async (req, res) => {
  const character = await findCharacterInCampaign(req);
  if (character.ownerId !== req.user.id && req.membership.role !== 'GM') {
    throw new HttpError(403, "Only the character's owner or the GM can edit it");
  }
  const changes = readFields(req.body ?? {}, CHARACTER_FIELDS, 'character');
  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, 'Send at least one field to change');
  }
  const updated = await updateCharacter(character.id, changes);
  if (!updated) {
    throw new HttpError(404, 'Character not found');
  }
  res.json(updated);
});

module.exports = router;
