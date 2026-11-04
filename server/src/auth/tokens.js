const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';
const TOKEN_LIFETIME = '7d';
const TEST_SECRET = 'campaign-keeper-test-secret';

function readJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'test') {
    return TEST_SECRET;
  }
  throw new Error('JWT_SECRET is not set. Set it to a long random string before you start the server.');
}

function signToken(userId) {
  return jwt.sign({}, readJwtSecret(), { algorithm: ALGORITHM, subject: String(userId), expiresIn: TOKEN_LIFETIME });
}

function readTokenUserId(token) {
  let payload;
  try {
    payload = jwt.verify(token, readJwtSecret(), { algorithms: [ALGORITHM] });
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return undefined;
    }
    throw err;
  }
  const userId = Number(payload.sub);
  return Number.isInteger(userId) ? userId : undefined;
}

module.exports = { readJwtSecret, signToken, readTokenUserId };
