import rateLimit from "express-rate-limit";

const rateLimitResponse = {
  code: "RATE_LIMITED",
  message: "Too many requests. Please try again later."
};

// Room creation: 5 requests per minute per IP
export const createRoomLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitResponse
});

// Join: 10 requests per minute per IP — generous enough for normal use,
// tight enough to block room-code enumeration
export const joinRoomLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitResponse
});

// Room state: 30 requests per minute per IP — clients poll this endpoint
export const roomStateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitResponse
});
