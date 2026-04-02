import { describe, expect, it } from "vitest";

import { parseSentinelUrls } from "./socket-adapter";

describe("parseSentinelUrls", () => {
  it("parses comma-separated Sentinel addresses", () => {
    expect(parseSentinelUrls("redis://sentinel-1:26379,sentinel-2:26380")).toEqual([
      { host: "sentinel-1", port: 26379 },
      { host: "sentinel-2", port: 26380 }
    ]);
  });

  it("defaults missing Sentinel ports to 26379", () => {
    expect(parseSentinelUrls("sentinel-1,sentinel-2")).toEqual([
      { host: "sentinel-1", port: 26379 },
      { host: "sentinel-2", port: 26379 }
    ]);
  });
});
