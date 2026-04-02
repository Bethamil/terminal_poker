import Redis from "ioredis";

import type { RedisConnectionConfig } from "../config/env";

const createRedisClient = (config: RedisConnectionConfig): Redis => {
  if (config.kind === "standalone") {
    return new Redis(config.url, {
      lazyConnect: true
    });
  }

  return new Redis({
    sentinels: config.sentinels,
    name: config.name,
    natMap: config.natMap,
    username: config.username,
    password: config.password,
    sentinelUsername: config.sentinelUsername,
    sentinelPassword: config.sentinelPassword,
    lazyConnect: true
  });
};

const registerErrorLogger = (label: string, client: Redis) => {
  client.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error(`redis ${label} error`, error);
  });
};

export const createRedisAdapterClients = async (config: RedisConnectionConfig) => {
  const publisher = createRedisClient(config);
  const subscriber = publisher.duplicate();

  registerErrorLogger("publisher", publisher);
  registerErrorLogger("subscriber", subscriber);

  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);
    return { publisher, subscriber };
  } catch (error) {
    publisher.disconnect();
    subscriber.disconnect();
    throw error;
  }
};
