const { query, closePool } = require('../../src/db/pool');
const { migrate } = require('../../src/db/migrate');

async function assertTestDatabase() {
  const { rows } = await query('SELECT current_database() AS name');
  const { name } = rows[0];
  if (!name.endsWith('_test')) {
    throw new Error(`Tests wipe the database, so they only run on one whose name ends in _test. DATABASE_URL points at "${name}".`);
  }
}

async function resetSchema() {
  await assertTestDatabase();
  await query('DROP SCHEMA public CASCADE');
  await query('CREATE SCHEMA public');
  await migrate();
}

async function clearData() {
  await query('TRUNCATE users, campaigns RESTART IDENTITY CASCADE');
}

function useTestDatabase() {
  beforeAll(resetSchema);
  beforeEach(clearData);
  afterAll(closePool);
}

module.exports = { useTestDatabase };
