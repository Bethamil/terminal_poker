# Deployment

Release tags publish the application image to `ghcr.io/bethamil/terminal_poker`.

## Deployment Options

- Docker Compose self-hosting for a single app image
- Helm values for Kubernetes-based deployments

## Rate Limiting

Terminal Poker does not enforce app-level rate limiting out of the box.

That is intentional: different deployments may want very different limits, exemptions, trusted networks, or bot protection strategies. Configure rate limiting at your edge layer instead, such as your reverse proxy, load balancer, ingress controller, CDN, or API gateway.

## Docker Self-Hosting

The Docker deployment files live in [`deploy/docker/`](../deploy/docker/):

- `compose.yml` runs the app against external services
- `compose.bundled.yml` adds a bundled PostgreSQL container
- `.env.example` is for external PostgreSQL
- `.env.bundled.example` is for bundled PostgreSQL

### External Postgres

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

### Bundled Postgres

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
On startup, the container applies committed Prisma migrations with `prisma migrate deploy` before launching the compiled app from `dist`.

## Helm Deployment

The Helm deployment assets live in [`deploy/helm/`](../deploy/helm/).

The provided `values.yaml` is an example configuration for deploying Terminal Poker as a single app container on Kubernetes:

- the app serves the frontend, REST API, and Socket.IO endpoint from one container
- PostgreSQL is required
- Redis is optional and only needed for multi-instance Socket.IO fan-out

### Expected External Services

- PostgreSQL reachable through `DATABASE_URL`
- Redis optional with `REDIS_MODE=none`
- Standalone Redis reachable through `REDIS_URL` when `REDIS_MODE=standalone`
- Redis Sentinel reachable through `REDIS_SENTINEL_URL` and `REDIS_SENTINEL_MASTER_NAME` when `REDIS_MODE=sentinel`
- TLS issuer already present in the cluster if `tls: true`

### Example Install

```bash
helm repo add <repo-name> <repo-url>
helm repo update

helm upgrade --install terminal-poker <repo-name>/<chart-name> \
  --namespace terminal-poker \
  --create-namespace \
  -f deploy/helm/values.yaml
```

### Production Notes

- Replace the placeholder hostname and `DATABASE_URL` with your own values.
- Replace the default image tag when you publish a newer release.
- Move `DATABASE_URL` into your secret-management workflow before production use.
- Move your Redis env vars into your secret-management workflow too if you are running multiple backend replicas.
- Apply any request rate limiting at your proxy or ingress layer rather than inside the app.
- Keep `replicaCount` at `1` unless Redis is configured, otherwise Socket.IO stays single-node.
- The values file uses the same startup pattern as the Docker setup: `prisma migrate deploy` runs before the app starts, then Node starts the compiled backend from `dist`.

## Related Docs

- [Local development](development.md)
- [Operations](operations.md)
