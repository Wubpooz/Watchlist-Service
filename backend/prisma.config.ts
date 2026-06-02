import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "src/db/seed.ts",
  },
  datasource: {
    url: process.env.POSTGRES_URL || "postgresql://johndoe:randompassword@localhost:5432/mydb",
    directUrl: process.env.POSTGRES_URL_NON_POOLING
  },
});
