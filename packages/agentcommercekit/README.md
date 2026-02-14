# Agent Commerce Kit (ACK) TypeScript SDK

**Agent Commerce Kit (ACK)** provides vendor-neutral protocols, patterns, and open source components that enable AI agents to participate in commerce.

Built on open **W3C Web Standards**, ACK enables AI Agents to manage their own identities, operate their own accounts and wallets, access paid services through standardized paywalls, compensate humans for data contributions, and optimize costs across complex service chains.

To learn more about the Agent Commerce Kit, check out the [documentation](https://www.agentcommercekit.com).

## Installation

We recommend installing the `agentcommercekit` package, which is tree-shakeable and contains everything you need to build for the ACK protocol, even if you choose to only target ACK-ID or ACK-Pay. This is the simplest way to get started, prevent version conflicts or duplication, and makes it easy to manage updates.

```sh
npm i agentcommercekit
# or
pnpm add agentcommercekit
```

Alternatively, you can install each sub-package individually. These are:

- [@agentcommercekit/ack-id](https://github.com/agentcommercekit/ack/tree/main/packages/ack-id) - For ACK-ID specific schemas and functionality
- [@agentcommercekit/ack-pay](https://github.com/agentcommercekit/ack/tree/main/packages/ack-pay) - For ACK-Pay specific schemas and functionality
- [@agentcommercekit/caip](https://github.com/agentcommercekit/ack/tree/main/packages/caip) - For CAIP (Chain Agnostic Improvement Proposal) utilities
- [@agentcommercekit/did](https://github.com/agentcommercekit/ack/tree/main/packages/did) - For DID resolution and manipulation
- [@agentcommercekit/jwt](https://github.com/agentcommercekit/ack/tree/main/packages/jwt) - For JWT creation and verification
- [@agentcommercekit/keys](https://github.com/agentcommercekit/ack/tree/main/packages/keys) - For public/private KeyPairs
- [@agentcommercekit/vc](https://github.com/agentcommercekit/ack/tree/main/packages/vc) - For Verifiable Credentials

When installing separately, we recommend updating all Agent Commerce Kit packages together to prevent duplication of shared dependencies.

## Usage

- [ACK-ID methods](#ack-id-methods)
- [ACK-Pay methods](#ack-pay-methods)

### ACK-ID methods

#### Creating Controller Credentials

```ts
import { createControllerCredential, createDidWebUri } from "agentcommercekit"

// Create DID URIs for agent and controller.
// These DID documents should be hosted at `<domain>/.well-known/did.json`
const controllerDid = createDidWebUri("https://controller.example.com")
const agentDid = createDidWebUri("https://agent.example.com")

// Create a credential establishing the controller relationship
const credential = createControllerCredential({
  subject: agentDid,
  controller: controllerDid,
  // Optional id and issuer can be provided
  id: "urn:uuid:123e4567-e89b-12d3-a456-426614174000",
  issuer: controllerDid, // Defaults to controller if not provided
})
```

#### Verifying a controller credential

```ts
import {
  getControllerClaimVerifier,
  getDidResolver,
  verifyParsedCredential,
} from "agentcommercekit"

// Get the claim verifier for controller credentials
const verifier = getControllerClaimVerifier()
const resolver = getDidResolver()

// Verify the credential using verification logic from vc package.
try {
  await verifyParsedCredential(controllerCredential, {
    resolver,
    verifiers: [verifier],
    trustedIssuers: [controllerDid], // Optional: list of trusted issuers
  })
  console.log("Credential verified successfully")
} catch (error) {
  console.error("Verification failed:", error)
}
```

#### Type Guards for Credential Validation

```ts
import { isControllerClaim, isControllerCredential } from "agentcommercekit"

// Check if a credential is specifically a controller credential
isControllerCredential(credential)

// Check if a credential subject has the controller claim structure
isControllerClaim(credential.credentialSubject)
```

#### A2A Methods

Additionally, the ACK-ID package exposes methods to allow for identity exchange over A2A. See the [A2A section](../ack-id/README.md#a2a-support) of the ACK-ID README for more information.

These methods are exported from `agentcommercekit/a2a`. For example:

```ts
import { createA2AHandshakeMessage } from "agentcommercekit/a2a"

// ...
```

### ACK-Pay methods

#### Creating a Payment Request

```ts
import {
  createSignedPaymentRequest,
  createDidWebUri,
  createJwtSigner,
  curveToJwtAlgorithm,
  generateKeypair
} from "agentcommercekit"

// Create a payment request
const paymentRequest = {
  id: "payment-123",
  description: "Access to premium content",
  paymentOptions: [
    {
      id: "option-1",
      amount: BigInt(100_000_000).toString(), // 100 USDC
      decimals: 6,
      currency: "USDC",
      recipient: "did:web:payment.example.com",
      paymentService: "https://pay.example.com"
    }
  ]
}

const keypair = await generateKeypair("secp256k1")

// Create a payment request body with a signed token
const paymentRequestBody = await createSignedPaymentRequest(paymentRequest, {
  issuer: createDidWebUri("https://server.example.com"),
  signer: createJwtSigner(keypair),
  algorithm: curveToJwtAlgorithm(keypair.curve)
})

// Create a 402 Payment Required response
// Create a 402 Payment Required response
const response = new Response(JSON.stringify(paymentRequestBody, {
  status: 402,
  contentType: "application/json"
})
```

#### Creating a Payment Receipt

```ts
import { createPaymentReceipt } from "agentcommercekit"

const receipt = createPaymentReceipt({
  paymentRequestToken: "<payment-request-token>",
  paymentOptionId: "<payment-option-id-from-request>",
  issuer: "did:web:receipt-service.example.com",
  payerDid: "did:web:customer.example.com",
})
```

#### Verifying a Payment Receipt

```ts
import { getDidResolver, verifyPaymentReceipt } from "agentcommercekit"

const verified = await verifyPaymentReceipt(receipt, {
  resolver: getDidResolver(),
  trustedIssuers: ["did:web:merchant.example.com"],
})
```

#### Type Guards for Validation

```ts
import {
  isPaymentReceiptClaim,
  isPaymentReceiptCredential,
  isPaymentRequest,
} from "agentcommercekit"

// Check if a value is a valid payment request
isPaymentRequest(unknownObject)

// Check if a credential is specifically a payment receipt credential
isPaymentReceiptCredential(credential)

// Check if a credential subject has the payment receipt claim structure
isPaymentReceiptClaim(credential.credentialSubject)
```

## Agent Commerce Kit Version

This SDK supports Agent Commerce Kit version `2025-05-04`.

See the ACK [Versioning](https://agentcommercekit.com/resources/versioning) documentation for more information.

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
