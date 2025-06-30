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
// Zod v4
import { jwtStringSchema } from "@agentcommercekit/jwt/schemas/zod/v4"

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
- `curveToJwtAlgorithm(curve)`: Converts a cryptographic curve to its corresponding JWT algorithm

### Types

- `JwtString`: Type for a valid JWT string
- `JwtAlgorithm`: Supported JWT algorithms (`ES256`, `ES256K`, `EdDSA`)
- `JwtSigner`: Type for a JWT signer
- `JwtVerified`: Type for a verified JWT result

### Algorithm Mapping

This package distinguishes between cryptographic curves and JWT algorithms:

- **KeyCurve**: The underlying cryptographic curve (`secp256k1`, `secp256r1`, `Ed25519`)
- **JwtAlgorithm**: The corresponding JWT signing algorithm (`ES256K`, `ES256`, `EdDSA`)

Use `curveToJwtAlgorithm()` to convert between them:

```ts
import { curveToJwtAlgorithm } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"

const keypair = await generateKeypair("secp256k1")
const algorithm = curveToJwtAlgorithm(keypair.curve) // "ES256K"
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
