import { keypairAlgorithms } from "@agentcommercekit/keys"

/**
 * The base algorithms supported by the JWT library
 */
export const strictJwtAlgorithms = [
  "ES256",
  "ES256K",
  "ES256K-R",
  "Ed25519",
  "EdDSA"
] as const
export type StrictJwtAlgorithm = (typeof strictJwtAlgorithms)[number]

/**
 * Allow alternative names for the algorithm (adds `secp256k1` and `Ed25519`,
 * which map to `ES256K` and `EdDSA` respectively)
 */
export const jwtAlgorithms = [
  ...strictJwtAlgorithms,
  ...keypairAlgorithms
] as const
export type JwtAlgorithm = (typeof jwtAlgorithms)[number]

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
 * Resolve the JWT algorithm to the base algorithm
 */
export function resolveJwtAlgorithm(algorithm: unknown): StrictJwtAlgorithm {
  if (!isJwtAlgorithm(algorithm)) {
    throw new Error(`Unsupported algorithm: '${algorithm}'`)
  }

  if (algorithm === "secp256k1") {
    return "ES256K"
  } else if (algorithm === "secp256r1") {
    return "ES256"
  } else if (algorithm === "Ed25519") {
    return "EdDSA"
  }

  return algorithm
}
