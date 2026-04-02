import "dotenv/config";

import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional()
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional()
);

const envSchema = z
  .object({
    PORT: z.coerce.number().default(4000),
    CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
    DATABASE_URL: z.string().min(1),
    REDIS_MODE: z.enum(["none", "standalone", "sentinel"]).default("none"),
    REDIS_URL: optionalUrl,
    REDIS_SENTINEL_URL: optionalNonEmptyString,
    REDIS_SENTINEL_MASTER_NAME: optionalNonEmptyString,
    REDIS_USERNAME: optionalNonEmptyString,
    REDIS_PASSWORD: optionalNonEmptyString,
    REDIS_SENTINEL_USERNAME: optionalNonEmptyString,
    REDIS_SENTINEL_PASSWORD: optionalNonEmptyString
  })
  .superRefine((value, ctx) => {
    if (value.REDIS_MODE === "standalone" && !value.REDIS_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "REDIS_URL is required when REDIS_MODE=standalone",
        path: ["REDIS_URL"]
      });
    }

    if (value.REDIS_MODE === "sentinel") {
      if (!value.REDIS_SENTINEL_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "REDIS_SENTINEL_URL is required when REDIS_MODE=sentinel",
          path: ["REDIS_SENTINEL_URL"]
        });
      }

      if (!value.REDIS_SENTINEL_MASTER_NAME) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "REDIS_SENTINEL_MASTER_NAME is required when REDIS_MODE=sentinel",
          path: ["REDIS_SENTINEL_MASTER_NAME"]
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (input: NodeJS.ProcessEnv): Env => envSchema.parse(input);

export const env = parseEnv(process.env);
