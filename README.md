# Fullstack CF Base

Full-stack template built with **Hono** + **React** running on **Cloudflare Workers**.

**Stack:** Hono (REST API), React 19, React Query, Better Auth, Knex + PostgreSQL (via Hyperdrive), Tailwind CSS v4, Vite

---

## Quick Start (New Project)

### 1. Clone this template into your project

```sh
cp -r fullstack-cf-base/ my-project/
cd my-project
```

### 2. Rename the app

Update `"name"` in both files:
- `package.json` — change `"name": "my-hono-app"` to your project name
- `wrangler.jsonc` — change `"name": "my-hono-app"` to your project name (this becomes your `*.workers.dev` subdomain)

### 3. Install dependencies

```sh
bun install
```

### 4. Provision a PostgreSQL database

Use any hosted provider. **Neon** (free tier) is recommended:
1. Go to https://console.neon.tech → sign up → create project
2. Copy the connection string: `postgresql://user:pass@host/dbname?sslmode=require`

### 5. Create Hyperdrive (Cloudflare DB connection pooler)

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

Disable caching (required for auth to work — prevents stale "user not found" errors):

```sh
bunx wrangler hyperdrive update <your-hyperdrive-id> --caching-disabled true
```

### 6. Configure secrets

```sh
cp .env.prod.example .env.prod
```

Edit `.env.prod`:

```
DATABASE_URL=<your-connection-string>
BETTER_AUTH_SECRET=<run: openssl rand -hex 32>
BETTER_AUTH_URL=https://<your-project-name>.<your-subdomain>.workers.dev
CLIENT_URL=https://<your-project-name>.<your-subdomain>.workers.dev
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

> **OAuth is optional.** Leave `GITHUB_*` and `GOOGLE_*` empty if you only need email/password auth.

### 7. Run migrations & push secrets

```sh
bun run migrate:prod
bun run secrets:push
```

### 8. Deploy

```sh
bun run deploy
```

Your app is live at `https://<your-project-name>.<your-subdomain>.workers.dev`

---

## Local Development

### 1. Set up a local PostgreSQL database

If you already have a shared Postgres running (e.g. Docker), just create a new database for this project:

```sh
createdb <your-project-name>_dev
```

Or if starting fresh with Docker:

```sh
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
createdb -h localhost -U postgres <your-project-name>_dev
```

### 2. Configure local environment

```sh
cp .env.example .env
```

Edit `.env` — replace the database name to match what you created above:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/<your-project-name>_dev
```

### 3. Run migrations & start

```sh
bun run migrate
bun run dev
```

Client: http://localhost:5173 | Server: http://localhost:8787

---

## Scripts Reference

| Script | Description |
|---|---|
| `bun run dev` | Start client + server in dev mode (server uses restart-on-save watcher) |
| `bun run dev:server` | Server only, restart-on-save (`server/**/*.ts`) |
| `bun run build` | Build client assets for production (server is bundled by Wrangler from `server/index.tsx`) |
| `bun run preview` | Build and run locally with `wrangler dev` |
| `bun run deploy` | Build and deploy to Cloudflare Workers |
| `bun run test` | Run tests (Vitest, watch mode) |
| `bun run test:run` | Run tests once |
| `bun run lint` | Lint with ESLint |
| `bun run migrate` | Run migrations against local dev DB |
| `bun run migrate:prod` | Run migrations against production DB |
| `bun run migrate:rollback` | Rollback last migration (dev) |
| `bun run migrate:rollback:prod` | Rollback last migration (prod) |
| `bun run migrate:make` | Create a new migration file |
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
│   │   ├── knexfile.ts  # Knex config (dev + prod)
│   │   └── migrations/  # Database migrations
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
