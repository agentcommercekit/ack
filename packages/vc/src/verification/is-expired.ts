import type { W3CCredential } from "../types"

/**
 * Check if a credential is expired
 *
 * @param credential - The {@link W3CCredential} to check
 * @returns `true` if the credential is expired, `false` otherwise
 */
export function isExpired(credential: W3CCredential): boolean {
  if (credential.expirationDate === undefined) {
    return false
  }

  const expirationDate = new Date(credential.expirationDate)

  if (isNaN(expirationDate.getTime())) {
    // Expiration date is present but unparseable — fail closed and treat as
    // expired. Returning false (not expired) would allow a credential with a
    // garbage date to pass all downstream checks, which is the wrong default
    // for a security-critical guard.
    return true
  }

  return expirationDate < new Date()
}
