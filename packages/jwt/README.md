# @agentcommercekit/jwt

JWT utilities for creating and verifying JWTs with support for multiple key algorithms.

This package is part of the [Agent Commerce Kit](https://www.agentcommercekit.com).

## Installation

```sh
npm i @agentcommercekit/jwt
# or
pnpm add @agentcommercekit/jwt
```

## Usage

### Create a JWT

```ts
import { createJwt, createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"

// Generate a keypair
const keypair = await generateKeypair("secp256k1")

// Create a signer from the keypair
const signer = createJwtSigner(keypair)

// Create a JWT
const jwt = await createJwt(
  { sub: "did:web:subject.com", foo: "bar" },
  { issuer: "did:web:issuer.com", signer }
)
```

### Verify a JWT

```ts
import { getDidResolver } from "@agentcommercekit/did"
import { verifyJwt } from "@agentcommercekit/jwt"

const resolver = getDidResolver()

const parsed = await verifyJwt(payload, {
  resolver: didResolver
})

console.log(parsed.payload)
```

### Schema Validation

The package provides schemas for validating JWT strings with Zod and Valibot:

```ts
// Zod v3
import { jwtStringSchema } from "@agentcommercekit/jwt/schemas/zod/v3"

// Valibot
import { jwtStringSchema } from "@agentcommercekit/jwt/schemas/valibot"
```

## API

### Functions

- `createJwt(payload, options, header?)`: Creates a JWT
- `verifyJwt(jwt, options)`: Verifies a JWT
- `createJwtSigner(keypair)`: Creates a JWT signer from a keypair
- `isJwtString(value)`: Checks if a value is a valid JWT string
- `isJwtAlgorithm(algorithm)`: Checks if a value is a valid JWT algorithm
- `resolveJwtAlgorithm(algorithm)`: Resolves alternate algorithm names to standard ones

### Types

- `JwtString`: Type for a valid JWT string
- `JwtAlgorithm`: Supported JWT algorithms (`ES256K`, `ES256K-R`, `Ed25519`, `EdDSA`, `secp256k1`)
- `JwtSigner`: Type for a JWT signer
- `JwtVerified`: Type for a verified JWT result

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
