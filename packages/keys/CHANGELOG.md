# @agentcommercekit/keys

## 0.11.0

### Minor Changes

- [#114](https://github.com/agentcommercekit/ack/pull/114)
  [`e5c6951`](https://github.com/agentcommercekit/ack/commit/e5c6951d60e00514f9eb4f525f30ef5d1d729057)
  Thanks [@venables](https://github.com/venables)! - Upgrade cryptographic
  dependencies to their latest majors (@noble/curves 2, @solana/codecs-strings
  6, multiformats 14, uint8arrays 6) and migrate the curve modules to the
  @noble/curves v2 API. The public API of `@agentcommercekit/keys` is unchanged.

- [#117](https://github.com/agentcommercekit/ack/pull/117)
  [`97985ca`](https://github.com/agentcommercekit/ack/commit/97985caa33c305367484c09d658b680323bbb982)
  Thanks [@venables](https://github.com/venables)! - Remove previously
  deprecated APIs. These were thin aliases for their replacements; migrate
  callers as noted.

  - `@agentcommercekit/keys`
    - `bytesToJwk` → `publicKeyBytesToJwk`
    - `jwkToBytes` → `publicKeyJwkToBytes`
    - `getCompressedPublicKey(keypair)` →
      `getPublicKeyFromPrivateKey(privateKey, curve, true)`
  - `@agentcommercekit/did`
    - `DidPkhChainId` (type) → `Caip2ChainId`
    - `isDidPkhChainId` → `isCaip2ChainId`
    - `createBlockchainAccountId(address, chainId)` →
      `createCaip10AccountId(chainId, address)` (note the argument order)
    - `didPkhChainIdSchema` (valibot + zod) → `caip2ChainIdSchema`
  - `@agentcommercekit/ack-pay`
    - `createPaymentRequestBody` → `createSignedPaymentRequest` (returns
      `paymentRequestToken` instead of `paymentToken`)

### Patch Changes

- [#116](https://github.com/agentcommercekit/ack/pull/116)
  [`8e9cf8e`](https://github.com/agentcommercekit/ack/commit/8e9cf8ef687d4c1517da55eb373cbe38e628e538)
  Thanks [@venables](https://github.com/venables)! - Build the `./secp256r1`
  subpath export. The export was declared in `package.json` but its entry was
  missing from `tsdown.config.ts`, so `dist/curves/secp256r1.{js,d.ts}` were
  never emitted and importing `@agentcommercekit/keys/secp256r1` failed (and
  `publint` flagged the missing files). Added the build entry so the export
  resolves.

## 0.9.0

### Patch Changes

- [#29](https://github.com/agentcommercekit/ack/pull/29)
  [`05d7c03`](https://github.com/agentcommercekit/ack/commit/05d7c033ea150b840429c112f9c41e2c0c89ac78)
  Thanks [@venables](https://github.com/venables)! - Improve JWK methods, add
  did:jwks support

## 0.8.1

### Patch Changes

- [#27](https://github.com/agentcommercekit/ack/pull/27)
  [`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9)
  Thanks [@venables](https://github.com/venables)! - Add did:pkh support for
  more chains, including solana

- [#27](https://github.com/agentcommercekit/ack/pull/27)
  [`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9)
  Thanks [@venables](https://github.com/venables)! - Add schemas for CAIP-2,
  CAIP-10, CAIP-19 which are used by did:pkh

## 0.7.1

### Patch Changes

- [#23](https://github.com/agentcommercekit/ack/pull/23)
  [`fceb090`](https://github.com/agentcommercekit/ack/commit/fceb09050306374157b739f50f098a07b4cefaad)
  Thanks [@venables](https://github.com/venables)! - Add isValidPublicKey for
  each of the supported curves

## 0.6.1

### Patch Changes

- [#21](https://github.com/agentcommercekit/ack/pull/21)
  [`36da071`](https://github.com/agentcommercekit/ack/commit/36da0717b65d7f882c7a16cd4e6a1667d8dfccb6)
  Thanks [@venables](https://github.com/venables)! - Update private key
  generation to by sync

## 0.6.0

### Minor Changes

- [#19](https://github.com/agentcommercekit/ack/pull/19)
  [`ad7b0a0`](https://github.com/agentcommercekit/ack/commit/ad7b0a0327c2cd0366a37f7ab96a53a456934fc3)
  Thanks [@venables](https://github.com/venables)! - Update interfaces to
  separate key curves from jwt signing algorithms

- [#20](https://github.com/agentcommercekit/ack/pull/20)
  [`829f5e7`](https://github.com/agentcommercekit/ack/commit/829f5e7c4a546f9ec0cf61d0cd19c99d62fd4eb9)
  Thanks [@venables](https://github.com/venables)! - Improve JWK
  encoding/decoding and public key methods

- [#15](https://github.com/agentcommercekit/ack/pull/15)
  [`2ce8d11`](https://github.com/agentcommercekit/ack/commit/2ce8d11998251a7c274239e3dfa85d2afc99576f)
  Thanks [@venables](https://github.com/venables)! - Add support for ES256 keys
  in JWTs

## 0.2.0

### Minor Changes

- [#3](https://github.com/agentcommercekit/ack/pull/3)
  [`4104ffe`](https://github.com/agentcommercekit/ack/commit/4104ffeae34c7ae972b375871feb09bbe5d27b73)
  Thanks [@venables](https://github.com/venables)! - - Upgrade legacy public key
  formats to use multibase in DID Documents
  - Update base64 methods to be explicit that they use `base64url` encoding
  - Simplify interface for public key encoding methods

## 0.1.0

### Minor Changes

- Initial release of the Agent Commerce Kit (ACK) TypeScript SDK
