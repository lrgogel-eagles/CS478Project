const { query } = require('../db/pool');
const { DuplicateEmailError, isUniqueViolation } = require('./errors');

function toUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

async function createUser({ email, passwordHash, displayName }) {
  const trimmedEmail = email.trim();
  try {
    const { rows } = await query('INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING *', [
      trimmedEmail,
      passwordHash,
      displayName.trim(),
    ]);
    return toUser(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err, 'users_email_unique')) {
      throw new DuplicateEmailError(trimmedEmail, { cause: err });
    }
    throw err;
  }
}

async function findLoginByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [email.trim()]);
  if (rows.length === 0) {
    return undefined;
  }
  return { user: toUser(rows[0]), passwordHash: rows[0].password_hash };
}

async function findUserById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows.length > 0 ? toUser(rows[0]) : undefined;
}

module.exports = { createUser, findLoginByEmail, findUserById };
