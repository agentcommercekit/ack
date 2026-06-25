import type { Resolvable } from "@agentcommercekit/did"

import type { Verifiable, W3CCredential } from "../types"
import {
  CredentialExpiredError,
  CredentialRevokedError,
  InvalidProofError,
  UnsupportedCredentialTypeError,
  UntrustedIssuerError,
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
  credential: W3CCredential,
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
 * @returns The credential decoded from the verified proof. Callers MUST use
 *   this returned value for any post-verification reads — the `credential`
 *   argument is caller-supplied and is not bound to the proof.
 * @throws on error
 */
export async function verifyParsedCredential(
  credential: W3CCredential,
  options: VerifyCredentialOptions,
): Promise<Verifiable<W3CCredential>> {
  if (!isVerifiable(credential)) {
    throw new InvalidProofError("Credential does not contain a proof")
  }

  // The proof (a JWT) is the only authoritative source. `verifyProof` returns
  // the credential decoded from the verified proof; all trust decisions below
  // run against that, never against the caller-supplied `credential` object,
  // whose fields are not bound to the proof and may have been tampered with.
  const verifiedCredential = await verifyProof(
    credential.proof,
    options.resolver,
  )

  if (isExpired(verifiedCredential)) {
    throw new CredentialExpiredError()
  }

  if (await isRevoked(verifiedCredential)) {
    throw new CredentialRevokedError()
  }

  // If trustedIssuers is defined, we require the issuer is in the array (even
  // if the array is empty). If it is not defined, we skip the check.
  if (
    Array.isArray(options.trustedIssuers) &&
    !options.trustedIssuers.includes(verifiedCredential.issuer.id)
  ) {
    throw new UntrustedIssuerError(
      `Issuer is not trusted '${verifiedCredential.issuer.id}'`,
    )
  }

  // If verifiers are provided, we verify the credential against them.
  if (options.verifiers?.length) {
    const verifiers = options.verifiers.filter((v) =>
      v.accepts(verifiedCredential.type),
    )

    if (!verifiers.length) {
      throw new UnsupportedCredentialTypeError(
        `Unsupported credential type: ${verifiedCredential.type.join(", ")}`,
      )
    }

    // Verify sequentially: failures are deterministic (the first verifier in
    // order wins) and an earlier failure short-circuits before later verifiers
    // run. The set is small (already filtered by `accepts`), so running them in
    // series rather than in parallel is not a meaningful cost.
    for (const verifier of verifiers) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- ordered, short-circuiting verification
      await verifier.verify(
        verifiedCredential.credentialSubject,
        options.resolver,
      )
    }
  }

  return verifiedCredential
}
