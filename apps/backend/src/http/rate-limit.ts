import rateLimit from "express-rate-limit";

const rateLimitResponse = {
  code: "RATE_LIMITED",
  message: "Too many requests. Please try again later."
};

// Room creation: 5 requests per minute per IP.
// This is the most sensitive endpoint — creating rooms is infrequent
// and doesn't suffer from shared-network false positives.
export const createRoomLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitResponse
});
