import * as v from "valibot"
import type { W3CCredential } from "../types"

const baseSchema = v.object({
  "@context": v.array(v.string()),
  credentialStatus: v.optional(
    v.object({
      id: v.string(),
      type: v.string()
    })
  ),
  credentialSubject: v.looseObject({ id: v.optional(v.string()) }),
  expirationDate: v.optional(v.string()),
  id: v.optional(v.string()),
  issuanceDate: v.string(),
  issuer: v.union([v.string(), v.object({ id: v.string() })]),
  type: v.array(v.string()),
  proof: v.optional(v.looseObject({ type: v.optional(v.string()) }))
})

export const credentialSchema = v.pipe(
  baseSchema,
  v.transform((input) => {
    const issuer =
      typeof input.issuer === "string" ? { id: input.issuer } : input.issuer

    return {
      ...input,
      issuer
    } as W3CCredential
  })
)

export const jwtProofSchema = v.object({
  type: v.literal("JwtProof2020"),
  jwt: v.string()
})

export const bitstringStatusListClaimSchema = v.object({
  id: v.string(),
  type: v.literal("BitstringStatusList"),
  statusPurpose: v.string(),
  encodedList: v.string()
})
