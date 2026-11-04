const { Pool, types } = require('pg');

types.setTypeParser(types.builtins.DATE, (value) => value);

let pool;

function readDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Point it at your PostgreSQL database, for example postgres://postgres:postgres@localhost:5432/campaign_keeper');
  }
  return url;
}

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: readDatabaseUrl() });
  }
  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    const closing = pool;
    pool = undefined;
    await closing.end();
  }
}

module.exports = { query, withTransaction, closePool };
