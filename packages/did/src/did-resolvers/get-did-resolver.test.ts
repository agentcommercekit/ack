import { describe, expect, it, vi } from "vitest"

import { getDidResolver } from "./get-did-resolver"

type MockFetch = (input: string | URL | Request) => Promise<Response>

const mockJwks = {
  keys: [
    {
      kty: "EC",
      crv: "P-256",
      x: "f83OJ3D2xF4d2cBFj4JfFq8RUBnOXHnm9dXfNhf0U4o",
      y: "x_FEzRu9-2jMlqG8tWJBz1y8Z5bO1T_3WqF5svQ7vZk",
      use: "sig",
    },
  ],
}

function getFetchInputUrl(input: string | URL | Request): string {
  if (typeof input === "string") {
    return input
  }

  if (input instanceof URL) {
    return input.href
  }

  return input.url
}

function createDiscoveryFetch(jwksUri: string) {
  return vi.fn<MockFetch>(async (input) => {
    const url = getFetchInputUrl(input)

    if (url === "https://issuer.example/.well-known/jwks.json") {
      return new Response("not found", {
        status: 404,
        statusText: "Not Found",
      })
    }

    if (url === "https://issuer.example/.well-known/openid-configuration") {
      return Response.json({ jwks_uri: jwksUri })
    }

    return Response.json(mockJwks)
  })
}

describe("getDidResolver", () => {
  it.each([
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    "https://[::ffff:127.0.0.1]/jwks.json",
    "https://[::ffff:192.168.0.1]/jwks.json",
    "https://[fe90::1]/jwks.json",
  ])(
    "rejects did:jwks OIDC jwks_uri targets that do not satisfy the URL policy: %s",
    async (jwksUri) => {
      const fetch = createDiscoveryFetch(jwksUri)

      const resolver = getDidResolver({ webOptions: { fetch } })
      const result = await resolver.resolve("did:jwks:issuer.example")

      expect(result.didDocument).toBeNull()
      expect(result.didResolutionMetadata.error).toBe("internalError")
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).not.toHaveBeenCalledWith(jwksUri, undefined)
    },
  )

  it.each(["https://keys.example/jwks.json", "https://fd.example/jwks.json"])(
    "allows did:jwks OIDC jwks_uri targets that satisfy the URL policy: %s",
    async (jwksUri) => {
      const fetch = createDiscoveryFetch(jwksUri)

      const resolver = getDidResolver({ webOptions: { fetch } })
      const result = await resolver.resolve("did:jwks:issuer.example")

      expect(result.didDocument?.id).toBe("did:jwks:issuer.example")
      expect(result.didResolutionMetadata.contentType).toBe(
        "application/did+ld+json",
      )
      expect(fetch).toHaveBeenCalledWith(jwksUri, undefined)
    },
  )
})
