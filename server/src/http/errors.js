const { DuplicateEmailError, AlreadyMemberError } = require('../data/errors');
const { InvalidNotationError } = require('../dice');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function isClientError(status) {
  return Number.isInteger(status) && status >= 400 && status < 500;
}

function describeError(err) {
  if (err instanceof HttpError) {
    return { status: err.status, message: err.message };
  }
  if (err instanceof InvalidNotationError) {
    return { status: 400, message: err.message };
  }
  if (err instanceof DuplicateEmailError) {
    return { status: 409, message: 'Email already in use' };
  }
  if (err instanceof AlreadyMemberError) {
    return { status: 409, message: 'You are already in this campaign' };
  }
  if (err.type === 'entity.parse.failed') {
    return { status: 400, message: "The request body isn't valid JSON" };
  }
  if (err.type === 'entity.too.large') {
    return { status: 413, message: 'The request is too large' };
  }
  if (err.expose === true && isClientError(err.status)) {
    return { status: err.status, message: "The server couldn't read the request" };
  }
  return undefined;
}

function handleUnknownRoute(req, res) {
  res.status(404).json({ error: 'Not found' });
}

function handleError(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  const known = describeError(err);
  if (known) {
    res.status(known.status).json({ error: known.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Try again' });
}

module.exports = { HttpError, handleUnknownRoute, handleError };
