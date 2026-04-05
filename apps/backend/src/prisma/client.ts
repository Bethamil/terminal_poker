import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { Env } from "../config/env";

export const createPrismaClient = (env: Env) => {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL
  });

  return new PrismaClient({
    adapter
  });
};
