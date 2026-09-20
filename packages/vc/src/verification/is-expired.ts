import type { W3CCredential } from "../types"

/**
 * ISO-8601 timestamps with an explicit calendar date (`YYYY-MM-DD…`).
 * Used only to reject JS-normalized overflow dates such as `2099-02-30…`.
 */
const ISO_CALENDAR_PREFIX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[Tt ].*)?$/

/**
 * Return true when `value` looks like an ISO calendar date whose day overflows
 * (e.g. Feb 30) and was silently normalized by `Date`.
 */
function hasOverflowCalendarDate(value: string, parsed: Date): boolean {
  const match = ISO_CALENDAR_PREFIX.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  return (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  )
}

/**
 * Check if a credential is expired
 *
 * Fail closed: a present but unparseable `expirationDate` (including an empty
 * string) is treated as expired. An attacker must not clear expiry by mangling
 * the date string. ISO-shaped overflow calendar dates that `Date` would
 * normalize (e.g. `2099-02-30T00:00:00.000Z`) are also treated as expired.
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

  if (hasOverflowCalendarDate(credential.expirationDate, expirationDate)) {
    return true
  }

  return expirationDate < new Date()
}
