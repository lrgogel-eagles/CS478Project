import { isInteger, isObject, isText, readList, readOne } from '../../api/guards';
import { send } from '../../api/http';

export type Roll = {
  id: number;
  campaignId: number;
  userId: number;
  displayName: string;
  expression: string;
  results: number[];
  modifier: number;
  total: number;
  rolledAt: string;
};

export const DICE_LIMITS = {
  expression: 40,
  recentRolls: 20,
} as const;

const ROUTES = {
  rolls: (campaignId: number) => `/api/campaigns/${campaignId}/rolls`,
} as const;

function isRoll(value: unknown): value is Roll {
  return (
    isObject(value) &&
    isInteger(value.id) &&
    isInteger(value.campaignId) &&
    isInteger(value.userId) &&
    isText(value.displayName) &&
    isText(value.expression) &&
    Array.isArray(value.results) &&
    value.results.every(isInteger) &&
    isInteger(value.modifier) &&
    isInteger(value.total) &&
    isText(value.rolledAt)
  );
}

export const diceApi = {
  recent: (campaignId: number) =>
    send('GET', `${ROUTES.rolls(campaignId)}?limit=${DICE_LIMITS.recentRolls}`).then((data) => readList(data, isRoll, 'roll list')),
  roll: (campaignId: number, expression: string) => send('POST', ROUTES.rolls(campaignId), { expression }).then((data) => readOne(data, isRoll, 'roll')),
};
