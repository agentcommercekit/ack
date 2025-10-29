import type { JwtString } from "@agentcommercekit/jwt"
import * as v from "valibot"
import {
  createPaymentRequestToken,
  type PaymentRequestTokenOptions
} from "./create-payment-request-token"
import type { PaymentRequest, PaymentRequestInit } from "./payment-request"
import { paymentRequestSchema } from "./schemas/valibot"

/**
 * Create a signed payment request
 *
 * @param params - The payment config params, including the amount, currency, and recipient
 * @param options - The {@link PaymentRequestTokenOptions} to use
 * @returns A payment request with a signed token
 */
export async function createSignedPaymentRequest(
  paymentRequestInit: PaymentRequestInit,
  { issuer, signer, algorithm }: PaymentRequestTokenOptions
): Promise<{
  paymentRequest: PaymentRequest
  paymentRequestToken: JwtString
}> {
  const paymentRequest = v.parse(paymentRequestSchema, paymentRequestInit)
  const paymentRequestToken = await createPaymentRequestToken(paymentRequest, {
    issuer,
    signer,
    algorithm
  })

  return {
    paymentRequest,
    paymentRequestToken
  }
}

/**
 * @deprecated Use {@link createSignedPaymentRequest} instead
 */
export async function createPaymentRequestBody(
  ...args: Parameters<typeof createSignedPaymentRequest>
): Promise<{
  paymentRequest: PaymentRequest
  paymentToken: string
}> {
  const result = await createSignedPaymentRequest(...args)
  return {
    paymentRequest: result.paymentRequest,
    paymentToken: result.paymentRequestToken
  }
}
