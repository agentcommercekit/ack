# ACK Payment Protocol (ACK-Pay) TypeScript SDK

> Agent-Native Payments Protocol for the Agent Economy

The Agent Commerce Kit Payment Protocol (ACK-Pay) TypeScript SDK provides tools for creating verifiable payment requests and receipts using W3C Verifiable Credentials.

ACK-Pay is part of the [Agent Commerce Kit](https://www.agentcommercekit.com).

## Installation

```sh
npm i @agentcommercekit/ack-pay
# or
pnpm add @agentcommercekit/ack-pay
```

## Usage

### Creating a Payment Request

```ts
import {
  createPaymentRequestBody,
  createPaymentRequestResponse
} from "@agentcommercekit/ack-pay"
import { createDidWebUri } from "@agentcommercekit/did"
import { createJwtSigner, curveToJwtAlgorithm } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"

// Create a payment request
const paymentRequest = {
  id: "payment-123",
  description: "Access to premium content",
  paymentOptions: [
    {
      id: "option-1",
      amount: 1000,
      decimals: 2,
      currency: "USD",
      recipient: "did:web:payment.example.com",
      paymentService: "https://pay.example.com"
    }
  ]
}

const keypair = await generateKeypair("secp256k1")

// Create a payment request body with a signed token
const paymentBody = await createPaymentRequestBody(paymentRequest, {
  issuer: createDidWebUri("https://server.example.com"),
  signer: createJwtSigner(keypair),
  algorithm: curveToJwtAlgorithm(keypair.curve)
})

// Create a 402 Payment Required response
const response = await createPaymentRequestResponse(paymentRequest, {
  issuer: createDidWebUri("https://server.example.com"),
  signer: createJwtSigner(keypair),
  algorithm: curveToJwtAlgorithm(keypair.curve)
})
```

### Creating a Payment Receipt

```ts
import { createPaymentReceipt } from "@agentcommercekit/ack-pay"

const receipt = createPaymentReceipt({
  paymentToken: "<payment-token-from-request>",
  paymentOptionId: "<payment-option-id-from-request>",
  issuer: "did:web:receipt-service.example.com",
  payerDid: "did:web:customer.example.com"
})
```

### Verifying a Payment Receipt

```ts
import { verifyPaymentReceipt } from "@agentcommercekit/ack-pay"
import { getDidResolver } from "@agentcommercekit/did"

const verified = await verifyPaymentReceipt(receipt, {
  resolver: getDidResolver(),
  trustedIssuers: ["did:web:merchant.example.com"]
})
```

### Type Guards for Validation

```ts
import { isPaymentRequest } from "@agentcommercekit/ack-pay"

// Check if a value is a valid payment request
isPaymentRequest(unknownObject)

// Check if a credential is specifically a payment receipt credential
isPaymentReceiptCredential(credential)

// Check if a credential subject has the payment receipt claim structure
isPaymentReceiptClaim(credential.credentialSubject)
```

## API Reference

### Payment Requests

- `createPaymentRequestBody(params, options)` - Creates a payment request with a signed JWT token
- `createPaymentRequestResponse(params, options)` - Creates a HTTP 402 Response with payment request
- `isPaymentRequest(value)` - Type guard for payment requests

### Payment Tokens

- `createPaymentToken(paymentRequest, options)` - Creates a signed JWT token for a payment request
- `verifyPaymentToken(token, options)` - Verifies a payment token JWT

### Payment Receipts

- `createPaymentReceipt(params)` - Creates a verifiable credential receipt
- `verifyPaymentReceipt(receipt, options)` - Verifies a payment receipt credential
- `getReceiptClaimVerifier()` - Returns a claim verifier for payment receipts

### Schema Validation

```ts
// Zod v4 schema
import { paymentRequestSchema } from "@agentcommercekit/ack-pay/schemas/zod/v4"

// Zod v3 schema
import { paymentRequestSchema } from "@agentcommercekit/ack-pay/schemas/zod/v3"

// Valibot schema
import { paymentRequestSchema } from "@agentcommercekit/ack-pay/schemas/valibot"
```

## Agent Commerce Kit Version

This SDK supports Agent Commerce Kit version `2025-05-04`.

See the ACK [Versioning](https://agentcommercekit.com/resources/versioning) documentation for more information.

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
