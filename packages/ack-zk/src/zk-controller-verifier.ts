import { getControllerClaimVerifier } from "@agentcommercekit/ack-id"
import type { ClaimVerifier, CredentialSubject } from "@agentcommercekit/vc"
import type { Resolvable } from "@agentcommercekit/did"
import { zkClient } from "./zk-client"
import { sha256 } from "./utils"

export interface ZKControllerProof {
  proof: string
  publicValues: {
    agentDidHash: string
    controllerCommitment: string
    hasValidController: boolean
    credentialTimestamp: number
    isExpired: boolean
  }
}

// Store ZK proofs temporarily for verification
const zkProofStore = new Map<string, ZKControllerProof>()

/**
 * Set a ZK proof for verification
 */
export function setZKProofForVerification(credentialId: string, proof: ZKControllerProof) {
  zkProofStore.set(credentialId, proof)
}

/**
 * Clear a ZK proof after verification
 */
export function clearZKProof(credentialId: string) {
  zkProofStore.delete(credentialId)
}

/**
 * ZK-enhanced controller claim verifier
 * Proves controller relationship without revealing controller identity
 */
export function getZKControllerClaimVerifier(): ClaimVerifier {
  const standardVerifier = getControllerClaimVerifier()
  
  return {
    accepts: (type: string[]) => 
      type.includes("ControllerCredential") || 
      type.includes("ZKControllerCredential"),
    
    verify: async (
      credentialSubject: CredentialSubject,
      resolver: Resolvable
    ): Promise<void> => {
      // Check if we have an ID
      if (!credentialSubject.id) {
        throw new Error("Credential subject must have an ID")
      }
      
      // Check if we have a ZK proof for this credential
      const zkProof = zkProofStore.get(credentialSubject.id)
      
      if (zkProof) {
        // Verify using ZK proof
        await verifyZKProof(credentialSubject, zkProof)
        // Clear the proof after use
        clearZKProof(credentialSubject.id)
        return
      }
      
      // Fall back to standard verification
      return standardVerifier.verify(credentialSubject, resolver)
    }
  }
}

async function verifyZKProof(
  credentialSubject: CredentialSubject,
  zkProof: ZKControllerProof
): Promise<void> {
  // We already checked that id exists in the caller
  if (!credentialSubject.id) {
    throw new Error("Credential subject must have an ID")
  }
  
  // Verify agent DID hash matches
  const expectedHash = await sha256(credentialSubject.id)
  if (expectedHash !== zkProof.publicValues.agentDidHash) {
    throw new Error("Agent DID hash mismatch")
  }
  
  // Verify proof has valid controller
  if (!zkProof.publicValues.hasValidController) {
    throw new Error("Invalid controller relationship")
  }
  
  // Check expiration
  if (zkProof.publicValues.isExpired) {
    throw new Error("Controller credential expired")
  }
  
  // In production, would also verify the cryptographic proof
  // This would involve checking the proof against the verification key
}

/**
 * Helper function to verify a credential with ZK proof
 */
export async function verifyWithZKProof(
  credentialSubject: CredentialSubject,
  resolver: Resolvable,
  verifier: ClaimVerifier,
  zkProof?: ZKControllerProof
): Promise<void> {
  if (!credentialSubject.id) {
    throw new Error("Credential subject must have an ID")
  }
  
  if (zkProof) {
    setZKProofForVerification(credentialSubject.id, zkProof)
  }
  
  try {
    await verifier.verify(credentialSubject, resolver)
  } finally {
    if (zkProof && credentialSubject.id) {
      clearZKProof(credentialSubject.id)
    }
  }
}