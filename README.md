# Terminal Poker

Simple scrum poker app for small teams. It includes a React frontend, an Express + Socket.IO backend, PostgreSQL for room state, and shared TypeScript types across the repo.

## Features

- Create and join rooms with a short code
- Vote with a selectable planning deck
- Reveal and reset rounds
- Optional room passcode
- Optional Jira room link and ticket tracking
- Resume recent rooms in the same browser

## Local Development

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

Redis is optional for local development and single-instance deployments. Only set `REDIS_URL` if you need the
Socket.IO Redis adapter, for example when running multiple backend instances behind a load balancer.

If you want to test multi-instance realtime locally, start Redis too:

```bash
docker compose up -d postgres redis
```

Then add:

```env
REDIS_URL="redis://localhost:6379"
```

Generate Prisma client and push the schema:

```bash
pnpm prisma:generate
pnpm --filter @terminal-poker/backend exec prisma db push
```

Start the app:

```bash
pnpm dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Commands

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`

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
