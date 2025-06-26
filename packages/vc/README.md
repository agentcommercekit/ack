# @agentcommercekit/vc

Package for creating, signing, verifying, and managing W3C Verifiable Credentials.

This package is part of the [Agent Commerce Kit](https://www.agentcommercekit.com).

## Installation

```sh
npm i @agentcommercekit/vc
# or
pnpm add @agentcommercekit/vc
```

## Usage

### Creating and Signing a Credential

```ts
import { getDidResolver } from "@agentcommercekit/did"
import { createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { createCredential, signCredential } from "@agentcommercekit/vc"

const issuerDid = createDidWebUri("https://issuer.example.com")

// Create credential
const credential = createCredential({
  type: "ExampleCredential",
  issuer: issuerDid,
  subject: "did:example:subject",
  attestation: {
    claim: "value"
  }
})

// Sign credential
const resolver = getDidResolver()
const issuerKeypair = await generateKeypair("secp256k1")
const signer = createJwtSigner(issuerKeypair)

const { jwt, verifiableCredential } = await signCredential(credential, {
  did: issuerDid,
  signer,
  resolver
})

// jwt - signed credential in jwt form
// verifiableCredential - signed credential object
```

### Verifying a Credential

```ts
import {
  verifyParsedCredential,
  parsedJwtCredential
} from "@agentcommercekit/vc"

// Parse JWT credential
const parsed = await parsedJwtCredential(jwt, resolver)

// Verify credential
await verifyParsedCredential(credential, {
  resolver,
  trustedIssuers: ["did:example:issuer"]
})
```

### Revocation

```ts
import { makeRevocable, isRevoked } from "@agentcommercekit/vc"

// Make credential revocable
const revocableCredential = await makeRevocable(credential, {
  id: "https://example.com/status/1#0"
  statusListUrl: "https://example.com/status/1",
  statusListIndex: 0
})

// Check if credential is revoked
const revoked = await isRevoked(credential)
```

## API Reference

### Creation and Signing

- `createCredential(params)` - Create a new unsigned W3C Verifiable Credential
- `signCredential(credential, options)` - Sign a credential and return both JWT and parsed formats
- `isCredential(value)` - Type guard for W3C Verifiable Credentials

### Verification

- `verifyParsedCredential(credential, options)` - Verify a credential's proof, expiration, and other claims
- `verifyProof(proof, resolver)` - Verify a credential's proof
- `isExpired(credential)` - Check if a credential is expired
- `isRevoked(credential)` - Check if a credential has been revoked
- `parsedJwtCredential(jwt, resolver)` - Parse a JWT credential string into a W3C Credential

### Revocation

- `makeRevocable(credential, options)` - Add revocation status to a credential
- `createStatusListCredential(options)` - Create a credential for status list management

### Schema Validation

```ts
// Zod v3 schemas
import { credentialSchema } from "@agentcommercekit/vc/schemas/zod/v3"

// Valibot schemas
import { credentialSchema } from "@agentcommercekit/vc/schemas/valibot"
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
