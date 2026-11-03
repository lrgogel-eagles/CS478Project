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

## Integration checklist

**IMPORTANT:** `src/api/client.ts` has provisional API routes because the wiki's API Routes page was not accessible. Match `ROUTES`, JSON request bodies, response types, and token/session handling to the actual backend before demo. The frontend expects login/signup to return `{token,user}`, campaign list to return an array or `{campaigns:[...]}`, creation/join to return a campaign object, and dice roll to return `{dice:[...],total,modifier?}`. Backend must enforce authentication and authorize campaign access; client redirects are not a security boundary.

Frontend pages: `/login`, `/campaigns`, `/dice`. Unauthenticated visitors are redirected to `/login`.

No backend or GitHub repository files were changed by this generated package.
