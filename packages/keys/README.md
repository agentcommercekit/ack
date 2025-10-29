# @agentcommercekit/keys

Methods for dealing with cryptographic keys on multiple curves (secp256k1, Ed25519).

This package is part of the [Agent Commerce Kit](https://www.agentcommercekit.com).

## Installation

```sh
npm i @agentcommercekit/keys
# or
pnpm add @agentcommercekit/keys
```

## Usage

```ts
import {
  encodePublicKeyFromKeypair,
  generateKeypair,
  keypairToJwk,
} from "@agentcommercekit/keys"

// Generate and format keypairs
const keypair = await generateKeypair("secp256k1")
const jwkKeypair = keypairToJwk(keypair)

// Format public keys
const hexPublicKey = encodePublicKeyFromKeypair("hex", keypair)
const jwkPublicKey = encodePublicKeyFromKeypair("jwk", keypair)
const multibasePublicKey = encodePublicKeyFromKeypair("multibase", keypair)
const base58PublicKey = encodePublicKeyFromKeypair("base58", keypair)
```

## API

### Keypair Operations

- `generateKeypair(curve: KeyCurve, privateKeyBytes?: Uint8Array): Promise<Keypair>`
- `keypairToJwk(keypair: Keypair): PrivateKeyJwk`
- `jwkToKeypair(jwk: PrivateKeyJwk): Keypair`

### Public Key Formatting

- `encodePublicKeyFromKeypair<T extends PublicKeyEncoding>(encoding: T, keypair: Keypair): PublicKeyTypeMap[T]`

### Additional Exports

Encoding utilities are also available via subpath exports:

```ts
import { base58ToBytes, bytesToBase58 } from "@agentcommercekit/keys/encoding"
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
