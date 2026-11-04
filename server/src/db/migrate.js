const fs = require('node:fs/promises');
const path = require('node:path');
const { query, withTransaction, closePool } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'db', 'migrations');

async function migrate() {
  await query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const { rows } = await query('SELECT name FROM schema_migrations');
  const appliedNames = new Set(rows.map((row) => row.name));
  const fileNames = (await fs.readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();
  const newlyApplied = [];
  for (const name of fileNames) {
    if (appliedNames.has(name)) {
      continue;
    }
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, name), 'utf8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
    });
    newlyApplied.push(name);
  }
  return newlyApplied;
}

if (require.main === module) {
  migrate()
    .then((names) => {
      console.log(names.length > 0 ? `Applied ${names.join(', ')}` : 'Database is up to date');
    })
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}

module.exports = { migrate };
