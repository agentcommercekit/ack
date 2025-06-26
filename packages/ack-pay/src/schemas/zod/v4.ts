import { didUriSchema } from "@agentcommercekit/did/schemas/zod/v4"
import * as z from "zod/v4"

const urlOrDidUri = z.union([z.url(), didUriSchema])

export const paymentOptionSchema = z.object({
  id: z.string(),
  amount: z.number().int().positive(),
  decimals: z.number().int().nonnegative(),
  currency: z.string(),
  recipient: z.string(),
  network: z.string().optional(),
  paymentService: urlOrDidUri.optional(),
  receiptService: urlOrDidUri.optional()
})

export const paymentRequestSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  serviceCallback: z.url().optional(),
  expiresAt: z
    .union([z.date(), z.string()])
    .transform((val) => new Date(val).toISOString())
    .optional(),
  paymentOptions: z.array(paymentOptionSchema).nonempty()
})

export const paymentReceiptClaimSchema = z.object({
  paymentToken: z.string(), // Often a JwtString but not required
  paymentOptionId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export const paymentRequestBodySchema = z.object({
  payment: paymentRequestSchema,
  paymentToken: z.string() // Often a JwtString but not required
})
