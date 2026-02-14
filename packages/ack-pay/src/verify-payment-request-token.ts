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
   * Whether to verify the expiry of the payment request token
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
  } catch (_err) {
    throw new InvalidPaymentRequestTokenError()
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

  return {
    paymentRequest: output,
    parsed: parsedPaymentRequestToken,
  }
}
