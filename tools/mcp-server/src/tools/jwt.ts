/**
 * Raw JWT tools for MCP.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  createJwt,
  createJwtSigner,
  verifyJwt,
  type DidUri,
} from "agentcommercekit"
import { z } from "zod"

import {
  curveToAlg,
  err,
  keypairFromJwk,
  ok,
  resolver,
  verification,
} from "../util"

/** Register raw JWT tools on the MCP server. */
export function registerJwtTools(server: McpServer) {
  server.tool(
    "ack_create_jwt",
    "Create a signed JWT with an arbitrary payload. Use for challenge-response authentication, signed messages between agents, or any custom signed payload. The JWT is signed with the provided JWK and includes the signer's DID as the issuer.",
    {
      payload: z
        .string()
        .describe(
          "JSON string of the JWT payload (claims). Standard claims like sub, aud, exp, nbf are supported.",
        ),
      signerJwk: z
        .string()
        .describe(
          "JWK JSON string containing the signer's private key (from ack_generate_keypair or any valid private key JWK)",
        ),
      signerDid: z
        .string()
        .describe("DID of the signer, set as the JWT issuer (iss claim)"),
    },
    async ({ payload, signerJwk: jwk, signerDid: did }) => {
      try {
        const parsed = JSON.parse(payload)
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          throw new Error("payload must be a JSON object")
        }
        const keypair = keypairFromJwk(jwk)
        const jwt = await createJwt(
          parsed,
          {
            issuer: did as DidUri,
            signer: createJwtSigner(keypair),
          },
          { alg: curveToAlg(keypair.curve) },
        )
        return ok(jwt)
      } catch (e) {
        return err(e)
      }
    },
  )

  server.tool(
    "ack_verify_jwt",
    "Verify a signed JWT and return its decoded payload. Checks the signature against the issuer's DID. Use for verifying challenge-response tokens or any signed message from another agent.",
    {
      jwt: z.string().describe("The signed JWT string to verify"),
      issuer: z
        .string()
        .optional()
        .describe(
          "Expected issuer DID. If provided, verifies the JWT was signed by this DID.",
        ),
    },
    async ({ jwt, issuer }) => {
      try {
        const result = await verifyJwt(jwt, { resolver, issuer })
        return verification(true, {
          issuer: result.issuer,
          payload: result.payload,
        })
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e)
        return verification(false, { reason })
      }
    },
  )
}
