import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { createRateLimiter } from "./rate-limit";

const mockRequest = (ip = "127.0.0.1") =>
  ({ ip, socket: { remoteAddress: ip } }) as unknown as Request;

const mockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response;
  return res;
};

describe("createRateLimiter", () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter({ maxTokens: 3, refillRate: 1, pruneAfter: 60_000 });
  });

  it("allows requests within the burst limit", () => {
    const next = vi.fn();
    for (let i = 0; i < 3; i++) {
      limiter(mockRequest(), mockResponse(), next);
    }
    expect(next).toHaveBeenCalledTimes(3);
  });

  it("returns 429 when burst is exhausted", () => {
    const next = vi.fn();
    // Exhaust tokens
    for (let i = 0; i < 3; i++) {
      limiter(mockRequest(), mockResponse(), next);
    }

    const res = mockResponse();
    limiter(mockRequest(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later."
    });
    expect(res.set).toHaveBeenCalledWith("Retry-After", expect.any(String));
  });

  it("tracks IPs independently", () => {
    const next = vi.fn();
    // Exhaust IP A
    for (let i = 0; i < 3; i++) {
      limiter(mockRequest("10.0.0.1"), mockResponse(), next);
    }

    // IP B should still be allowed
    limiter(mockRequest("10.0.0.2"), mockResponse(), next);
    expect(next).toHaveBeenCalledTimes(4);
  });

  it("refills tokens over time", () => {
    vi.useFakeTimers();
    const next = vi.fn();

    // Exhaust tokens
    for (let i = 0; i < 3; i++) {
      limiter(mockRequest(), mockResponse(), next);
    }
    expect(next).toHaveBeenCalledTimes(3);

    // Advance 2 seconds → should refill 2 tokens
    vi.advanceTimersByTime(2000);

    limiter(mockRequest(), mockResponse(), next);
    expect(next).toHaveBeenCalledTimes(4);

    vi.useRealTimers();
  });
});
