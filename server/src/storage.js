const fs = require('fs');
const path = require('path');

function createStorage(dataFile) {
  let cached = null;
  let pool = null;
  let pending = Promise.resolve();

  function localRead() {
    try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return { campaigns: [], users: [] }; throw error; }
  }

  async function tables(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, data JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, invite_code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL, data JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS memberships (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK(role IN ('gm','player')), ready BOOLEAN NOT NULL DEFAULT FALSE, data JSONB NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS one_gm_per_campaign ON memberships(campaign_id) WHERE role = 'gm';
      CREATE UNIQUE INDEX IF NOT EXISTS one_account_per_campaign ON memberships(campaign_id,user_id) WHERE user_id IS NOT NULL;
      CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, name TEXT NOT NULL, level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 20), data JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS session_notes (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, gm_only BOOLEAN NOT NULL DEFAULT FALSE, data JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS dice_rolls (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, data JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS quests (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, data JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, data JSONB NOT NULL);
      CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, data JSONB NOT NULL);
    `);
  }

  async function readDatabase(client) {
    const users = (await client.query('SELECT data FROM users ORDER BY id')).rows.map(row => row.data);
    const campaigns = (await client.query('SELECT data FROM campaigns ORDER BY id')).rows.map(row => row.data);
    const memberRows = (await client.query('SELECT campaign_id, data FROM memberships')).rows;
    const collections = { characters: 'characters', notes: 'session_notes', quests: 'quests', events: 'calendar_events', activity: 'activity' };
    const byType = {};
    for (const [key, table] of Object.entries(collections)) byType[key] = (await client.query(`SELECT campaign_id, data FROM ${table}`)).rows;
    for (const campaign of campaigns) {
      campaign.members = memberRows.filter(row => row.campaign_id === campaign.id).map(row => row.data);
      for (const key of Object.keys(collections)) campaign[key] = byType[key].filter(row => row.campaign_id === campaign.id).map(row => row.data);
    }
    return { users, campaigns };
  }

  async function writeDatabase(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const table of ['dice_rolls','activity','calendar_events','quests','session_notes','characters','memberships','campaigns','users']) await client.query(`DELETE FROM ${table}`);
      for (const user of data.users || []) await client.query('INSERT INTO users(id,email,name,data) VALUES($1,$2,$3,$4::jsonb)', [user.id,user.email,user.name,JSON.stringify(user)]);
      const accountFor = new Map();
      for (const user of data.users || []) for (const entry of user.memberships || []) accountFor.set(`${entry.campaignId}:${entry.playerToken}`,user.id);
      for (const campaign of data.campaigns || []) {
        const { members, characters, notes, quests, events, activity, ...fields } = campaign;
        await client.query('INSERT INTO campaigns(id,invite_code,name,status,data) VALUES($1,$2,$3,$4,$5::jsonb)', [campaign.id,campaign.code,campaign.name,campaign.status,JSON.stringify(fields)]);
        for (const member of members || []) {
          const userId = accountFor.get(`${campaign.id}:${member.token}`) || null;
          await client.query('INSERT INTO memberships(id,campaign_id,user_id,role,ready,data) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [member.id,campaign.id,userId,member.role,!!member.ready,JSON.stringify(member)]);
        }
        for (const character of characters || []) await client.query('INSERT INTO characters(id,campaign_id,name,level,data) VALUES($1,$2,$3,$4,$5::jsonb)', [character.id,campaign.id,character.name||'Character',Math.max(1,Math.min(20,Number(character.level)||1)),JSON.stringify(character)]);
        for (const note of notes || []) await client.query('INSERT INTO session_notes(id,campaign_id,gm_only,data) VALUES($1,$2,$3,$4::jsonb)', [note.id,campaign.id,!!note.private,JSON.stringify(note)]);
        for (const [table,items] of [['quests',quests],['calendar_events',events],['activity',activity]]) for (const item of items || []) await client.query(`INSERT INTO ${table}(id,campaign_id,data) VALUES($1,$2,$3::jsonb)`, [item.id,campaign.id,JSON.stringify(item)]);
        for (const item of activity || []) if (item.kind === 'dice') await client.query('INSERT INTO dice_rolls(id,campaign_id,data) VALUES($1,$2,$3::jsonb)', [item.id,campaign.id,JSON.stringify(item)]);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async function initialize() {
    if (!process.env.DATABASE_URL) return;
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await tables(pool);
    const existing = await pool.query('SELECT COUNT(*)::integer AS count FROM campaigns');
    const accounts = await pool.query('SELECT COUNT(*)::integer AS count FROM users');
    if (existing.rows[0].count || accounts.rows[0].count) cached = await readDatabase(pool);
    else {
      const legacy = await pool.query("SELECT to_regclass('public.campaign_keeper_state') AS name");
      if (legacy.rows[0].name) {
        const result = await pool.query('SELECT data FROM campaign_keeper_state WHERE id = 1');
        cached = result.rows[0]?.data || localRead();
      } else cached = localRead();
      await writeDatabase(cached);
    }
    console.log('PostgreSQL relational persistence enabled');
  }

  function read() { return cached ? structuredClone(cached) : localRead(); }
  function save(data) {
    if (pool) {
      cached = structuredClone(data);
      const snapshot = structuredClone(data);
      pending = pending.then(() => writeDatabase(snapshot)).catch(error => console.error('PostgreSQL save failed:',error));
      return;
    }
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const temp = `${dataFile}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2));
    fs.renameSync(temp, dataFile);
  }
  return { read, save, initialize };
}
module.exports = { createStorage };
