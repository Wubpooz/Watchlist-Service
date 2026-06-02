import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun run src/db/seed.ts",
  },
  datasource: {
    url: env("POSTGRES_URL") || "postgresql://johndoe:randompassword@localhost:5432/mydb"
  },
});
