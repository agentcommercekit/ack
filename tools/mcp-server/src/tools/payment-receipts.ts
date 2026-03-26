/**
 * ACK-Pay payment receipt tools for MCP.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  createPaymentReceipt,
  verifyPaymentReceipt,
  type DidUri,
} from "agentcommercekit"
import { z } from "zod"

import { err, ok, resolver, verification } from "../util"

/** Register ACK-Pay payment receipt tools on the MCP server. */
export function registerPaymentReceiptTools(server: McpServer) {
  server.tool(
    "ack_create_payment_receipt",
    "Create a payment receipt as a W3C Verifiable Credential, proving that a payment was made.",
    {
      paymentRequestToken: z
        .string()
        .describe("The original payment request JWT that was fulfilled"),
      paymentOptionId: z
        .string()
        .describe("ID of the payment option that was used"),
      issuerDid: z
        .string()
        .describe("DID of the receipt issuer (typically the payment receiver)"),
      payerDid: z.string().describe("DID of the entity that made the payment"),
      metadata: z
        .record(z.unknown())
        .optional()
        .describe("Optional metadata about the payment"),
    },
    async ({
      paymentRequestToken,
      paymentOptionId,
      issuerDid,
      payerDid,
      metadata,
    }) => {
      try {
        const receipt = createPaymentReceipt({
          paymentRequestToken,
          paymentOptionId,
          issuer: issuerDid as DidUri,
          payerDid: payerDid as DidUri,
          metadata,
        })
        return ok(receipt)
      } catch (e) {
        return err(e)
      }
    },
  )

  server.tool(
    "ack_verify_payment_receipt",
    "Verify a payment receipt credential. Checks the receipt signature and optionally verifies the embedded payment request.",
    {
      receipt: z.string().describe("The receipt as a signed JWT string"),
      trustedReceiptIssuers: z
        .array(z.string())
        .optional()
        .describe("Trusted receipt issuer DIDs"),
      paymentRequestIssuer: z
        .string()
        .optional()
        .describe("Expected payment request issuer DID"),
    },
    async ({ receipt, trustedReceiptIssuers, paymentRequestIssuer }) => {
      try {
        const result = await verifyPaymentReceipt(receipt, {
          resolver,
          trustedReceiptIssuers,
          paymentRequestIssuer,
        })
        return verification(true, {
          receipt: result.receipt,
          paymentRequest: result.paymentRequest,
        })
      } catch (e) {
        return verification(false, { reason: (e as Error).message })
      }
    },
  )
}
