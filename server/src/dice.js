const crypto = require('node:crypto');

const NOTATION = /^(\d*)d(\d+)([+-]\d+)?$/i;
const MAX_LENGTH = 40;
const MAX_DICE = 100;
const MAX_MODIFIER = 10000;
const DIE_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);

class InvalidNotationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidNotationError';
  }
}

function parseNotation(text) {
  const match = text.length <= MAX_LENGTH ? NOTATION.exec(text) : null;
  if (!match) {
    throw new InvalidNotationError('Invalid dice notation. Try something like 2d6+3 or 1d20-1');
  }
  const count = match[1] === '' ? 1 : Number(match[1]);
  const sides = Number(match[2]);
  const modifier = Number(match[3] ?? 0);
  if (count < 1 || count > MAX_DICE) {
    throw new InvalidNotationError(`You can roll 1 to ${MAX_DICE} dice at a time`);
  }
  if (!DIE_SIDES.has(sides)) {
    throw new InvalidNotationError('Dice can be d4, d6, d8, d10, d12, d20 or d100');
  }
  if (Math.abs(modifier) > MAX_MODIFIER) {
    throw new InvalidNotationError(`The modifier has to be between -${MAX_MODIFIER} and +${MAX_MODIFIER}`);
  }
  return { count, sides, modifier };
}

function formatNotation({ count, sides, modifier }) {
  if (modifier === 0) {
    return `${count}d${sides}`;
  }
  return `${count}d${sides}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;
}

function rollDice({ count, sides, modifier }) {
  const results = Array.from({ length: count }, () => crypto.randomInt(1, sides + 1));
  const total = results.reduce((sum, die) => sum + die, modifier);
  return { results, total };
}

module.exports = { InvalidNotationError, parseNotation, formatNotation, rollDice };
