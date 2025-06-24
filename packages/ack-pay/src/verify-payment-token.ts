import { verifyJwt } from "@agentcommercekit/jwt"
import * as v from "valibot"
import { InvalidPaymentTokenError } from "./errors"
import { paymentRequestSchema } from "./schemas/valibot"
import type { PaymentRequest } from "./payment-request"
import type { Resolvable } from "@agentcommercekit/did"
import type { JwtVerified } from "@agentcommercekit/jwt"

interface ValidatePaymentTokenOptions {
  /**
   * The resolver to use for did resolution
   */
  resolver?: Resolvable
  /**
   * Whether to verify the expiry of the payment token
   */
  verifyExpiry?: boolean
  /**
   * The issuer to verify the payment token against
   */
  issuer?: string
}

/**
 * Verify a payment token
 *
 * @param token - The payment token to verify
 * @param options - The {@link ValidatePaymentTokenOptions} to use
 * @returns The {@link PaymentRequest} parsed from the payment token and the parsed JWT
 */
export async function verifyPaymentToken(
  token: string,
  options: ValidatePaymentTokenOptions = {}
): Promise<{ paymentRequest: PaymentRequest; parsed: JwtVerified }> {
  let parsedPaymentToken: JwtVerified

  try {
    parsedPaymentToken = await verifyJwt(token, {
      resolver: options.resolver,
      issuer: options.issuer,
      policies: {
        aud: false,
        exp: options.verifyExpiry ?? true
      }
    })
  } catch (_err) {
    throw new InvalidPaymentTokenError()
  }

  const { success, output } = v.safeParse(
    paymentRequestSchema,
    parsedPaymentToken.payload
  )

  if (!success) {
    throw new InvalidPaymentTokenError(
      "Payment token is not a valid PaymentRequest"
    )
  }

  return {
    paymentRequest: output,
    parsed: parsedPaymentToken
  }
}
