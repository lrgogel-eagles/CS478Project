const fs = require('node:fs/promises');
const path = require('node:path');
const { query, withTransaction, closePool } = require('./pool');
const { migrate } = require('./migrate');

const SEED_FILE = path.join(__dirname, '..', '..', 'db', 'seed.sql');

async function seed() {
  await migrate();
  const { rows } = await query('SELECT count(*)::int AS user_count FROM users');
  if (rows[0].user_count > 0) {
    throw new Error('The database already has users, so the demo seed was not loaded. Run it on an empty database.');
  }
  const sql = await fs.readFile(SEED_FILE, 'utf8');
  await withTransaction((client) => client.query(sql));
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('Loaded the demo campaign "The Sunken Keep" (invite code KEEP42)');
    })
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}

module.exports = { seed };
