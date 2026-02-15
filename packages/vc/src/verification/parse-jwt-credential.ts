import type { Resolvable } from "@agentcommercekit/did"

import { verifyCredential } from "did-jwt-vc"

import type { Verifiable, W3CCredential } from "../types"

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

  return result.verifiableCredential as Verifiable<T>
}
