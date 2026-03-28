import { generateKeypair, keypairToJwk } from "agentcommercekit"
import { describe, expect, it } from "vitest"

import { curveToAlg, err, keypairFromJwk, ok, verification } from "./util"

describe("keypairFromJwk", () => {
  it("reconstructs a secp256k1 keypair from its JWK", async () => {
    const original = await generateKeypair("secp256k1")
    const jwk = keypairToJwk(original)
    const restored = keypairFromJwk(JSON.stringify(jwk))

    expect(restored.curve).toBe("secp256k1")
    expect(Buffer.from(restored.privateKey).toString("hex")).toBe(
      Buffer.from(original.privateKey).toString("hex"),
    )
    expect(Buffer.from(restored.publicKey).toString("hex")).toBe(
      Buffer.from(original.publicKey).toString("hex"),
    )
  })

  it("reconstructs an Ed25519 keypair from its JWK", async () => {
    const original = await generateKeypair("Ed25519")
    const jwk = keypairToJwk(original)
    const restored = keypairFromJwk(JSON.stringify(jwk))

    expect(restored.curve).toBe("Ed25519")
    expect(Buffer.from(restored.privateKey).toString("hex")).toBe(
      Buffer.from(original.privateKey).toString("hex"),
    )
  })

  it("throws on invalid JSON", () => {
    expect(() => keypairFromJwk("not json")).toThrow()
  })

  it("throws on JWK missing required fields", () => {
    expect(() => keypairFromJwk(JSON.stringify({ kty: "EC" }))).toThrow()
  })

  it("throws on JSON array input", () => {
    expect(() => keypairFromJwk("[1, 2, 3]")).toThrow("JWK must be a JSON object")
  })

  it("throws on JSON primitive input", () => {
    expect(() => keypairFromJwk('"just a string"')).toThrow("JWK must be a JSON object")
  })

  it("throws on JSON null input", () => {
    expect(() => keypairFromJwk("null")).toThrow("JWK must be a JSON object")
  })
})

describe("curveToAlg", () => {
  it("maps secp256k1 to ES256K", () => {
    expect(curveToAlg("secp256k1")).toBe("ES256K")
  })

  it("maps secp256r1 to ES256", () => {
    expect(curveToAlg("secp256r1")).toBe("ES256")
  })

  it("maps Ed25519 to EdDSA", () => {
    expect(curveToAlg("Ed25519")).toBe("EdDSA")
  })

  it("throws on unsupported curve", () => {
    expect(() => curveToAlg("P-384")).toThrow("Unsupported curve")
  })
})

describe("response helpers", () => {
  it("ok wraps data in MCP content format", () => {
    const result = ok({ foo: "bar" })
    expect(result.isError).toBeUndefined()
    expect(result.content[0]!.type).toBe("text")
    expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual({
      foo: "bar",
    })
  })

  it("ok passes strings through without double-encoding", () => {
    const result = ok("eyJhbGciOiJFUzI1NksifQ.test.sig")
    expect((result.content[0] as { text: string }).text).toBe(
      "eyJhbGciOiJFUzI1NksifQ.test.sig",
    )
  })

  it("err wraps error message with isError flag", () => {
    const result = err(new Error("something broke"))
    expect(result.isError).toBe(true)
    expect((result.content[0] as { text: string }).text).toBe(
      "Error: something broke",
    )
  })

  it("verification returns valid/invalid with data", () => {
    const valid = verification(true, { score: 82 })
    expect(JSON.parse((valid.content[0] as { text: string }).text)).toEqual({
      valid: true,
      score: 82,
    })

    const invalid = verification(false, { reason: "expired" })
    expect(JSON.parse((invalid.content[0] as { text: string }).text)).toEqual({
      valid: false,
      reason: "expired",
    })
  })
})
