import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
/**
 * Shared utilities for MCP tools.
 */
import {
  getDidResolver,
  jwkToKeypair,
  type JwtAlgorithm,
  type Keypair,
} from "agentcommercekit"

/** Shared DID resolver instance. */
export const resolver = getDidResolver()

/**
 * Reconstruct a Keypair from a JWK JSON string.
 *
 * Using JWK instead of raw hex + curve avoids the risk of curve mismatch —
 * the JWK's `crv` field is always bundled with the key material.
 */
export function keypairFromJwk(jwkJson: string): Keypair {
  const jwk = JSON.parse(jwkJson)
  if (typeof jwk !== "object" || jwk === null || Array.isArray(jwk)) {
    throw new Error("JWK must be a JSON object")
  }
  return jwkToKeypair(jwk)
}

/** Map a curve name to its JWT algorithm identifier. */
export function curveToAlg(curve: string): JwtAlgorithm {
  switch (curve) {
    case "secp256k1":
      return "ES256K"
    case "secp256r1":
      return "ES256"
    case "Ed25519":
      return "EdDSA"
    default:
      throw new Error(
        `Unsupported curve: ${curve}. Use secp256k1, secp256r1, or Ed25519.`,
      )
  }
}

/** Return a successful MCP tool result with a JSON text response. */
export function ok(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  }
}

/** Return an error MCP tool result. */
export function err(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error)
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  }
}

/** Return a verification result (valid or invalid, never an error). */
export function verification(
  valid: boolean,
  data: Record<string, unknown>,
): CallToolResult {
  return ok({ valid, ...data })
}
