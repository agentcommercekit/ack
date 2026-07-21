import { verifyJWT, type JWTVerified, type JWTVerifyOptions } from "did-jwt"

export type JwtVerified = JWTVerified

export type VerifyJwtOptions = JWTVerifyOptions & {
  issuer?: string
  /**
   * Require the JWT to carry a non-empty `aud` claim. `did-jwt` only runs its
   * audience check when the token has an `aud`, so a token that omits it is
   * accepted even when an `audience` is supplied. Setting this ensures the
   * audience check actually runs; supply `audience` for the value to be
   * matched.
   */
  requireAudience?: boolean
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
 * Verify a JWT, with additional options to restrict to a specific issuer and
 * to require an audience claim.
 */
export async function verifyJwt(
  jwt: string,
  { issuer, requireAudience, ...options }: VerifyJwtOptions = {},
): Promise<JwtVerified> {
  const result = await verifyJWT(jwt, options)

  if (issuer && result.payload.iss !== issuer) {
    throw new Error(`Expected issuer ${issuer}, got ${result.payload.iss}`)
  }

  if (requireAudience && !hasAudience(result.payload.aud)) {
    throw new Error("JWT audience is required but missing")
  }

  return result
}
