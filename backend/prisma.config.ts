import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    adapter: () => {
      const connectionString = process.env.DATABASE_URL;
      const { Pool } = require("pg");
      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
