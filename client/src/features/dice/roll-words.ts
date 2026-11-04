import type { Roll } from './dice-api';

export const MAX_DICE_SHOWN = 6;

export function listWords(values: number[]) {
  if (values.length <= 1) return values.join('');
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1) ?? ''}`;
}

export function rollMath(roll: Roll) {
  const dice = roll.results.length > MAX_DICE_SHOWN ? `${roll.results.length} dice` : listWords(roll.results);
  if (roll.modifier === 0) return roll.results.length === 1 ? '' : dice;
  return `${dice}, ${roll.modifier > 0 ? 'plus' : 'minus'} ${Math.abs(roll.modifier)}`;
}

export function rollDetail(roll: Roll) {
  return roll.results.length >= 2 && roll.results.length <= 4 ? ` (${listWords(roll.results)})` : '';
}
