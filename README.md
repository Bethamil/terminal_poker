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
PRESENCE_TTL_SECONDS=30
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

Use `REDIS_URL` only if you need the Socket.IO Redis adapter, such as when you run multiple backend instances behind a load balancer.

To test that locally:

```bash
docker compose up -d postgres redis
```

Then add:

```env
REDIS_URL="redis://localhost:6379"
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
