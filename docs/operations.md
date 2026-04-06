# Operations

## Redis

Redis is optional for local development and single-instance deployments.

Use one of these modes:

- `REDIS_MODE=none`: no Redis
- `REDIS_MODE=standalone`: one Redis instance
- `REDIS_MODE=sentinel`: Redis Sentinel-managed Redis

To test locally with Redis enabled:

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

Rooms are removed by running:

```bash
pnpm --filter @terminal-poker/backend cleanup:expired-rooms
```

The inactivity threshold is controlled by `ROOM_INACTIVITY_TTL_HOURS` in `apps/backend/.env`. For example, `ROOM_INACTIVITY_TTL_HOURS=24` removes rooms that have been inactive for more than 24 hours.

For production, run this command from a cron job or Kubernetes `CronJob`.

## Related Docs

- [Local development](development.md)
- [Deployment](deployment.md)
