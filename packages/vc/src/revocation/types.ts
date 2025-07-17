import type { bitstringStatusListCredentialSchema } from "../schemas/valibot"
import type { W3CCredential } from "../types"
import type * as v from "valibot"

type BitstringStatusListEntry = {
  id: string
  type: "BitstringStatusListEntry"
  statusPurpose: string
  statusListIndex: string
  statusListCredential: string
}

export type BitstringStatusListCredential = W3CCredential & {
  credentialSubject: v.InferOutput<typeof bitstringStatusListCredentialSchema>
}

export type Revocable<T extends W3CCredential> = T & {
  credentialStatus: BitstringStatusListEntry
}
