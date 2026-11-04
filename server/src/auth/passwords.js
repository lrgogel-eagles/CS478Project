const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

const SCHEME = 'scrypt';
const SALT_BYTES = 16;
const KEY_BYTES = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEY_BYTES);
  return [SCHEME, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, storedHash) {
  const [scheme, saltText, keyText, ...extra] = storedHash.split('$');
  if (scheme !== SCHEME || saltText === undefined || keyText === undefined || extra.length > 0) {
    return false;
  }
  const expected = Buffer.from(keyText, 'base64');
  if (expected.length !== KEY_BYTES) {
    return false;
  }
  const actual = await scrypt(password, Buffer.from(saltText, 'base64'), KEY_BYTES);
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
