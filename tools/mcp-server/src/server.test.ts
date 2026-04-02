/**
 * MCP transport-level smoke tests.
 *
 * Spawns the actual server over stdio, performs the MCP handshake,
 * and exercises tools through the protocol — the same path a real
 * MCP client (Claude, Cursor, etc.) would take.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const EXPECTED_TOOLS = [
  "ack_create_controller_credential",
  "ack_sign_credential",
  "ack_verify_credential",
  "ack_resolve_did",
  "ack_create_payment_request",
  "ack_verify_payment_request",
  "ack_create_payment_receipt",
  "ack_verify_payment_receipt",
  "ack_generate_keypair",
]

describe("MCP server over stdio", () => {
  let client: Client
  let transport: StdioClientTransport

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "tsx",
      args: ["./src/index.ts"],
      cwd: import.meta.dirname + "/..",
      stderr: "pipe",
    })

    client = new Client({ name: "test-client", version: "0.0.1" })
    await client.connect(transport)
  }, 15_000)

  afterAll(async () => {
    await client.close()
  })

  it("completes the MCP handshake", () => {
    const info = client.getServerVersion()
    expect(info).toBeDefined()
    expect(info!.name).toBe("ack")
  })

  it("lists all 9 tools", async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name).sort()
    expect(names).toEqual([...EXPECTED_TOOLS].sort())
  })

  it("generates a keypair via ack_generate_keypair", async () => {
    const result = await client.callTool({
      name: "ack_generate_keypair",
      arguments: { curve: "Ed25519" },
    })

    expect(result.isError).toBeFalsy()

    const text = (result.content as Array<{ type: string; text: string }>)[0]!
      .text
    const parsed = JSON.parse(text)

    expect(parsed.curve).toBe("Ed25519")
    expect(parsed.did).toMatch(/^did:key:z6Mk/)
    expect(parsed.jwk).toBeDefined()
  })

  it("resolves a did:key via ack_resolve_did", async () => {
    // Generate a key first, then resolve its DID
    const genResult = await client.callTool({
      name: "ack_generate_keypair",
      arguments: { curve: "secp256k1" },
    })

    const genText = (
      genResult.content as Array<{ type: string; text: string }>
    )[0]!.text
    const { did } = JSON.parse(genText)

    const resolveResult = await client.callTool({
      name: "ack_resolve_did",
      arguments: { did },
    })

    expect(resolveResult.isError).toBeFalsy()

    const resolveText = (
      resolveResult.content as Array<{ type: string; text: string }>
    )[0]!.text
    const doc = JSON.parse(resolveText)

    expect(doc.did).toBe(did)
    expect(doc.didDocument).toBeDefined()
    expect(doc.didDocument.verificationMethod).toBeDefined()
  })

  it("round-trips sign and verify through the protocol", async () => {
    // Generate owner + agent keypairs
    const ownerResult = await client.callTool({
      name: "ack_generate_keypair",
      arguments: { curve: "secp256k1" },
    })
    const owner = JSON.parse(
      (ownerResult.content as Array<{ type: string; text: string }>)[0]!.text,
    )

    const agentResult = await client.callTool({
      name: "ack_generate_keypair",
      arguments: { curve: "secp256k1" },
    })
    const agent = JSON.parse(
      (agentResult.content as Array<{ type: string; text: string }>)[0]!.text,
    )

    // Create a controller credential
    const credResult = await client.callTool({
      name: "ack_create_controller_credential",
      arguments: {
        subjectDid: agent.did,
        controllerDid: owner.did,
      },
    })
    expect(credResult.isError).toBeFalsy()
    const credential = (
      credResult.content as Array<{ type: string; text: string }>
    )[0]!.text

    // Sign it
    const signResult = await client.callTool({
      name: "ack_sign_credential",
      arguments: {
        credential,
        signerJwk: owner.jwk,
        signerDid: owner.did,
      },
    })
    expect(signResult.isError).toBeFalsy()
    const jwt = (
      signResult.content as Array<{ type: string; text: string }>
    )[0]!.text
    expect(jwt).toMatch(/^eyJ/)

    // Verify it
    const verifyResult = await client.callTool({
      name: "ack_verify_credential",
      arguments: { jwt },
    })
    expect(verifyResult.isError).toBeFalsy()
    const verification = JSON.parse(
      (verifyResult.content as Array<{ type: string; text: string }>)[0]!.text,
    )
    expect(verification.valid).toBe(true)
  })
})
