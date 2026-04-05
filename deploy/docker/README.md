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
- `TRUST_PROXY_HOPS` (optional, default `0`)
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
- `TRUST_PROXY_HOPS` (optional, default `0`)
- optional Redis env vars

Compose derives the internal `DATABASE_URL` automatically for the bundled setup.
On startup, the container applies committed Prisma migrations with `prisma migrate deploy` before launching the compiled app from `dist`.

## Reverse Proxy / Rate Limiting

The backend includes per-IP rate limiting on public API endpoints. When running behind a reverse proxy (Cloudflare, nginx, etc.), set `TRUST_PROXY_HOPS` so Express reads the real client IP from `X-Forwarded-For`:

```env
# Number of trusted proxy hops in front of the app
# 0 = disabled (default, fine for direct exposure or local dev)
# 1 = one proxy (e.g. Cloudflare OR nginx)
# 2 = two proxies (e.g. Cloudflare + nginx)
TRUST_PROXY_HOPS=1
```

Without this, all requests appear to come from the proxy IP and share a single rate-limit bucket.

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
