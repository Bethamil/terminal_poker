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

Start Postgres:

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
REDIS_MODE=none
```

Create `apps/frontend/.env`:

```env
VITE_API_BASE_URL="http://localhost:4000"
VITE_SOCKET_URL="http://localhost:4000"
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

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
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
