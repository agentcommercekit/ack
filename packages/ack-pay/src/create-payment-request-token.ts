import { createJwt } from "@agentcommercekit/jwt"
import type { PaymentRequest } from "./payment-request"
import type { DidUri } from "@agentcommercekit/did"
import type { JwtAlgorithm, JwtSigner, JwtString } from "@agentcommercekit/jwt"

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
  { issuer, signer, algorithm }: PaymentRequestTokenOptions
): Promise<JwtString> {
  return createJwt(
    { ...paymentRequest, sub: paymentRequest.id },
    {
      issuer,
      signer
    },
    {
      alg: algorithm
    }
  )
}
