# Terminal Poker

Self-hosted scrum poker built as a `pnpm` monorepo with a React/Vite frontend, an Express/Socket.IO backend, PostgreSQL as the authoritative store, Redis for multi-instance realtime fan-out, and shared TypeScript contracts across the stack.

## Short Architecture Summary

- HTTP is used for room creation, room join, and authoritative room-state hydration on load or refresh.
- Socket.IO is used only after the client has a valid participant token and initial room snapshot.
- PostgreSQL stores rooms, participants, rounds, votes, Jira settings, and reconnect identity.
- Redis is only the Socket.IO adapter for cross-instance pub/sub and never the primary room-state store.
- Shared TypeScript contracts in `packages/shared-types` define vote values, room snapshots, HTTP payloads, and typed Socket.IO events.
- Jira integration is room-scoped and round-scoped today, with the URL builder isolated so Jira API enrichment can be added later.

## Monorepo File Structure

```text
.
├── apps
│   ├── backend
│   │   ├── prisma/schema.prisma
│   │   └── src
│   └── frontend
│       └── src
├── deploy
│   └── helm
├── packages
│   └── shared-types
├── DESIGN
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Core Features

- create room with short code
- join room with name and optional room passcode
- live presence derived from persisted heartbeat timestamps
- Fibonacci voting deck
- pre-reveal state only shows who voted, not their vote values
- moderator reveal and reset controls
- refresh/reconnect-safe participant identity through stored participant tokens
- room-scoped Jira base URL plus round-scoped Jira ticket key/id
- clearly rendered Jira issue link in the round UI
- typed Socket.IO event contracts shared between frontend and backend

## Local Run Instructions

1. Start infrastructure:

```bash
docker compose up -d
```

2. Install workspace dependencies:

```bash
pnpm install
```

3. Copy environment defaults:

```bash
cp .env.example .env
```

4. Generate Prisma client and sync the schema:

```bash
pnpm prisma:generate
pnpm --filter @terminal-poker/backend exec prisma db push
```

5. Start the apps:

```bash
pnpm dev
```

6. Open:

- frontend: `http://localhost:5173`
- backend: `http://localhost:4000`

## Package Scripts

- `pnpm dev` runs frontend and backend together
- `pnpm build` builds all workspaces
- `pnpm test` runs shared/backend tests and frontend test discovery
- `pnpm typecheck` runs workspace type-checking

## Prisma Schema

The Prisma schema lives at [apps/backend/prisma/schema.prisma](/Users/emielbloem/projects/terminal_poker/apps/backend/prisma/schema.prisma) and defines:

- `Room`
- `Participant`
- `Round`
- `Vote`
- `ParticipantRole`
- `RoundStatus`

## Deployment

Helm deployment values are in:

- [frontend-values.yaml](/Users/emielbloem/projects/terminal_poker/deploy/helm/frontend-values.yaml)
- [backend-values.yaml](/Users/emielbloem/projects/terminal_poker/deploy/helm/backend-values.yaml)
- [README.md](/Users/emielbloem/projects/terminal_poker/deploy/helm/README.md)

These files assume the `generic-webapp` Helm chart and external PostgreSQL/Redis services.
