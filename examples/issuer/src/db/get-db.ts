import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

/**
 * Build a Drizzle client from a SQLite database URL.
 *
 * @param url - The SQLite database URL.
 * @returns A Drizzle client.
 */
export function getDb(url = "file:sqlite.db") {
  const client = createClient({ url })
  return drizzle({ client, schema })
}

export type DatabaseClient = ReturnType<typeof getDb>
