import { CredentialV1Schema } from "web-identity-schemas/zod"
import * as z from "zod"

import type { W3CCredential } from "../types"

/**
 * Validates an unsigned W3C VC Data Model v1.1 credential, backed by
 * `web-identity-schemas`' `CredentialV1Schema`.
 *
 * Built on the *unsigned* V1 base (not the verifiable schema) so it stays
 * unsigned-compatible and accepts ACK's `JwtProof2020` proofs. The transform
 * preserves ACK's two invariants: a top-level string `issuer` is normalized to
 * `{ id }`, and `type` is coerced to an array.
 */
export const credentialSchema = CredentialV1Schema.transform((input) => {
  const issuer =
    typeof input.issuer === "string" ? { id: input.issuer } : input.issuer
  const type = Array.isArray(input.type) ? input.type : [input.type]
  const context = Array.isArray(input["@context"])
    ? input["@context"]
    : [input["@context"]]

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- transform normalizes validated input into W3CCredential shape
  return {
    ...input,
    "@context": context,
    issuer,
    type,
  } as W3CCredential
})

export const jwtProofSchema = z.object({
  type: z.literal("JwtProof2020"),
  jwt: z.string(),
})

export const bitstringStatusListClaimSchema = z.object({
  id: z.string(),
  type: z.literal("BitstringStatusList"),
  statusPurpose: z.string(),
  encodedList: z.string(),
})
