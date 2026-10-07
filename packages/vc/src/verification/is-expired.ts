import type { W3CCredential } from "../types"

/**
 * Check if a credential is expired
 *
 * @param credential - The {@link W3CCredential} to check
 * @returns `true` if the credential is expired or has an unparseable
 *   `expirationDate`, `false` if it is verifiably not yet expired
 *
 * An unparseable date is treated as expired rather than "not expired":
 * a credential whose expiry cannot be established should not pass an
 * expiry check, consistent with the fail-closed approach used elsewhere
 * in this verification pipeline (e.g. `resolveStatusListCredential`
 * throws on an unreadable `expirationDate` instead of treating it as
 * absent).
 */
export function isExpired(credential: W3CCredential): boolean {
  if (!credential.expirationDate) {
    return false
  }

  const expirationDate = new Date(credential.expirationDate)

  if (isNaN(expirationDate.getTime())) {
    // An unreadable expiry date cannot be verified — treat as expired
    // (fail-closed) rather than silently allowing the credential through.
    return true
  }

  return expirationDate < new Date()
}
