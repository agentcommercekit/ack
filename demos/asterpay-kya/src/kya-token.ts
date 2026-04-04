import { log, logJson } from "@repo/cli-tools"
import {
  createJwt,
  createJwtSigner,
  type JwtString,
  type Keypair,
} from "agentcommercekit"
import { jwtPayloadSchema } from "agentcommercekit/schemas/zod/v4"
import { decodeJwt } from "jose"
import * as z from "zod/v4"

export const trustScoreComponentSchema = z.object({
  walletAge: z.number().min(0).max(15),
  transactionActivity: z.number().min(0).max(15),
  sanctionsScreening: z.number().min(0).max(15),
  ercIdentity: z.number().min(0).max(15),
  operatorKyb: z.number().min(0).max(15),
  paymentHistory: z.number().min(0).max(15),
  trustBond: z.number().min(0).max(10),
})

export const insumerAttestationSchema = z.object({
  tokenBalance: z.object({
    met: z.boolean(),
    chain: z.string(),
    token: z.string(),
    minBalance: z.string(),
  }),
  coinbaseKyc: z.object({
    met: z.boolean(),
    schema: z.string(),
  }),
  coinbaseCountry: z.object({
    met: z.boolean(),
    country: z.string(),
  }),
  gitcoinPassport: z.object({
    met: z.boolean(),
    minScore: z.number(),
  }),
})

export const asterPayKyaJwtPayloadSchema = z.object({
  ...jwtPayloadSchema.shape,
  agentAddress: z.string(),
  agentId: z.string().optional(),
  trustScore: z.number().min(0).max(100),
  tier: z.enum(["open", "verified", "trusted", "enterprise"]),
  components: trustScoreComponentSchema,
  insumerAttestation: insumerAttestationSchema,
  sanctioned: z.boolean(),
  jti: z.string(),
})

export type AsterPayKyaJwtPayload = z.output<
  typeof asterPayKyaJwtPayloadSchema
>

export async function createMockAsterPayKyaToken(
  keypair: Keypair,
): Promise<JwtString> {
  const payload: AsterPayKyaJwtPayload = {
    sub: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    aud: "erc8183-acp-provider",
    agentAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    agentId: "ERC-8004 #16850",
    trustScore: 82,
    tier: "trusted",
    components: {
      walletAge: 12,
      transactionActivity: 11,
      sanctionsScreening: 15,
      ercIdentity: 15,
      operatorKyb: 10,
      paymentHistory: 9,
      trustBond: 10,
    },
    insumerAttestation: {
      tokenBalance: {
        met: true,
        chain: "base",
        token: "USDC",
        minBalance: "100",
      },
      coinbaseKyc: {
        met: true,
        schema: "coinbase_account_attestation",
      },
      coinbaseCountry: {
        met: true,
        country: "EU",
      },
      gitcoinPassport: {
        met: true,
        minScore: 20,
      },
    },
    sanctioned: false,
    jti: crypto.randomUUID(),
  }

  const jwt = await createJwt(
    payload,
    {
      issuer: "https://api.asterpay.io/",
      signer: createJwtSigner(keypair),
      expiresIn: 1800, // 30 min aligned to InsumerAPI JWT TTL
    },
    {
      // @ts-expect-error - custom typ for AsterPay KYA
      typ: "kya+JWT",
      alg: "ES256",
    },
  )

  const parsed = decodeJwt(jwt)
  log("🔑 AsterPay KYA Trust Score Token:")
  logJson(parsed)

  return jwt
}
