# ACK Identity Protocol (ACK-ID) TypeScript SDK

> Verifiable Identity for Agent Interactions

The Agent Commerce Kit Identity Protocol (ACK-ID) TypeScript SDK provides tools for establishing verifiable relationships between AI agents and their controlling entities using W3C Verifiable Credentials.

ACK-ID is part of the [Agent Commerce Kit](https://www.agentcommercekit.com).

## Installation

```sh
npm i @agentcommercekit/ack-id
# or
pnpm add @agentcommercekit/ack-id
```

## Usage

### Creating Controller Credentials

```ts
import { createControllerCredential } from "@agentcommercekit/ack-id"
import { createDidWebUri } from "@agentcommercekit/did"

// Create DIDs for agent and controller
const controllerDid = createDidWebUri("https://controller.example.com")
const agentDid = createDidWebUri("https://agent.example.com")

// Create a credential establishing the controller relationship
const credential = createControllerCredential({
  subject: agentDid,
  controller: controllerDid,
  // Optional id and issuer can be provided
  id: "urn:uuid:123e4567-e89b-12d3-a456-426614174000",
  issuer: controllerDid // Defaults to controller if not provided
})
```

### Verifying a controller credential

```ts
import { getControllerClaimVerifier } from "@agentcommercekit/ack-id"
import { getDidResolver } from "@agentcommercekit/did"
import { verifyParsedCredential } from "@agentcommercekit/vc"

// Get the verifier for controller credentials
const verifier = getControllerClaimVerifier()
const resolver = getDidResolver()

// Verify the credential using verification logic from vc package.
try {
  await verifyParsedCredential(controllerCredential, {
    resolver,
    verifiers: [verifier],
    trustedIssuers: [controllerDid] // Optional: list of trusted issuers
  })
  console.log("Credential verified successfully")
} catch (error) {
  console.error("Verification failed:", error)
}
```

### Type Guards for Credential Validation

```ts
import {
  isControllerClaim,
  isControllerCredential
} from "@agentcommercekit/ack-id"

// Check if a credential is specifically a controller credential
isControllerCredential(credential)

// Check if a credential subject has the controller claim structure
isControllerClaim(credential.credentialSubject)
```

## API Reference

### Controller Credentials

- `createControllerCredential(params: CreateControllerCredentialParams): W3CCredential` - Creates a verifiable credential that establishes a controller relationship
- `isControllerCredential(credential: unknown): credential is ControllerCredential` - Type guard for controller credentials
- `isControllerClaim(credentialSubject: CredentialSubject): boolean` - Type guard for controller claims
- `getControllerClaimVerifier(): ClaimVerifier` - Returns a verifier that can validate controller claims

### Schema Validation

```ts
// Zod v4 schema

// Valibot schema
import { controllerClaimSchema } from "@agentcommercekit/ack-id/schemas/valibot"
// Zod v3 schema
import { controllerClaimSchema } from "@agentcommercekit/ack-id/schemas/zod/v3"
import { controllerClaimSchema } from "@agentcommercekit/ack-id/schemas/zod/v4"
```

## A2A Support

This package includes utilities for building secure, mutually authenticated agent-to-agent (A2A) flows using DIDs and JWTs, as demonstrated in the [demo-identity-a2a](../docs/demos/demo-identity-a2a.mdx).

### Key Exports from `@agentcommercekit/ack-id/a2a`

- `createA2AHandshakeMessage` – Create a signed handshake message (JWT in A2A message body) for authentication.
- `verifyA2AHandshakeMessage` – Verify a handshake message and extract the payload.
- `createSignedA2AMessage` – Sign any A2A message, embedding a JWT signature in the metadata.
- `verifyA2ASignedMessage` – Verify the signature of a signed A2A message.
- `generateRandomNonce`, `generateRandomJti` – Generate secure random values for nonces and JWT IDs.
- `createAgentCardServiceEndpoint` – Helper for DID service endpoints.

### Example: Mutual Authentication Flow

#### 1. Customer Agent initiates handshake

```ts
import {
  createA2AHandshakeMessage,
  generateRandomNonce
} from "@agentcommercekit/ack-id/a2a"

const handshake = await createA2AHandshakeMessage(
  "user", // role
  "did:web:bank.example.com", // recipient DID
  {
    did: "did:web:customer.example.com" // sender DID
    // ...
  }
)

// Send handshake message to the other agent
```

#### 2. Counterparty Agent verifies and responds

```ts
import { verifyA2AHandshakeMessage, createA2AHandshakeMessage } from "@agentcommercekit/ack-id/a2a"

// On receiving handshake message from customer
const payload = await verifyA2AHandshakeMessage(handshake.message, {
  did: "did:web:bank.example.com",
  counterparty: "did:web:customer.example.com"
})
// payload.nonce is the customer's nonce

// Respond with a handshake message including the received nonce
t const response = await createA2AHandshakeMessage(
  "agent",
  "did:web:customer.example.com",
  {
    did: "did:web:bank.example.com",
    requestNonce: payload.nonce,
    // ...

  }
)
// Send response to the customer
```

#### 3. Signed Messaging after Authentication

```ts
import {
  createSignedA2AMessage,
  verifyA2ASignedMessage
} from "@agentcommercekit/ack-id/a2a"

// To send a signed message:
const signed = await createSignedA2AMessage(
  {
    role: "user",
    parts: [
      { type: "text", text: "Please check the balance for account #12345" }
    ]
    // metadata will be filled in
  },
  {
    did: "did:web:customer.example.com"
    // ...
  }
)
// Send signed.message

// To verify a signed message:
const verified = await verifyA2ASignedMessage(signed.message, {
  did: "did:web:bank.example.com",
  counterparty: "did:web:customer.example.com"
})
// verified.payload.message matches the message content
```

### Utility Methods

- `generateRandomNonce()` – Generate a secure random nonce for challenge/response.
- `generateRandomJti()` – Generate a secure random JWT ID.
- `createAgentCardServiceEndpoint(did, url)` – Create a DID service endpoint for agent discovery.

These methods enable robust, replay-resistant, mutually authenticated A2A flows using DIDs and JWTs. See the [identity-a2a demo](../../demos/identity-a2a) for a full walkthrough.

## Agent Commerce Kit Version

This SDK supports Agent Commerce Kit version `2025-05-04`.

See the ACK [Versioning](https://agentcommercekit.com/resources/versioning) documentation for more information.

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
