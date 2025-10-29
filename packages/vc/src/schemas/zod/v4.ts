import * as z from "zod/v4"
import type { W3CCredential } from "../../types"

export const credentialSchema = z
  .object({
    "@context": z.array(z.string()),
    credentialStatus: z
      .object({
        id: z.string(),
        type: z.string(),
      })
      .optional(),
    credentialSubject: z.looseObject({ id: z.string().optional() }),
    expirationDate: z.string().optional(),
    id: z.string().optional(),
    issuanceDate: z.string(),
    issuer: z.string().or(z.object({ id: z.string() })),
    type: z.array(z.string()),
    proof: z
      .looseObject({
        type: z.string().optional(),
      })
      .optional(),
  })
  .transform((v) => {
    const issuer = typeof v.issuer === "string" ? { id: v.issuer } : v.issuer

    return {
      ...v,
      issuer,
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
