import type { W3CCredential } from "../types"

/**
 * Check if a credential is expired
 *
 * Fails closed: a credential with an `expirationDate` that is present but
 * cannot be parsed as a valid date is treated as expired, not as
 * non-expiring.
 *
 * @param credential - The {@link W3CCredential} to check
 * @returns `true` if the credential is expired (or has an unparseable
 *   expiration date), `false` otherwise
 */
export function isExpired(credential: W3CCredential): boolean {
  if (credential.expirationDate === undefined) {
    return false
  }

  // `parseJwtCredential` does not validate that `expirationDate` is a
  // string, so a malformed or malicious credential could carry a number
  // (which `Date()` accepts as epoch milliseconds) or another non-string
  // JSON value here. Reject anything that isn't a string outright, rather
  // than letting it reach `new Date()`, which would silently accept types
  // the {@link W3CCredential} type only documents as a string.
  if (typeof credential.expirationDate !== "string") {
    return true
  }

  const expirationDate = new Date(credential.expirationDate)

  if (isNaN(expirationDate.getTime())) {
    // Expiration date is present but unparseable. Fail closed: an
    // unparseable expiration date must not be treated as "never expires",
    // since that would let a malformed or malicious `expirationDate` value
    // grant a credential unbounded validity.
    return true
  }

  return expirationDate < new Date()
}
