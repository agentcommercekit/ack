import type { Resolvable } from "@agentcommercekit/did"
import { verifyCredential } from "did-jwt-vc"

import { isCredential } from "../is-credential"
import type { Verifiable, W3CCredential } from "../types"
import { InvalidCredentialError } from "./errors"

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

  // `verifyCredential` returns did-jwt-vc's own credential shape. Validate it
  // conforms to our `W3CCredential` before returning it, rather than trusting an
  // unchecked cast that would silently mask a divergent shape.
  if (!isCredential(result.verifiableCredential)) {
    throw new InvalidCredentialError(
      "Verified JWT did not decode to a valid W3C credential",
    )
  }

  return result.verifiableCredential as Verifiable<T>
}
