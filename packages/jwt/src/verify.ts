import { verifyJWT, type JWTVerified, type JWTVerifyOptions } from "did-jwt"

export type JwtVerified = JWTVerified

export type VerifyJwtOptions = JWTVerifyOptions & {
  issuer?: string
}

/**
 * Verify a JWT, with additional options to restrict to a specific issuer
 */
export async function verifyJwt(
  jwt: string,
  { issuer, ...options }: VerifyJwtOptions = {},
): Promise<JwtVerified> {
  const result = await verifyJWT(jwt, options)

  if (issuer && result.payload.iss !== issuer) {
    throw new Error(`Expected issuer ${issuer}, got ${result.payload.iss}`)
  }

  return result
}
