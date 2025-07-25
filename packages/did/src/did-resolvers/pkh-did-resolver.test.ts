import { describe, expect, it } from "vitest"
import { resolve } from "./pkh-did-resolver"
import fixtureEthereumMainnet from "../../test-fixtures/did-pkh/did:pkh:eip155:1:0xb9c5714089478a327f09197987f16f9e5d936e8a.json"
import fixtureBaseSepolia from "../../test-fixtures/did-pkh/did:pkh:eip155:84532:0xa0ae58da58dfa46fa55c3b86545e7065f90ff011.json"
import fixtureSolana from "../../test-fixtures/did-pkh/did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ:CKg5d12Jhpej1JqtmxLJgaFqqeYjxgPqToJ4LBdvG9Ev.json"

/**
 * Test vectors from the did-pkh spec
 * @see {@link https://github.com/w3c-ccg/did-pkh/tree/main/test-vectors}
 */
const fixtures = {
  ethereumMainnet: {
    did: "did:pkh:eip155:1:0xb9c5714089478a327f09197987f16f9e5d936e8a",
    fixture: fixtureEthereumMainnet
  },
  baseSepolia: {
    did: "did:pkh:eip155:84532:0xa0ae58da58dfa46fa55c3b86545e7065f90ff011",
    fixture: fixtureBaseSepolia
  },
  solana: {
    did: "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ:CKg5d12Jhpej1JqtmxLJgaFqqeYjxgPqToJ4LBdvG9Ev",
    fixture: fixtureSolana
  }
}

describe("pkh-did-resolver", () => {
  it.each(Object.entries(fixtures))(
    "resolves %s did:pkh URIs",
    async (_, { did, fixture }) => {
      const result = await resolve(did)

      expect(result.didDocument).toEqual(fixture)
    }
  )

  it("returns an error for unknown did:pkh URIs", async () => {
    const result = await resolve("did:pkh:eip-155:1:invalid")

    expect(result).toEqual({
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: { error: "invalidDid" }
    })
  })
})
