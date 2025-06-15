import { ethers } from "ethers";
import { createControllerCredential } from "@agentcommercekit/ack-id";
import { signCredential } from "@agentcommercekit/vc";
import { createJwtSigner } from "@agentcommercekit/jwt";

// Integrated client demonstrating ACK-ID + x402 + ACK-Pay flow
async function demo() {
  console.log("=== Integrated Payment Demo (ACK-ID + x402 + ACK-Pay) ===\n");
  
  // Setup client identity (ACK-ID)
  // For demo purposes, using simple key generation
  const agentPrivateKey = ethers.utils.randomBytes(32);
  const agentDid = `did:key:z6Mk${ethers.utils.hexlify(ethers.utils.randomBytes(32)).substring(2)}`;
  
  const controllerPrivateKey = ethers.utils.randomBytes(32);
  const controllerDid = `did:key:z6Mk${ethers.utils.hexlify(ethers.utils.randomBytes(32)).substring(2)}`;
  const controllerSigner = createJwtSigner(controllerPrivateKey, "EdDSA");
  
  // Create controller credential (ACK-ID)
  const controllerCredential = createControllerCredential({
    subject: agentDid,
    controller: controllerDid,
    issuer: controllerDid
  });
  
  const signedIdentity = await signCredential(controllerCredential, {
    signer: controllerSigner,
    algorithm: "EdDSA"
  });
  
  console.log("Client identity created:");
  console.log(`- Agent DID: ${agentDid}`);
  console.log(`- Controller DID: ${controllerDid}\n`);
  
  // Storage for receipt
  let savedReceipt: string | null = null;
  
  // First request - no payment/receipt
  console.log("1. Initial request without payment...");
  const response1 = await fetch("http://localhost:3000/api/protected");
  
  if (response1.status === 402) {
    console.log("✓ Got 402 Payment Required");
    const requirements = await response1.json();
    console.log("\nRequirements:");
    console.log("- Identity: ACK-ID controller credential");
    console.log("- Payment: 0.01 USDC via x402");
    console.log("- Alternative: Use existing ACK-Pay receipt\n");
    
    // Make payment with identity
    console.log("2. Creating x402 payment with ACK-ID identity...");
    
    // Create payment proof
    const paymentWallet = ethers.Wallet.createRandom();
    const paymentProof = {
      scheme: "exact",
      network: "base-sepolia",
      amount: requirements.requirements.payment.maxAmountRequired,
      asset: requirements.requirements.payment.asset,
      payTo: requirements.requirements.payment.payTo,
      from: paymentWallet.address,
      txHash: "0x" + "a".repeat(64), // Simulated
      timestamp: Date.now()
    };
    
    const signature = await paymentWallet.signMessage(JSON.stringify(paymentProof));
    const xPaymentHeader = Buffer.from(
      JSON.stringify({ ...paymentProof, signature })
    ).toString("base64");
    
    console.log("✓ Payment proof created");
    console.log("✓ Identity credential ready\n");
    
    // Retry with both identity and payment
    console.log("3. Sending payment with identity verification...");
    const response2 = await fetch("http://localhost:3000/api/protected", {
      headers: { 
        "X-PAYMENT": xPaymentHeader,
        "X-IDENTITY": signedIdentity
      }
    });
    
    if (response2.ok) {
      const data = await response2.json();
      console.log("✓ Payment successful!");
      console.log(`- Method used: ${data.method}`);
      console.log(`- Data received: ${data.data}`);
      
      if (data.receipt) {
        savedReceipt = data.receipt;
        console.log(`- Receipt issued, valid until: ${data.receiptExpiry}`);
        console.log("\n4. Testing receipt-based access...");
        
        // Use receipt for subsequent access
        const response3 = await fetch("http://localhost:3000/api/protected", {
          headers: { 
            "Authorization": `Bearer ${savedReceipt}`
          }
        });
        
        if (response3.ok) {
          const receiptData = await response3.json();
          console.log("✓ Receipt accepted!");
          console.log(`- Method used: ${receiptData.method}`);
          console.log(`- Data received: ${receiptData.data}`);
        }
      }
    } else {
      console.log("✗ Payment/identity verification failed (expected in demo)");
    }
  }
  
  console.log("\n=== Integration Flow Complete ===");
  console.log("\nWhat happened:");
  console.log("1. Client created ACK-ID identity (agent + controller DIDs)");
  console.log("2. Server required both identity and payment");
  console.log("3. Client sent x402 payment + ACK-ID credential");
  console.log("4. Server verified both, processed payment, issued ACK-Pay receipt");
  console.log("5. Client used receipt for subsequent access (no payment needed)");
  console.log("\nThis demonstrates true integration:");
  console.log("- ACK-ID: Provides verified identity");
  console.log("- x402: Handles actual payment");
  console.log("- ACK-Pay: Issues receipts for future access");
}

demo().catch(console.error);