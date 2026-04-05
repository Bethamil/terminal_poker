import "dotenv/config";

import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/terminal_poker?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    // Allow `prisma generate` in CI without requiring a real database URL.
    url: databaseUrl
  }
});
