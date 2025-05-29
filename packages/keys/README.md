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
  generateKeypair,
  keypairToJwk,
  encodePublicKeyFromKeypair
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

- `generateKeypair(algorithm: KeypairAlgorithm, privateKeyBytes?: Uint8Array): Promise<Keypair>`
- `keypairToJwk(keypair: Keypair): PrivateKeyJwk`
- `jwkToKeypair(jwk: PrivateKeyJwk): Keypair`

### Public Key Formatting

- `encodePublicKeyFromKeypair<T extends PublicKeyEncoding>(encoding: T, keypair: Keypair): PublicKeyTypeMap[T]`
- `getCompressedPublicKey(keypair: Keypair): Uint8Array`

### Additional Exports

Encoding utilities are also available via subpath exports:

```ts
import { bytesToBase58, base58ToBytes } from "@agentcommercekit/keys/encoding"
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
