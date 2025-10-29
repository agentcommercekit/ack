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

async function verifyJwtProof(
  proof: Verifiable<W3CCredential>["proof"],
  resolver: Resolvable,
): Promise<void> {
  if (!isJwtProof(proof)) {
    throw new InvalidProofError()
  }

  try {
    await verifyCredential(proof.jwt, resolver)
  } catch (_error) {
    throw new InvalidProofError()
  }
}

/**
 * Verify a proof
 *
 * @param proof - The credential proof to verify
 * @param resolver - The resolver to use for did resolution
 */
export async function verifyProof(
  proof: Verifiable<W3CCredential>["proof"],
  resolver: Resolvable,
): Promise<void> {
  switch (proof.type) {
    case "JwtProof2020":
      return verifyJwtProof(proof, resolver)
    default:
      throw new UnsupportedProofTypeError(
        `Unsupported proof type: ${proof.type}`,
      )
  }
}
