/**
 * ACK-Pay payment request tools for MCP.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  createJwtSigner,
  createSignedPaymentRequest,
  verifyPaymentRequestToken,
  type DidUri,
  type PaymentRequestInit,
} from "agentcommercekit"
import { z } from "zod"

import {
  curveToAlg,
  err,
  keypairFromJwk,
  ok,
  resolver,
  verification,
} from "../util"

const paymentOptionSchema = z.object({
  id: z.string(),
  amount: z.union([z.number(), z.string()]),
  decimals: z.number(),
  currency: z.string(),
  recipient: z.string(),
  network: z.string().optional(),
  paymentService: z.string().optional(),
  receiptService: z.string().optional(),
})

/** Register ACK-Pay payment request tools on the MCP server. */
export function registerPaymentRequestTools(server: McpServer) {
  server.tool(
    "ack_create_payment_request",
    "Create a signed payment request token (JWT) for use in HTTP 402 responses. Unlike receipts, this creates AND signs in one step. Verify the result with ack_verify_payment_request.",
    {
      description: z
        .string()
        .optional()
        .describe("Human-readable description of what the payment is for"),
      paymentOptions: z
        .array(paymentOptionSchema)
        .min(1)
        .describe(
          "Array of payment options (amount, currency, recipient, network)",
        ),
      expiresInSeconds: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Seconds until the payment request expires"),
      signerJwk: z
        .string()
        .describe(
          "JWK JSON string containing the signer's private key (from ack_generate_keypair or any valid private key JWK)",
        ),
      signerDid: z
        .string()
        .describe("DID of the payment requester (must match the JWK)"),
    },
    async ({
      description,
      paymentOptions,
      expiresInSeconds,
      signerJwk: jwk,
      signerDid: did,
    }) => {
      try {
        const keypair = keypairFromJwk(jwk)

        const init: PaymentRequestInit = {
          id: crypto.randomUUID(),
          description,
          paymentOptions: paymentOptions as [
            (typeof paymentOptions)[0],
            ...typeof paymentOptions,
          ],
        }

        if (expiresInSeconds !== undefined) {
          init.expiresAt = new Date(
            Date.now() + expiresInSeconds * 1000,
          ).toISOString()
        }

        const result = await createSignedPaymentRequest(init, {
          issuer: did as DidUri,
          signer: createJwtSigner(keypair),
          algorithm: curveToAlg(keypair.curve),
        })

        return ok(result)
      } catch (e) {
        return err(e)
      }
    },
  )

  server.tool(
    "ack_verify_payment_request",
    "Verify and parse a payment request JWT (from ack_create_payment_request). Returns the decoded payment request if valid, including payment options and issuer. Returns {valid: true/false}.",
    {
      token: z.string().describe("The payment request JWT string"),
      issuer: z
        .string()
        .optional()
        .describe(
          "Expected issuer DID. If provided, verifies the token was issued by this DID.",
        ),
    },
    async ({ token, issuer }) => {
      try {
        const { paymentRequest, parsed } = await verifyPaymentRequestToken(
          token,
          { resolver, issuer },
        )
        return verification(true, {
          paymentRequest,
          issuer: parsed.issuer,
        })
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e)
        return verification(false, { reason })
      }
    },
  )
}
