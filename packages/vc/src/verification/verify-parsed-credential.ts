import type { Resolvable } from "@agentcommercekit/did"
import type { Verifiable, W3CCredential } from "../types"
import {
  CredentialExpiredError,
  CredentialRevokedError,
  InvalidProofError,
  UnsupportedCredentialTypeError,
  UntrustedIssuerError
} from "./errors"
import { isExpired } from "./is-expired"
import { isRevoked } from "./is-revoked"
import type { ClaimVerifier } from "./types"
import { verifyProof } from "./verify-proof"

type VerifyCredentialOptions = {
  /**
   * The list of trusted issuers
   */
  trustedIssuers?: string[]
  /**
   * The resolver to use for did resolution
   */
  resolver: Resolvable
  /**
   * The list of claim verifiers to use
   */
  verifiers?: ClaimVerifier[]
}

function isVerifiable(
  credential: W3CCredential
): credential is Verifiable<W3CCredential> {
  return (
    "proof" in credential &&
    credential.proof !== null &&
    typeof credential.proof === "object" &&
    "type" in credential.proof
  )
}

/**
 * Verifies a credential, checking:
 * - The proof is valid
 * - The credential is not expired
 * - The issuer is trusted
 * - The contents of the credential subject are valid, based on the credential type.
 *
 * @param credential - The credential to verify.
 * @param options - The {@link VerifyCredentialOptions} to use
 * @throws on error
 */
export async function verifyParsedCredential(
  credential: W3CCredential,
  options: VerifyCredentialOptions
): Promise<void> {
  if (!isVerifiable(credential)) {
    throw new InvalidProofError("Credential does not contain a proof")
  }

  await verifyProof(credential.proof, options.resolver)

  if (isExpired(credential)) {
    throw new CredentialExpiredError()
  }

  if (await isRevoked(credential)) {
    throw new CredentialRevokedError()
  }

  // If trustedIssuers is defined, we require the issuer is in the array (even
  // if the array is empty). If it is not defined, we skip the check.
  if (
    Array.isArray(options.trustedIssuers) &&
    !options.trustedIssuers.includes(credential.issuer.id)
  ) {
    throw new UntrustedIssuerError(
      `Issuer is not trusted '${credential.issuer.id}'`
    )
  }

  // If verifiers are provided, we verify the credential against them.
  if (options.verifiers?.length) {
    const verifiers = options.verifiers.filter((v) =>
      v.accepts(credential.type)
    )

    if (!verifiers.length) {
      throw new UnsupportedCredentialTypeError(
        `Unsupported credential type: ${credential.type.join(", ")}`
      )
    }

    for (const verifier of verifiers) {
      await verifier.verify(credential.credentialSubject, options.resolver)
    }
  }
}
