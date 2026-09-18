import type { W3CCredential } from "../types"

/**
 * Check if a credential is expired
 *
 * Fail closed: a present but unparseable `expirationDate` (including an empty
 * string) is treated as expired. An attacker must not clear expiry by mangling
 * the date string.
 *
 * @param credential - The {@link W3CCredential} to check
 * @returns `true` if the credential is expired or has an unreadable expiry,
 *   `false` when there is no expiry or it is still in the future
 */
export function isExpired(credential: W3CCredential): boolean {
  if (credential.expirationDate === undefined) {
    return false
  }

  const expirationDate = new Date(credential.expirationDate)

  if (Number.isNaN(expirationDate.getTime())) {
    return true
  }

  return expirationDate < new Date()
}
