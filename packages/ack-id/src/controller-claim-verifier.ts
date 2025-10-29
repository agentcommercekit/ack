import {
  resolveDidWithController,
  type Resolvable
} from "@agentcommercekit/did"
import {
  InvalidControllerClaimError,
  InvalidCredentialSubjectError,
  isCredential,
  type ClaimVerifier,
  type CredentialSubject,
  type W3CCredential
} from "@agentcommercekit/vc"
import * as v from "valibot"
import { controllerClaimSchema } from "./schemas/valibot"

export interface ControllerCredential extends W3CCredential {
  credentialSubject: v.InferOutput<typeof controllerClaimSchema>
}

function isControllerClaim(
  credentialSubject: CredentialSubject
): credentialSubject is v.InferOutput<typeof controllerClaimSchema> {
  return v.is(controllerClaimSchema, credentialSubject)
}

/**
 * Check if a credential is a controller credential
 *
 * @param credential - The credential to check
 * @returns `true` if the credential is a controller credential, `false` otherwise
 */
export function isControllerCredential(
  credential: unknown
): credential is ControllerCredential {
  if (!isCredential(credential)) {
    return false
  }

  return isControllerClaim(credential.credentialSubject)
}

async function verifyAgentControllerClaim(
  credentialSubject: CredentialSubject,
  resolver: Resolvable
): Promise<void> {
  if (!isControllerClaim(credentialSubject)) {
    throw new InvalidCredentialSubjectError()
  }

  // Resolve the agent's DID document and its controller's DID document
  const { controller } = await resolveDidWithController(
    credentialSubject.id,
    resolver
  )

  if (controller.did !== credentialSubject.controller) {
    throw new InvalidControllerClaimError()
  }
}

/**
 * Get a controller claim verifier
 *
 * @returns A {@link ClaimVerifier} that verifies controller credentials
 */
export function getControllerClaimVerifier(): ClaimVerifier {
  return {
    accepts: (type: string[]) => type.includes("ControllerCredential"),
    verify: verifyAgentControllerClaim
  }
}
