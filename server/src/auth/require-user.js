const { findUserById } = require('../data/users');
const { HttpError } = require('../http/errors');
const { readTokenUserId } = require('./tokens');

const BEARER = /^Bearer (\S+)$/i;

async function requireUser(req, res, next) {
  const match = BEARER.exec(req.get('Authorization') ?? '');
  if (!match) {
    throw new HttpError(401, 'You need to log in');
  }
  const userId = readTokenUserId(match[1]);
  const user = userId === undefined ? undefined : await findUserById(userId);
  if (!user) {
    throw new HttpError(401, 'Your session has expired. Log in again');
  }
  req.user = user;
  next();
}

module.exports = { requireUser };
