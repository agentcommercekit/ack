import { log, logJson } from "@repo/cli-tools"
import { createJwt, createJwtSigner } from "agentcommercekit"
import { jwtPayloadSchema } from "agentcommercekit/schemas/zod/v4"
import { decodeJwt } from "jose"
import * as z from "zod/v4"
import type { JwtString, Keypair } from "agentcommercekit"

export const skyfireKyaJwtPayloadSchema = z.object({
  ...jwtPayloadSchema.shape,
  ssi: z.string(),
  jti: z.string(),
  bid: z.object({
    agentName: z.string(),
    ownerId: z.string(),
    nameFirst: z.string(),
    nameLast: z.string()
  })
})

export type SkyfireKyaJwtPayload = z.output<typeof skyfireKyaJwtPayloadSchema>

/**
 * Create a mock Skyfire KYA token
 *
 * @returns
 */
export async function createMockSkyfireKyaToken(
  keypair: Keypair
): Promise<JwtString> {
  const payload: SkyfireKyaJwtPayload = {
    aud: "seller-service-123",
    sub: "buyer-agent-456",
    bid: {
      agentName: "BuyerAgent",
      ownerId: "buyer-org-789",
      nameFirst: "Alice",
      nameLast: "Johnson"
    },
    ssi: "seller-service-123",
    jti: crypto.randomUUID()
  }

  const jwt = await createJwt(
    payload,
    {
      issuer: "https://api.skyfire.xyz/",
      signer: createJwtSigner(keypair),
      expiresIn: 3600
    },
    {
      // @ts-expect-error - TODO: fix this
      typ: "kya+JWT",
      alg: "ES256"
    }
  )

  const parsed = decodeJwt(jwt)
  log("🔑 Here's a sample Skyfire KYA token:")
  logJson(parsed)

  return jwt
}
