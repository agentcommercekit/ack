/**
 * Utility tools for MCP.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  caip2ChainIds,
  createDidKeyUri,
  createDidPkhUri,
  createDidWebUri,
  generateKeypair,
  keypairToJwk,
} from "agentcommercekit"
import { z } from "zod"

import { err, ok } from "../util"

const chainIdValues = Object.values(caip2ChainIds) as [string, ...string[]]

/** Register utility tools on the MCP server. */
export function registerUtilityTools(server: McpServer) {
  server.tool(
    "ack_generate_keypair",
    "Generate a new cryptographic keypair with a did:key DID. Returns the JWK (private key), DID, and curve. Pass the jwk value to any tool that requires signerJwk. The DID can be used as signerDid, subjectDid, controllerDid, etc.",
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
        })
      } catch (e) {
        return err(e)
      }
    },
  )

  server.tool(
    "ack_create_did_web",
    "Create a did:web DID URI from a URL. Use for agents or services hosted at a known web address. The domain must host a .well-known/did.json document for DID resolution to work.",
    {
      url: z
        .string()
        .describe(
          "URL of the DID subject (e.g. 'https://example.com' or 'https://example.com/agents/1')",
        ),
    },
    async ({ url }) => {
      try {
        const did = createDidWebUri(url)
        return ok({ did })
      } catch (e) {
        return err(e)
      }
    },
  )

  server.tool(
    "ack_create_did_pkh",
    "Create a did:pkh DID URI from a blockchain chain ID and wallet address. Use for representing on-chain identities (e.g. Ethereum wallets) as DIDs.",
    {
      chainId: z
        .enum(chainIdValues)
        .describe(
          "CAIP-2 chain ID (e.g. 'eip155:1' for Ethereum mainnet, 'eip155:8453' for Base, 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' for Solana)",
        ),
      address: z.string().describe("Wallet address on the specified chain"),
    },
    async ({ chainId, address }) => {
      try {
        const did = createDidPkhUri(chainId, address)
        return ok({ did })
      } catch (e) {
        return err(e)
      }
    },
  )
}
