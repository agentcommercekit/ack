import { isJwtString } from "@agentcommercekit/jwt"
import {
  InvalidCredentialError,
  InvalidCredentialSubjectError,
  isCredential,
  parseJwtCredential,
  verifyParsedCredential
} from "@agentcommercekit/vc"
import {
  getReceiptClaimVerifier,
  isPaymentReceiptCredential
} from "./receipt-claim-verifier"
import { verifyPaymentToken } from "./verify-payment-token"
import type { PaymentRequest } from "./payment-request"
import type { Resolvable } from "@agentcommercekit/did"
import type { JwtString } from "@agentcommercekit/jwt"
import type { Verifiable, W3CCredential } from "@agentcommercekit/vc"

interface VerifyPaymentReceiptOptions {
  /**
   * The resolver to use for verifying the PaymentReceipt
   */
  resolver: Resolvable
  /**
   * The issuers that are trusted to issue PaymentReceipts
   */
  trustedReceiptIssuers?: string[]
  /**
   * Whether to verify the paymentToken as a JWT
   */
  verifyPaymentTokenJwt?: boolean
  /**
   * The issuer of the paymentToken
   */
  paymentRequestIssuer?: string
}

/**
 * Validates and verifies a PaymentReceipt, in either JWT or parsed format.
 *
 * @param receipt - The PaymentReceipt to validate and verify
 * @param options - The {@link VerifyPaymentReceiptOptions} to use
 * @returns The validated and verified PaymentReceipt
 */
export async function verifyPaymentReceipt(
  receipt: string | Verifiable<W3CCredential>, // We can require JwtString here.
  {
    resolver,
    trustedReceiptIssuers,
    paymentRequestIssuer,
    verifyPaymentTokenJwt = true
  }: VerifyPaymentReceiptOptions
): Promise<
  | {
      receipt: Verifiable<W3CCredential>
      paymentToken: string
      paymentRequest: null
    }
  | {
      receipt: Verifiable<W3CCredential>
      paymentToken: JwtString
      paymentRequest: PaymentRequest
    }
> {
  let parsedCredential: Verifiable<W3CCredential>

  if (isJwtString(receipt)) {
    parsedCredential = await parseJwtCredential(receipt, resolver)
  } else if (isCredential(receipt)) {
    parsedCredential = receipt
  } else {
    throw new InvalidCredentialError("Receipt is not a JWT or Credential")
  }

  if (!isPaymentReceiptCredential(parsedCredential)) {
    throw new InvalidCredentialError(
      "Credential is not a PaymentReceiptCredential"
    )
  }

  await verifyParsedCredential(parsedCredential, {
    resolver,
    trustedIssuers: trustedReceiptIssuers,
    verifiers: [getReceiptClaimVerifier()]
  })

  // Verify the paymentToken is a valid JWT
  const paymentToken = parsedCredential.credentialSubject.paymentToken

  if (!verifyPaymentTokenJwt) {
    return {
      receipt: parsedCredential,
      paymentToken,
      paymentRequest: null
    }
  }

  if (!isJwtString(paymentToken)) {
    throw new InvalidCredentialSubjectError("Payment token is not a JWT")
  }

  const { paymentRequest } = await verifyPaymentToken(paymentToken, {
    resolver,
    // We don't want to fail Receipt Verification if the paymentToken has
    // expired, since the receipt lives longer than that
    verifyExpiry: false,
    // If the paymentRequestIssuer is provided, we want to verify that the
    // payment token was issued by the same issuer.
    issuer: paymentRequestIssuer
  })

  return {
    receipt: parsedCredential,
    paymentToken,
    paymentRequest
  }
}
