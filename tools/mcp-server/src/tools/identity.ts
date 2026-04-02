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

/** Register ACK-ID identity tools on the MCP server. */
export function registerIdentityTools(server: McpServer) {
  server.tool(
    "ack_create_controller_credential",
    "Create a W3C Verifiable Credential proving that a subject DID (e.g. an agent) is controlled by a controller DID (e.g. the owner). Requires both subjectDid and controllerDid.",
    {
      subjectDid: z
        .string()
        .describe("DID of the agent or entity being controlled"),
      controllerDid: z
        .string()
        .describe("DID of the owner or entity with authority"),
      issuerDid: z
        .string()
        .optional()
        .describe("DID of the issuer. Defaults to the controller."),
    },
    async ({ subjectDid: subject, controllerDid: controller, issuerDid: issuer }) => {
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
    "Sign a W3C Verifiable Credential, returning a signed JWT string. Requires the credential JSON, the signer's JWK (from ack_generate_keypair), and the signer's DID.",
    {
      credential: z
        .string()
        .describe("JSON string of the W3C credential to sign"),
      signerJwk: z
        .string()
        .describe(
          "JWK JSON string containing the signer's private key (from ack_generate_keypair)",
        ),
      signerDid: z.string().describe("DID of the signer (must match the JWK)"),
    },
    async ({ credential, signerJwk: jwk, signerDid: did }) => {
      try {
        const keypair = keypairFromJwk(jwk)
        const parsed = JSON.parse(credential)
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("credential must be a JSON object")
        }
        const jwt = await signCredential(parsed, {
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
        const reason = e instanceof Error ? e.message : String(e)
        return verification(false, { reason })
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
