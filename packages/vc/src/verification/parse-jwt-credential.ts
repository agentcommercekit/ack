import type { Resolvable } from "@agentcommercekit/did"
import { verifyCredential } from "did-jwt-vc"

import type { Verifiable, W3CCredential } from "../types"
import { InvalidCredentialError } from "./errors"

/**
 * Validate that a decoded credential has the shape the verification chain relies
 * on. did-jwt-vc returns its own credential type; this guards exactly the fields
 * downstream code reads — `issuer.id`, `type`, `credentialSubject` — plus the
 * `proof` that makes it a {@link Verifiable}, rather than trusting an unchecked
 * cast that would silently mask a divergent shape.
 *
 * It intentionally does NOT enforce ACK's authoring schema, so valid third-party
 * VCs (e.g. an object `@context` entry, or a VC 2.0 `validFrom`) are not rejected
 * here; conversely a top-level string `issuer` is rejected because downstream
 * reads `issuer.id`.
 */
function hasStringId(value: object): value is { id: string } {
  return "id" in value && typeof value.id === "string"
}

function isDecodedCredential(
  value: unknown,
): value is Verifiable<W3CCredential> {
  if (typeof value !== "object" || value === null) {
    return false
  }

  if (!("issuer" in value)) {
    return false
  }
  const issuer = value.issuer

  return (
    "credentialSubject" in value &&
    typeof value.credentialSubject === "object" &&
    value.credentialSubject !== null &&
    typeof issuer === "object" &&
    issuer !== null &&
    hasStringId(issuer) &&
    "type" in value &&
    Array.isArray(value.type) &&
    "proof" in value &&
    value.proof != null
  )
}

/**
 * Parse a JWT credential
 *
 * @param jwt - The JWT string to parse
 * @param resolver - The resolver to use for did resolution
 * @returns A {@link Verifiable<W3CCredential>}
 */
export async function parseJwtCredential(
  jwt: string,
  resolver: Resolvable,
): Promise<Verifiable<W3CCredential>> {
  const result = await verifyCredential(jwt, resolver)

  if (!isDecodedCredential(result.verifiableCredential)) {
    throw new InvalidCredentialError(
      "Verified JWT did not decode to a valid W3C credential",
    )
  }

  return result.verifiableCredential
}
