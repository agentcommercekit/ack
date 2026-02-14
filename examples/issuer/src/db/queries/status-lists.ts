import { eq } from "drizzle-orm/sql"
import type { DatabaseClient } from "../get-db"
import { statusListsTable, type DatabaseStatusList } from "../schema"

type CreateStatusListParams = Pick<DatabaseStatusList, "id" | "credentialType">

export async function maybeCreateStatusList(
  db: DatabaseClient,
  { id, credentialType }: CreateStatusListParams,
) {
  await db
    .insert(statusListsTable)
    .values({
      id,
      credentialType,
    })
    .onConflictDoNothing()
}

export async function getStatusList(db: DatabaseClient, listId: number) {
  const [statusList] = await db
    .select()
    .from(statusListsTable)
    .where(eq(statusListsTable.id, listId))

  return statusList
}
