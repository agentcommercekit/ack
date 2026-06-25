import * as v from "valibot"
import { CredentialV1Schema } from "web-identity-schemas/valibot"

import type { W3CCredential } from "../types"

/**
 * Validates an unsigned W3C VC Data Model v1.1 credential, backed by
 * `web-identity-schemas`' `CredentialV1Schema`.
 *
 * Built on the *unsigned* V1 base (not the verifiable schema) so it stays
 * unsigned-compatible and accepts ACK's `JwtProof2020` proofs — the base is a
 * loose object, so an existing `proof` passes through untouched. The transform
 * preserves ACK's two invariants: a top-level string `issuer` is normalized to
 * `{ id }` (downstream reads `issuer.id`), and `type` is coerced to an array.
 */
export const credentialSchema = v.pipe(
  CredentialV1Schema,
  v.transform((input) => {
    const issuer =
      typeof input.issuer === "string" ? { id: input.issuer } : input.issuer
    const type = Array.isArray(input.type) ? input.type : [input.type]
    const context = Array.isArray(input["@context"])
      ? input["@context"]
      : [input["@context"]]

    return {
      ...input,
      "@context": context,
      issuer,
      type,
    } as W3CCredential
  }),
)

export const jwtProofSchema = v.object({
  type: v.literal("JwtProof2020"),
  jwt: v.string(),
})

export const bitstringStatusListClaimSchema = v.object({
  id: v.string(),
  type: v.literal("BitstringStatusList"),
  statusPurpose: v.string(),
  encodedList: v.string(),
})
