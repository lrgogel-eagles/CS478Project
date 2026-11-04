# Campaign Keeper client (Phase I)

React + TypeScript + Bootstrap + Fetch API, with Vitest page tests.

## Start

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. Backend API is proxied to http://localhost:3000; change `vite.config.ts` if needed.

## Test

```bash
npm test
npm run build
```

## API

`src/api/client.ts` calls the routes listed on the wiki's API Routes page. `LIMITS` in the same file holds the database's length limits, and the inputs use them.

Pages are `/login`, `/campaigns` and `/campaigns/:id/dice`. If you aren't logged in you get sent to `/login`.
