import { BitBuffer } from "bit-buffers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createStatusListCredential } from "../revocation/status-list-credential"
import type { W3CCredential } from "../types"
import { isRevocable, isRevoked } from "./is-revoked"

function buildCredential(
  credentialStatus?: W3CCredential["credentialStatus"],
): W3CCredential {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: { id: "did:example:123" },
    issuanceDate: "2024-01-01T00:00:00.000Z",
    credentialSubject: { id: "did:example:subject" },
    credentialStatus,
  }
}

function statusEntry(
  fields: Record<string, string>,
): W3CCredential["credentialStatus"] {
  return {
    id: "https://example.com/status-list/1#0",
    type: "BitstringStatusListEntry",
    ...fields,
  }
}

function getStatusListCredential(revokedIndex?: number) {
  let bitBuffer = new BitBuffer()
  if (revokedIndex !== undefined) {
    bitBuffer = bitBuffer.set(revokedIndex)
  }
  return createStatusListCredential({
    url: "https://example.com/status-list/1",
    encodedList: bitBuffer.toBitstring(),
    issuer: "did:example:123",
  })
}

describe("isRevocable", () => {
  it("returns false if no credential status is present", () => {
    const credential = buildCredential(undefined)

    expect(isRevocable(credential)).toBe(false)
  })

  it("returns false if status list not present", () => {
    const credential = buildCredential(statusEntry({ statusListIndex: "0" }))

    expect(isRevocable(credential)).toBe(false)
  })

  it("returns false if index is not present", () => {
    const credential = buildCredential(
      statusEntry({
        statusListCredential: "https://example.com/status-list/1",
      }),
    )

    expect(isRevocable(credential)).toBe(false)
  })

  it("returns true for a revocable credential", () => {
    const credential = buildCredential(
      statusEntry({
        statusListIndex: "0",
        statusListCredential: "https://example.com/status-list/1",
      }),
    )

    expect(isRevocable(credential)).toBe(true)
  })
})

describe("isRevoked", () => {
  const mockFetch = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it("returns false for non-revocable credentials", async () => {
    const credential = buildCredential(undefined)

    mockFetch.mockResolvedValueOnce(Response.json(getStatusListCredential()))

    expect(await isRevoked(credential)).toBe(false)
  })

  it("returns false when status list cannot be fetched", async () => {
    const credential = buildCredential(
      statusEntry({
        statusListIndex: "0",
        statusListCredential: "https://example.com/status-list/1",
      }),
    )

    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    expect(await isRevoked(credential)).toBe(false)
  })

  it("returns false when bit at index is not set", async () => {
    const credential = buildCredential(
      statusEntry({
        statusListIndex: "5",
        statusListCredential: "https://example.com/status-list/1",
      }),
    )

    mockFetch.mockResolvedValueOnce(Response.json(getStatusListCredential()))

    expect(await isRevoked(credential)).toBe(false)
  })

  it("returns true when bit at index is set", async () => {
    const credential = buildCredential(
      statusEntry({
        statusListIndex: "5",
        statusListCredential: "https://example.com/status-list/1",
      }),
    )

    mockFetch.mockResolvedValueOnce(Response.json(getStatusListCredential(5)))

    expect(await isRevoked(credential)).toBe(true)
  })
})
