import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./env";

export const db = drizzle(ENV.databaseUrl);

export function getDb() {
  return db;
}
