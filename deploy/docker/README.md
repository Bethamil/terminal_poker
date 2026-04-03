# Docker Self-Hosting

This folder contains the Docker Compose files for running Terminal Poker as a single app image.

- `compose.yml` runs the app against external services
- `compose.bundled.yml` adds a bundled PostgreSQL container
- `.env.example` is for external PostgreSQL
- `.env.bundled.example` is for bundled PostgreSQL

The app image is published from GitHub release tags to `ghcr.io/bethamil/terminal_poker`.

## External Postgres

```bash
cp deploy/docker/.env.example .env.selfhost
docker compose --env-file .env.selfhost -f deploy/docker/compose.yml up -d
```

Open:

- App: [http://localhost:8080](http://localhost:8080)

Expected settings in `.env.selfhost`:

- `TERMINAL_POKER_IMAGE`
- `APP_PORT`
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `ROOM_INACTIVITY_TTL_HOURS`
- optional Redis env vars

## Bundled Postgres

```bash
cp deploy/docker/.env.bundled.example .env.selfhost
docker compose --env-file .env.selfhost -f deploy/docker/compose.yml -f deploy/docker/compose.bundled.yml up -d
```

In the bundled setup, PostgreSQL stays internal to the Compose network. The app connects to `postgres:5432`, but the database is not published on a host port.

Expected settings in `.env.selfhost`:

- `TERMINAL_POKER_IMAGE`
- `APP_PORT`
- `CLIENT_ORIGIN`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `ROOM_INACTIVITY_TTL_HOURS`
- optional Redis env vars

Compose derives the internal `DATABASE_URL` automatically for the bundled setup.

## Redis

Redis is optional for a single app instance. Keep `REDIS_MODE=none` unless you need shared Socket.IO state across multiple replicas.

Standalone Redis:

```env
REDIS_MODE=standalone
REDIS_URL=redis://your-redis-host:6379
```

Sentinel Redis:

```env
REDIS_MODE=sentinel
REDIS_SENTINEL_URL=redis://sentinel-1:26379,redis://sentinel-2:26379,redis://sentinel-3:26379
REDIS_SENTINEL_MASTER_NAME=mymaster
```
