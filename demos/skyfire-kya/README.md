# ACK-ID: Skyfire KYA Token Demo

This demo shows how [Skyfire](https://skyfire.xyz) KYA (Know Your Agent) tokens can work on top of ACK-ID's identity infrastructure. ACK-ID serves as the foundational identity layer for agent commerce, providing standardized verification and trust mechanisms.

## Getting started

Before starting, please follow the [Getting Started](../../README.md#getting-started) guide at the root of this monorepo.

### Running the demo

You can use the demo by running the following command from the root of this repository:

```sh
pnpm run demo:skyfire-kya
```

Alternatively, you can run the demo from this directory (`./demos/skyfire-kya`) with:

```sh
pnpm run demo
```

## What is ACK-ID?

ACK-ID is a protocol built on W3C Standards that provides verifiable, secure identity infrastructure for agents. It uses DIDs (Decentralized Identifiers) and Verifiable Credentials to establish trust and enable agent-to-agent commerce. ACK-ID serves as the core identity layer that other agent systems can build upon.

## What is Skyfire KYA?

Skyfire KYA tokens are JWT-based credentials that contain:

- Buyer Identity Data (BID): Information about the agent and its owner
- Service Scope Identifier (SSI): Which seller service the agent is authorized to use
- Cryptographic Proof: JWT signature from Skyfire's infrastructure

## How Skyfire KYA Works with ACK-ID

This demo demonstrates how KYA tokens can leverage ACK-ID's infrastructure:

1. **Native Compatibility**: KYA JWTs are essentially Verifiable Credentials that can be converted to standard W3C VC format
1. **Cryptographic Integrity**: Conversion preserves original signatures and maintains data fidelity
1. **Infrastructure Reuse**: Existing ACK-ID services can support Skyfire KYA tokens without modification

## Demo Flow

### 1. Skyfire KYA to Verifiable Credential Conversion

- Converts a Skyfire KYA JWT to a W3C Verifiable Credential
- Preserves all original JWT data and cryptographic signatures
- Generates ACK-ID compatible DIDs for buyer, seller, and owner
- Creates a standards-compliant VC that works with ACK-ID infrastructure

### 2. Bidirectional Conversion

- Demonstrates perfect fidelity conversion back to original JWT format
- Proves cryptographic integrity is maintained throughout the process
- Shows that no data is lost in the VC conversion process

### 3. ACK-ID Verification

- Uses ACK-ID's verification infrastructure to validate Skyfire KYA tokens
- Demonstrates how Skyfire tokens work with ACK-ID trust networks
- Shows how existing ACK-ID services can support Skyfire identities

### 4. Service Integration

- Simulates how services built on ACK-ID can work with Skyfire KYA tokens
- Demonstrates data extraction using ACK-ID patterns
- Shows ACK-ID as a foundational identity layer for multiple agent systems

## Technical Implementation

### Verifiable Credential Structure

The demo creates a Verifiable Credential that contains the essential KYA data:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://agentcommercekit.com/contexts/skyfire/v1"
  ],
  "type": ["VerifiableCredential", "SkyFireKYACredential"],
  "issuer": { "id": "did:web:api.skyfire.xyz" },
  "credentialSubject": {
    "id": "did:web:api.skyfire.xyz:buyer:buyer-agent-456",
    "aud": "seller-service-123",
    "bid": {
      "agentName": "BuyerAgent",
      "ownerId": "buyer-org-789",
      "nameFirst": "Alice",
      "nameLast": "Johnson"
    },
    "ssi": "seller-service-123",
    "jti": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

### DID Generation

The system generates synthetic DIDs for Skyfire identities:

- **Buyer DID**: `did:web:api.skyfire.xyz:buyer:{sub}`
- **Seller DID**: `did:web:api.skyfire.xyz:seller:{ssi}`
- **Owner DID**: `did:web:api.skyfire.xyz:owner:{ownerId}`

### Verification Flow

1. **JWT Verification**: Validates the KYA token signature using Skyfire's JWKS
2. **Trust Check**: Ensures Skyfire is in the trusted issuers list
3. **Expiration Check**: Validates token hasn't expired
4. **Authorization Check**: Verifies buyer-owner relationship

## Getting Started

Before starting, follow the [Getting Started](../../README.md#getting-started) guide at the root of this monorepo.

### Running the Demo

From the root of the repository:

```sh
pnpm run demo:skyfire-kya
```

Or from this directory:

```sh
pnpm run demo
```

## Sample Output

```txt
Skyfire ACK-ID Integration Demo

1. Converting KYA JWT to ACK-ID compatible Verifiable Credential...
✓ Verifiable Credential created

2. Demonstrating bidirectional conversion...
✓ Successfully converted VC back to JWT:
   Original JWT matches reconstructed: true

3. Running ACK-ID style verification...
✓ Verification passed - agent is authorized

4. Simulating service interaction...
   Incoming request with KYA token...
   Serving agent: BuyerAgent
   Buyer name: Alice Johnson
   ✓ Request processed successfully

Demo complete
```

## Key Technical Points

### Efficient VC Structure

The VC structure avoids duplication by using standard VC fields:

- Issuer information in `issuer` field rather than duplicated in `credentialSubject`
- Issuance and expiration dates in VC-level fields
- Subject represented as proper DID in `credentialSubject.id`

### Bidirectional Conversion

The conversion maintains cryptographic integrity:

- Original JWT signature is preserved in the VC proof
- All JWT claims can be reconstructed from VC data
- Perfect fidelity ensures identical tokens after round-trip conversion

### ACK-ID Integration

Skyfire KYA tokens integrate with ACK-ID through:

- Standard W3C Verifiable Credential format
- DID-based identity representation
- Compatible verification flows
- Reusable trust infrastructure

## Production Considerations

For production deployment:

1. **JWKS Endpoint**: Fetch Skyfire's current JWKS from their endpoint
2. **Trust Configuration**: Configure Skyfire as a trusted issuer in ACK-ID systems
3. **Error Handling**: Implement robust error handling for token validation
4. **Caching**: Cache JWKS responses to reduce external dependencies
5. **Monitoring**: Add telemetry for verification success/failure rates

## Learn More

- [Agent Commerce Kit](https://www.agentcommercekit.com) Documentation
- [ACK-ID](https://www.agentcommercekit.com/ack-id) Documentation
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) Specification
- [Skyfire](https://skyfire.xyz) Platform Documentation
