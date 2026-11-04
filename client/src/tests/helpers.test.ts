import { describe, expect, it } from 'vitest';
import { abilityModifier, characterSummary, signedModifier } from '../features/characters/ability-scores';
import { dieKindOf, isNaturalOne, isNaturalTwenty, validNotation } from '../features/dice/notation';
import { listWords, rollDetail, rollMath } from '../features/dice/roll-words';
import { formatSessionDate, isDateText, todayText } from '../features/notes/note-dates';
import { makeRoll } from './fixtures';

describe('validNotation', () => {
  it.each(['d20', '2d6+3', '1d20-1', '100d100', '4D8', ' 3d10 '])('accepts %s', (notation) => {
    expect(validNotation(notation)).toBe(true);
  });

  it.each(['abc', 'd', '2d7', '2d1000', '0d6', '101d6', '2d6+', '2d6 + 3', `1d20+${'9'.repeat(40)}`])('rejects %s', (notation) => {
    expect(validNotation(notation)).toBe(false);
  });
});

describe('dice words', () => {
  it('finds the die in an expression', () => {
    expect(dieKindOf('3d8+2')).toBe('d8');
    expect(dieKindOf('d100')).toBe('d100');
    expect(dieKindOf('nonsense')).toBe('d20');
  });

  it('spots a natural 20 or 1 only on a single d20', () => {
    expect(isNaturalTwenty('1d20+5', [20])).toBe(true);
    expect(isNaturalTwenty('2d20', [20, 3])).toBe(false);
    expect(isNaturalOne('d20', [1])).toBe(true);
    expect(isNaturalOne('1d6', [1])).toBe(false);
  });

  it('reads out the dice like a person would', () => {
    expect(listWords([4])).toBe('4');
    expect(listWords([4, 6])).toBe('4 and 6');
    expect(listWords([4, 6, 2])).toBe('4, 6 and 2');
    expect(rollMath(makeRoll(1, '1d20', [12], 0))).toBe('');
    expect(rollMath(makeRoll(1, '1d20-1', [12], -1))).toBe('12, minus 1');
    expect(rollMath(makeRoll(1, '8d6', [1, 2, 3, 4, 5, 6, 1, 2], 3))).toBe('8 dice, plus 3');
    expect(rollDetail(makeRoll(1, '1d20', [12], 0))).toBe('');
    expect(rollDetail(makeRoll(1, '3d6', [1, 2, 3], 0))).toBe(' (1, 2 and 3)');
    expect(rollDetail(makeRoll(1, '5d6', [1, 2, 3, 4, 5], 0))).toBe('');
  });
});

describe('ability scores', () => {
  it.each([
    [1, -5, '−5'],
    [8, -1, '−1'],
    [10, 0, '+0'],
    [11, 0, '+0'],
    [16, 3, '+3'],
    [30, 10, '+10'],
  ])('gives a score of %i a modifier of %i', (score, modifier, text) => {
    expect(abilityModifier(score)).toBe(modifier);
    expect(signedModifier(score)).toBe(text);
  });

  it('sums up race, class and level', () => {
    expect(characterSummary({ race: 'Dwarf', charClass: 'fighter', level: 3 })).toBe('Dwarf fighter, level 3');
    expect(characterSummary({ race: '', charClass: 'wizard', level: 1 })).toBe('wizard, level 1');
    expect(characterSummary({ race: '', charClass: '', level: 7 })).toBe('Level 7');
  });
});

describe('session dates', () => {
  it('checks the date is real', () => {
    expect(isDateText('2026-11-04')).toBe(true);
    expect(isDateText('2026-02-30')).toBe(false);
    expect(isDateText('11/04/2026')).toBe(false);
    expect(isDateText('')).toBe(false);
  });

  it('writes the date out the short way', () => {
    expect(formatSessionDate('2026-01-09')).toBe('Jan 9, 2026');
    expect(formatSessionDate('not a date')).toBe('not a date');
  });

  it("uses the local day for today's date", () => {
    expect(todayText(new Date(2026, 10, 4, 23, 30))).toBe('2026-11-04');
    expect(todayText(new Date(2027, 0, 1, 0, 5))).toBe('2027-01-01');
  });
});
