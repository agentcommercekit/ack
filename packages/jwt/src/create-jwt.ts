import {
  createJWT as baseCreateJWT,
  type JWTHeader,
  type JWTOptions,
  type JWTPayload,
} from "did-jwt"

import type { JwtAlgorithm } from "./jwt-algorithm"
import { isJwtString, type JwtString } from "./jwt-string"

export type JwtPayload = JWTPayload
export type JwtOptions = JWTOptions

/**
 * JWT header that only contains valid JWT algorithms
 */
export interface JwtHeader extends Omit<JWTHeader, "alg" | "typ"> {
  typ?: string
  alg: JwtAlgorithm
}

/**
 * Create a JWT
 *
 * @param payload - The payload to create the JWT from
 * @param options - The options to create the JWT from
 * @param header - Optional header overrides
 * @param header.alg - The algorithm to use for the JWT. Accepts `secp256k1` and
 *  `Ed25519` as aliases for `ES256K` and `EdDSA` respectively. Defaults to
 *  `ES256K`.
 * @returns The JWT
 */
export async function createJwt(
  payload: Partial<JwtPayload>,
  options: JwtOptions,
  { alg = "ES256K", ...header }: Partial<JwtHeader> = {},
): Promise<JwtString> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const result = await baseCreateJWT(payload, options, {
    ...header,
    alg,
  } as Partial<JWTHeader>)

  if (!isJwtString(result)) {
    throw new Error("Failed to create JWT")
  }

  return result
}
