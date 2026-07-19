import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "./env";

const pool = new Pool({ connectionString: ENV.databaseUrl });
export const db = drizzle(pool);

export function getDb() {
  return db;
}
