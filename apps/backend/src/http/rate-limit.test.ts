import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createRoomLimiter, joinRoomLimiter, roomStateLimiter } from "./rate-limit";

const createTestApp = (limiter: ReturnType<typeof import("express-rate-limit").default>) => {
  const app = express();
  app.use(limiter);
  app.get("/", (_req, res) => res.json({ ok: true }));
  return app;
};

describe("rate limiters", () => {
  it("createRoomLimiter allows requests within the limit", async () => {
    const app = createTestApp(createRoomLimiter);
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
    }
  });

  it("createRoomLimiter returns 429 when limit is exceeded", async () => {
    const app = createTestApp(createRoomLimiter);
    for (let i = 0; i < 5; i++) {
      await request(app).get("/");
    }
    const res = await request(app).get("/");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later."
    });
  });

  it("joinRoomLimiter allows 10 requests", async () => {
    const app = createTestApp(joinRoomLimiter);
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
    }
    const res = await request(app).get("/");
    expect(res.status).toBe(429);
  });

  it("roomStateLimiter allows 30 requests", async () => {
    const app = createTestApp(roomStateLimiter);
    for (let i = 0; i < 30; i++) {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
    }
    const res = await request(app).get("/");
    expect(res.status).toBe(429);
  });
});
