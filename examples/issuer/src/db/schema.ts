import type { W3CCredential } from "agentcommercekit"

import { sql } from "drizzle-orm"
import {
  index,
  integer,
  sqliteTable as table,
  text
} from "drizzle-orm/sqlite-core"

export const STATUS_LIST_MAX_SIZE = 8_192

export const statusListsTable = table("status_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  credentialType: text("credential_type").notNull(),
  // NOTE: In a production implementation, it would be preferable to use
  // PostgreSQL and leverage server-side bitwise operations to update the status
  // list.
  data: text("data")
    .notNull()
    .$defaultFn(() => "0".repeat(STATUS_LIST_MAX_SIZE)),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("last_message_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdateFn(() => new Date())
})

export type DatabaseStatusList = typeof statusListsTable.$inferSelect

export const credentialsTable = table(
  "credentials",
  {
    // In sqlite, we can only auto-increment a primary key. It would be preferable
    // to have a separate `serial` column for the status list index. However, for
    // simplicity, we assume that the status list index is the same as the id.
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    credentialType: text("credential_type").notNull(),
    baseCredential: text("base_credential", { mode: "json" })
      .notNull()
      .$type<W3CCredential>(),
    issuedAt: integer("issued_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" })
  },
  (t) => [index("credential_type_idx").on(t.credentialType)]
)

export type DatabaseCredential = typeof credentialsTable.$inferSelect
export type NewDatabaseCredential = typeof credentialsTable.$inferInsert
