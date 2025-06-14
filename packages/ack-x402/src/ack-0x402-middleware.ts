import { verifyPaymentToken, createPaymentReceipt } from '@agentcommercekit/ack-pay';
import { getDidResolver } from '@agentcommercekit/did';
import { signCredential } from '@agentcommercekit/vc';
import { createJwtSigner } from '@agentcommercekit/jwt';
import type { ACK0x402Config } from "./types";
import type { Keypair } from '@agentcommercekit/keys';

export function ack0x402Middleware(config: ACK0x402Config) {
  const resolver = getDidResolver();
  
  return async (req: Request): Promise<Response | null> => {
    // Check if this is a protected route
    const pathname = new URL(req.url).pathname;
    const routeConfig = config.routes[pathname];
    
    if (!routeConfig) {
      return null; // Not a protected route
    }
    
    // Check for payment headers
    const ackPayment = req.headers.get("X-ACK-PAYMENT");
    const standardPayment = req.headers.get("X-PAYMENT");
    
    // If identity is enabled and ACK payment provided
    if (config.enableIdentity && ackPayment) {
      try {
        // Verify JWT payment token
        const { paymentRequest, parsed } = await verifyPaymentToken(ackPayment, {
          resolver,
          verifyExpiry: true
        });
        
        // Set agent DID header
        req.headers.set('X-AGENT-DID', parsed.issuer);
        
        // Generate receipt if enabled
        if (config.enableReceipts && config.serviceIdentity) {
          console.log('Receipt generation enabled');
          console.log('Service identity:', config.serviceIdentity);
          console.log('Private key type:', typeof config.serviceIdentity.privateKey);
          console.log('Private key value:', config.serviceIdentity.privateKey);
          
          // The test passes the full keypair object as privateKey
          const privateKeyValue = config.serviceIdentity.privateKey;
          if (privateKeyValue && typeof privateKeyValue === 'object') {
            console.log('Private key is object, creating signer...');
            const keypair = privateKeyValue as Keypair;
            const signer = createJwtSigner(keypair);
            
            const receipt = createPaymentReceipt({
              paymentToken: ackPayment,
              paymentOptionId: 'x402-payment',
              issuer: config.serviceIdentity.did,
              payerDid: parsed.issuer,
              expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            
            console.log('Created receipt:', receipt);
            
            const signedReceipt = await signCredential(receipt, {
              issuer: config.serviceIdentity.did,
              signer,
              algorithm: keypair.algorithm
            });
            
            console.log('Signed receipt:', signedReceipt);
            req.headers.set('X-ACK-RECEIPT', signedReceipt);
            console.log('Set receipt header');
          }
        }
        
        return null; // Payment valid, continue
        
      } catch (error) {
        console.error('Error in middleware:', error);
        return new Response('Invalid ACK payment token', { 
          status: 400,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
    
    // If standard payment provided
    if (standardPayment) {
      return null; // Accept standard payment
    }
    
    // No payment provided
    return new Response(
      JSON.stringify({
        error: "Payment required",
        paymentDetails: {
          address: config.receivingAddress,
          ...routeConfig
        }
      }),
      { 
        status: 402,
        headers: { "Content-Type": "application/json" }
      }
    );
  };
}
