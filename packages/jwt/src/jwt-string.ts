import type { JwtString } from "web-identity-schemas"

export type { JwtString }

/**
 * Checks if a string is formatted correctly as a JWT string. This
 * does not verify the JWT's integrity, only that it is formatted correctly.
 *
 * Requires a non-empty signature segment (ACK always signs its JWTs; it never
 * issues unsecured tokens), so this is stricter than `web-identity-schemas`'
 * `JwtStringSchema`, which permits an empty signature.
 *
 * @param value - The value to check
 * @returns `true` if the value is a valid JWT string, `false` otherwise
 */
export function isJwtString(value: unknown): value is JwtString {
  return (
    typeof value === "string" &&
    /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/.test(value)
  )
}
