import {
  InvalidCredentialSubjectError,
  isCredential,
  type ClaimVerifier,
  type CredentialSubject,
  type W3CCredential,
} from "@agentcommercekit/vc"
import * as v from "valibot"

import { paymentReceiptClaimSchema } from "./schemas/valibot"

export interface PaymentReceiptCredential extends W3CCredential {
  credentialSubject: v.InferOutput<typeof paymentReceiptClaimSchema>
}

function isPaymentReceiptClaim(
  credentialSubject: CredentialSubject,
): credentialSubject is v.InferOutput<typeof paymentReceiptClaimSchema> {
  return v.is(paymentReceiptClaimSchema, credentialSubject)
}

/**
 * Check if a credential is a payment receipt credential
 *
 * @param credential - The credential to check
 * @returns `true` if the credential is a payment receipt credential, `false` otherwise
 */
export function isPaymentReceiptCredential(
  credential: unknown,
): credential is PaymentReceiptCredential {
  if (!isCredential(credential)) {
    return false
  }
  return isPaymentReceiptClaim(credential.credentialSubject)
}

async function verifyPaymentReceiptClaim(
  credentialSubject: CredentialSubject,
): Promise<void> {
  if (!isPaymentReceiptClaim(credentialSubject)) {
    throw new InvalidCredentialSubjectError()
  }

  // TODO: The schema check above confirms the credential subject is
  // structurally valid (paymentRequestToken is a JWT string, paymentOptionId
  // is present). Deeper semantic checks that could be added here:
  //
  //   1. Verify that paymentRequestToken is not expired (call
  //      verifyPaymentRequestToken with verifyExpiry: true). Note that
  //      verifyPaymentReceipt already does this on the outer credential, but
  //      the ClaimVerifier runs against the proof-decoded subject and could
  //      enforce it independently.
  //
  //   2. Verify that paymentOptionId matches one of the options in the
  //      decoded paymentRequestToken. verifyPaymentReceipt already performs
  //      this check, but centralising it here would make the ClaimVerifier
  //      self-contained and usable outside of verifyPaymentReceipt.
  //
  // Both checks require the resolver (or at minimum the decoded payment
  // request), so the ClaimVerifier interface would need to be extended to pass
  // additional context, or the checks should remain in verifyPaymentReceipt
  // where that context is already available.
}

/**
 * Get a claim verifier for payment receipt credentials
 *
 * @returns A {@link ClaimVerifier} that verifies payment receipt credentials
 */
export function getReceiptClaimVerifier(): ClaimVerifier {
  return {
    accepts: (type: string[]) => type.includes("PaymentReceiptCredential"),
    verify: verifyPaymentReceiptClaim,
  }
}
