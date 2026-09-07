import dotenv from "dotenv";
dotenv.config();

import { defineConfig } from "@prisma/config";

let migrationUrl: string | undefined;
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("connection_limit", "1");
  url.searchParams.set("socket_timeout", "30");
  migrationUrl = url.toString();
}

export default defineConfig({
  datasource: {
    url: migrationUrl,
  },
});
