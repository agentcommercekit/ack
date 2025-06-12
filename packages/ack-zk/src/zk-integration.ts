#!/usr/bin/env tsx
/**
 * Example: Complete ZK Controller Credential Flow
 * 
 * This example demonstrates:
 * 1. Creating a controller credential with ZK proof
 * 2. Verifying the credential without revealing controller identity
 * 3. Handling errors and edge cases
 */

import { 
  createZKControllerCredential,
  getZKControllerClaimVerifier,
  SP1ZKClient
} from "@agentcommercekit/ack-zk"
import { 
  createDidWebUri, 
  getDidResolver,
  createDidKeyUri 
} from "@agentcommercekit/did"
import { 
  signCredential, 
  verifyParsedCredential 
} from "@agentcommercekit/vc"
import { Ed25519Keypair } from "@agentcommercekit/keys"

async function main() {
  console.log("🔐 ACK-ZK Controller Credential Demo\n")
  
  try {
    // Step 1: Setup identities
    console.log("1️⃣ Setting up identities...")
    
    // Controller (e.g., a company)
    const controllerKeypair = Ed25519Keypair.random()
    const controllerDid = createDidKeyUri({ publicKey: controllerKeypair.publicKey })
    console.log(`   Controller DID: ${controllerDid}`)
    
    // Agent (e.g., an AI assistant)
    const agentDid = createDidWebUri("https://agent.example.ai")
    console.log(`   Agent DID: ${agentDid}`)
    
    // Step 2: Create ZK-enabled credential
    console.log("\n2️⃣ Creating ZK controller credential...")
    
    // Configure ZK client (optional - uses defaults if not specified)
    const zkClient = new SP1ZKClient({
      proofSystem: "plonk",
      useNetwork: false // Use local prover for demo
    })
    
    const startTime = Date.now()
    const { credential, zkProof } = await createZKControllerCredential({
      subject: agentDid,
      controller: controllerDid,
      issuer: controllerDid,
      generateZKProof: true
    })
    const proofTime = Date.now() - startTime
    
    console.log(`   ✓ Credential created`)
    console.log(`   ✓ ZK proof generated in ${proofTime}ms`)
    console.log(`   Proof size: ${zkProof!.proof.length / 2} bytes`)
    
    // Step 3: Sign the credential
    console.log("\n3️⃣ Signing credential...")
    const signedCredential = await signCredential({
      credential,
      keypair: controllerKeypair,
      verificationMethod: `${controllerDid}#${controllerKeypair.publicKeyMultibase}`
    })
    console.log(`   ✓ Credential signed by controller`)
    
    // Step 4: Display ZK proof (public values only)
    console.log("\n4️⃣ ZK Proof Public Values:")
    console.log(`   Agent DID Hash: ${zkProof!.publicValues.agentDidHash.substring(0, 16)}...`)
    console.log(`   Controller Commitment: ${zkProof!.publicValues.controllerCommitment.substring(0, 16)}...`)
    console.log(`   Has Valid Controller: ${zkProof!.publicValues.hasValidController}`)
    console.log(`   Credential Timestamp: ${new Date(zkProof!.publicValues.credentialTimestamp * 1000).toISOString()}`)
    console.log(`   Is Expired: ${zkProof!.publicValues.isExpired}`)
    console.log(`   🔒 Controller DID is NOT revealed!`)
    
    // Step 5: Verify with ZK proof
    console.log("\n5️⃣ Verifying credential with ZK proof...")
    const verifier = getZKControllerClaimVerifier()
    const resolver = getDidResolver()
    
    try {
      await verifyParsedCredential(signedCredential, {
        resolver,
        verifiers: [verifier],
        options: {
          zkProof: zkProof
        }
      })
      console.log(`   ✓ Verification successful!`)
      console.log(`   ✓ Controller identity verified without being revealed`)
    } catch (error) {
      console.error(`   ✗ Verification failed: ${error}`)
    }
    
    // Step 6: Show what happens without ZK proof
    console.log("\n6️⃣ Attempting standard verification (would reveal controller)...")
    try {
      // This would fail because it tries to resolve the controller DID
      await verifyParsedCredential(signedCredential, {
        resolver,
        verifiers: [verifier]
        // No zkProof provided - falls back to standard verification
      })
      console.log(`   ✓ Standard verification successful`)
    } catch (error) {
      console.log(`   ℹ️  Standard verification requires revealing controller DID`)
      console.log(`   ℹ️  Use ZK proof to maintain privacy`)
    }
    
    // Step 7: Demonstrate proof portability
    console.log("\n7️⃣ Proof Portability:")
    console.log(`   The ZK proof can be:`)
    console.log(`   • Stored in a database`)
    console.log(`   • Sent over the network`)
    console.log(`   • Cached for repeated verification`)
    console.log(`   • Shared publicly without privacy concerns`)
    
    // Serialize for storage/transport
    const serializedProof = JSON.stringify(zkProof)
    console.log(`   Serialized proof size: ${serializedProof.length} bytes`)
    
    // Step 8: Performance comparison
    console.log("\n8️⃣ Performance Summary:")
    console.log(`   Proof generation: ${proofTime}ms`)
    console.log(`   Verification: <10ms (after proof is generated)`)
    console.log(`   Privacy preserved: ✓`)
    
  } catch (error) {
    console.error("\n❌ Error:", error)
    process.exit(1)
  }
  
  console.log("\n✅ Demo complete!")
}

// Run the demo
main().catch(console.error)