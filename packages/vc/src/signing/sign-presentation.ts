import { isJwtString, type JwtString } from "@agentcommercekit/jwt"
import { createVerifiablePresentationJwt } from "did-jwt-vc"
import type { W3CPresentation } from "../types"
import type { Signer } from "./types"

type SignPresentationOptions = {
  challenge?: string
  domain?: string
}

/**
 * Signs a presentation with a given holder.
 *
 * @param presentation - The {@link W3CPresentation} to sign
 * @param options - The {@link SignCredentialOptions} to use
 * @returns A JWT encoded verifiable presentation
 */
export async function signPresentation(
  presentation: W3CPresentation,
  signer: Signer,
  options: SignPresentationOptions = {}
): Promise<JwtString> {
  const jwt = await createVerifiablePresentationJwt(
    presentation,
    signer,
    options
  )

  if (!isJwtString(jwt)) {
    throw new Error("Failed to sign presentation")
  }

  return jwt
}
