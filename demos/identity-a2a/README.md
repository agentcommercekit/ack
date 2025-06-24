# ACK-ID: A2A Identity & Auth Demo

**ACK-ID** is a protocol built on W3C Standards designed to bring verifiable, secure, compliant identity, reputation, and service discovery to agents.

**A2A** (Agent2Agent) is a protocol developed by Google to standardize communication between multiple agents.

This interactive command-line demo showcases how two A2A-compatible agents can use ACK-ID to verify each other's identity and trust that they are communicating with the expected agent.

## Getting started

Before starting, please follow the [Getting Started](../../README.md#getting-started) guide at the root of this monorepo.

### Running the demo

You can use the demo by running the following command from the root of this repository:

```sh
pnpm run demo:identity-a2a
```

Alternatively, you can run the demo from this directory with:

```sh
pnpm run demo
```

## Overview

This demo showcases mutual authentication flow between a Bank Customer Agent and a Bank Teller Agent using ACK-ID DIDs and JWTs exchanged within A2A message bodies. The demo walks through the following authentication flow.

### 1. Initial Contact - Customer Agent Initiates

The Customer Agent sends an authentication request as an A2A message containing a signed JWT with a nonce:

```jsonc
{
  "role": "user",
  "kind": "message",
  "messageId": "f1f54f9d-6db2-4d78-8b38-4e50d77c8b19",
  "parts": [
    {
      "type": "data",
      "data": {
        "jwt": "<signed-JWT-from-customer>"
      }
    }
  ]
}
```

The JWT payload includes:

```jsonc
{
  "iss": "did:web:customer.example.com", // Customer's DID
  "aud": "did:web:bank.example.com", // Bank's expected DID
  "nonce": "c-128bit-random", // Customer's random nonce
  "iat": 1718476800,
  "jti": "0e94d7ec-...", // Unique JWT ID
  "exp": 1718477100 // 5-minute expiry
}
```

### 2. Bank Teller Agent Response

The Bank Teller Agent verifies the customer's JWT signature and responds with its own signed JWT, including both the customer's nonce and a new server nonce:

```jsonc
{
  "role": "agent",
  "kind": "message",
  "messageId": "f1f54f9d-6db2-4d78-8b38-4e50d77c8b19",
  "parts": [
    {
      "type": "data",
      "data": {
        "jwt": "<signed-JWT-from-bank>"
      }
    }
  ]
}
```

The Bank's JWT payload:

```jsonc
{
  "iss": "did:web:bank.example.com", // Bank's DID
  "aud": "did:web:customer.example.com", // Customer's DID
  "nonce": "c-128bit-random", // Echo customer's nonce
  "replyNonce": "b-128bit-random", // Bank's new nonce
  "jti": "1f85c8fa-...", // Unique JWT ID
  "iat": 1718476805,
  "exp": 1718477105 // Short expiry
}
```

### 3. Subsequent Communications

After successful mutual authentication, all subsequent messages include a signature in the metadata:

```jsonc
{
  "role": "user",
  "kind": "message",
  "messageId": "89f2e11b-5b0a-4c3b-b49d-14628e5d30fb",
  "parts": [
    {
      "type": "text",
      "text": "Please check the balance for account #12345"
    }
  ],
  "metadata": {
    "sig": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...Q" // JWT signature of the parts array
  }
}
```

The signature is a JWT with the payload of `{ "message": <the-message-object-without-metadata> }`, with `aud` and `iss` properly set for the counterparty and sender's DID, respectively.

### Security Benefits

This authentication flow provides several security advantages:

- **Mutual Authentication:** Both parties prove their identity through cryptographic signatures
- **Replay Attack Prevention:** Nonces and JWT IDs ensure messages cannot be replayed
- **Man-in-the-Middle (MITM) Protection:** The aud and iss fields are pinned in the JWTs, preventing tampering. An attacker cannot modify requests or responses without invalidating the signatures
- **Short-lived Tokens:** 5-minute expiry limits the window for potential attacks
- **Verifiable Identity:** DID-based authentication ensures cryptographic proof of identity

## Learn More

- [Agent Commerce Kit](https://www.agentcommercekit.com) Documentation
- [ACK-ID](https://www.agentcommercekit.com/ack-id) Documentation
- [A2A](https://github.com/google-a2a/A2A) Documentation
