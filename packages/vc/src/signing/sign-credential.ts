import { isJwtString, type JwtString } from "@agentcommercekit/jwt"
import { createVerifiableCredentialJwt } from "did-jwt-vc"

import type { W3CCredential } from "../types"
import type { Signer } from "./types"

/**
 * Signs a credential with a given issuer.
 *
 * @param credential - The {@link W3CCredential} to sign
 * @param options - The {@link SignCredentialOptions} to use
 * @returns A {@link SignedCredential}
 */
export async function signCredential(
  credential: W3CCredential,
  signer: Signer,
): Promise<JwtString> {
  // options.alg is already a JwtAlgorithm, no conversion needed
  const jwt = await createVerifiableCredentialJwt(credential, signer)

  if (!isJwtString(jwt)) {
    throw new Error("Failed to sign credential")
  }

  return jwt
}
