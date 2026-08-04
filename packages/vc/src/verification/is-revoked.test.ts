import {
  createDidDocumentFromKeypair,
  createDidWebUri,
  getDidResolver,
} from "@agentcommercekit/did"
import { createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair, type Keypair } from "@agentcommercekit/keys"
import { BitBuffer } from "bit-buffers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createStatusListCredential } from "../revocation/status-list-credential"
import { signCredential } from "../signing/sign-credential"
import type { W3CCredential } from "../types"
import {
  RevocationCheckError,
  UnsupportedCredentialStatusError,
} from "./errors"
import { isRevocable, isRevoked } from "./is-revoked"
import { parseJwtCredential } from "./parse-jwt-credential"

const statusListUrl = "https://issuer.example.com/status/1"

async function captureRevocationError(
  call: Promise<unknown>,
): Promise<RevocationCheckError> {
  try {
    await call
  } catch (error) {
    if (error instanceof RevocationCheckError) {
      return error
    }
    throw error
  }

  throw new Error("Expected the revocation check to fail, but it resolved")
}

const resolver = getDidResolver()
let issuerDid: string
let issuerKeypair: Keypair
let otherIssuerDid: string
let otherIssuerKeypair: Keypair

async function addIssuer(host: string) {
  const keypair = await generateKeypair("secp256k1")
  const did = createDidWebUri(host)
  resolver.addToCache(did, createDidDocumentFromKeypair({ did, keypair }))
  return { did, keypair }
}

beforeEach(async () => {
  const issuer = await addIssuer("https://issuer.example.com")
  issuerDid = issuer.did
  issuerKeypair = issuer.keypair

  const other = await addIssuer("https://other.example.com")
  otherIssuerDid = other.did
  otherIssuerKeypair = other.keypair
})

/**
 * Build the JSON an issuer serves at a status list URL: a status list
 * credential carrying a real `JwtProof2020` proof.
 */
async function signedStatusList({
  revokedIndex,
  url = statusListUrl,
  did = issuerDid,
  keypair = issuerKeypair,
  encodedList,
  statusPurpose = "revocation",
  expirationDate,
  issuedAt,
  statusSize,
  credentialType,
}: {
  revokedIndex?: number
  url?: string
  did?: string
  keypair?: Keypair
  encodedList?: string
  statusPurpose?: string
  expirationDate?: Date | null
  issuedAt?: Date
  statusSize?: number
  credentialType?: string[]
} = {}) {
  const bits = new BitBuffer(1024)
  const list =
    encodedList ??
    (revokedIndex === undefined
      ? bits.toBitstring()
      : bits.set(revokedIndex).toBitstring())

  const base = createStatusListCredential({
    url,
    encodedList: list,
    issuer: did,
    expirationDate,
  })

  // `createStatusListCredential` only issues revocation lists and always stamps
  // the current time, so another purpose or an older issuance date has to be
  // assembled by hand.
  const credential = {
    ...base,
    credentialSubject: {
      ...base.credentialSubject,
      statusPurpose,
      ...(statusSize === undefined ? {} : { statusSize }),
    },
    ...(issuedAt ? { issuanceDate: issuedAt.toISOString() } : {}),
    ...(credentialType ? { type: credentialType } : {}),
  }

  const jwt = await signCredential(credential, {
    did,
    signer: createJwtSigner(keypair),
    alg: "ES256K",
  })

  const parsed = await parseJwtCredential(jwt, resolver)

  return { ...parsed, credentialSubject: credential.credentialSubject }
}

function buildCredential(
  credentialStatus?: W3CCredential["credentialStatus"],
): W3CCredential {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: { id: issuerDid },
    issuanceDate: "2024-01-01T00:00:00.000Z",
    credentialSubject: { id: "did:example:subject" },
    credentialStatus,
  }
}

function statusEntry(fields: Record<string, string> = {}) {
  return {
    id: `${statusListUrl}#5`,
    type: "BitstringStatusListEntry",
    statusPurpose: "revocation",
    statusListIndex: "5",
    statusListCredential: statusListUrl,
    ...fields,
  }
}

describe("isRevocable", () => {
  it("returns false when no credential status is present", () => {
    expect(isRevocable(buildCredential(undefined))).toBe(false)
  })

  it("returns false when the status list credential is missing", () => {
    const { statusListCredential: _, ...entry } = statusEntry()

    expect(isRevocable(buildCredential(entry))).toBe(false)
  })

  it("returns false when the index is missing", () => {
    const { statusListIndex: _, ...entry } = statusEntry()

    expect(isRevocable(buildCredential(entry))).toBe(false)
  })

  it("returns false when the status purpose is missing", () => {
    const { statusPurpose: _, ...entry } = statusEntry()

    expect(isRevocable(buildCredential(entry))).toBe(false)
  })

  it("returns false for an unrecognized credential status type", () => {
    expect(
      isRevocable(
        buildCredential(statusEntry({ type: "StatusList2021Entry" })),
      ),
    ).toBe(false)
  })

  it("returns true for a well-formed BitstringStatusListEntry", () => {
    expect(isRevocable(buildCredential(statusEntry()))).toBe(true)
  })
})

describe("isRevoked", () => {
  const mockFetch = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it("returns false for a credential with no credential status", async () => {
    await expect(
      isRevoked(buildCredential(undefined), { resolver }),
    ).resolves.toBe(false)
  })

  it("returns false when the bit at the index is not set", async () => {
    mockFetch.mockResolvedValueOnce(Response.json(await signedStatusList()))

    await expect(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    ).resolves.toBe(false)
  })

  it("returns true when the bit at the index is set", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(await signedStatusList({ revokedIndex: 5 })),
    )

    await expect(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    ).resolves.toBe(true)
  })

  it("throws when the status list cannot be fetched", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/Could not fetch status list credential/)
  })

  it("throws when the status list responds with an error status", async () => {
    mockFetch.mockResolvedValueOnce(new Response("nope", { status: 502 }))

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/returned HTTP 502/)
  })

  it("throws when the status list is not valid JSON", async () => {
    mockFetch.mockResolvedValueOnce(new Response("<html>error</html>"))

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/is not valid JSON/)
  })

  it("throws when the status list is wrapped in an API envelope", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json({ ok: true, data: await signedStatusList() }),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(
      /did not return a signed BitstringStatusListCredential/,
    )
  })

  it("throws when the status list carries no proof", async () => {
    const { proof: _, ...unsigned } = await signedStatusList()
    mockFetch.mockResolvedValueOnce(Response.json(unsigned))

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(
      /did not return a signed BitstringStatusListCredential/,
    )
  })

  it("throws when the status list proof does not verify", async () => {
    const statusList = await signedStatusList()
    mockFetch.mockResolvedValueOnce(
      Response.json({
        ...statusList,
        proof: { type: "JwtProof2020", jwt: "not.a.jwt" },
      }),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/has an invalid proof/)
  })

  it("throws when the status list is signed by an untrusted issuer", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(
        await signedStatusList({
          did: otherIssuerDid,
          keypair: otherIssuerKeypair,
        }),
      ),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/not a trusted status list issuer/)
  })

  it("accepts a status list from an explicitly trusted third-party issuer", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(
        await signedStatusList({
          revokedIndex: 5,
          did: otherIssuerDid,
          keypair: otherIssuerKeypair,
        }),
      ),
    )

    await expect(
      isRevoked(buildCredential(statusEntry()), {
        resolver,
        trustedStatusListIssuers: [otherIssuerDid],
      }),
    ).resolves.toBe(true)
  })

  it("throws when the status list is a different, validly signed list", async () => {
    // An empty list the same issuer signed for a different URL must not stand in
    // for the list this credential points at.
    mockFetch.mockResolvedValueOnce(
      Response.json(
        await signedStatusList({ url: "https://issuer.example.com/status/2" }),
      ),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/declares a different id/)
  })

  it("throws when the status list tracks a different status purpose", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(
        await signedStatusList({
          revokedIndex: 5,
          statusPurpose: "suspension",
        }),
      ),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/tracks 'suspension'/)
  })

  it("throws for a non-numeric status list index", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(await signedStatusList({ revokedIndex: 5 })),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry({ statusListIndex: "five" })), {
        resolver,
      }),
    )

    expect(error.detail).toMatch(/not a non-negative integer/)
  })

  it("throws for a status list index with trailing garbage", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(await signedStatusList({ revokedIndex: 5 })),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry({ statusListIndex: "5abc" })), {
        resolver,
      }),
    )

    expect(error.detail).toMatch(/not a non-negative integer/)
  })

  it("throws for an index beyond the end of the status list", async () => {
    mockFetch.mockResolvedValueOnce(Response.json(await signedStatusList()))

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry({ statusListIndex: "99999" })), {
        resolver,
      }),
    )

    expect(error.detail).toMatch(/is outside the status list/)
  })

  it("throws for a status list URL with a non-http scheme", async () => {
    const error = await captureRevocationError(
      isRevoked(
        buildCredential(
          statusEntry({ statusListCredential: "file:///etc/passwd" }),
        ),
        { resolver },
      ),
    )

    expect(error.detail).toMatch(/not an absolute http\(s\) URL/)

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("throws for a credential status type it cannot evaluate", async () => {
    await expect(
      isRevoked(buildCredential(statusEntry({ type: "StatusList2021Entry" })), {
        resolver,
      }),
    ).rejects.toThrow(UnsupportedCredentialStatusError)

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("throws for a status purpose it cannot evaluate", async () => {
    await expect(
      isRevoked(buildCredential(statusEntry({ statusPurpose: "suspension" })), {
        resolver,
      }),
    ).rejects.toThrow(UnsupportedCredentialStatusError)

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("throws when the encoded list cannot be decoded", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(await signedStatusList({ encodedList: "not-a-bitstring" })),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/unreadable encodedList/)
  })

  it("returns false for a null credential status", async () => {
    // The type forbids `null`, but a JWT payload can carry it, and reading
    // `.type` off it used to throw a TypeError instead of failing closed.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- models an untyped JWT payload
    const credential = {
      ...buildCredential(undefined),
      credentialStatus: null,
    } as unknown as W3CCredential

    await expect(isRevoked(credential, { resolver })).resolves.toBe(false)
  })

  it("throws when the status list has expired", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(
        await signedStatusList({
          revokedIndex: 5,
          expirationDate: new Date(Date.now() - 1000),
        }),
      ),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/is expired/)
  })

  it("throws when a replayed status list is older than maxStatusListAgeMs", async () => {
    // The list is validly signed by the trusted issuer and bound to the right
    // URL. Only its age shows that it predates the revocation.
    mockFetch.mockResolvedValueOnce(
      Response.json(
        await signedStatusList({
          issuedAt: new Date(Date.now() - 60 * 60 * 1000),
        }),
      ),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), {
        resolver,
        maxStatusListAgeMs: 60_000,
      }),
    )

    expect(error.detail).toMatch(/over the 60000ms limit/)
  })

  it("accepts a status list within maxStatusListAgeMs", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(await signedStatusList({ revokedIndex: 5 })),
    )

    await expect(
      isRevoked(buildCredential(statusEntry()), {
        resolver,
        maxStatusListAgeMs: 60_000,
      }),
    ).resolves.toBe(true)
  })

  it("throws for a multi-bit status list it cannot read", async () => {
    const statusList = await signedStatusList({ statusSize: 2 })
    mockFetch.mockResolvedValueOnce(Response.json(statusList))

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    // The entry bits of a statusSize 2 list live at index * 2, so reading bit
    // `index` would report some other credential's status.
    expect(error.detail).toMatch(/uses statusSize 2/)
  })

  it("throws when the fetched credential is not a status list credential", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(
        await signedStatusList({ credentialType: ["VerifiableCredential"] }),
      ),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/is not a BitstringStatusListCredential/)
  })

  it("refuses to follow a redirect away from the status list URL", async () => {
    mockFetch.mockResolvedValueOnce(Response.json(await signedStatusList()))

    await isRevoked(buildCredential(statusEntry()), { resolver })

    expect(mockFetch.mock.calls[0]?.[1]?.redirect).toBe("error")
  })

  it("throws when the encoded list exceeds the decode limit", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(
        await signedStatusList({ encodedList: "u".repeat(70_000) }),
      ),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/encodedList over the 65536 byte limit/)
  })

  it("throws when the status list body exceeds the size limit", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("x".repeat(5_000_001), {
        headers: { "content-type": "application/json" },
      }),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/over the 5000000 byte limit/)
  })

  it("throws when the status list declares an oversized content-length", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("{}", { headers: { "content-length": "9999999999" } }),
    )

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    expect(error.detail).toMatch(/declares 9999999999 bytes/)
  })

  it("asks for the credential media types the specification serves", async () => {
    mockFetch.mockResolvedValueOnce(Response.json(await signedStatusList()))

    await isRevoked(buildCredential(statusEntry()), { resolver })

    const headers = new Headers(mockFetch.mock.calls[0]?.[1]?.headers)
    const accept = headers.get("accept") ?? ""

    expect(accept).toContain("application/vc+ld+json")
    expect(accept).toContain("application/json")
  })

  it("keeps the dereferenced URL out of the thrown message", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED 169.254.169.254"))

    const error = await captureRevocationError(
      isRevoked(buildCredential(statusEntry()), { resolver }),
    )

    // API error handlers return this message to the caller, so it must not
    // report which host answered or how.
    expect(error.message).toBe(
      "Unable to determine credential revocation status",
    )
    expect(error.message).not.toContain(statusListUrl)
    expect(error.message).not.toContain("ECONNREFUSED")
    expect(error.detail).toContain(statusListUrl)
  })
})
