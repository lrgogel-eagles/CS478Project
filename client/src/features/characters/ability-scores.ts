import type { Ability, Character } from './characters-api';

export const ABILITY_LABELS = {
  str: 'Str',
  dex: 'Dex',
  con: 'Con',
  int: 'Int',
  wis: 'Wis',
  cha: 'Cha',
} as const satisfies Record<Ability, string>;

export function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function signedModifier(score: number) {
  const modifier = abilityModifier(score);
  return modifier < 0 ? `−${Math.abs(modifier)}` : `+${modifier}`;
}

export function characterSummary(character: Pick<Character, 'race' | 'charClass' | 'level'>) {
  const kind = [character.race, character.charClass].filter((part) => part !== '').join(' ');
  return kind === '' ? `Level ${character.level}` : `${kind}, level ${character.level}`;
}
