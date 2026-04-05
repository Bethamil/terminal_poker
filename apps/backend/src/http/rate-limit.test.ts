import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createRoomLimiter } from "./rate-limit";

const createTestApp = () => {
  const app = express();
  app.use(createRoomLimiter);
  app.post("/", (_req, res) => res.json({ ok: true }));
  return app;
};

describe("createRoomLimiter", () => {
  it("allows requests within the limit", async () => {
    const app = createTestApp();
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post("/");
      expect(res.status).toBe(200);
    }
  });

  it("returns 429 when limit is exceeded", async () => {
    const app = createTestApp();
    for (let i = 0; i < 10; i++) {
      await request(app).post("/");
    }
    const res = await request(app).post("/");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later."
    });
  });
});
