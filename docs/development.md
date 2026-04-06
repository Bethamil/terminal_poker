# Local Development

## Requirements

- `pnpm`
- Docker

## Quick Start

Start PostgreSQL:

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
pnpm db:migrate
pnpm dev
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:4000](http://localhost:4000)

## Common Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm db:migrate
pnpm db:clear
pnpm db:reset
pnpm db:studio
pnpm --filter @terminal-poker/backend cleanup:expired-rooms
pnpm --filter @terminal-poker/frontend build
pnpm --filter @terminal-poker/backend dev
pnpm --filter @terminal-poker/frontend dev
```

## Repo Layout

```text
apps/
  backend/
  cli/
  frontend/
packages/
  shared-types/
deploy/
  docker/
  helm/
docs/
```

## Related Docs

- [Operations](operations.md)
- [Deployment](deployment.md)
