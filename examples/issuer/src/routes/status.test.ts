import {
  bytesToHexString,
  DidResolver,
  getDidResolver,
  isRevoked,
  type Revocable,
  type W3CCredential,
} from "agentcommercekit"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type { DatabaseClient } from "@/db/get-db"
import { getStatusList } from "@/db/queries/status-lists"
import type { DatabaseStatusList } from "@/db/schema"
import { STATUS_LIST_MAX_SIZE } from "@/db/schema"
import {
  createDidWebWithSigner,
  type DidWithSigner,
} from "@/test-helpers/did-web-with-signer"

import app from ".."

vi.mock("agentcommercekit", async () => {
  const actual = await vi.importActual("agentcommercekit")
  return {
    ...actual,
    getDidResolver: vi.fn<() => DidResolver>(),
  }
})

vi.mock("@/db/queries/status-lists", async () => {
  const actual = await vi.importActual("@/db/queries/status-lists")
  return {
    ...actual,
    getStatusList:
      vi.fn<
        (
          db: DatabaseClient,
          listId: number,
        ) => Promise<DatabaseStatusList | undefined>
      >(),
  }
})

const baseUrl = "https://issuer.example.com"
const statusListUrl = `${baseUrl}/status/1`
const revokedIndex = 7

function statusListData(revoked: number[]) {
  return Array.from({ length: STATUS_LIST_MAX_SIZE }, (_, index) =>
    revoked.includes(index) ? "1" : "0",
  ).join("")
}

function mockStatusList(revoked: number[]) {
  vi.mocked(getStatusList).mockResolvedValue({
    id: 1,
    credentialType: "ControllerCredential",
    data: statusListData(revoked),
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

function revocableCredential(issuerDid: string): Revocable<W3CCredential> {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: { id: issuerDid },
    issuanceDate: "2024-01-01T00:00:00.000Z",
    credentialSubject: { id: "did:web:subject.example.com" },
    credentialStatus: {
      id: `${statusListUrl}#${revokedIndex}`,
      type: "BitstringStatusListEntry",
      statusPurpose: "revocation",
      statusListIndex: String(revokedIndex),
      statusListCredential: statusListUrl,
    },
  }
}

describe("GET /status/:listId", () => {
  let issuer: DidWithSigner

  beforeAll(async () => {
    issuer = await createDidWebWithSigner(baseUrl)

    process.env.ISSUER_PRIVATE_KEY = bytesToHexString(issuer.keypair.privateKey)
    process.env.BASE_URL = baseUrl
  })

  beforeEach(() => {
    const resolver = new DidResolver()
    resolver.addToCache(issuer.did, issuer.didDocument)
    vi.mocked(getDidResolver).mockReturnValue(resolver)
  })

  // Unstub here, not at the end of a test body: a failed assertion would
  // otherwise leave the `fetch` stub in place for the rest of the file.
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("returns the status list credential unwrapped, so verifiers can read it", async () => {
    mockStatusList([])

    const res = await app.request("/status/1")
    const body: unknown = await res.json()

    expect(res.status).toBe(200)
    // A verifier dereferences this URL expecting the credential itself. An
    // `{ ok, data }` envelope silently defeats every revocation check.
    expect(body).toMatchObject({
      id: statusListUrl,
      proof: { type: "JwtProof2020" },
      credentialSubject: { statusPurpose: "revocation" },
    })
    expect(body).not.toHaveProperty("data")
  })

  it("serves a status list a verifier reads a revoked credential from", async () => {
    mockStatusList([revokedIndex])

    const res = await app.request("/status/1")
    const statusListCredential = await res.json()

    const resolver = new DidResolver()
    resolver.addToCache(issuer.did, issuer.didDocument)
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json(statusListCredential))),
    )

    await expect(
      isRevoked(revocableCredential(issuer.did), { resolver }),
    ).resolves.toBe(true)
  })

  it("serves a status list a verifier reads an unrevoked credential from", async () => {
    mockStatusList([])

    const res = await app.request("/status/1")
    const statusListCredential = await res.json()

    const resolver = new DidResolver()
    resolver.addToCache(issuer.did, issuer.didDocument)
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json(statusListCredential))),
    )

    await expect(
      isRevoked(revocableCredential(issuer.did), { resolver }),
    ).resolves.toBe(false)
  })

  it("returns a 404 for an unknown status list", async () => {
    vi.mocked(getStatusList).mockResolvedValue(undefined)

    const res = await app.request("/status/999")

    expect(res.status).toBe(404)
  })

  it("serves status list 0, which holds the first issued credentials", async () => {
    mockStatusList([])

    const res = await app.request("/status/0")

    expect(res.status).toBe(200)
    expect(getStatusList).toHaveBeenCalledWith(expect.anything(), 0)
  })

  it("returns a 404 for a non-numeric status list id", async () => {
    mockStatusList([])

    const res = await app.request("/status/1abc")

    expect(res.status).toBe(404)
    expect(getStatusList).not.toHaveBeenCalled()
  })

  it("signs the parsed id into the credential, not the raw path text", async () => {
    mockStatusList([])

    const res = await app.request("/status/0001")
    const body: unknown = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ id: statusListUrl })
  })
})
