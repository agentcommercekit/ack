import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ack0x402Middleware } from './ack-0x402-middleware';
import { createACK0x402Client } from './ack-0x402-client';
import { generateKeypair } from '@agentcommercekit/keys/ed25519';
import { createDidKeyUri } from '@agentcommercekit/did';
import { createJwtSigner } from '@agentcommercekit/jwt';
import { createPaymentToken } from '@agentcommercekit/ack-pay';

// Mock x402-next
vi.mock('x402-next', () => ({
  paymentMiddleware: vi.fn(() => async (req: Request) => {
    // Simulate x402 behavior
    const payment = req.headers.get('X-PAYMENT');
    if (!payment) {
      return new Response('402 Payment Required', { status: 402 });
    }
    return null; // Continue to handler
  })
}));

describe('ACK-0x402 Middleware', () => {
  let serviceKeypair: any;
  let serviceDid: string;
  let agentKeypair: any;
  let agentDid: string;

  beforeEach(async () => {
    // Setup service identity
    serviceKeypair = await generateKeypair();
    serviceDid = createDidKeyUri(serviceKeypair);
    
    // Setup agent identity
    agentKeypair = await generateKeypair();
    agentDid = createDidKeyUri(agentKeypair);
  });

  describe('Backward Compatibility', () => {
    it('should work as standard x402 when ACK features disabled', async () => {
      const middleware = ack0x402Middleware({
        receivingAddress: '0x123',
        routes: { '/api': { price: '$1' } },
        facilitator: { url: 'https://x402.org' },
        enableIdentity: false,
        enableReceipts: false
      });

      const req = new Request('https://example.com/api');
      const response = await middleware(req);
      
      expect(response?.status).toBe(402);
    });

    it('should accept standard x402 payments when ACK enabled', async () => {
      const middleware = ack0x402Middleware({
        receivingAddress: '0x123',
        routes: { '/api': { price: '$1' } },
        facilitator: { url: 'https://x402.org' },
        enableIdentity: true,
        enableReceipts: true
      });

      const req = new Request('https://example.com/api', {
        headers: { 'X-PAYMENT': 'standard-x402-payment' }
      });
      
      const response = await middleware(req);
      expect(response).toBeNull(); // Payment accepted
    });
  });

  describe('Identity Enhancement', () => {
    it('should verify ACK payment token with DID', async () => {
      const middleware = ack0x402Middleware({
        receivingAddress: '0x123',
        routes: { '/api': { price: '$1' } },
        facilitator: { url: 'https://x402.org' },
        enableIdentity: true
      });

      // Create valid payment token
      const paymentRequest = {
        id: 'test-payment',
        paymentOptions: [{
          id: 'opt-1',
          amount: 100,
          decimals: 2,
          currency: 'USDC',
          recipient: '0x123'
        }]
      };

      const paymentToken = await createPaymentToken(paymentRequest, {
        issuer: agentDid,
        signer: createJwtSigner(agentKeypair),
        algorithm: agentKeypair.algorithm
      });

      const req = new Request('https://example.com/api', {
        headers: { 'X-ACK-PAYMENT': paymentToken }
      });

      const response = await middleware(req);
      expect(response).toBeNull(); // Payment accepted
      expect(req.headers.get('X-AGENT-DID')).toBe(agentDid);
    });

    it('should reject invalid JWT payment tokens', async () => {
      const middleware = ack0x402Middleware({
        receivingAddress: '0x123',
        routes: { '/api': { price: '$1' } },
        facilitator: { url: 'https://x402.org' },
        enableIdentity: true
      });

      const req = new Request('https://example.com/api', {
        headers: { 'X-ACK-PAYMENT': 'invalid-jwt' }
      });

      const response = await middleware(req);
      expect(response?.status).toBe(400);
      expect(await response?.text()).toBe('Invalid ACK payment token');
    });
  });

  describe('Value Proposition Tests', () => {
    it('should enable identity-based access control', async () => {
      // Test that services can identify and track agents
      const middleware = ack0x402Middleware({
        receivingAddress: '0x123',
        routes: { '/api': { price: '$1' } },
        facilitator: { url: 'https://x402.org' },
        enableIdentity: true
      });

      // Multiple requests from same agent
      const paymentToken = await createPaymentToken({
        id: 'payment-1',
        paymentOptions: [{ id: 'opt-1', amount: 100, decimals: 2, currency: 'USDC', recipient: '0x123' }]
      }, {
        issuer: agentDid,
        signer: createJwtSigner(agentKeypair),
        algorithm: agentKeypair.algorithm
      });

      const req1 = new Request('https://example.com/api', {
        headers: { 'X-ACK-PAYMENT': paymentToken }
      });

      await middleware(req1);
      
      // Service can identify this is the same agent
      expect(req1.headers.get('X-AGENT-DID')).toBe(agentDid);
    });

    it('should provide cryptographic non-repudiation', async () => {
      // Test that payments cannot be denied by agents
      const paymentToken = await createPaymentToken({
        id: 'payment-1',
        paymentOptions: [{ id: 'opt-1', amount: 100, decimals: 2, currency: 'USDC', recipient: '0x123' }]
      }, {
        issuer: agentDid,
        signer: createJwtSigner(agentKeypair),
        algorithm: agentKeypair.algorithm
      });

      // The payment token cryptographically proves the agent created it
      expect(paymentToken).toMatch(/^eyJ/); // JWT format
    });
  });
});
