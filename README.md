<p align="center">
  <img src="apps/frontend/public/favicon.svg" alt="Terminal Poker logo" width="88" />
</p>

<h1 align="center">Terminal Poker</h1>

<p align="center">
  Fast scrum poker with a terminal edge.
  <br />
  Create a room, share a code, vote in real time, reveal, move on.
</p>

<p align="center">
  <code>React</code>
  <code>Vite</code>
  <code>Node</code>
  <code>Socket.IO</code>
  <code>PostgreSQL</code>
</p>

## Why It's Good

- No account flow. Join with a name and a room code.
- Real-time voting, reveal, reset, and optional room passcodes.
- Jira-friendly room setup and ticket tracking.
- Resume recent rooms in the same browser.

## Quick Start

Requirements:

- `pnpm`
- Docker

Start local infra:

```bash
docker compose up -d postgres
```

Install dependencies:

```bash
pnpm install
```

Create `apps/backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/terminal_poker?schema=public"
CLIENT_ORIGIN="http://localhost:5173"
PORT=4000
ROOM_INACTIVITY_TTL_HOURS=24
REDIS_MODE=none
```

Optional: create `apps/frontend/.env` if your backend is not running on `http://localhost:4000`:

```env
VITE_DEV_BACKEND_URL="http://localhost:4000"
```

Prepare the database and start the app:

```bash
pnpm prisma:generate
pnpm --filter @terminal-poker/backend exec prisma db push
pnpm dev
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:4000](http://localhost:4000)

## Compose Modes

This repo now has two Docker Compose paths:

- `docker-compose.yml`: local development infra only (`postgres`, optional `redis`)
- `compose.selfhost.yml`: self-hosted app deployment using the single Docker image and external services
- `compose.selfhost.bundled.yml`: optional override that adds a bundled PostgreSQL service

For local development:

```bash
docker compose up -d postgres
pnpm dev
```

For self-hosting with your own Postgres:

```bash
cp .env.selfhost.example .env.selfhost
docker compose --env-file .env.selfhost -f compose.selfhost.yml up -d
```

Open:

- App: [http://localhost:8080](http://localhost:8080)

If you want to use a bundled Postgres service instead:

```bash
cp .env.selfhost.bundled.example .env.selfhost
docker compose --env-file .env.selfhost -f compose.selfhost.yml -f compose.selfhost.bundled.yml up -d
```

In the bundled setup, PostgreSQL stays internal to the Compose network by default. The app connects to `postgres:5432`, but the database is not published on a host port.
In this mode you only set `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`; Compose derives the internal `DATABASE_URL` automatically.

If you want to use your own Redis too, update `.env.selfhost`:

```env
REDIS_MODE=standalone
REDIS_URL=redis://your-redis-host:6379
```

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm --filter @terminal-poker/backend cleanup:expired-rooms
pnpm db:clear
pnpm db:reset
```

## Redis

Redis is optional for local development and single-instance deployments.

Use one of these modes:

- `REDIS_MODE=none`: no Redis
- `REDIS_MODE=standalone`: one Redis instance
- `REDIS_MODE=sentinel`: Redis Sentinel-managed Redis

To test that locally:

```bash
docker compose up -d postgres redis
```

No Redis:

```env
REDIS_MODE=none
```

Standalone Redis:

```env
REDIS_MODE=standalone
REDIS_URL="redis://localhost:6379"
```

Sentinel Redis:

```env
REDIS_MODE=sentinel
REDIS_SENTINEL_URL="redis://sentinel-1:26379,redis://sentinel-2:26379,redis://sentinel-3:26379"
REDIS_SENTINEL_MASTER_NAME="mymaster"
```

## Room Cleanup

Rooms store a `lastActivityAt` timestamp. It is updated on:

- participant join
- vote cast
- room settings update
- Jira ticket update
- round reveal / unreveal
- round reset
- participant kick
- participant leave

Rooms are removed by running the cleanup command:

```bash
pnpm --filter @terminal-poker/backend cleanup:expired-rooms
```

The inactivity threshold is controlled by `ROOM_INACTIVITY_TTL_HOURS` in `apps/backend/.env`. For example, `ROOM_INACTIVITY_TTL_HOURS=24` removes rooms that have been inactive for more than 24 hours.

For production, run this command from a cron job or Kubernetes `CronJob`.

## Repo Layout

```text
apps/
  backend/
  frontend/
packages/
  shared-types/
deploy/
  helm/
```
