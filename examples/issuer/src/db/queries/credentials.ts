import { eq } from "drizzle-orm"

import {
  credentialsTable,
  statusListsTable,
  type DatabaseCredential,
  type NewDatabaseCredential,
} from "@/db/schema"
import { getStatusListPosition } from "@/db/utils/get-status-list-position"

import type { DatabaseClient } from "../get-db"

import { maybeCreateStatusList } from "./status-lists"

export async function createCredential(
  db: DatabaseClient,
  credential: NewDatabaseCredential,
): Promise<DatabaseCredential> {
  const [result] = await db
    .insert(credentialsTable)
    .values(credential)
    .returning()

  if (!result) {
    throw new Error("Failed to create credential")
  }

  const { id: statusListId } = getStatusListPosition(result.id)

  await maybeCreateStatusList(db, {
    id: statusListId,
    credentialType: credential.credentialType,
  })

  return result
}

export async function getCredential(
  db: DatabaseClient,
  id: number,
): Promise<DatabaseCredential | undefined> {
  const [credential] = await db
    .select()
    .from(credentialsTable)
    .where(eq(credentialsTable.id, id))

  return credential
}

export async function revokeCredential(
  db: DatabaseClient,
  credential: DatabaseCredential,
) {
  // Set revocation bit in the status list
  const { id: statusListId, index: listIndex } = getStatusListPosition(
    credential.id,
  )

  await db
    .update(credentialsTable)
    .set({ revokedAt: new Date() })
    .where(eq(credentialsTable.id, credential.id))

  // Update the index in the status list. NOTE: In a production implementation,
  // you would want to do this in a transaction to avoid race conditions, and
  // you could leverage PostgreSQL in bitwise operations to do this more
  // efficiently.
  const [statusList] = await db
    .select()
    .from(statusListsTable)
    .where(eq(statusListsTable.id, statusListId))

  if (!statusList) {
    throw new Error("Status list not found")
  }

  // Update the bit in the string using array manipulation
  const chars = statusList.data.split("")
  chars[listIndex] = "1"
  const updatedString = chars.join("")

  await db
    .update(statusListsTable)
    .set({
      data: updatedString,
    })
    .where(eq(statusListsTable.id, statusListId))
}
