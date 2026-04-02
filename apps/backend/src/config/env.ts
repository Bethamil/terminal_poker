import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  PRESENCE_TTL_SECONDS: z.coerce.number().default(30)
});

export const env = envSchema.parse(process.env);

