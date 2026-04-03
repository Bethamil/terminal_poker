import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

const baseEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/terminal_poker?schema=public",
  CLIENT_ORIGIN: "http://localhost:5173"
};

describe("parseEnv", () => {
  it("defaults Redis to none when no Redis config is present", () => {
    const parsed = parseEnv(baseEnv);

    expect(parsed.ROOM_INACTIVITY_TTL_HOURS).toBe(24);
    expect(parsed.REDIS_MODE).toBe("none");
    expect(parsed.REDIS_URL).toBeUndefined();
  });

  it("requires REDIS_URL in standalone mode", () => {
    expect(() => parseEnv({ ...baseEnv, REDIS_MODE: "standalone" })).toThrow(/REDIS_URL/);
  });

  it("accepts standalone Redis config", () => {
    const parsed = parseEnv({
      ...baseEnv,
      REDIS_MODE: "standalone",
      REDIS_URL: "redis://localhost:6379"
    });

    expect(parsed.REDIS_MODE).toBe("standalone");
    expect(parsed.REDIS_URL).toBe("redis://localhost:6379");
  });

  it("requires Sentinel settings in sentinel mode", () => {
    expect(() => parseEnv({ ...baseEnv, REDIS_MODE: "sentinel" })).toThrow(/REDIS_SENTINEL_/);
  });

  it("accepts Sentinel Redis config", () => {
    const parsed = parseEnv({
      ...baseEnv,
      REDIS_MODE: "sentinel",
      REDIS_SENTINEL_URL: "redis://sentinel-1:26379,redis://sentinel-2:26379",
      REDIS_SENTINEL_MASTER_NAME: "mymaster"
    });

    expect(parsed.REDIS_MODE).toBe("sentinel");
    expect(parsed.REDIS_SENTINEL_MASTER_NAME).toBe("mymaster");
  });
});
