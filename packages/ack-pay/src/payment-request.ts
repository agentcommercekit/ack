import * as v from "valibot"
import {
  paymentRequestSchema,
  type paymentOptionSchema
} from "./schemas/valibot"

export type PaymentRequestInit = v.InferInput<typeof paymentRequestSchema>
export type PaymentRequest = v.InferOutput<typeof paymentRequestSchema>
export type PaymentOption = v.InferOutput<typeof paymentOptionSchema>

/**
 * Checks if a value is a valid Payment Request
 * @param value - The value to check
 * @returns `true` if the value is a valid Payment Request, `false` otherwise
 */
export function isPaymentRequest(value: unknown): value is PaymentRequest {
  return v.is(paymentRequestSchema, value)
}
