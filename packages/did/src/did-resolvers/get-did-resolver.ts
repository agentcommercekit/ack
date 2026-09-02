import type { ResolverOptions } from "did-resolver"
import { getResolver as getJwksDidResolver } from "jwks-did-resolver"
import { getResolver as getKeyDidResolver } from "key-did-resolver"

import { DidResolver } from "./did-resolver"
import { getResolver as getPkhDidResolver } from "./pkh-did-resolver"
import {
  getResolver as getWebDidResolver,
  type DidWebResolverOptions,
} from "./web-did-resolver"

interface GetDidResolverOptions extends ResolverOptions {
  /**
   * The options for the did:web resolver
   */
  webOptions?: DidWebResolverOptions
}

type FetchInput = string | URL | Request

const DEFAULT_WEB_OPTIONS: DidWebResolverOptions = {
  allowedHttpHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
}

const IPV4_PRIVATE_RANGES = [
  { start: "10.0.0.0", end: "10.255.255.255" },
  { start: "127.0.0.0", end: "127.255.255.255" },
  { start: "169.254.0.0", end: "169.254.255.255" },
  { start: "172.16.0.0", end: "172.31.255.255" },
  { start: "192.168.0.0", end: "192.168.255.255" },
]

function getFetchUrl(input: FetchInput): URL {
  if (typeof input === "string" || input instanceof URL) {
    return new URL(input)
  }

  return new URL(input.url)
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4) {
    return null
  }

  let value = 0
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null
    }

    const byte = Number(part)
    if (byte < 0 || byte > 255) {
      return null
    }

    value = value * 256 + byte
  }

  return value
}

function isPrivateIpv4Address(hostname: string): boolean {
  const address = ipv4ToNumber(hostname)
  if (address === null) {
    return false
  }

  if (address === 0) {
    return true
  }

  return IPV4_PRIVATE_RANGES.some(({ start, end }) => {
    const startAddress = ipv4ToNumber(start)
    const endAddress = ipv4ToNumber(end)
    return (
      startAddress !== null &&
      endAddress !== null &&
      address >= startAddress &&
      address <= endAddress
    )
  })
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "")
}

function expandIpv6Address(ip: string): number[] | null {
  if (!ip.includes(":")) {
    return null
  }

  let normalized = ip
  const embeddedIpv4 = ip.match(/(?<ipv4>\d+\.\d+\.\d+\.\d+)$/)?.groups?.ipv4
  if (embeddedIpv4) {
    const ipv4 = ipv4ToNumber(embeddedIpv4)
    if (ipv4 === null) {
      return null
    }

    normalized = ip.replace(
      embeddedIpv4,
      `${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`,
    )
  }

  if (normalized.split("::").length > 2) {
    return null
  }

  const [left = "", right = ""] = normalized.split("::")
  const leftGroups = left ? left.split(":") : []
  const rightGroups = right ? right.split(":") : []

  if (leftGroups.length + rightGroups.length > 8) {
    return null
  }

  const zeroGroups = 8 - leftGroups.length - rightGroups.length
  if (!normalized.includes("::") && zeroGroups !== 0) {
    return null
  }

  const groups = [
    ...leftGroups,
    ...Array.from({ length: zeroGroups }, () => "0"),
    ...rightGroups,
  ]

  if (groups.length !== 8) {
    return null
  }

  return groups.map((group) => {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) {
      return Number.NaN
    }

    return Number.parseInt(group, 16)
  })
}

function isPrivateIpv6Address(hostname: string): boolean {
  const groups = expandIpv6Address(hostname)
  if (!groups || groups.some(Number.isNaN)) {
    return false
  }

  const isUnspecified = groups.every((group) => group === 0)
  const isLoopback =
    groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1
  const firstGroup = groups[0] ?? 0
  const sixthGroup = groups[5] ?? 0
  const seventhGroup = groups[6] ?? 0
  const eighthGroup = groups[7] ?? 0
  const isUniqueLocal = (firstGroup & 0xfe00) === 0xfc00
  const isLinkLocal = (firstGroup & 0xffc0) === 0xfe80
  const isIpv4Mapped =
    groups.slice(0, 5).every((group) => group === 0) && sixthGroup === 0xffff
  const mappedIpv4 = isIpv4Mapped
    ? `${seventhGroup >>> 8}.${seventhGroup & 0xff}.${eighthGroup >>> 8}.${eighthGroup & 0xff}`
    : null

  return (
    isUnspecified ||
    isLoopback ||
    isUniqueLocal ||
    isLinkLocal ||
    (mappedIpv4 !== null && isPrivateIpv4Address(mappedIpv4))
  )
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    isPrivateIpv4Address(normalized) ||
    isPrivateIpv6Address(normalized)
  )
}

function validateJwksFetchUrl(
  input: FetchInput,
  allowedHttpHosts: string[],
): void {
  const url = getFetchUrl(input)
  const hostname = normalizeHostname(url.hostname)
  const normalizedAllowedHttpHosts = new Set(
    allowedHttpHosts.map(normalizeHostname),
  )

  if (
    isLocalOrPrivateHost(hostname) &&
    !normalizedAllowedHttpHosts.has(hostname)
  ) {
    throw new Error(
      `Refusing to fetch did:jwks URL at private host: ${url.href}`,
    )
  }

  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && normalizedAllowedHttpHosts.has(hostname))
  ) {
    throw new Error(
      `Refusing to fetch did:jwks URL with unsafe scheme: ${url.href}`,
    )
  }
}

function createJwksFetch(
  fetch: NonNullable<DidWebResolverOptions["fetch"]>,
  allowedHttpHosts: string[],
): NonNullable<DidWebResolverOptions["fetch"]> {
  return (input, init) => {
    validateJwksFetchUrl(input, allowedHttpHosts)
    return fetch(input, init)
  }
}

/**
 * Get a did resolver that can resolve multiple DID methods.
 *
 * @param options - The {@link GetDidResolverOptions} to use for the did resolver
 * @returns A new {@link DidResolver} instance
 */
export function getDidResolver({
  webOptions,
  ...options
}: GetDidResolverOptions = {}): DidResolver {
  const resolvedWebOptions = webOptions ?? DEFAULT_WEB_OPTIONS
  const webFetch = resolvedWebOptions.fetch ?? globalThis.fetch
  const jwksAllowedHttpHosts = webOptions?.allowedHttpHosts ?? []
  const keyResolver = getKeyDidResolver()
  const webResolver = getWebDidResolver(resolvedWebOptions)
  const jwksResolver = getJwksDidResolver({
    ...resolvedWebOptions,
    allowedHttpHosts: jwksAllowedHttpHosts,
    fetch: createJwksFetch(webFetch, jwksAllowedHttpHosts),
  })
  const pkhResolver = getPkhDidResolver()

  const didResolver = new DidResolver(
    {
      ...keyResolver,
      ...webResolver,
      ...jwksResolver,
      ...pkhResolver,
    },
    options,
  )

  return didResolver
}
