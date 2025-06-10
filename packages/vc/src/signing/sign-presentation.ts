import { isJwtString, resolveJwtAlgorithm } from "@agentcommercekit/jwt"
import { createVerifiablePresentationJwt, verifyPresentation } from "did-jwt-vc"
import type { SignOptions } from "./types"
import type { Verifiable, W3CPresentation } from "../types"
import type { JwtString } from "@agentcommercekit/jwt"

type SignedPresentation = {
  /**
   * The signed {@link Verifiable<W3CPresentation>} presentation
   */
  verifiablePresentation: Verifiable<W3CPresentation>
  /**
   * The JWT string representation of the signed presentation
   */
  jwt: JwtString
}

/**
 * Signs a presentation with a given holder.
 *
 * @param presentation - The {@link W3CPresentation} to sign
 * @param options - The {@link SignCredentialOptions} to use
 * @returns A {@link SignedPresentation}
 */
export async function signPresentation(
  presentation: W3CPresentation,
  options: SignOptions
): Promise<SignedPresentation> {
  options.alg = options.alg ? resolveJwtAlgorithm(options.alg) : options.alg
  const jwt = await createVerifiablePresentationJwt(presentation, options)

  if (!isJwtString(jwt)) {
    throw new Error("Failed to sign presentation")
  }

  const { verifiablePresentation } = await verifyPresentation(
    jwt,
    options.resolver
  )

  return { jwt, verifiablePresentation }
}
