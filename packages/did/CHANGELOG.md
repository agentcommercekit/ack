# @agentcommercekit/did

## 0.11.0

### Minor Changes

- [#129](https://github.com/agentcommercekit/ack/pull/129)
  [`cdec76a`](https://github.com/agentcommercekit/ack/commit/cdec76a840855d29b62b008b44a03e80d2337ce8)
  Thanks [@EfeDurmaz16](https://github.com/EfeDurmaz16)! - Add a `timeout`
  option to `getResolver`'s `DidWebResolverOptions` for the `did:web` resolver,
  defaulting to 5000ms. Resolving a `did:web` DID fetches the host named in the
  DID, so an unresponsive or slow host could otherwise hang the caller
  indefinitely. The resolver passes `AbortSignal.timeout(timeout)` to the
  underlying fetch; a custom `fetch` must honour `init.signal` for the timeout
  to take effect. Values outside 1..2147483647 (the 32-bit timer limit) throw a
  `RangeError`: beyond it, runtimes either clamp the timer to 1ms or throw at
  fetch time, both of which would surface as a misleading `notFound`. There is
  no first-class opt-out; passing the maximum (about 24.8 days) effectively
  disables the timeout.

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

- [#116](https://github.com/agentcommercekit/ack/pull/116)
  [`8e9cf8e`](https://github.com/agentcommercekit/ack/commit/8e9cf8ef687d4c1517da55eb373cbe38e628e538)
  Thanks [@venables](https://github.com/venables)! - Adopt
  [`web-identity-schemas`](https://github.com/catena-labs/web-identity-schemas)
  as the source of truth for DID/JWT/VC validation schemas and DID/JWT types,
  and **drop Zod v3 support**.

  Breaking changes:

  - **Zod v3 is no longer supported.** The `./schemas/zod/v3` and
    `./schemas/zod/v4` subpath exports are removed; each package now exports a
    single `./schemas/zod` (Zod v4). The `zod` optional peer range is now
    `^4.0.0`. Import from `@agentcommercekit/<pkg>/schemas/zod` instead of
    `.../schemas/zod/v3` or `.../schemas/zod/v4`.
  - **DID validation is stricter.** `didUriSchema` and `isDidUri` now enforce
    the full DID-core syntax (via `web-identity-schemas`' `DidSchema`/`isDid`)
    instead of a permissive `startsWith("did:")` check. Malformed DIDs that
    previously passed are now rejected (and validation error details have
    changed).
  - `DidUri` and `JwtString` are now re-exported from `web-identity-schemas`
    (`Did` and `JwtString` respectively). They remain structurally compatible;
    `JwtString` widens to `string`.
  - **VC validation is stricter.** `credentialSchema` (and the `isCredential`
    guard built on it) is now backed by w-i-s' `CredentialV1Schema`, which
    enforces the VC Data Model v1.1 shape: the `@context` must start with the v1
    core URI, `type` must include `"VerifiableCredential"`, `issuanceDate` must
    be an ISO-8601 datetime, and `id` must be a URI. Loosely-shaped objects that
    the previous hand-rolled schema accepted may now be rejected. ACK-issued
    credentials (always v1) are unaffected, and the credential-verification path
    (`parseJwtCredential`/`verifyParsedCredential`) is unchanged — it still uses
    a separate structural guard, not this authoring schema.

  `web-identity-schemas` is now a dependency of `did`, `jwt`, and `vc`. The VC
  credential schema is now backed by w-i-s' `CredentialV1Schema` while
  preserving ACK's issuer-normalization and `JwtProof2020` handling. CAIP,
  payment, A2A, controller-claim, and `JwtProof2020` schemas remain hand-rolled.

### Patch Changes

- [#53](https://github.com/agentcommercekit/ack/pull/53)
  [`7c1739a`](https://github.com/agentcommercekit/ack/commit/7c1739a8c1301f693511df2ebbcb1c89d5a8f64d)
  Thanks [@venables](https://github.com/venables)! - Improve did:jwks support

- Updated dependencies
  [[`e5c6951`](https://github.com/agentcommercekit/ack/commit/e5c6951d60e00514f9eb4f525f30ef5d1d729057),
  [`8e9cf8e`](https://github.com/agentcommercekit/ack/commit/8e9cf8ef687d4c1517da55eb373cbe38e628e538),
  [`97985ca`](https://github.com/agentcommercekit/ack/commit/97985caa33c305367484c09d658b680323bbb982),
  [`8e9cf8e`](https://github.com/agentcommercekit/ack/commit/8e9cf8ef687d4c1517da55eb373cbe38e628e538)]:
  - @agentcommercekit/keys@0.11.0
  - @agentcommercekit/caip@0.11.0

## 0.10.1

### Patch Changes

- [#48](https://github.com/agentcommercekit/ack/pull/48)
  [`e223835`](https://github.com/agentcommercekit/ack/commit/e2238355ced067c1a5f993fff52f3796055160e2)
  Thanks [@venables](https://github.com/venables)! - Fix `did:web` resolution
  URL construction to follow the spec:

  - Keep root identifiers at `/.well-known/did.json` (for example,
    `did:web:example.com`)
  - Resolve path-based identifiers to `/:path/did.json` (for example,
    `did:web:example.com:abc`)

  Also adds regression tests for path-based resolution, including
  `allowedHttpHosts`.

## 0.9.0

### Patch Changes

- [#29](https://github.com/agentcommercekit/ack/pull/29)
  [`05d7c03`](https://github.com/agentcommercekit/ack/commit/05d7c033ea150b840429c112f9c41e2c0c89ac78)
  Thanks [@venables](https://github.com/venables)! - Improve JWK methods, add
  did:jwks support

- Updated dependencies
  [[`05d7c03`](https://github.com/agentcommercekit/ack/commit/05d7c033ea150b840429c112f9c41e2c0c89ac78)]:
  - @agentcommercekit/keys@0.9.0

## 0.8.2

### Patch Changes

- [#28](https://github.com/agentcommercekit/ack/pull/28)
  [`3d1f83f`](https://github.com/agentcommercekit/ack/commit/3d1f83faafaac388d6b977a1929180d8d20fa751)
  Thanks [@domleboss97](https://github.com/domleboss97)! - Scope return type of
  did pkh creation; improve did uri typing

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

- Updated dependencies
  [[`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9),
  [`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9)]:
  - @agentcommercekit/keys@0.8.1

## 0.7.1

### Patch Changes

- Updated dependencies
  [[`fceb090`](https://github.com/agentcommercekit/ack/commit/fceb09050306374157b739f50f098a07b4cefaad)]:
  - @agentcommercekit/keys@0.7.1

## 0.6.1

### Patch Changes

- Updated dependencies
  [[`36da071`](https://github.com/agentcommercekit/ack/commit/36da0717b65d7f882c7a16cd4e6a1667d8dfccb6)]:
  - @agentcommercekit/keys@0.6.1

## 0.6.0

### Minor Changes

- [#19](https://github.com/agentcommercekit/ack/pull/19)
  [`ad7b0a0`](https://github.com/agentcommercekit/ack/commit/ad7b0a0327c2cd0366a37f7ab96a53a456934fc3)
  Thanks [@venables](https://github.com/venables)! - Update interfaces to
  separate key curves from jwt signing algorithms

- [#14](https://github.com/agentcommercekit/ack/pull/14)
  [`2c8ae7a`](https://github.com/agentcommercekit/ack/commit/2c8ae7ab1b6a2bcc6ae51414e673d168a0f484b6)
  Thanks [@venables](https://github.com/venables)! - Add zod v4 schema support.

- [#20](https://github.com/agentcommercekit/ack/pull/20)
  [`829f5e7`](https://github.com/agentcommercekit/ack/commit/829f5e7c4a546f9ec0cf61d0cd19c99d62fd4eb9)
  Thanks [@venables](https://github.com/venables)! - Improve JWK
  encoding/decoding and public key methods

- [#15](https://github.com/agentcommercekit/ack/pull/15)
  [`2ce8d11`](https://github.com/agentcommercekit/ack/commit/2ce8d11998251a7c274239e3dfa85d2afc99576f)
  Thanks [@venables](https://github.com/venables)! - Add support for ES256 keys
  in JWTs

### Patch Changes

- Updated dependencies
  [[`ad7b0a0`](https://github.com/agentcommercekit/ack/commit/ad7b0a0327c2cd0366a37f7ab96a53a456934fc3),
  [`829f5e7`](https://github.com/agentcommercekit/ack/commit/829f5e7c4a546f9ec0cf61d0cd19c99d62fd4eb9),
  [`2ce8d11`](https://github.com/agentcommercekit/ack/commit/2ce8d11998251a7c274239e3dfa85d2afc99576f)]:
  - @agentcommercekit/keys@0.6.0

## 0.3.1

### Patch Changes

- [#9](https://github.com/agentcommercekit/ack/pull/9)
  [`66741d6`](https://github.com/agentcommercekit/ack/commit/66741d64221a0ca382f9279fbe1babf4a92b52d4)
  Thanks [@edspencer](https://github.com/edspencer)! - Added Service type export

## 0.2.0

### Minor Changes

- [#3](https://github.com/agentcommercekit/ack/pull/3)
  [`4104ffe`](https://github.com/agentcommercekit/ack/commit/4104ffeae34c7ae972b375871feb09bbe5d27b73)
  Thanks [@venables](https://github.com/venables)! - - Upgrade legacy public key
  formats to use multibase in DID Documents
  - Update base64 methods to be explicit that they use `base64url` encoding
  - Simplify interface for public key encoding methods

### Patch Changes

- Updated dependencies
  [[`4104ffe`](https://github.com/agentcommercekit/ack/commit/4104ffeae34c7ae972b375871feb09bbe5d27b73)]:
  - @agentcommercekit/keys@0.2.0

## 0.1.0

### Minor Changes

- Initial release of the Agent Commerce Kit (ACK) TypeScript SDK

### Patch Changes

- Updated dependencies []:
  - @agentcommercekit/keys@0.1.0
