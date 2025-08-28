import { didUriSchema } from "@agentcommercekit/did/schemas/zod/v3"
import { jwtStringSchema } from "@agentcommercekit/jwt/schemas/zod"
import { z } from "zod/v3"

const urlOrDidUri = z.union([z.string().url(), didUriSchema])

export const paymentOptionSchema = z.object({
  id: z.string(),
  amount: z.union([z.number().int().positive(), z.string()]),
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
  serviceCallback: z.string().url().optional(),
  expiresAt: z
    .union([z.date(), z.string()])
    .transform((val) => new Date(val).toISOString())
    .optional(),
  paymentOptions: z.array(paymentOptionSchema).nonempty()
})

export const paymentReceiptClaimSchema = z.object({
  paymentRequestToken: jwtStringSchema,
  paymentOptionId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional()
})
