import { isJwtString } from "@agentcommercekit/jwt"
import { createVerifiableCredentialJwt, verifyCredential } from "did-jwt-vc"
import type { SignOptions } from "./types"
import type { Verifiable, W3CCredential } from "../types"
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
export async function signCredential<T extends W3CCredential>(
  credential: T,
  options: SignOptions
): Promise<SignedCredential<T>> {
  // options.alg is already a JwtAlgorithm, no conversion needed
  const jwt = await createVerifiableCredentialJwt(credential, options)

  if (!isJwtString(jwt)) {
    throw new Error("Failed to sign credential")
  }

  const { verifiableCredential } = await verifyCredential(jwt, options.resolver)

  return { jwt, verifiableCredential: verifiableCredential as Verifiable<T> }
}
