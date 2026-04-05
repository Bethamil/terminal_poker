<p align="center">
  <img src="apps/frontend/public/favicon.svg" alt="Terminal Poker logo" width="88" />
</p>

<h1 align="center">Terminal Poker</h1>

<p align="center">
  Fast planning poker with a terminal edge.
  <br />
  Run estimation rounds without account friction.
</p>

<p align="center">
  Real-time rooms, optional Jira sync, room passcodes, and zero-account joins.
</p>

<p align="center">
  <code>React</code>
  <code>Vite</code>
  <code>Node</code>
  <code>Socket.IO</code>
  <code>PostgreSQL</code>
</p>

<p align="center">
  <img src="docs/assets/readme-home.png" alt="Terminal Poker home screen" width="900" />
</p>

<p align="center">
  Launch a room in seconds and run planning poker without the usual setup friction.
</p>

## Why Terminal Poker

- No accounts required. Join with a name and a room code.
- Real-time voting, reveal, reset, and optional room passcodes.
- Jira-friendly room setup and optional ticket sync.
- Resume recent rooms in the same browser.

## In Action

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/readme-host-round.png" alt="Host view while a round is in progress" />
      <br />
      Sync the current ticket, reveal the votes, and move straight into the next estimate.
    </td>
    <td width="50%">
      <img src="docs/assets/readme-reveal-result.png" alt="Revealed planning poker result" />
      <br />
      Reveal the result instantly and keep the outcome clear, focused, and easy to discuss.
    </td>
  </tr>
</table>

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
pnpm db:migrate
pnpm dev
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:4000](http://localhost:4000)

## Deployment

- Docker self-hosting: [deploy/docker/](deploy/docker/)
- Helm / Kubernetes example values: [deploy/helm/](deploy/helm/)

Release tags publish the container image to GHCR as `ghcr.io/bethamil/terminal_poker`.

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm db:migrate
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
  docker/
  helm/
```
