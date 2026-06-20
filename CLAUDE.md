# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

GymLog is a mobile-first PWA training diary. React 18 + TypeScript + Vite (client), Express + Drizzle ORM (server), PostgreSQL on Neon, deployed on Render free tier. UI is bilingual (Russian default / English).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (client + API) on http://localhost:5000 via `tsx server/index.ts` |
| `npm run build` | **Runs `drizzle-kit push --force` against the live DB**, then builds client (Vite) + server (esbuild → `dist/index.cjs`) |
| `npm start` | Run the production bundle (`dist/index.cjs`) |
| `npm run db:push` | Apply `shared/schema.ts` to the DB (`drizzle-kit push --force`) |
| `npm run check` | `tsc` typecheck |

There is **no test suite and no linter** configured. Verify changes with `npx tsc --noEmit` and by running the app.

`npx tsc --noEmit` currently reports ~4 **pre-existing** errors (missing `bcryptjs` types ×3; a `User | undefined` arg in `server/routes.ts`). These predate current work — don't treat them as regressions, but don't add new ones.

## Environment

`.env` is gitignored; each developer needs their own. Copy `.env.example` and fill in. Required: `DATABASE_URL` (Neon). For push notifications: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:`), `PUSH_CRON_SECRET`. The app boots fine without VAPID keys (push just disables itself with a warning).

## Architecture

**Single Express process serves both API and client.** In dev, Vite runs as middleware; in prod, `server/static.ts` serves `dist/public` and falls through to `index.html`. The client lives under `client/` (Vite root), server under `server/`, shared types in `shared/`.

**Client routing is HASH-based.** `App.tsx` uses wouter with `useHashLocation`, and `main.tsx` forces `#/` on load. This matters for anything generating URLs that open the app — e.g. push notification click targets must be `/#/friends`, not `/friends` (see `server/routes.ts` / `server/push.ts`).

**Global state is React Context, not a store library.** `App.tsx` defines `useAuth` (current user + `login`/`logout`), `useTheme`, `useLang`. `login(u)` just sets the in-memory user — call it after any `PATCH /api/users/:id` to refresh fields like `goal` / `activeProgramId` / push prefs. Per-user transient state (e.g. active workout id) is in `client/src/lib/store.ts` (localStorage).

**Data layer goes through one storage object.** `server/storage.ts` exports `storage` implementing the `IStorage` interface — all DB access lives here (Drizzle queries). Routes never touch `db` directly. Adding a DB operation = add to the interface + the implementation, then call from `server/routes.ts`.

**Auth:** Passport local strategy + `express-session` backed by Postgres (`connect-pg-simple`). Protect routes with the `requireAuth` middleware; ownership checks compare `(req.user as any).id`. `PATCH /api/users/:id` validates with `insertUserSchema.partial()`, so **any column added to the `users` table is automatically accepted** by that endpoint (this is how goal, push prefs, and activeProgramId are saved — no new route needed).

**i18n:** `client/src/lib/i18n.ts` holds a nested `{ ru, en }` dictionary accessed via `t("key.path", lang)`. Many components also inline `lang === "ru" ? "…" : "…"` for one-off strings — both patterns are acceptable; match the surrounding file. Exercise names have a separate RU map in `client/src/lib/exerciseNames.ts`.

## Database: schema is the source of truth, with a self-heal safety net

`shared/schema.ts` (Drizzle pgTable definitions) is authoritative. Two consequences a new contributor must internalize:

1. **`drizzle-kit push --force` (run by both `build` and `db:push`) DROPS columns that aren't in the schema.** Always add new fields to `shared/schema.ts` — never only to the live DB.

2. **`ensureTables()` in `server/index.ts` runs at every startup** and idempotently `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so the live DB self-heals across deploys. **When you add a table or column to `shared/schema.ts`, mirror it here too** (additive only). This is why prod survives schema drift even when a migration didn't run.

`server/seed.ts` exists (`seedDatabase()`) but is intentionally NOT called at startup — invoking it would create a default `admin`/`admin123` account. The prod DB is already seeded.

## Server bundling gotcha

`script/build.ts` bundles the server with esbuild and externalizes all node_modules **except** an explicit `allowlist`. A server dependency that must be bundled (e.g. `web-push`) has to be added to that allowlist, or the prod bundle will fail to resolve it at runtime.

## Deploy & conventions

- Render builds from `master` via `render.yaml` (`npm install && npm run build`, start `npm start`). `DATABASE_URL` and push env vars are set in the Render dashboard, not in the repo.
- This is a solo/small-team project that **commits directly to `master`**; pushing `master` triggers a Render deploy. Render free tier sleeps, so the first request after idle is slow, and internal timers are unreliable — scheduled work (push reminders) is driven by an external cron hitting `POST /api/push/run?token=<PUSH_CRON_SECRET>`.
