import * as v from "valibot"
import { isCredential } from "../is-credential"
import { bitstringStatusListCredentialSchema } from "../schemas/valibot"
import type { BitstringStatusListCredential } from "./types"
import type { CredentialSubject } from "../types"

function isStatusListClaim(
  credentialSubject: CredentialSubject
): credentialSubject is v.InferOutput<
  typeof bitstringStatusListCredentialSchema
> {
  return v.is(bitstringStatusListCredentialSchema, credentialSubject)
}

/**
 * Check if a credential is a status list credential
 *
 * @param credential - The credential to check
 * @returns `true` if the credential is a status list credential, `false` otherwise
 */
export function isStatusListCredential(
  credential: unknown
): credential is BitstringStatusListCredential {
  if (!isCredential(credential)) {
    return false
  }
  return isStatusListClaim(credential.credentialSubject)
}
