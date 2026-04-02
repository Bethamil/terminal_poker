import Redis, { type Redis as RedisClient, type RedisOptions, type SentinelAddress } from "ioredis";

import type { Env } from "../config/env";

const REDIS_CONNECT_TIMEOUT_MS = 10_000;
const REDIS_COMMAND_TIMEOUT_MS = 5_000;

export type SocketIoRedisClients = {
  pubClient: RedisClient;
  subClient: RedisClient;
};

export const parseSentinelUrls = (sentinelUrl: string): SentinelAddress[] =>
  {
    const sentinels = sentinelUrl
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const url = new URL(value.includes("://") ? value : `redis://${value}`);

        if (!url.hostname) {
          throw new Error(`Invalid Redis Sentinel URL: ${value}`);
        }

        return {
          host: url.hostname,
          port: url.port ? Number(url.port) : 26379
        };
      });

    if (sentinels.length === 0) {
      throw new Error("REDIS_SENTINEL_URL must contain at least one Sentinel address");
    }

    return sentinels;
  };

const getCommonOptions = (connectionName: string): RedisOptions => ({
  connectionName,
  lazyConnect: true,
  connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
  commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
  maxRetriesPerRequest: null
});

const attachClientLogging = (client: RedisClient, label: string) => {
  client.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error(`[redis:${label}]`, error);
  });
};

const createStandaloneClient = (env: Env, label: string) => {
  const client = new Redis(env.REDIS_URL!, {
    ...getCommonOptions(`terminal-poker-${label}`),
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD
  });

  attachClientLogging(client, label);
  return client;
};

const createSentinelClient = (env: Env, label: string) => {
  const client = new Redis({
    ...getCommonOptions(`terminal-poker-${label}`),
    sentinels: parseSentinelUrls(env.REDIS_SENTINEL_URL!),
    name: env.REDIS_SENTINEL_MASTER_NAME!,
    role: "master",
    failoverDetector: true,
    sentinelCommandTimeout: REDIS_COMMAND_TIMEOUT_MS,
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
    sentinelUsername: env.REDIS_SENTINEL_USERNAME,
    sentinelPassword: env.REDIS_SENTINEL_PASSWORD ?? env.REDIS_PASSWORD
  });

  attachClientLogging(client, label);
  return client;
};

export const createSocketIoRedisClients = async (env: Env): Promise<SocketIoRedisClients | null> => {
  switch (env.REDIS_MODE) {
    case "none":
      return null;
    case "standalone": {
      const pubClient = createStandaloneClient(env, "socket-publisher");
      const subClient = createStandaloneClient(env, "socket-subscriber");

      try {
        await Promise.all([pubClient.connect(), subClient.connect()]);
        return { pubClient, subClient };
      } catch (error) {
        pubClient.disconnect();
        subClient.disconnect();
        throw error;
      }
    }
    case "sentinel": {
      const pubClient = createSentinelClient(env, "socket-publisher");
      const subClient = createSentinelClient(env, "socket-subscriber");

      try {
        await Promise.all([pubClient.connect(), subClient.connect()]);
        return { pubClient, subClient };
      } catch (error) {
        pubClient.disconnect();
        subClient.disconnect();
        throw error;
      }
    }
  }
};

export const closeSocketIoRedisClients = (clients: SocketIoRedisClients | null) => {
  if (!clients) {
    return;
  }

  clients.pubClient.disconnect();
  clients.subClient.disconnect();
};
