# Campaign Keeper

A web app for running tabletop RPG campaigns. Characters, quests, NPCs, session notes, and a calendar for scheduling the next game night, with role-based views.

Team 6 - CS478 Software Development, USI, Fall 2026

- Cooper Clark (team lead)
- Yingjing Yang
- Landen Gogel

## Planned stack

React with TypeScript and Bootstrap on the front end, Node.js with Express on the back end, PostgreSQL for data, Jest for tests, Socket.IO for live updates.

## Run it locally

You need Node 22.9 or newer and PostgreSQL. Make an empty database for the app:

```bash
createdb -U postgres campaign_keeper
```

Set up the server:

```bash
cd server
npm install
cp .env.example .env
```

Put a long random string after `JWT_SECRET=` in `server/.env`, and change `DATABASE_URL` if your PostgreSQL user, password or port is different. This prints one you can paste in:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Load the tables and the demo campaign, then start the API on port 3000:

```bash
npm run db:seed
npm start
```

`db:seed` only runs on an empty database. `npm run db:migrate` adds the tables without the demo data.

Start the client in a second terminal and open http://localhost:5173:

```bash
cd client
npm install
npm run dev
```

The demo campaign's accounts can't log in. Sign up for your own and join "The Sunken Keep" with invite code `KEEP42`.

### Server tests

The tests wipe their database, so they only run on one whose name ends in `_test`:

```bash
createdb -U postgres campaign_keeper_test
cd server
DATABASE_URL=postgres://postgres:postgres@localhost:5432/campaign_keeper_test npm test
```

## Docs

The [project proposal](https://github.com/lrgogel-eagles/CS478Project/wiki) lives on the wiki, along with dev setup and weekly progress.
