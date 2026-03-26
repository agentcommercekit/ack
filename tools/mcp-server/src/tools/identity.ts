/**
 * ACK-ID identity tools for MCP.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  createControllerCredential,
  createJwtSigner,
  parseJwtCredential,
  resolveDid,
  signCredential,
  verifyParsedCredential,
  type DidUri,
  type JwtString,
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

export function registerIdentityTools(server: McpServer) {
  server.tool(
    "ack_create_controller_credential",
    "Create a W3C Verifiable Credential proving that a subject DID is controlled by a controller DID.",
    {
      subject: z
        .string()
        .describe("DID of the subject (the entity being controlled)"),
      controller: z
        .string()
        .describe("DID of the controller (the entity with authority)"),
      issuer: z
        .string()
        .optional()
        .describe("DID of the issuer. Defaults to the controller."),
    },
    async ({ subject, controller, issuer }) => {
      try {
        const credential = createControllerCredential({
          subject: subject as DidUri,
          controller: controller as DidUri,
          issuer: issuer as DidUri | undefined,
        })
        return ok(credential)
      } catch (e) {
        return err(e)
      }
    },
  )

  server.tool(
    "ack_sign_credential",
    "Sign a W3C Verifiable Credential, returning a signed JWT string. The jwk parameter should be the JWK string returned by ack_generate_keypair.",
    {
      credential: z
        .string()
        .describe("JSON string of the W3C credential to sign"),
      jwk: z
        .string()
        .describe(
          "JWK JSON string containing the private key (from ack_generate_keypair)",
        ),
      did: z.string().describe("DID of the signer"),
    },
    async ({ credential, jwk, did }) => {
      try {
        const keypair = keypairFromJwk(jwk)
        const jwt = await signCredential(JSON.parse(credential), {
          did: did as DidUri,
          signer: createJwtSigner(keypair),
          alg: curveToAlg(keypair.curve),
        })
        return ok(jwt)
      } catch (e) {
        return err(e)
      }
    },
  )

  server.tool(
    "ack_verify_credential",
    "Verify a signed credential JWT. Checks signature, expiration, and optionally trusted issuers.",
    {
      jwt: z.string().describe("The signed credential JWT string"),
      trustedIssuers: z
        .array(z.string())
        .optional()
        .describe(
          "List of trusted issuer DIDs. If provided, the credential issuer must be in this list.",
        ),
    },
    async ({ jwt, trustedIssuers }) => {
      try {
        const credential = await parseJwtCredential(jwt as JwtString, resolver)
        await verifyParsedCredential(credential, {
          resolver,
          trustedIssuers,
        })
        return verification(true, {
          issuer: credential.issuer,
          type: credential.type,
          subject: credential.credentialSubject,
        })
      } catch (e) {
        return verification(false, { reason: (e as Error).message })
      }
    },
  )

  server.tool(
    "ack_resolve_did",
    "Resolve a DID URI to its DID Document. Supports did:key, did:web, and did:pkh methods.",
    {
      did: z.string().describe("The DID URI to resolve"),
    },
    async ({ did }) => {
      try {
        return ok(await resolveDid(did, resolver))
      } catch (e) {
        return err(e)
      }
    },
  )
}
