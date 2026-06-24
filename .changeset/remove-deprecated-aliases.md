---
"agentcommercekit": minor
"@agentcommercekit/keys": minor
"@agentcommercekit/did": minor
"@agentcommercekit/ack-pay": minor
---

Remove previously deprecated APIs. These were thin aliases for their
replacements; migrate callers as noted.

- `@agentcommercekit/keys`
  - `bytesToJwk` → `publicKeyBytesToJwk`
  - `jwkToBytes` → `publicKeyJwkToBytes`
  - `getCompressedPublicKey(keypair)` → `getPublicKeyFromPrivateKey(privateKey, curve, true)`
- `@agentcommercekit/did`
  - `DidPkhChainId` (type) → `Caip2ChainId`
  - `isDidPkhChainId` → `isCaip2ChainId`
  - `createBlockchainAccountId(address, chainId)` → `createCaip10AccountId(chainId, address)` (note the argument order)
  - `didPkhChainIdSchema` (valibot + zod v3/v4) → `caip2ChainIdSchema`
- `@agentcommercekit/ack-pay`
  - `createPaymentRequestBody` → `createSignedPaymentRequest` (returns `paymentRequestToken` instead of `paymentToken`)
