# Helm Deployment

This values file is an example configuration for deploying Terminal Poker as a single app container on Kubernetes:

- `values.yaml` deploys the single Terminal Poker app image
- The app serves the frontend, REST API, and Socket.IO endpoint from one container
- PostgreSQL is required
- Redis is optional and only needed for multi-instance Socket.IO fan-out

## Expected External Services

- PostgreSQL reachable through `DATABASE_URL`
- Redis optional with `REDIS_MODE=none`
- Standalone Redis reachable through `REDIS_URL` when `REDIS_MODE=standalone`
- Redis Sentinel reachable through `REDIS_SENTINEL_URL` and `REDIS_SENTINEL_MASTER_NAME` when `REDIS_MODE=sentinel`
- TLS issuer already present in the cluster if `tls: true`

## Example Install

```bash
helm repo add <repo-name> <repo-url>
helm repo update

helm upgrade --install terminal-poker <repo-name>/<chart-name> \
  --namespace terminal-poker \
  --create-namespace \
  -f deploy/helm/values.yaml
```

## Production Notes

- Replace the placeholder hostname and `DATABASE_URL` with your own values.
- Replace the default image tag when you publish a newer release.
- Move `DATABASE_URL` into your secret-management workflow before production use.
- Move your Redis env vars into your secret-management workflow too if you are running multiple backend replicas.
- Keep `replicaCount` at `1` unless Redis is configured, otherwise Socket.IO stays single-node.
- The values file uses the same startup pattern as the self-hosted Docker Compose setup: `prisma migrate deploy` runs before the app starts, then Node starts the compiled backend from `dist`.
