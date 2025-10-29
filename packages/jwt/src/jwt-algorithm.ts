import { isKeyCurve, type KeyCurve } from "@agentcommercekit/keys"

/**
 * JWT signing algorithms supported by the JWT library
 *
 * The did-jwt library also supports non-standard "ES256K-R" for
 */
export const jwtAlgorithms = ["ES256", "ES256K", "EdDSA"] as const
export type JwtAlgorithm = (typeof jwtAlgorithms)[number]

/**
 * Mapping from key curves to JWT algorithms
 */
export const CURVE_TO_ALGORITHM: Record<KeyCurve, JwtAlgorithm> = {
  secp256k1: "ES256K",
  secp256r1: "ES256",
  Ed25519: "EdDSA"
}

/**
 * Check if an algorithm is a valid JWT algorithm
 * @param algorithm - The algorithm to check
 * @returns `true` if the algorithm is a valid JWT algorithm, `false` otherwise
 */
export function isJwtAlgorithm(algorithm: unknown): algorithm is JwtAlgorithm {
  return (
    typeof algorithm === "string" &&
    (jwtAlgorithms as readonly string[]).includes(algorithm)
  )
}

/**
 * Convert a key curve to its corresponding JWT algorithm
 * @param curve - The key curve
 * @returns The corresponding JWT algorithm
 */
export function curveToJwtAlgorithm(curve: KeyCurve): JwtAlgorithm {
  if (!isKeyCurve(curve)) {
    throw new Error(`Unsupported curve: '${curve}'`)
  }

  return CURVE_TO_ALGORITHM[curve]
}
