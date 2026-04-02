# Helm Deployment

These values files target the `generic-webapp` Helm chart, following the `helm-generic-webapp-project-implementation` skill constraints:

- `frontend-values.yaml` deploys the built Vite SPA through `nginx`
- `backend-values.yaml` deploys the Express + Socket.IO service
- PostgreSQL is required
- Redis is optional and only needed for multi-instance Socket.IO fan-out

## Expected External Services

- PostgreSQL reachable through `DATABASE_URL`
- Redis reachable through `REDIS_URL` when running more than one backend replica
- TLS issuer already present in the cluster if `tls: true`

## Example Install

```bash
helm repo add dictu https://your-helm-repo.example.com
helm repo update

helm upgrade --install terminal-poker-frontend dictu/generic-webapp \
  --namespace terminal-poker \
  --create-namespace \
  -f deploy/helm/frontend-values.yaml

helm upgrade --install terminal-poker-backend dictu/generic-webapp \
  --namespace terminal-poker \
  --create-namespace \
  -f deploy/helm/backend-values.yaml
```

## Production Notes

- Replace the placeholder image coordinates with your published images.
- Move `DATABASE_URL` into your secret-management workflow before production use.
- Move `REDIS_URL` into your secret-management workflow too if you are running multiple backend replicas.
- Keep backend replica count at `1` unless Redis is configured, otherwise Socket.IO stays single-node.
- Set the frontend build args `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to the backend public origin.
