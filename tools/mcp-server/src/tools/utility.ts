/**
 * Utility tools for MCP.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  bytesToHexString,
  createDidKeyUri,
  generateKeypair,
  keypairToJwk,
} from "agentcommercekit"
import { z } from "zod"

import { err, ok } from "../util"

export function registerUtilityTools(server: McpServer) {
  server.tool(
    "ack_generate_keypair",
    "Generate a new cryptographic keypair. Returns the private key (hex), public key (hex), JWK, DID, and curve. Use the JWK value when calling other tools that require signing.",
    {
      curve: z
        .enum(["secp256k1", "secp256r1", "Ed25519"])
        .default("secp256k1")
        .describe("Cryptographic curve to use"),
    },
    async ({ curve }) => {
      try {
        const keypair = await generateKeypair(curve)
        return ok({
          curve,
          did: createDidKeyUri(keypair),
          jwk: JSON.stringify(keypairToJwk(keypair)),
          privateKey: bytesToHexString(keypair.privateKey),
          publicKey: bytesToHexString(keypair.publicKey),
        })
      } catch (e) {
        return err(e)
      }
    },
  )
}
