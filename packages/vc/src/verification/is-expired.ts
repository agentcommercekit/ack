import type { W3CCredential } from "../types"

/**
 * ISO-8601 timestamps with an explicit calendar date (`YYYY-MM-DD…`).
 * Used only to reject JS-normalized overflow dates such as `2099-02-30…`.
 */
const ISO_CALENDAR_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:[Tt ].*)?$/

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    return leap ? 29 : 28
  }

  const lengths = [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return lengths[month - 1] ?? 0
}

/**
 * Return true when `value` looks like an ISO calendar date whose year/month/day
 * are out of range (e.g. Feb 30). Compares against calendar bounds rather than
 * UTC fields of the parsed instant, so valid offsets like `+14:00` stay valid.
 */
function hasOverflowCalendarDate(value: string): boolean {
  const match = ISO_CALENDAR_PREFIX.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (month < 1 || month > 12) {
    return true
  }

  if (day < 1 || day > daysInMonth(year, month)) {
    return true
  }

  return false
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

  if (hasOverflowCalendarDate(credential.expirationDate)) {
    return true
  }

  const expirationDate = new Date(credential.expirationDate)

  if (Number.isNaN(expirationDate.getTime())) {
    return true
  }

  return expirationDate < new Date()
}
