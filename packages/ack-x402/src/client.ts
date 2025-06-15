import { ethers } from "ethers";
import { createControllerCredential } from "@agentcommercekit/ack-id";
import { signCredential } from "@agentcommercekit/vc";
import { createJwtSigner } from "@agentcommercekit/jwt";
// For production, use the official x402 client
// import { createPayment } from "@coinbase/x402-js";

async function demo() {
  console.log("=== x402-express + ACK Integration Demo ===\n");
  
  const API_BASE = "http://localhost:3000";
  
  // 1. Setup ACK-ID identity
  console.log("Setting up ACK-ID identity...");
  const agentDid = `did:key:z6Mk${ethers.utils.hexlify(ethers.utils.randomBytes(32)).substring(2)}`;
  const controllerWallet = ethers.Wallet.createRandom();
  const controllerDid = `did:pkh:evm:1:${controllerWallet.address}`;
  const controllerSigner = createJwtSigner(controllerWallet.privateKey, "ES256K");
  
  const controllerCredential = createControllerCredential({
    subject: agentDid,
    controller: controllerDid,
    issuer: controllerDid
  });
  
  const signedIdentity = await signCredential(controllerCredential, {
    signer: controllerSigner,
    algorithm: "ES256K"
  });
  
  console.log(`✓ Agent DID: ${agentDid}`);
  console.log(`✓ Controller: ${controllerDid}\n`);
  
  let savedReceipt: string | null = null;
  
  // 2. First request - no payment (x402 middleware will return 402)
  console.log("1. Testing protected endpoint without payment...");
  try {
    const response1 = await fetch(`${API_BASE}/api/protected`);
    
    if (response1.status === 402) {
      console.log("✓ Got 402 Payment Required from x402-express");
      const paymentDetails = await response1.json();
      
      console.log("\nPayment Requirements:");
      console.log(`- Amount: ${paymentDetails.price || paymentDetails.amount}`);
      console.log(`- Receiver: ${paymentDetails.receiver}`);
      console.log(`- Network: ${paymentDetails.network}`);
      console.log(`- Asset: ${paymentDetails.asset}`);
      console.log(`- Description: ${paymentDetails.description}\n`);
      
      // 3. Create x402 payment
      console.log("2. Creating x402 payment...");
      
      // Simulate payment creation (in production use @coinbase/x402-js)
      const paymentWallet = ethers.Wallet.createRandom();
      const paymentData = {
        scheme: "exact",
        network: paymentDetails.network,
        amount: "10000", // $0.01 in USDC smallest units
        asset: paymentDetails.asset,
        receiver: paymentDetails.receiver,
        from: paymentWallet.address,
        txHash: "0x" + "a".repeat(64),
        blockNumber: 12345678,
        timestamp: Date.now()
      };
      
      const signature = await paymentWallet.signMessage(JSON.stringify(paymentData));
      const xPaymentHeader = Buffer.from(JSON.stringify({
        ...paymentData,
        signature
      })).toString("base64");
      
      console.log("✓ Payment prepared\n");
      
      // 4. Send payment without identity (should fail)
      console.log("3. Sending payment without identity...");
      const response2 = await fetch(`${API_BASE}/api/protected`, {
        headers: {
          "X-PAYMENT": xPaymentHeader
        }
      });
      
      if (response2.status === 401) {
        const error = await response2.json();
        console.log("✓ Got 401:", error.message);
        console.log("  Server requires ACK-ID identity\n");
        
        // 5. Send with both payment and identity
        console.log("4. Sending payment + ACK-ID identity...");
        const response3 = await fetch(`${API_BASE}/api/protected`, {
          headers: {
            "X-PAYMENT": xPaymentHeader,
            "X-IDENTITY": signedIdentity,
            "X-Payment-Verified": "true", // Simulate x402 verification
            "X-Payment-Amount": "10000"
          }
        });
        
        if (response3.ok) {
          const data = await response3.json();
          console.log("✓ Success!");
          console.log(`- Method: ${data.method}`);
          console.log(`- Data: ${data.data}`);
          console.log(`- Payer DID: ${data.payerDid}`);
          
          if (data.receipt) {
            savedReceipt = data.receipt;
            console.log(`- Receipt issued until: ${data.receiptExpiry}\n`);
            
            // 6. Test receipt-based access
            console.log("5. Using ACK-Pay receipt for access...");
            const response4 = await fetch(`${API_BASE}/api/protected`, {
              headers: {
                "Authorization": `Bearer ${savedReceipt}`
              }
            });
            
            if (response4.ok) {
              const receiptData = await response4.json();
              console.log("✓ Receipt accepted!");
              console.log(`- Method: ${receiptData.method}`);
              console.log(`- Data: ${receiptData.data}\n`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
  
  // 7. Test premium endpoint
  console.log("6. Testing premium endpoint ($0.05)...");
  try {
    const premiumResponse = await fetch(`${API_BASE}/api/premium`);
    if (premiumResponse.status === 402) {
      const details = await premiumResponse.json();
      console.log(`✓ Premium endpoint requires: ${details.price || details.amount}`);
    }
  } catch (error) {
    console.error("Premium request failed:", error);
  }
  
  console.log("\n=== Demo Complete ===");
  console.log("\nIntegration Summary:");
  console.log("1. x402-express middleware handles payment requirements (402)");
  console.log("2. Server enhances with ACK-ID identity requirement");
  console.log("3. Successful payment + identity → ACK-Pay receipt");
  console.log("4. Receipt enables 24-hour access without re-payment");
  console.log("5. True integration of payment + identity + access control");
}

// Production example with real x402 client
async function productionExample() {
  // Uncomment when using @coinbase/x402-js
  /*
  import { createPayment } from "@coinbase/x402-js";
  
  const response = await fetch("https://api.example.com/api/protected");
  
  if (response.status === 402) {
    const paymentRequest = await response.json();
    
    // Create payment using official SDK
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
    const payment = await createPayment({
      amount: paymentRequest.amount,
      receiver: paymentRequest.receiver,
      asset: paymentRequest.asset,
      network: paymentRequest.network,
      signer: wallet
    });
    
    // Create ACK-ID
    const identity = await createAndSignACKID();
    
    // Retry with both
    const paidResponse = await fetch("https://api.example.com/api/protected", {
      headers: {
        "X-PAYMENT": payment.token,
        "X-IDENTITY": identity
      }
    });
    
    if (paidResponse.ok) {
      const data = await paidResponse.json();
      // Save receipt for future use
      if (data.receipt) {
        await saveReceipt(data.receipt);
      }
    }
  }
  */
}

// Run the demo
if (require.main === module) {
  demo().catch(console.error);
}

export { demo, productionExample };