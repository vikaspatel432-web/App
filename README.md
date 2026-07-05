# SP Consultants BIM Portal

A white-labeled BIM collaboration portal built on top of [Speckle](https://speckle.systems). Instead of giving
clients direct access to Speckle, they log into this branded portal, see only the projects your team has
explicitly shared with them, and view/browse models through an embedded 3D viewer — all without ever seeing
Speckle's own UI, URLs, or login screen.

## How it's built

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Prisma 7 + PostgreSQL** for the portal's own data: client organizations, user logins, and which Speckle
  project IDs each client is allowed to see (any Postgres works; Neon's free tier is used in the deploy guide
  below)
- **Custom session auth** (signed JWT cookie via `jose`, following Next.js's own [recommended
  pattern](https://nextjs.org/docs/app/guides/authentication)) — no third-party auth SaaS required
- **Speckle GraphQL API** called server-side only, using a single service-account Personal Access Token
  (`SPECKLE_TOKEN`) that never reaches the browser
- **`@speckle/viewer`** for the embedded 3D viewer

### Access model

There are two roles:

- **ADMIN** (your team) — manages client organizations, their user logins, and which Speckle project IDs are
  shared with each one. Admins see every project visible to the connected Speckle service account.
- **CLIENT** (your clients' users) — see only the projects explicitly mapped to their organization in
  `/admin`. They never see a Speckle login screen, Speckle branding, or any project you haven't shared with
  them.

This mapping lives in the portal's own database (`ClientOrg`, `User`, `ProjectAccess` in
`prisma/schema.prisma`), completely separate from Speckle's own permission system. Your Speckle service
account needs access to every project you intend to expose through the portal (invite it as a collaborator
on those projects in Speckle).

## Environment variables

Set these in `.env` for local development, and in your host's dashboard for production (see `.env.example`):

| Variable | What it is |
|----------|------------|
| `DATABASE_URL` | PostgreSQL connection string. On Neon/Vercel Postgres this is generated for you. |
| `SESSION_SECRET` | Random secret that signs login cookies. Generate with `openssl rand -base64 32`. |
| `SPECKLE_SERVER_URL` | `https://app.speckle.systems` for Speckle's cloud, or your self-hosted server URL. |
| `SPECKLE_TOKEN` | A Personal Access Token for a service Speckle account (`{SPECKLE_SERVER_URL}/settings/profile/tokens`) that can see every project you'll share. **Server-side only — never exposed to the browser.** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | The first admin login, created by the seed script. |
| `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_PRIMARY_COLOR`, `NEXT_PUBLIC_LOGO_URL` | White-label branding. |

## Local development

```bash
npm install
cp .env.example .env      # then fill in the values above (you need a Postgres URL)
npx prisma migrate deploy # create the tables
npx prisma db seed        # create the first admin login
npm run dev
```

Then open http://localhost:3000, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, and go to `/admin` to create
a client organization, share Speckle project IDs with it (a project ID is the `<id>` in its Speckle URL:
`/projects/<id>`), and create login credentials for that client's users.

## Deploying to Vercel

1. **Create a Postgres database.** In the Vercel dashboard → Storage → create a Postgres database (or use
   [Neon](https://neon.tech)'s free tier). Copy its connection string.
2. **Import the repo.** Vercel → Add New → Project → import this GitHub repo. Vercel auto-detects Next.js.
3. **Set Environment Variables** (Project → Settings → Environment Variables) — every variable from the table
   above. Use the Postgres connection string from step 1 for `DATABASE_URL`.
4. **Deploy.** Vercel automatically runs the `vercel-build` script, which applies database migrations, creates
   the first admin login, and builds the app. No manual database setup needed.
5. Visit your `*.vercel.app` URL, sign in, and you're live. Attach a custom domain later under
   Project → Settings → Domains.

> The generated Prisma client (`src/generated/prisma`) is intentionally gitignored; the `postinstall` script
> regenerates it on every install, including on Vercel.

**Note on the build tooling:** `npm run dev` / `npm run build` are pinned to `next dev --webpack` /
`next build --webpack`. Next.js 16 defaults to Turbopack, but `@speckle/viewer`'s dependency
`@speckle/shared` uses a `#lodash` subpath import that Turbopack currently fails to resolve. Webpack handles
it fine — revisit this once upstream fixes land.

## Known limitations / next steps

- **The 3D viewer loads models anonymously.** The service token is intentionally kept server-side only (see
  "Why the token never reaches the browser" below), so `SpeckleViewer` fetches model geometry directly from
  Speckle without a token. This means **only Speckle projects/models set to "Public" or "Anyone with the
  link" will actually render** for clients today. For fully private projects, add a server-side proxy route
  that streams Speckle's object-loading endpoints through this app (checking the requesting user's
  `ProjectAccess` first) so the browser never needs its own token — the Speckle team has discussed exactly
  this pattern in their [community forum](https://speckle.community/t/proposed-feature-to-proxy-requests-through-another-server-to-avoid-exposing-api-key-on-frontend/15283).
- **Comment threads are read-only and best-effort.** `src/lib/speckle/queries.ts`'s `getCommentThreads`
  query is written against Speckle's documented v2 schema, but comment/rich-text field names have shifted
  across Speckle server versions. Verify the `commentThreads` query against your own server's GraphQL
  playground (`{SPECKLE_SERVER_URL}/graphql`) before relying on it, and adjust field names there if needed.
  Posting new comments isn't implemented yet — Speckle's comment-creation mutation expects a structured
  rich-text document body, which needs confirming against your server's live schema.
- **No self-serve client signup.** Admins create client logins by hand in `/admin`. Fine for a small number
  of clients; add invite emails / password reset if this grows.

### Why the token never reaches the browser

`SPECKLE_TOKEN` belongs to one service account that (by necessity) has access to every project shared through
this portal. If that token were sent to the browser so the viewer could load private objects directly, any
logged-in client could read it out of the page and use it to access every other client's projects too. So
all Speckle GraphQL calls happen in `src/lib/speckle/*` (server-only modules), and every query is scoped to
the caller's `ProjectAccess` rows before anything is returned to a client (see `src/lib/dal.ts`).

## Project structure

```
prisma/schema.prisma          Portal DB schema: User, ClientOrg, ProjectAccess
prisma/seed.ts                 Creates the first admin login
proxy.ts                       Route protection (Next 16's replacement for middleware.ts)
src/lib/session.ts              Signed-cookie session helpers
src/lib/dal.ts                  Auth/authorization checks used by every page and Server Action
src/lib/speckle/client.ts       Server-only Speckle GraphQL client (holds SPECKLE_TOKEN)
src/lib/speckle/queries.ts      Project/model/version/comment queries
src/components/SpeckleViewer.tsx   Embedded 3D viewer (client component)
src/app/(login, page, projects/[projectId], projects/[projectId]/models/[modelId])
src/app/admin/                  Admin panel: client orgs, users, project-access mappings
```
