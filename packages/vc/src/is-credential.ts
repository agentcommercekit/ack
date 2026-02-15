import type { W3CCredential } from "did-jwt-vc"

import * as v from "valibot"

import { credentialSchema } from "./schemas/valibot"

/**
 * Check if a value is a valid W3C credential
 *
 * @param credential - The value to check
 * @returns `true` if the value is a valid W3C credential, `false` otherwise
 */
export function isCredential(credential: unknown): credential is W3CCredential {
  return v.is(credentialSchema, credential)
}
