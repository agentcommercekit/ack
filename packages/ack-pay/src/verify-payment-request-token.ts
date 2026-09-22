import type { Resolvable } from "@agentcommercekit/did"
import { verifyJwt, type JwtVerified } from "@agentcommercekit/jwt"
import * as v from "valibot"

import { InvalidPaymentRequestTokenError } from "./errors"
import type { PaymentRequest } from "./payment-request"
import { paymentRequestSchema } from "./schemas/valibot"

interface ValidatePaymentRequestTokenOptions {
  /**
   * The resolver to use for did resolution
   */
  resolver?: Resolvable
  /**
   * Whether to verify JWT `exp` and PaymentRequest `expiresAt`
   */
  verifyExpiry?: boolean
  /**
   * The issuer to verify the payment request token against
   */
  issuer?: string
}

/**
 * Verify a payment request token
 *
 * @param token - The payment request token to verify
 * @param options - The {@link ValidatePaymentRequestTokenOptions} to use
 * @returns The {@link PaymentRequest} parsed from the payment request token and the parsed JWT
 */
export async function verifyPaymentRequestToken(
  token: string,
  options: ValidatePaymentRequestTokenOptions = {},
): Promise<{ paymentRequest: PaymentRequest; parsed: JwtVerified }> {
  let parsedPaymentRequestToken: JwtVerified

  try {
    parsedPaymentRequestToken = await verifyJwt(token, {
      resolver: options.resolver,
      issuer: options.issuer,
      policies: {
        aud: false,
        exp: options.verifyExpiry ?? true,
      },
    })
  } catch (err) {
    throw new InvalidPaymentRequestTokenError(undefined, { cause: err })
  }

  const { success, output } = v.safeParse(
    paymentRequestSchema,
    parsedPaymentRequestToken.payload,
  )

  if (!success) {
    throw new InvalidPaymentRequestTokenError(
      "Payment Request token is not a valid PaymentRequest",
    )
  }

  // `expiresAt` is a business-level expiry distinct from JWT `exp`.
  if (
    options.verifyExpiry !== false &&
    output.expiresAt !== undefined &&
    Date.parse(output.expiresAt) <= Date.now()
  ) {
    throw new InvalidPaymentRequestTokenError("Payment request has expired")
  }

  return {
    paymentRequest: output,
    parsed: parsedPaymentRequestToken,
  }
}
