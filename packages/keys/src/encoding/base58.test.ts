import { describe, expect, test } from "vitest"

import {
  base58btcToBytes,
  base58ToBytes,
  bytesToBase58,
  bytesToBase58btc,
} from "./base58"

describe("base58btc encoding and decoding (used for DID:key)", () => {
  test("converts bytes to base58btc string", () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const base58 = bytesToBase58btc(bytes)
    expect(base58).toBe("2VfUX")
  })

  test("converts base58btc string to bytes", () => {
    const base58 = "2VfUX"
    const bytes = base58btcToBytes(base58)
    expect(bytes).toEqual(new Uint8Array([1, 2, 3, 4]))
  })

  test("roundtrip base58btc encoding", () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const base58 = bytesToBase58btc(original)
    const bytes = base58btcToBytes(base58)
    expect(bytes).toEqual(original)
  })
})

describe("Solana base58 encoding and decoding (used for Solana addresses)", () => {
  test("converts bytes to Solana base58 string", () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const base58 = bytesToBase58(bytes)
    expect(base58).toBe("2VfUX")
  })

  test("converts Solana base58 string to bytes", () => {
    const base58 = "2VfUX"
    const bytes = base58ToBytes(base58)
    expect(bytes).toEqual(new Uint8Array([1, 2, 3, 4]))
  })

  test("roundtrip Solana base58 encoding", () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const base58 = bytesToBase58(original)
    const bytes = base58ToBytes(base58)
    expect(bytes).toEqual(original)
  })
})
