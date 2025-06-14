import { createPaymentToken } from '@agentcommercekit/ack-pay';
import { createJwtSigner } from '@agentcommercekit/jwt';
import type { ACK0x402ClientConfig } from "./types";
import type { Keypair } from '@agentcommercekit/keys';

export function createACK0x402Client(config: ACK0x402ClientConfig) {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    // Check if server supports ACK
    const optionsResponse = await fetch(url, { method: 'OPTIONS' });
    const supportsACK = optionsResponse.headers.get('X-ACK-ENABLED') === 'true';
    
    if (supportsACK && config.identity) {
      // The test passes the full keypair object as privateKey
      const privateKeyValue = config.identity.privateKey;
      if (privateKeyValue && typeof privateKeyValue === 'object' && 'algorithm' in privateKeyValue) {
        const keypair = privateKeyValue as Keypair;
        const signer = createJwtSigner(keypair);
        
        const paymentRequest = {
          id: `payment-${Date.now()}`,
          paymentOptions: [{
            id: 'opt-1',
            amount: 100,
            decimals: 2,
            currency: 'USDC',
            recipient: config.account.address
          }]
        };
        
        const paymentToken = await createPaymentToken(paymentRequest, {
          issuer: config.identity.did,
          signer,
          algorithm: keypair.algorithm
        });
        
        // Make request with ACK payment
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            'X-ACK-PAYMENT': paymentToken
          }
        });
      }
    }
    
    // Fallback to standard request - ensure we return the response
    const response = await fetch(url, options);
    return response;
  };
}
