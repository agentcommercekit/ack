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
function isDecodedCredential(
  value: unknown,
): value is Verifiable<W3CCredential> {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const credential = value as Record<string, unknown>
  const issuer = credential.issuer

  return (
    typeof credential.credentialSubject === "object" &&
    credential.credentialSubject !== null &&
    typeof issuer === "object" &&
    issuer !== null &&
    typeof (issuer as Record<string, unknown>).id === "string" &&
    Array.isArray(credential.type) &&
    credential.proof != null
  )
}

/**
 * Parse a JWT credential
 *
 * @param jwt - The JWT string to parse
 * @param resolver - The resolver to use for did resolution
 * @returns A {@link Verifiable<W3CCredential>}
 */
export async function parseJwtCredential<T extends W3CCredential>(
  jwt: string,
  resolver: Resolvable,
): Promise<Verifiable<T>> {
  const result = await verifyCredential(jwt, resolver)

  if (!isDecodedCredential(result.verifiableCredential)) {
    throw new InvalidCredentialError(
      "Verified JWT did not decode to a valid W3C credential",
    )
  }

  return result.verifiableCredential as Verifiable<T>
}
