import {
  colors,
  errorMessage,
  log,
  logJson,
  successMessage,
} from "@repo/cli-tools"
import {
  resolveDidWithController,
  type DidResolver,
  type JwtString,
} from "agentcommercekit"

import type { CredentialVerifier } from "./credential-verifier"

/**
 * Verify another agent's identity using their DID and ownership credential.
 *
 * @returns true if the credential is valid and the agent is controlled by the expected owner
 */
export async function verifyAgentIdentityWithCredential(
  jwt: JwtString | undefined,
  resolver: DidResolver,
  verifier: CredentialVerifier,
): Promise<boolean> {
  if (!jwt) {
    log(colors.dim("[verification] Agent missing ownership credential"))
    return false
  }

  try {
    log(colors.dim("[verification] Verifying Ownership Credential attestation"))

    // Verifies the JWT credential. This checks the signature, expiration date,
    // and if the credential is revoked.
    const credential = await verifier.verifyCredential(jwt)

    log(colors.dim("[verification] Ownership Credential JWT payload:"))
    logJson(credential)

    if (!credential.credentialSubject.id) {
      log(colors.dim("[verification] Credential verification failed: No ID"))
      return false
    }

    // Resolve the agent's DID and controller
    const { controller } = await resolveDidWithController(
      credential.credentialSubject.id,
      resolver,
    )

    log(
      colors.dim(
        `[verification] Verification result issuer: ${credential.issuer.id}`,
      ),
    )

    // Check if the DID controller matches the controller in the credential
    if (credential.credentialSubject.controller !== controller.did) {
      log(
        colors.dim(
          `[verification] Credential verification failed: Issuer ${credential.credentialSubject.id} doesn't match expected owner ${controller.did}`,
        ),
      )
      return false
    }

    log(
      successMessage(
        `[verification] Credential verification succeeded: Agent is controlled by:
        ${colors.bold(controller.did)}`,
      ),
    )
    return true
  } catch (error) {
    log(errorMessage(`[verification] Credential verification error: ${error}`))
    return false
  }
}
