# @agentcommercekit/ack-x402

ACK-x402 is an enhancement layer for the x402 payment protocol that adds decentralized identity (DID) and verifiable credentials to enable trusted agent-to-agent commerce.

## 🎯 Objective

The core objective of ACK-x402 is to transform x402 from an anonymous payment rail into an **identity-aware, credential-enabled commerce protocol** for autonomous AI agents, while maintaining full backward compatibility with the standard x402 protocol.

### Why This Matters

In the emerging agent economy, knowing WHO is paying is as important as the payment itself. ACK-x402 enables:
- **Identity-based commerce**: Services can identify and build relationships with agents
- **Verifiable receipts**: Portable proof of payment as W3C Verifiable Credentials
- **Trust without intermediaries**: Cryptographic proof of payment intent
- **Progressive enhancement**: Works with existing x402 infrastructure

## 📁 Project Structure

```
src/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript type definitions
├── ack-0x402-middleware.ts     # Server-side middleware
├── ack-0x402-client.ts         # Client-side implementation
└── ack-0x402.test.ts          # Test suite
```

## 🔧 Core Components

### 1. **types.ts** - Type Definitions
Defines the configuration interfaces for both middleware and client:

- `ACK0x402Config`: Server configuration including identity and receipt options
- `ACK0x402ClientConfig`: Client configuration with agent identity

### 2. **ack-0x402-middleware.ts** - Server Middleware
The core middleware that enhances x402 with ACK capabilities.

#### Key Methods:
- `ack0x402Middleware(config)`: Creates middleware function that:
  - Verifies JWT payment tokens signed with agent DIDs
  - Sets `X-AGENT-DID` header for downstream identity-based logic
  - Generates verifiable credential receipts after payment
  - Falls back to standard x402 for non-ACK payments

#### How it Works:
1. Intercepts requests to protected routes
2. Checks for `X-ACK-PAYMENT` header (JWT payment token)
3. Verifies the JWT signature and extracts agent DID
4. Optionally generates a VC receipt signed by the service
5. Passes validated payments to the application

### 3. **ack-0x402-client.ts** - Client Implementation
Enhanced client that adds identity to payment requests.

#### Key Methods:
- `createACK0x402Client(config)`: Creates an enhanced fetch function that:
  - Detects ACK-enabled servers via OPTIONS request
  - Creates JWT payment tokens signed with agent's DID
  - Falls back to standard requests for non-ACK servers

#### How it Works:
1. Checks if server supports ACK (via `X-ACK-ENABLED` header)
2. If supported, creates a signed payment token with agent's identity
3. Adds `X-ACK-PAYMENT` header to the request
4. Otherwise, makes a standard request

## 🚀 Usage Example

### Server Setup
```typescript
import { ack0x402Middleware } from '@agentcommercekit/ack-x402';

const middleware = ack0x402Middleware({
  receivingAddress: '0x123...',
  routes: {
    '/api/premium': {
      price: '$1.00',
      network: 'base-mainnet'
    }
  },
  enableIdentity: true,      // Require DID-based payments
  enableReceipts: true,      // Issue VC receipts
  serviceIdentity: {
    did: 'did:web:api.example.com',
    privateKey: serviceKeypair
  },
  facilitator: {
    url: 'https://x402.org/facilitator'
  }
});

// Apply middleware to your server
app.use(middleware);
```

### Client Usage
```typescript
import { createACK0x402Client } from '@agentcommercekit/ack-x402';

const client = createACK0x402Client({
  account: { address: '0x...' },  // Standard x402 account
  identity: {
    did: 'did:key:z6Mk...',      // Agent's DID
    privateKey: agentKeypair     // Agent's keypair
  }
});

// Make authenticated payment
const response = await client('https://api.example.com/premium');
const receipt = response.headers.get('X-ACK-RECEIPT'); // VC receipt
```

## 💡 How Components Contribute to the Objective

### Identity Layer (DID Integration)
- **Middleware**: Verifies agent identity from JWT signatures
- **Client**: Signs payment requests with agent's DID
- **Contribution**: Enables services to know WHO is paying, build allowlists, track usage

### Verifiable Receipts (VC Integration)
- **Middleware**: Issues W3C Verifiable Credentials as receipts
- **Client**: Receives and can store portable receipts
- **Contribution**: Creates audit trail, enables reputation building, supports disputes

### Backward Compatibility
- **Middleware**: Accepts both ACK and standard x402 payments
- **Client**: Falls back to standard requests for non-ACK servers
- **Contribution**: Allows gradual adoption without breaking existing systems

## 🔑 Key Benefits

1. **For Service Providers**:
   - Know which agents are accessing their APIs
   - Build relationships with repeat customers
   - Issue verifiable receipts for compliance
   - Maintain compatibility with standard x402

2. **For AI Agents**:
   - Build portable payment history
   - Prove identity without complex authentication
   - Collect receipts for expense tracking
   - Access identity-gated premium features

3. **For the Ecosystem**:
   - Standard protocol for agent identity in payments
   - Interoperable trust layer built on W3C standards
   - Progressive enhancement of existing infrastructure
   - Foundation for reputation and credit systems

## 🛠️ Technical Features

- **JWT Payment Tokens**: Cryptographically signed payment intents
- **DID Resolution**: Verify agent identities across DID methods
- **VC Receipts**: W3C-compliant verifiable credentials
- **Progressive Enhancement**: Graceful fallback to standard x402
- **Type Safety**: Full TypeScript support

## 🔗 Dependencies

- `@agentcommercekit/ack-pay`: Payment token creation and verification
- `@agentcommercekit/did`: DID resolution and verification
- `@agentcommercekit/vc`: Verifiable credential creation and signing
- `@agentcommercekit/jwt`: JWT creation and verification
- `@agentcommercekit/keys`: Cryptographic key management

## 📈 Future Enhancements

- Credential-based access control (require specific VCs)
- Reputation scoring based on payment history
- Multi-signature payments for agent collectives
- Integration with more DID methods
- Receipt aggregation services

## 🤝 Contributing

This is part of the Agent Commerce Kit (ACK) project. See the main repository for contribution guidelines.

## 📄 License

MIT License - see LICENSE file for details.
EOF
```

This should create a complete README without any breaks. The file explains:
1. What ACK-x402 is and why it exists
2. How each component works
3. How to use it
4. The value it adds to the x402 ecosystem
5. Future possibilities