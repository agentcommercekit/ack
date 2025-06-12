import { createControllerCredential } from "@agentcommercekit/ack-id"
import type { DidUri } from "@agentcommercekit/did"
import type { W3CCredential } from "@agentcommercekit/vc"
import { zkClient } from "./zk-client"
import type { ZKControllerProof } from "./zk-controller-verifier"
import { createHash } from "crypto"

export interface ZKControllerCredentialParams {
  id?: string
  subject: DidUri
  controller: DidUri
  issuer?: DidUri
  generateZKProof?: boolean
}

/**
 * Create a controller credential with optional ZK proof generation
 * 
 * When generateZKProof is true, this function:
 * 1. Creates a standard W3C credential
 * 2. Calls the Rust zk-controller-prover binary
 * 3. Returns both the credential and the ZK proof
 * 
 * The ZK proof generation happens via child process execution of the Rust prover.
 */
export async function createZKControllerCredential({
  id,
  subject,
  controller,
  issuer,
  generateZKProof = false
}: ZKControllerCredentialParams): Promise<{
  credential: W3CCredential
  zkProof?: ZKControllerProof
}> {
  // Step 1: Create standard W3C credential
  const credential = createControllerCredential({
    id,
    subject,
    controller,
    issuer
  })
  
  // Step 2: Generate ZK proof if requested
  if (generateZKProof) {
    // For testing, create a deterministic "signature" that the zkVM can validate
    // In production, this would be the actual JWT signature
    const credentialData = JSON.stringify({
      subject,
      controller,
      timestamp: credential.issuanceDate
    })
    
    // Create a simple hash as the signature
    const credentialSignature = createHash("sha256")
      .update(credentialData)
      .digest("hex")
    
    // Call the Rust prover via child process
    const zkProof = await zkClient.generateControllerProof({
      agentDid: subject,
      controllerDid: controller,
      credentialSignature,
      credentialTimestamp: Math.floor(new Date(credential.issuanceDate).getTime() / 1000)
    })
    
    return { credential, zkProof }
  }
  
  return { credential }
}