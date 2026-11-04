const crypto = require('node:crypto');
const { InviteCodeTakenError } = require('./data/errors');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 5;

function makeInviteCode() {
  return Array.from({ length: CODE_LENGTH }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
}

async function withNewInviteCode(save) {
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await save(makeInviteCode());
    } catch (err) {
      if (!(err instanceof InviteCodeTakenError)) {
        throw err;
      }
    }
  }
  return save(makeInviteCode());
}

module.exports = { withNewInviteCode };
