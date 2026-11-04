import { DICE_LIMITS } from './dice-api';

export const DIE_KINDS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const;

export type DieKind = (typeof DIE_KINDS)[number];

const DIE_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);
const MAX_DICE = 100;

export function validNotation(value: string) {
  const text = value.trim();
  if (text.length > DICE_LIMITS.expression) return false;
  const match = /^(\d*)d(\d+)([+-]\d+)?$/i.exec(text);
  if (!match) return false;
  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  return count >= 1 && count <= MAX_DICE && DIE_SIDES.has(sides);
}

export function dieKindOf(expression: string): DieKind {
  const match = /d(\d+)/i.exec(expression);
  const kind = match ? `d${match[1]}` : 'd20';
  return DIE_KINDS.find((known) => known === kind) ?? 'd20';
}

export function signed(modifier: number) {
  return modifier < 0 ? `−${Math.abs(modifier)}` : `+${modifier}`;
}

export function isNaturalTwenty(expression: string, results: number[]) {
  return /^1?d20([+-]\d+)?$/i.test(expression) && results[0] === 20;
}

export function isNaturalOne(expression: string, results: number[]) {
  return /^1?d20([+-]\d+)?$/i.test(expression) && results[0] === 1;
}
