import { beforeEach, describe, expect, it, vi } from "vitest"

import type { FetchLike } from "../types"
import { createPolicyEnforcedFetch, isSafeFetchTarget } from "./url-policy"

describe("isSafeFetchTarget", () => {
  it("allows an ordinary https URL", () => {
    expect(isSafeFetchTarget(new URL("https://example.com/jwks.json"))).toBe(
      true,
    )
  })

  it("rejects http (non-https)", () => {
    expect(isSafeFetchTarget(new URL("http://example.com/jwks.json"))).toBe(
      false,
    )
  })

  it("rejects localhost", () => {
    expect(isSafeFetchTarget(new URL("https://localhost/jwks.json"))).toBe(
      false,
    )
  })

  it.each([
    "127.0.0.1", // loopback
    "0.0.0.0", // unspecified
    "10.1.2.3", // private (10.0.0.0/8)
    "172.16.0.1", // private (172.16.0.0/12)
    "172.31.255.255", // private (172.16.0.0/12, upper bound)
    "192.168.1.1", // private (192.168.0.0/16)
    "169.254.169.254", // link-local (cloud metadata endpoint)
  ])("rejects disallowed IPv4 literal %s", (host) => {
    expect(isSafeFetchTarget(new URL(`https://${host}/jwks.json`))).toBe(false)
  })

  it.each([
    "172.15.255.255", // just below the 172.16.0.0/12 private range
    "172.32.0.0", // just above the 172.16.0.0/12 private range
    "1.1.1.1",
    "8.8.8.8",
  ])("allows non-private IPv4 literal %s", (host) => {
    expect(isSafeFetchTarget(new URL(`https://${host}/jwks.json`))).toBe(true)
  })

  it.each([
    "[::1]", // loopback
    "[::]", // unspecified
    "[fe80::1]", // link-local
    "[fc00::1]", // unique local
    "[fd00::1]", // unique local
    "[::ffff:127.0.0.1]", // IPv4-mapped loopback
    "[::ffff:169.254.169.254]", // IPv4-mapped link-local (cloud metadata)
  ])("rejects disallowed IPv6 literal %s", (host) => {
    expect(isSafeFetchTarget(new URL(`https://${host}/jwks.json`))).toBe(false)
  })

  it("allows a non-private IPv6 literal", () => {
    expect(
      isSafeFetchTarget(new URL("https://[2606:4700:4700::1111]/jwks.json")),
    ).toBe(true)
  })

  it("rejects a decimal-encoded IPv4 loopback address (SSRF bypass attempt)", () => {
    // WHATWG URL parsing canonicalizes non-dotted-quad IPv4 forms (decimal,
    // octal, hex) into standard dotted-quad as part of host parsing, so this
    // is caught by the same IPv4 check without any extra handling here.
    const url = new URL("https://2130706433/jwks.json") // 127.0.0.1
    expect(url.hostname).toBe("127.0.0.1")
    expect(isSafeFetchTarget(url)).toBe(false)
  })
})

describe("createPolicyEnforcedFetch", () => {
  let mockFetch: FetchLike

  beforeEach(() => {
    mockFetch = vi.fn<FetchLike>().mockResolvedValue(new Response("{}"))
  })

  it("delegates to the wrapped fetch for an allowed URL", async () => {
    const policyEnforcedFetch = createPolicyEnforcedFetch(mockFetch)

    await policyEnforcedFetch("https://example.com/jwks.json")

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/jwks.json",
      undefined,
    )
  })

  it("throws instead of delegating for a disallowed URL", async () => {
    const policyEnforcedFetch = createPolicyEnforcedFetch(mockFetch)

    // This mirrors the issue's reproduction: an OIDC discovery document
    // pointing jwks_uri at a cloud metadata endpoint.
    await expect(
      policyEnforcedFetch("http://169.254.169.254/latest/meta-data/"),
    ).rejects.toThrow(/Refusing to fetch disallowed URL/)

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("checks a Request input's URL, not just string/URL inputs", async () => {
    const policyEnforcedFetch = createPolicyEnforcedFetch(mockFetch)

    await expect(
      policyEnforcedFetch(new Request("http://127.0.0.1/jwks.json")),
    ).rejects.toThrow(/Refusing to fetch disallowed URL/)

    expect(mockFetch).not.toHaveBeenCalled()
  })
})
