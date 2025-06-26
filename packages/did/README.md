# @agentcommercekit/did

DID (Decentralized Identifier) and DID document utilities with support for multiple DID methods.

This package is part of the [Agent Commerce Kit](https://www.agentcommercekit.com).

## Installation

```sh
npm i @agentcommercekit/did
# or
pnpm add @agentcommercekit/did
```

## Usage

### Basic DID Resolution

```ts
import { getDidResolver, resolveDid } from "@agentcommercekit/did"
import type { DidUri } from "@agentcommercekit/did"

// Create a resolver with support for did:web, did:key, and did:pkh methods
const resolver = getDidResolver()

// Resolve a DID
const { did, didDocument } = await resolveDid("did:web:example.com", resolver)
```

### Resolving DIDs with Controllers

```ts
import { getDidResolver, resolveDidWithController } from "@agentcommercekit/did"

const resolver = getDidResolver()

// Resolve a DID and its controller
const { did, didDocument, controller } = await resolveDidWithController(
  "did:web:example.com",
  resolver
)
```

### Creating DID URIs

```ts
import {
  createDidWebUri,
  createDidKeyUri,
  createDidPkhUri
} from "@agentcommercekit/did"
import { generateKeypair } from "@agentcommercekit/keys"

// Create a did:web URI from a domain or URL
const webDid = createDidWebUri("https://www.example.com")
// did:web:example.com

// Create a did:key URI from a keypair
const keypair = await generateKeypair("secp256k1")
const keyDid = createDidKeyUri(keypair)
// did:key:zQ3...

// Create a did:pkh URI from an address and chain ID
const pkhDid = createDidPkhUri(
  "0x1234567890123456789012345678901234567890",
  "eip155:1"
)
// did:pkh:eip155:1:0x1234567890123456789012345678901234567890
```

### Creating DID Documents

```ts
import { generateKeypair } from "@agentcommercekit/keys"
import {
  createDidDocumentFromKeypair,
  createDidWebDocumentFromKeypair
} from "@agentcommercekit/did"

const keypair = await generateKeypair("secp256k1")

// Create a DID document from a keypair
const did = createDidKeyUri(keypair)

const didDocument = createDidDocumentFromKeypair({
  did,
  keypair,
  encoding: "jwk", // Optional, defaults to "jwk"
  controller: "did:web:controller.example.com" // Optional
})

// Create a did:web and document with URI and document
const { did, didDocument } = createDidWebDocumentFromKeypair({
  keypair,
  baseUrl: "https://www.example.com",
  controller: ownerDid
})
```

## API Reference

### DID URIs

- `createDidWebUri(input: string | URL): DidWebUri` - Create a did:web URI from a domain or URL
- `createDidKeyUri(keypair: Keypair): DidKeyUri` - Create a did:key URI from a keypair
- `createDidPkhUri(address: string, chainId: DidPkhChainId): DidPkhUri` - Create a did:pkh URI from an address and chain ID

### Resolution

- `getDidResolver(options?: GetDidResolverOptions): DidResolver` - Create a resolver supporting multiple DID methods
- `resolveDid(didUri: string, resolver: Resolvable): Promise<DidUriWithDocument>` - Resolve a DID to its document
- `resolveDidWithController(didUri: string, resolver: Resolvable): Promise<DidUriWithControlledDidDocument>` - Resolve a DID and its controller

### DID Document Creation

- `createDidDocument(options: CreateDidDocumentOptions): DidDocument` - Create a generic DID document
- `createDidDocumentFromKeypair(options: CreateDidDocumentFromKeypairOptions): DidDocument` - Create a DID document from a keypair
- `createDidWebDocument(options: CreateDidWebDocumentOptions): DidUriWithDocument` - Create a DidWebUri and associated document document
- `createDidPkhDocument(options: CreateDidPkhDocumentOptions): DidUriWithDocument` - Create a DidPkhUri and associated document

### Validation

- `isDidUri(value: unknown): value is DidUri` - Check if a value is a valid DID URI
- `isDidDocument(value: unknown): value is DidDocument` - Check if a value is a valid DID document
- `isDidDocumentForDid(didDocument: DidDocument, did: string): boolean` - Check if a document belongs to a DID

### Schema Validation

```ts
// Zod v4 schemas
import { didUriSchema } from "@agentcommercekit/did/schemas/zod/v4"

// Zod v3 schemas
import { didUriSchema } from "@agentcommercekit/did/schemas/zod/v3"

// Valibot schemas
import { didUriSchema } from "@agentcommercekit/did/schemas/valibot"
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
