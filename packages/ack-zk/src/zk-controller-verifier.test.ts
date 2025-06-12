import { describe, it, expect, beforeAll } from "vitest"
import { 
  getZKControllerClaimVerifier, 
  verifyWithZKProof,
  setZKProofForVerification 
} from "./zk-controller-verifier"
import { createZKControllerCredential } from "./zk-controller-credential"
import { getDidResolver } from "@agentcommercekit/did"

describe("ZK Controller Verifier", () => {
  beforeAll(() => {
    process.env.NODE_ENV = "test"
    process.env.SP1_PROVER = "network"
    process.env.NETWORK_PRIVATE_KEY = "0x9c9f28688fcdf245fb977bc9571b2e1040d9a35778842b606318c6706f4a8c8d"
    process.env.NETWORK_RPC_URL = "https://rpc.production.succinct.xyz"
  })

  it("should reject invalid ZK proof", async () => {
    console.log("\n🧪 Test: Rejecting invalid ZK proof")
    
    const agentDid = "did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7jMWmTTzMWcmGNaATJEk2"
    const differentAgentDid = "did:key:z6MkfD3skqPXjZDgPCPVvhcFvaxHxxKgF4zQwvNXrAC9LGQM"
    const controllerDid = "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
    
    // Create a valid proof for one agent
    const { credential, zkProof } = await createZKControllerCredential({
      subject: agentDid,
      controller: controllerDid,
      generateZKProof: true
    })
    
    // Try to verify with different agent DID
    const verifier = getZKControllerClaimVerifier()
    const resolver = getDidResolver()
    
    await expect(
      verifyWithZKProof(
        { id: differentAgentDid }, // Wrong agent DID
        resolver,
        verifier,
        zkProof
      )
    ).rejects.toThrow("Agent DID hash mismatch")
    
    console.log("✅ Invalid proof correctly rejected!")
  }, 300000) // 5 minute timeout

  it("should fall back to standard verification when no ZK proof", async () => {
    console.log("\n🧪 Test: Standard verification without ZK proof")
    
    const verifier = getZKControllerClaimVerifier()
    const resolver = getDidResolver()
    
    // This will fall back to standard verification
    // which should fail for a non-existent DID
    await expect(
      verifier.verify(
        { id: "did:key:test" },
        resolver
      )
    ).rejects.toThrow()
  })
})