import type { DidUri } from "@agentcommercekit/did"
import {
  createJwt,
  type JwtAlgorithm,
  type JwtSigner,
  type JwtString,
} from "@agentcommercekit/jwt"

import type { PaymentRequest } from "./payment-request"

export interface PaymentRequestTokenOptions {
  /**
   * The issuer of the payment request token
   */
  issuer: DidUri
  /**
   * The signer of the payment request token
   */
  signer: JwtSigner
  /**
   * The algorithm of the payment request token
   */
  algorithm: JwtAlgorithm
}

/**
 * Builds a signed JWT payment request token for a given payment request
 *
 * @param paymentRequest - A valid PaymentRequest to create a payment request token for
 * @param options - The {@link PaymentRequestTokenOptions} to use
 * @returns A signed JWT payment request token
 */
export async function createPaymentRequestToken(
  paymentRequest: PaymentRequest,
  { issuer, signer, algorithm }: PaymentRequestTokenOptions,
): Promise<JwtString> {
  const options: {
    issuer: DidUri
    signer: JwtSigner
    expiresIn?: number
  } = {
    issuer,
    signer,
  }

  // Mirror paymentRequest.expiresAt into the JWT `exp` claim so verifiers that
  // only check JWT expiry still reject stale quotes.
  if (paymentRequest.expiresAt) {
    const expiresAtMs = new Date(paymentRequest.expiresAt).getTime()
    const expiresIn = Math.floor((expiresAtMs - Date.now()) / 1000)
    if (expiresIn <= 0) {
      throw new Error("Payment request expiresAt must be in the future")
    }
    options.expiresIn = expiresIn
  }

  return createJwt(
    { ...paymentRequest, sub: paymentRequest.id },
    options,
    {
      alg: algorithm,
    },
  )
}
