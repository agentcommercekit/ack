/**
 * URL policy applied to fetch targets that are not directly derived from a
 * DID identifier — specifically, the `jwks_uri` an OIDC discovery document
 * can point `did:jwks` resolution at (see {@link createPolicyEnforcedFetch}).
 *
 * Unlike `did:web`, where the fetch target is built deterministically from
 * the DID string itself, the OIDC discovery fallback reads a URL out of
 * *response content* and then fetches that — a classic SSRF shape, since an
 * attacker who controls the DID's host also controls where discovery points
 * next.
 */
import type { FetchLike } from "../types"

/** Hostnames rejected outright, regardless of scheme. */
const DISALLOWED_HOSTNAMES = new Set(["localhost"])

/**
 * Checks whether a dotted-quad IPv4 address falls in a disallowed range:
 * loopback (127.0.0.0/8), unspecified (0.0.0.0/8), private (10.0.0.0/8,
 * 172.16.0.0/12, 192.168.0.0/16), or link-local (169.254.0.0/16).
 */
function isDisallowedIPv4(hostname: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname)

  if (!match) {
    return false
  }

  const parts = match.slice(1, 5).map(Number)

  if (parts.some((part) => part > 255)) {
    return false
  }

  const [a, b, c, d] = parts

  if (
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined
  ) {
    return false
  }

  if (a === 127 || a === 0) {
    return true // loopback / unspecified
  }
  if (a === 10) {
    return true // 10.0.0.0/8
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true // 172.16.0.0/12
  }
  if (a === 192 && b === 168) {
    return true // 192.168.0.0/16
  }
  if (a === 169 && b === 254) {
    return true // 169.254.0.0/16 (link-local)
  }

  return false
}

/**
 * Checks whether an IPv6 address (without brackets) falls in a disallowed
 * range: loopback (::1), unspecified (::), link-local (fe80::/10), unique
 * local (fc00::/7), or an IPv4-mapped/compatible address whose embedded
 * IPv4 address is itself disallowed.
 */
function isDisallowedIPv6(hostname: string): boolean {
  const lower = hostname.toLowerCase()

  if (lower === "::1" || lower === "::") {
    return true
  }

  // IPv4-mapped (::ffff:a.b.c.d) or IPv4-compatible (::a.b.c.d) forms embed
  // a dotted-quad tail — recurse into the IPv4 check for it. WHATWG URL
  // parsing normalizes these into a canonical hex-group form (e.g.
  // "::ffff:7f00:1" for "::ffff:127.0.0.1"), so check both the rare
  // dotted-quad form and the canonical hex-group form.
  const ipv4DottedTail = /(?:^|:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(
    lower,
  )
  if (ipv4DottedTail?.[1] && isDisallowedIPv4(ipv4DottedTail[1])) {
    return true
  }

  const ipv4MappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower)
  if (ipv4MappedHex) {
    const high = parseInt(ipv4MappedHex[1] ?? "0", 16)
    const low = parseInt(ipv4MappedHex[2] ?? "0", 16)
    const dottedQuad = [
      (high >> 8) & 0xff,
      high & 0xff,
      (low >> 8) & 0xff,
      low & 0xff,
    ].join(".")
    if (isDisallowedIPv4(dottedQuad)) {
      return true
    }
  }

  // fe80::/10 link-local: first hextet's top 10 bits are 1111111010, i.e.
  // fe80-febf.
  const firstHextet = lower.split(":")[0]
  if (firstHextet && /^fe[89ab][0-9a-f]$/.test(firstHextet)) {
    return true
  }

  // fc00::/7 unique local: first hextet's top 7 bits are 1111110, i.e.
  // fc00-fdff.
  if (firstHextet && /^f[cd][0-9a-f]{2}$/.test(firstHextet)) {
    return true
  }

  return false
}

/**
 * Checks whether a URL is safe to fetch: `https:` only, and not targeting a
 * loopback, unspecified, private, or link-local host.
 *
 * This is a hostname/IP-literal check performed before the request is made.
 * It does not protect against DNS rebinding (a hostname that resolves to a
 * disallowed IP only at connect time) — that requires enforcement at the
 * socket layer, which a `fetch` wrapper cannot provide.
 */
export function isSafeFetchTarget(url: URL): boolean {
  if (url.protocol !== "https:") {
    return false
  }

  let hostname = url.hostname.toLowerCase()

  if (DISALLOWED_HOSTNAMES.has(hostname)) {
    return false
  }

  // WHATWG URL parsing brackets IPv6 hostnames (e.g. "[::1]"); strip them
  // before range-checking.
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1)
  }

  if (isDisallowedIPv4(hostname) || isDisallowedIPv6(hostname)) {
    return false
  }

  return true
}

/**
 * Wraps a {@link FetchLike} so every request it makes — including ones the
 * wrapped fetch itself issues internally as a result of following content it
 * already fetched, such as an OIDC-discovered `jwks_uri` — is checked against
 * {@link isSafeFetchTarget} before being allowed through.
 */
export function createPolicyEnforcedFetch(fetch: FetchLike): FetchLike {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString())

    if (!isSafeFetchTarget(url)) {
      throw new Error(
        `Refusing to fetch disallowed URL: ${url.protocol}//${url.hostname}`,
      )
    }

    return fetch(input, init)
  }
}
