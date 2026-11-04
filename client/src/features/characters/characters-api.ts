import { isInteger, isObject, isText, readList, readOne } from '../../api/guards';
import { send } from '../../api/http';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

export type Ability = (typeof ABILITIES)[number];

export type AbilityScores = Record<Ability, number>;

export type Character = {
  id: number;
  campaignId: number;
  ownerId: number;
  name: string;
  race: string;
  charClass: string;
  level: number;
  hitPoints: number;
  abilityScores: AbilityScores;
  gold: number;
  updatedAt: string;
};

export type CharacterFields = Pick<Character, 'name' | 'race' | 'charClass' | 'level' | 'hitPoints' | 'abilityScores' | 'gold'>;

export const CHARACTER_LIMITS = {
  name: 60,
  label: 40,
  levelMin: 1,
  levelMax: 20,
  hitPointsMin: -999,
  hitPointsMax: 9999,
  scoreMin: 1,
  scoreMax: 30,
  goldMax: 2147483647,
} as const;

const ROUTES = {
  characters: (campaignId: number) => `/api/campaigns/${campaignId}/characters`,
  character: (campaignId: number, id: number) => `/api/campaigns/${campaignId}/characters/${id}`,
} as const;

function isAbilityScores(value: unknown): value is AbilityScores {
  return isObject(value) && ABILITIES.every((ability) => isInteger(value[ability]));
}

function isCharacter(value: unknown): value is Character {
  return (
    isObject(value) &&
    isInteger(value.id) &&
    isInteger(value.campaignId) &&
    isInteger(value.ownerId) &&
    isText(value.name) &&
    isText(value.race) &&
    isText(value.charClass) &&
    isInteger(value.level) &&
    isInteger(value.hitPoints) &&
    isAbilityScores(value.abilityScores) &&
    isInteger(value.gold) &&
    isText(value.updatedAt)
  );
}

export const charactersApi = {
  list: (campaignId: number) => send('GET', ROUTES.characters(campaignId)).then((data) => readList(data, isCharacter, 'character list')),
  get: (campaignId: number, id: number) => send('GET', ROUTES.character(campaignId, id)).then((data) => readOne(data, isCharacter, 'character')),
  create: (campaignId: number, fields: CharacterFields) =>
    send('POST', ROUTES.characters(campaignId), fields).then((data) => readOne(data, isCharacter, 'character')),
  update: (campaignId: number, id: number, fields: CharacterFields) =>
    send('PATCH', ROUTES.character(campaignId, id), fields).then((data) => readOne(data, isCharacter, 'character')),
};
