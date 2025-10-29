import type { DatabaseCredential } from "@/db/schema"
import { getStatusListPosition } from "@/db/utils/get-status-list-position"
import {
  makeRevocable,
  parseJwtCredential,
  signCredential,
  type Resolvable,
} from "agentcommercekit"
import type { CredentialResponse, Issuer } from "../types"

type BuildSignedCredentialParams = {
  baseUrl: string
  path?: `/${string}`
  issuer: Issuer
  credential: DatabaseCredential
  resolver: Resolvable
}

export async function buildSignedCredential({
  baseUrl,
  path,
  issuer,
  credential,
  resolver,
}: BuildSignedCredentialParams): Promise<CredentialResponse> {
  const { id: statusListId, index: statusListIndex } = getStatusListPosition(
    credential.id,
  )

  let unsignedCredential = credential.baseCredential
  // Set the id to be the full url of the credential. We don't set it on create,
  // because we want to use the id from the database.
  unsignedCredential.id = `${baseUrl}${path ?? ""}/${credential.id}`

  unsignedCredential = makeRevocable(unsignedCredential, {
    id: `${baseUrl}/status/${statusListId}#${statusListIndex}`,
    statusListIndex,
    statusListUrl: `${baseUrl}/status/${statusListId}`,
  })

  const jwt = await signCredential(unsignedCredential, issuer)

  const verifiableCredential = await parseJwtCredential(jwt, resolver)

  return {
    credential: verifiableCredential,
    jwt,
  }
}
