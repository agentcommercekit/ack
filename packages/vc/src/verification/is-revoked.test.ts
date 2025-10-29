import { BitBuffer } from "bit-buffers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createStatusListCredential } from "../revocation/status-list-credential"
import type { Verifiable, W3CCredential } from "../types"
import { isRevocable, isRevoked } from "./is-revoked"

describe("isRevocable", () => {
  it("returns false if no credential status is present", () => {
    const credential = {
      credentialStatus: undefined,
    } as Verifiable<W3CCredential>

    expect(isRevocable(credential)).toBe(false)
  })

  it("returns false if status list not present", () => {
    const credential = {
      credentialStatus: {
        statusListIndex: "0",
      },
    } as unknown as Verifiable<W3CCredential>

    expect(isRevocable(credential)).toBe(false)
  })

  it("returns false if index is not present", () => {
    const credential = {
      credentialStatus: {
        statusListCredential: "https://example.com/status-list/1",
      },
    } as unknown as Verifiable<W3CCredential>

    expect(isRevocable(credential)).toBe(false)
  })

  it("returns true for a revocable credential", () => {
    const credential = {
      credentialStatus: {
        statusListIndex: "0",
        statusListCredential: "https://example.com/status-list/1",
      },
    } as unknown as Verifiable<W3CCredential>

    expect(isRevocable(credential)).toBe(true)
  })
})

describe("isRevoked", () => {
  const mockFetch = vi.fn()

  const getStatusListCredential = (revokedIndex?: number) => {
    let bitBuffer = new BitBuffer()
    if (revokedIndex) {
      bitBuffer = bitBuffer.set(revokedIndex)
    }
    return createStatusListCredential({
      url: "https://example.com/status-list/1",
      encodedList: bitBuffer.toBitstring(),
      issuer: "did:example:123",
    })
  }

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it("returns false for non-revocable credentials", async () => {
    const credential = {
      credentialStatus: undefined,
    } as Verifiable<W3CCredential>

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(getStatusListCredential()),
    })

    expect(await isRevoked(credential)).toBe(false)
  })

  it("returns false when status list cannot be fetched", async () => {
    const credential = {
      credentialStatus: {
        statusListIndex: "0",
        statusListCredential: "https://example.com/status-list/1",
      },
    } as unknown as Verifiable<W3CCredential>

    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    expect(await isRevoked(credential)).toBe(false)
  })

  it("returns false when bit at index is not set", async () => {
    const credential = {
      credentialStatus: {
        statusListIndex: "5",
        statusListCredential: "https://example.com/status-list/1",
      },
    } as unknown as Verifiable<W3CCredential>

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(getStatusListCredential()),
    })

    expect(await isRevoked(credential)).toBe(false)
  })

  it("returns true when bit at index is set", async () => {
    const credential = {
      credentialStatus: {
        statusListIndex: "5",
        statusListCredential: "https://example.com/status-list/1",
      },
    } as unknown as Verifiable<W3CCredential>

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(getStatusListCredential(5)),
    })

    expect(await isRevoked(credential)).toBe(true)
  })
})
