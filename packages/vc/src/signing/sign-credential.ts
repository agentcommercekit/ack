import { isJwtString } from "@agentcommercekit/jwt"
import { createVerifiableCredentialJwt, verifyCredential } from "did-jwt-vc"
import type { Signer } from "./types"
import type { Verifiable, W3CCredential } from "../types"
import type { Resolvable } from "@agentcommercekit/did"
import type { JwtString } from "@agentcommercekit/jwt"

type SignedCredential<T extends W3CCredential> = {
  /**
   * The signed {@link Verifiable<W3CCredential>} credential
   */
  verifiableCredential: Verifiable<T>
  /**
   * The JWT string representation of the signed credential
   */
  jwt: JwtString
}

/**
 * Signs a credential with a given issuer.
 *
 * @param credential - The {@link W3CCredential} to sign
 * @param options - The {@link SignCredentialOptions} to use
 * @returns A {@link SignedCredential}
 */
export async function signCredential(
  credential: W3CCredential,
  signer: Signer
): Promise<JwtString> {
  // options.alg is already a JwtAlgorithm, no conversion needed
  const jwt = await createVerifiableCredentialJwt(credential, signer)

  if (!isJwtString(jwt)) {
    throw new Error("Failed to sign credential")
  }

  return jwt
}
