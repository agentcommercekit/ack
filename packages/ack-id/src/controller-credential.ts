import type { DidUri } from "@agentcommercekit/did"

import { createCredential, type W3CCredential } from "@agentcommercekit/vc"

type CreateControllerCredentialParams = {
  /**
   * The id of the credential.
   */
  id?: string
  /**
   * The Did of the subject of the credential.
   */
  subject: DidUri
  /**
   * The Did of the controller of the credential.
   */
  controller: DidUri
  /**
   * The Did of the issuer of the credential. If not provided, the controller
   * will be used as the issuer.
   */
  issuer?: DidUri
}

/**
 * Create a controller credential
 *
 * @param params - The {@link CreateControllerCredentialParams} to use
 * @returns A {@link W3CCredential} with a controller attestation
 */
export function createControllerCredential({
  id,
  subject,
  controller,
  issuer,
}: CreateControllerCredentialParams): W3CCredential {
  return createCredential({
    id,
    type: "ControllerCredential",
    issuer: issuer ?? controller,
    subject,
    attestation: {
      controller: controller,
    },
  })
}
