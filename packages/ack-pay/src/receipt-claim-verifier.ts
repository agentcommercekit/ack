import {
  InvalidCredentialSubjectError,
  isCredential,
  type ClaimVerifier,
  type CredentialSubject,
  type W3CCredential
} from "@agentcommercekit/vc"
import * as v from "valibot"
import { paymentReceiptClaimSchema } from "./schemas/valibot"

export interface PaymentReceiptCredential extends W3CCredential {
  credentialSubject: v.InferOutput<typeof paymentReceiptClaimSchema>
}

function isPaymentReceiptClaim(
  credentialSubject: CredentialSubject
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
  credential: unknown
): credential is PaymentReceiptCredential {
  if (!isCredential(credential)) {
    return false
  }
  return isPaymentReceiptClaim(credential.credentialSubject)
}

async function verifyPaymentReceiptClaim(
  credentialSubject: CredentialSubject
): Promise<void> {
  if (!isPaymentReceiptClaim(credentialSubject)) {
    throw new InvalidCredentialSubjectError()
  }

  return Promise.resolve()
}

/**
 * Get a claim verifier for payment receipt credentials
 *
 * @returns A {@link ClaimVerifier} that verifies payment receipt credentials
 */
export function getReceiptClaimVerifier(): ClaimVerifier {
  return {
    accepts: (type: string[]) => type.includes("PaymentReceiptCredential"),
    // For now, we just verify the credential subject matches the expected schema
    verify: verifyPaymentReceiptClaim
  }
}
