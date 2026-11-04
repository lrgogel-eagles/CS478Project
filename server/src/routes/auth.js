const express = require('express');
const { createUser, findLoginByEmail } = require('../data/users');
const { hashPassword, verifyPassword } = require('../auth/passwords');
const { signToken } = require('../auth/tokens');
const { requireUser } = require('../auth/require-user');
const { HttpError } = require('../http/errors');
const { readText } = require('../http/input');

const EMAIL_MAX_LENGTH = 254;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;
const DISPLAY_NAME_MAX_LENGTH = 40;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 72;

const router = express.Router();

function readPassword(value) {
  if (typeof value !== 'string' || value === '') {
    throw new HttpError(400, 'Password is required');
  }
  return value;
}

function readNewEmail(value) {
  const email = readText(value, 'Email', EMAIL_MAX_LENGTH);
  if (!EMAIL_SHAPE.test(email)) {
    throw new HttpError(400, 'Enter a valid email');
  }
  return email;
}

function readNewPassword(value) {
  const password = readPassword(value);
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new HttpError(400, `Password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`);
  }
  return password;
}

router.post('/auth/register', async (req, res) => {
  const body = req.body ?? {};
  const email = readNewEmail(body.email);
  const password = readNewPassword(body.password);
  const displayName = readText(body.displayName, 'Display name', DISPLAY_NAME_MAX_LENGTH);
  const user = await createUser({ email, passwordHash: await hashPassword(password), displayName });
  res.status(201).json({ user, token: signToken(user.id) });
});

router.post('/auth/login', async (req, res) => {
  const body = req.body ?? {};
  const email = readText(body.email, 'Email');
  const password = readPassword(body.password);
  const login = await findLoginByEmail(email);
  if (!login || !(await verifyPassword(password, login.passwordHash))) {
    throw new HttpError(401, 'Wrong email or password');
  }
  res.json({ user: login.user, token: signToken(login.user.id) });
});

router.get('/me', requireUser, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
