import type * as v from "valibot"

import type { bitstringStatusListClaimSchema } from "../schemas/valibot"
import type { W3CCredential } from "../types"

type BitstringStatusListEntry = {
  /**
   * The specification makes this optional, but `CredentialStatus` requires it
   * to stay assignable to did-jwt-vc's `CredentialPayload`. No check here reads
   * it: the list is bound to the credential through `statusListCredential` and
   * the list's own `id`.
   */
  id: string
  type: "BitstringStatusListEntry"
  statusPurpose: string
  statusListIndex: string
  statusListCredential: string
}

export type BitstringStatusListCredential = W3CCredential & {
  credentialSubject: v.InferOutput<typeof bitstringStatusListClaimSchema>
}

export type Revocable<T extends W3CCredential> = T & {
  credentialStatus: BitstringStatusListEntry
}
