import type { Resolvable } from "@agentcommercekit/did"
import { verifyCredential } from "did-jwt-vc"

import type { Verifiable, W3CCredential } from "../types"
import { InvalidProofError, UnsupportedProofTypeError } from "./errors"

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

/**
 * Verify a JWT proof and return the credential decoded from the signed payload.
 *
 * The returned credential is reconstructed from `proof.jwt`, so its fields are
 * exactly what was signed, rather than whatever a caller may have placed on the
 * surrounding object.
 */
async function verifyJwtProof(
  proof: Verifiable<W3CCredential>["proof"],
  resolver: Resolvable,
): Promise<Verifiable<W3CCredential>> {
  if (!isJwtProof(proof)) {
    throw new InvalidProofError()
  }

  try {
    const { verifiableCredential } = await verifyCredential(proof.jwt, resolver)
    return verifiableCredential as Verifiable<W3CCredential>
  } catch (_error) {
    throw new InvalidProofError()
  }
}

/**
 * Verify a proof
 *
 * @param proof - The credential proof to verify
 * @param resolver - The resolver to use for did resolution
 * @returns The credential decoded from the signed proof. For JWT proofs this is
 *   the payload recovered from `proof.jwt`, so callers can rely on it instead of
 *   on caller-supplied top-level fields that are not bound to the signature.
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
