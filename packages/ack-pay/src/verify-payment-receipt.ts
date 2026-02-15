import type { Resolvable } from "@agentcommercekit/did"

import { isJwtString, type JwtString } from "@agentcommercekit/jwt"
import {
  InvalidCredentialError,
  InvalidCredentialSubjectError,
  isCredential,
  parseJwtCredential,
  verifyParsedCredential,
  type Verifiable,
  type W3CCredential,
} from "@agentcommercekit/vc"

import type { PaymentRequest } from "./payment-request"

import {
  getReceiptClaimVerifier,
  isPaymentReceiptCredential,
} from "./receipt-claim-verifier"
import { verifyPaymentRequestToken } from "./verify-payment-request-token"

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
   * Whether to verify the paymentRequestToken as a JWT
   */
  verifyPaymentRequestTokenJwt?: boolean
  /**
   * The issuer of the paymentRequestToken
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
    verifyPaymentRequestTokenJwt = true,
  }: VerifyPaymentReceiptOptions,
): Promise<
  | {
      receipt: Verifiable<W3CCredential>
      paymentRequestToken: string
      paymentRequest: null
    }
  | {
      receipt: Verifiable<W3CCredential>
      paymentRequestToken: JwtString
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
      "Credential is not a PaymentReceiptCredential",
    )
  }

  await verifyParsedCredential(parsedCredential, {
    resolver,
    trustedIssuers: trustedReceiptIssuers,
    verifiers: [getReceiptClaimVerifier()],
  })

  // Verify the paymentRequestToken is a valid JWT
  const paymentRequestToken =
    parsedCredential.credentialSubject.paymentRequestToken

  if (!verifyPaymentRequestTokenJwt) {
    return {
      receipt: parsedCredential,
      paymentRequestToken,
      paymentRequest: null,
    }
  }

  if (!isJwtString(paymentRequestToken)) {
    throw new InvalidCredentialSubjectError(
      "Payment Request token is not a JWT",
    )
  }

  const { paymentRequest } = await verifyPaymentRequestToken(
    paymentRequestToken,
    {
      resolver,
      // We don't want to fail Receipt Verification if the paymentRequestToken has
      // expired, since the receipt lives longer than that
      verifyExpiry: false,
      // If the paymentRequestIssuer is provided, we want to verify that the
      // payment request token was issued by the same issuer.
      issuer: paymentRequestIssuer,
    },
  )

  return {
    receipt: parsedCredential,
    paymentRequestToken,
    paymentRequest,
  }
}
