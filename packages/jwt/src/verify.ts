import { verifyJWT, type JWTVerified, type JWTVerifyOptions } from "did-jwt"

export type JwtVerified = JWTVerified

export type VerifyJwtOptions = JWTVerifyOptions & {
  issuer?: string
}

/** Whether a JWT `aud` claim carries at least one non-empty audience. */
function hasAudience(aud: string | string[] | undefined): boolean {
  if (typeof aud === "string") {
    return aud.length > 0
  }
  if (Array.isArray(aud)) {
    return aud.some((entry) => entry.length > 0)
  }
  return false
}

/**
 * Verify a JWT, with an additional option to restrict to a specific issuer.
 *
 * When an `audience` is supplied, a token without a non-empty `aud` claim
 * fails verification. `did-jwt` only matches `aud` when the token carries
 * one, so without this check a token that omits `aud` would verify even
 * though the caller expected an audience.
 */
export async function verifyJwt(
  jwt: string,
  { issuer, ...options }: VerifyJwtOptions = {},
): Promise<JwtVerified> {
  const result = await verifyJWT(jwt, options)

  if (issuer && result.payload.iss !== issuer) {
    throw new Error(`Expected issuer ${issuer}, got ${result.payload.iss}`)
  }

  if (options.audience !== undefined && !hasAudience(result.payload.aud)) {
    throw new Error("JWT audience is required but missing")
  }

  return result
}
