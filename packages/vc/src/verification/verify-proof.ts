import type { Resolvable } from "@agentcommercekit/did"

import type { Verifiable, W3CCredential } from "../types"
import {
  InvalidCredentialError,
  InvalidProofError,
  UnsupportedProofTypeError,
} from "./errors"
import { parseJwtCredential } from "./parse-jwt-credential"

interface JwtProof {
  type: "JwtProof2020"
  jwt: string
}

/**
 * Check if a proof is a JWT proof
 *
 * @param proof - The proof to check
 * @returns `true` if the proof is a JWT proof, `false` otherwise
 */
export function isJwtProof(proof: unknown): proof is JwtProof {
  return (
    typeof proof === "object" &&
    proof !== null &&
    "type" in proof &&
    proof.type === "JwtProof2020" &&
    "jwt" in proof &&
    typeof proof.jwt === "string"
  )
}

async function verifyJwtProof(
  proof: Verifiable<W3CCredential>["proof"],
  resolver: Resolvable,
): Promise<Verifiable<W3CCredential>> {
  if (!isJwtProof(proof)) {
    throw new InvalidProofError()
  }

  try {
    return await parseJwtCredential(proof.jwt, resolver)
  } catch (error) {
    // Preserve a malformed-credential error (the decoded credential is the
    // problem, not the signature); wrap anything else as an invalid proof.
    if (error instanceof InvalidCredentialError) {
      throw error
    }
    throw new InvalidProofError()
  }
}

/**
 * Verify a proof and return the credential decoded from it.
 *
 * The returned credential is derived from the verified proof (the JWT payload),
 * not from any caller-supplied object. Callers MUST treat the returned value as
 * the authoritative credential: a `JwtProof2020` proof is only bound to the
 * claims inside its own JWT, so any outer object wrapping the proof can carry
 * tampered fields that the proof does not attest to.
 *
 * @param proof - The credential proof to verify
 * @param resolver - The resolver to use for did resolution
 * @returns The {@link Verifiable<W3CCredential>} decoded from the verified proof
 */
export async function verifyProof(
  proof: Verifiable<W3CCredential>["proof"],
  resolver: Resolvable,
): Promise<Verifiable<W3CCredential>> {
  switch (proof.type) {
    case "JwtProof2020":
      return verifyJwtProof(proof, resolver)
    default:
      throw new UnsupportedProofTypeError(
        `Unsupported proof type: ${proof.type}`,
      )
  }
}
