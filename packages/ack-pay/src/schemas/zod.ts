import { didUriSchema } from "@agentcommercekit/did/schemas/zod"
import { jwtStringSchema } from "@agentcommercekit/jwt/schemas/zod"
import * as z from "zod"

const urlOrDidUri = z.union([z.url(), didUriSchema])

const timestampSchema = z
  .union([z.date(), z.string()])
  .transform((val, ctx) => {
    const date = new Date(val)
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid date",
        input: val,
      })
      return z.NEVER
    }

    return date.toISOString()
  })

export const paymentOptionSchema = z.object({
  id: z.string(),
  amount: z.union([z.number().int().positive(), z.string()]),
  decimals: z.number().int().nonnegative(),
  currency: z.string(),
  recipient: z.string(),
  network: z.string().optional(),
  paymentService: urlOrDidUri.optional(),
  receiptService: urlOrDidUri.optional(),
})

export const paymentRequestSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  serviceCallback: z.url().optional(),
  expiresAt: timestampSchema.optional(),
  paymentOptions: z.array(paymentOptionSchema).nonempty(),
})

export const paymentReceiptClaimSchema = z.object({
  paymentRequestToken: jwtStringSchema,
  paymentOptionId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
