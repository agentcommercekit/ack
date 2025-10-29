# @agentcommercekit/caip

CAIP (Chain Agnostic Improvement Proposal) utilities for blockchain-agnostic identifier formats with support for CAIP-2 (Chain IDs), CAIP-10 (Account IDs), and CAIP-19 (Asset IDs).

This package is part of the [Agent Commerce Kit](https://www.agentcommercekit.com).

## Installation

```sh
npm i @agentcommercekit/caip
# or
pnpm add @agentcommercekit/caip
```

## What are CAIP IDs?

Chain Agnostic Improvement Proposals (CAIPs) provide standardized formats for identifying blockchains, accounts, and assets across different blockchain ecosystems. This enables applications to work with multiple chains without custom logic for each one.

In short, it these let you specify blockchains and contracts in a standardized format.

## Usage

### CAIP-2: Chain IDs

CAIP-2 defines a standard format for blockchain network identifiers: `namespace:reference`

```ts
import { caip2ChainIds, caip2Parts } from "@agentcommercekit/caip"

// Use predefined chain IDs
const ethMainnet = caip2ChainIds.ethereumMainnet // "eip155:1"
const solMainnet = caip2ChainIds.solanaMainnet // "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"

// Parse chain ID into parts
const parts = caip2Parts("eip155:1")
// { namespace: "eip155", reference: "1" }
```

**Available predefined chains:**

- `ethereumMainnet`, `ethereumSepolia`
- `baseMainnet`, `baseSepolia`
- `arbitrumMainnet`, `arbitrumSepolia`
- `solanaMainnet`, `solanaDevnet`

### CAIP-10: Account IDs

CAIP-10 defines account identifiers across chains: `chainId:accountAddress`

```ts
import { caip10Parts, createCaip10AccountId } from "@agentcommercekit/caip"

// Create an account ID
const accountId = createCaip10AccountId(
  "eip155:1",
  "0x1234567890123456789012345678901234567890"
)
// "eip155:1:0x1234567890123456789012345678901234567890"

// Parse account ID into parts
const parts = caip10Parts(accountId)
// {
//   namespace: "eip155",
//   reference: "1",
//   accountId: "0x1234567890123456789012345678901234567890"
// }
```

### CAIP-19: Asset IDs

CAIP-19 defines asset and token identifiers: `chainId/assetNamespace:assetReference/tokenId`

```ts
import type { Caip19AssetId, Caip19AssetType } from "@agentcommercekit/caip"

// Asset type (e.g., ERC-721 contract)
const nftContract: Caip19AssetType =
  "eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"

// Asset ID (specific token)
const nftToken: Caip19AssetId =
  "eip155:1/erc721:0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1"
```

## API Reference

### CAIP-2 (Chain IDs)

**Types:**

- `Caip2ChainId` - Chain identifier format
- `Caip2ChainIdParts` - Parsed chain ID components

**Constants:**

- `caip2ChainIds` - Predefined chain IDs for common networks
- `caip2ChainIdRegex` - Validation regex

**Functions:**

- `caip2Parts(chainId)` - Parse a CAIP-2 chain ID into namespace and reference

### CAIP-10 (Account IDs)

**Types:**

- `Caip10AccountId` - Account identifier format
- `Caip10AccountIdParts` - Parsed account ID components

**Constants:**

- `caip10AccountIdRegex` - Validation regex

**Functions:**

- `createCaip10AccountId(chainId, address)` - Create an account ID
- `caip10Parts(accountId)` - Parse an account ID into components

### CAIP-19 (Asset IDs)

**Types:**

- `Caip19AssetName` - Asset namespace and reference
- `Caip19AssetType` - Asset type (contract/collection)
- `Caip19AssetId` - Specific asset/token identifier

**Constants:**

- `caip19AssetIdRegex`, `caip19AssetTypeRegex`, `caip19AssetNameRegex` - Validation regexes

### Schema Validation

```ts
// Zod v4 schemas

// Valibot schemas
import {
  caip2ChainIdSchema,
  caip10AccountIdSchema
} from "@agentcommercekit/caip/schemas/valibot"
// Zod v3 schemas
import {
  caip2ChainIdSchema,
  caip10AccountIdSchema
} from "@agentcommercekit/caip/schemas/zod/v3"
import {
  caip2ChainIdSchema,
  caip10AccountIdSchema
} from "@agentcommercekit/caip/schemas/zod/v4"
```

## Resources

- [CAIP-2 Specification](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md)
- [CAIP-10 Specification](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md)
- [CAIP-19 Specification](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-19.md)

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
