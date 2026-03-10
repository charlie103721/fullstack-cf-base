<img src="client/public/vite.svg" alt="Vite logo" width="80" />

# Fullstack CF Base

Full-stack template built with **Hono** + **React** running on **Cloudflare Workers**.

**Stack:** Hono (REST API), React 19, React Query, Better Auth, Drizzle ORM + PostgreSQL (via Hyperdrive), Tailwind CSS v4, Vite

---

## Setup

### 1. Create your project

```sh
cp -r fullstack-cf-base/ my-project/
cd my-project
bun install
```

Update `"name"` in both files:
- `package.json` — change `"name": "my-hono-app"` to your project name
- `wrangler.jsonc` — change `"name": "my-hono-app"` to your project name (this becomes your `*.workers.dev` subdomain)

### 2. Local

#### Database

Create a local database (assumes Postgres is already running):

```sh
createdb <your-project-name>_dev
```

#### Environment

```sh
cp .env.example .env
```

Edit `.env` — set the database name to match what you created:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/<your-project-name>_dev
```

#### Run

```sh
bun run db:migrate
bun run dev
```

Client: http://localhost:5173 | Server: http://localhost:8787

### 3. Production

#### Database

Use any hosted PostgreSQL provider. **Neon** (free tier) is recommended:

1. Go to https://console.neon.tech → sign up → create project
2. Copy the connection string: `postgresql://user:pass@host/dbname?sslmode=require`

#### Hyperdrive (Cloudflare connection pooler)

Check if a Hyperdrive ID is already configured in `wrangler.jsonc`. If so, you can **reuse** it by updating its connection string:

```sh
bunx wrangler hyperdrive update <existing-hyperdrive-id> --connection-string="<your-connection-string>"
```

Otherwise, **create a new one**:

```sh
bunx wrangler hyperdrive create my-project-db --connection-string="<your-connection-string>"
```

This outputs a Hyperdrive ID. Update `wrangler.jsonc`:

```jsonc
"hyperdrive": [
  {
    "binding": "HYPERDRIVE",
    "id": "<your-hyperdrive-id>"
  }
]
```

Disable caching (required for auth — prevents stale "user not found" errors):

```sh
bunx wrangler hyperdrive update <your-hyperdrive-id> --caching-disabled true
```

> **LLM users:** If you're using an AI assistant to set up the project, have it check `wrangler.jsonc` for an existing Hyperdrive ID before creating a new one — it should ask whether to reuse or create.

#### Environment

```sh
cp .env.prod.example .env.prod
```

Open `.env.prod` and fill in every value:

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | Connection string from your Postgres provider (e.g. Neon dashboard → "Connection string") |
| `BETTER_AUTH_SECRET` | Generate a random secret: `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Your production URL, e.g. `https://my-app.my-subdomain.workers.dev` or your custom domain |
| `CLIENT_URL` | Same as `BETTER_AUTH_URL` (they share the same origin in this template) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app → Settings → Developer settings → OAuth Apps → Client ID |
| `GITHUB_CLIENT_SECRET` | Same page → "Generate a new client secret" |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Same page → Client secret |

> **OAuth is optional.** Leave `GITHUB_*` and `GOOGLE_*` empty if you only need email/password auth.

> **Tip:** If you're using an LLM-powered editor (Claude Code, Cursor, etc.), you can ask it to generate the `.env.prod` file for you — it can run `openssl rand -hex 32` and fill in the URLs based on your `wrangler.jsonc` name. Just provide your `DATABASE_URL` and any OAuth credentials.

#### Deploy

Push secrets and deploy (builds client, runs migrations, deploys to Cloudflare Workers):

```sh
bun run secrets:push
bun run deploy
```

Your app is live at `https://<your-project-name>.<your-subdomain>.workers.dev`

---

## Database

This template uses **Drizzle ORM** with **PostgreSQL**. In production, connections go through **Cloudflare Hyperdrive** for connection pooling.

### How it works

- **Schema** is defined in `server/db/schema.ts` using Drizzle's `pgTable` helpers.
- **Migrations** are generated SQL files in `server/db/migrations/`, produced by `drizzle-kit generate`.
- **Connection** is managed by `server/db/index.ts` — in dev it reuses a single pool, in production it creates a per-request pool via Hyperdrive.
- **Config** lives in `drizzle.config.ts` at the project root.

### Adding a new table

1. Define the table in `server/db/schema.ts`:

```ts
export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

2. Generate a migration:

```sh
bun run db:generate
```

This creates a new `.sql` file in `server/db/migrations/`.

3. Apply it:

```sh
bun run db:migrate
```

### Modifying an existing table

Edit the table definition in `schema.ts`, then run `db:generate` and `db:migrate` as above. Drizzle diffs your schema and generates the appropriate `ALTER TABLE` statements.

### Deploying database changes

The `deploy` script runs migrations automatically:

```sh
bun run deploy   # builds, migrates, deploys
```

To migrate production manually without deploying:

```sh
DATABASE_URL=<your-prod-connection-string> bun run db:migrate
```

### Browsing the database

```sh
bun run db:studio
```

Opens Drizzle Studio at https://local.drizzle.studio — a visual browser for your database.

### Dev vs Production connections

| | Dev | Production |
|---|---|---|
| **Connection** | Direct to local Postgres via `DATABASE_URL` in `.env` | Via Cloudflare Hyperdrive (connection pooling) |
| **Pool** | Single shared pool (reused across requests) | Per-request pool (`max: 1`), closed after each request |
| **Config** | `.env` → `DATABASE_URL` | Hyperdrive binding in `wrangler.jsonc` |

---

## Scripts Reference

| Script | Description |
|---|---|
| `bun run dev` | Start client + server in dev mode (server uses restart-on-save watcher) |
| `bun run dev:server` | Server only, restart-on-save (`server/**/*.ts`) |
| `bun run build` | Build client assets for production (server is bundled by Wrangler from `server/index.tsx`) |
| `bun run preview` | Build and run locally with `wrangler dev` |
| `bun run deploy` | Build client, run migrations, and deploy to Cloudflare Workers |
| `bun run test` | Run tests (Vitest, watch mode) |
| `bun run test:run` | Run tests once |
| `bun run lint` | Lint with ESLint |
| `bun run db:generate` | Generate a new migration from schema changes |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:push` | Push schema directly to the database (skips migration files) |
| `bun run db:studio` | Open Drizzle Studio (visual database browser) |
| `bun run secrets:push` | Push `.env.prod` secrets to Cloudflare |
| `bun run cf-typegen` | Regenerate `CloudflareBindings` types from `wrangler.jsonc` |

---

## Project Structure

```
├── client/              # React SPA (Vite + React Router)
│   └── src/
│       ├── components/  # UI components (shadcn/ui)
│       ├── hooks/       # React hooks (useAuth, etc.)
│       ├── lib/         # API client (fetch + React Query), auth utilities
│       └── pages/       # Route pages
├── server/              # Hono backend (REST API)
│   ├── config.ts        # Runtime config (isDev flag, etc.)
│   ├── db/
│   │   ├── schema.ts    # Drizzle table definitions
│   │   ├── index.ts     # DB connection middleware
│   │   └── migrations/  # SQL migration files (generated by drizzle-kit)
│   ├── features/        # Feature modules (router/service/repo/schema)
│   ├── lib/             # Auth setup (better-auth)
│   ├── middleware/       # Auth, JWT, logging, error handling
│   └── util/            # Shared helpers (logger, response formatting)
├── scripts/             # Deployment utilities
├── wrangler.jsonc       # Cloudflare Workers config
├── vite.config.ts       # Client build config
```

---

## Scheduled Tasks (Cron)

A cron trigger is configured in `wrangler.jsonc` to run every hour (`0 * * * *`). The handler is the `scheduled` export in `server/index.tsx`. Edit it to add your own scheduled jobs.

Test cron locally:

```sh
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```
