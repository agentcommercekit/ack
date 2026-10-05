import { randomBytes } from "node:crypto"

import { type DidDocument, getDidResolver } from "@agentcommercekit/did"
import { verifyJwt } from "@agentcommercekit/jwt"
import { beforeEach, describe, expect, it } from "vitest"

import app from "./index"

type Entity = "agent" | "controller"

function randomHexPrivateKey(): `0x${string}` {
  return `0x${randomBytes(32).toString("hex")}`
}

async function getDidDocument(entity: Entity): Promise<DidDocument> {
  const res = await app.request(`/${entity}/.well-known/did.json`)
  expect(res.status).toBe(200)
  return res.json()
}

async function signAs(entity: Entity): Promise<string> {
  const res = await app.request(`/${entity}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: "did:web:subject.example.com",
      payload: {},
    }),
  })
  expect(res.status).toBe(200)
  const body: { jwt: string } = await res.json()
  return body.jwt
}

describe("POST /:entity/sign", () => {
  beforeEach(() => {
    // Each identity needs its own distinct private key so that a bug which
    // conflates the two entities is actually observable in the resulting
    // JWT (same key material would make agent- and controller-signed JWTs
    // indistinguishable).
    process.env.HOSTNAME = "0.0.0.0"
    process.env.PORT = "3458"
    process.env.AGENT_PRIVATE_KEY = randomHexPrivateKey()
    process.env.CONTROLLER_PRIVATE_KEY = randomHexPrivateKey()
  })

  it("issues a JWT from the agent identity when signing as agent", async () => {
    const agentDidDocument = await getDidDocument("agent")
    const controllerDidDocument = await getDidDocument("controller")

    const resolver = getDidResolver()
    resolver.addToCache(agentDidDocument.id, agentDidDocument)
    resolver.addToCache(controllerDidDocument.id, controllerDidDocument)

    const jwt = await signAs("agent")
    const verified = await verifyJwt(jwt, { resolver })

    expect(verified.payload.iss).toBe(agentDidDocument.id)
    expect(verified.issuer).toBe(agentDidDocument.id)
  })

  it("issues a JWT from the controller identity when signing as controller", async () => {
    const agentDidDocument = await getDidDocument("agent")
    const controllerDidDocument = await getDidDocument("controller")

    // Sanity check: the two identities must actually be distinct, or this
    // test can't tell agent-signed and controller-signed JWTs apart.
    expect(controllerDidDocument.id).not.toBe(agentDidDocument.id)

    const resolver = getDidResolver()
    resolver.addToCache(agentDidDocument.id, agentDidDocument)
    resolver.addToCache(controllerDidDocument.id, controllerDidDocument)

    const jwt = await signAs("controller")

    // This is the core regression check: the JWT returned by
    // POST /controller/sign must actually verify against the controller's
    // key and carry the controller's DID as issuer, not the agent's.
    const verified = await verifyJwt(jwt, { resolver })

    expect(verified.payload.iss).toBe(controllerDidDocument.id)
    expect(verified.issuer).toBe(controllerDidDocument.id)

    // Verifying against the agent's DID must fail: the signature was not
    // produced by the agent's key, and the JWT's `iss` claim doesn't match
    // the agent's DID either.
    await expect(
      verifyJwt(jwt, { resolver, issuer: agentDidDocument.id }),
    ).rejects.toThrow("Expected issuer")
  })

  it("produces different signatures for agent and controller for the same payload", async () => {
    const agentJwt = await signAs("agent")
    const controllerJwt = await signAs("controller")

    // Compare the signature segment specifically, not the full JWT string,
    // since the header and payload already differ (different `iss`) even
    // if the signatures happened to collide.
    const agentSignature = agentJwt.split(".")[2]
    const controllerSignature = controllerJwt.split(".")[2]

    expect(agentSignature).not.toBe(controllerSignature)
  })
})
