# @agentcommercekit/did

## 0.10.1

### Patch Changes

- [#48](https://github.com/agentcommercekit/ack/pull/48) [`e223835`](https://github.com/agentcommercekit/ack/commit/e2238355ced067c1a5f993fff52f3796055160e2) Thanks [@venables](https://github.com/venables)! - Fix `did:web` resolution URL construction to follow the spec:
  - Keep root identifiers at `/.well-known/did.json` (for example, `did:web:example.com`)
  - Resolve path-based identifiers to `/:path/did.json` (for example, `did:web:example.com:abc`)

  Also adds regression tests for path-based resolution, including `allowedHttpHosts`.

## 0.9.0

### Patch Changes

- [#29](https://github.com/agentcommercekit/ack/pull/29) [`05d7c03`](https://github.com/agentcommercekit/ack/commit/05d7c033ea150b840429c112f9c41e2c0c89ac78) Thanks [@venables](https://github.com/venables)! - Improve JWK methods, add did:jwks support

- Updated dependencies [[`05d7c03`](https://github.com/agentcommercekit/ack/commit/05d7c033ea150b840429c112f9c41e2c0c89ac78)]:
  - @agentcommercekit/keys@0.9.0

## 0.8.2

### Patch Changes

- [#28](https://github.com/agentcommercekit/ack/pull/28) [`3d1f83f`](https://github.com/agentcommercekit/ack/commit/3d1f83faafaac388d6b977a1929180d8d20fa751) Thanks [@domleboss97](https://github.com/domleboss97)! - Scope return type of did pkh creation; improve did uri typing

## 0.8.1

### Patch Changes

- [#27](https://github.com/agentcommercekit/ack/pull/27) [`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9) Thanks [@venables](https://github.com/venables)! - Add did:pkh support for more chains, including solana

- [#27](https://github.com/agentcommercekit/ack/pull/27) [`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9) Thanks [@venables](https://github.com/venables)! - Add schemas for CAIP-2, CAIP-10, CAIP-19 which are used by did:pkh

- Updated dependencies [[`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9), [`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9)]:
  - @agentcommercekit/keys@0.8.1

## 0.7.1

### Patch Changes

- Updated dependencies [[`fceb090`](https://github.com/agentcommercekit/ack/commit/fceb09050306374157b739f50f098a07b4cefaad)]:
  - @agentcommercekit/keys@0.7.1

## 0.6.1

### Patch Changes

- Updated dependencies [[`36da071`](https://github.com/agentcommercekit/ack/commit/36da0717b65d7f882c7a16cd4e6a1667d8dfccb6)]:
  - @agentcommercekit/keys@0.6.1

## 0.6.0

### Minor Changes

- [#19](https://github.com/agentcommercekit/ack/pull/19) [`ad7b0a0`](https://github.com/agentcommercekit/ack/commit/ad7b0a0327c2cd0366a37f7ab96a53a456934fc3) Thanks [@venables](https://github.com/venables)! - Update interfaces to separate key curves from jwt signing algorithms

- [#14](https://github.com/agentcommercekit/ack/pull/14) [`2c8ae7a`](https://github.com/agentcommercekit/ack/commit/2c8ae7ab1b6a2bcc6ae51414e673d168a0f484b6) Thanks [@venables](https://github.com/venables)! - Add zod v4 schema support.

- [#20](https://github.com/agentcommercekit/ack/pull/20) [`829f5e7`](https://github.com/agentcommercekit/ack/commit/829f5e7c4a546f9ec0cf61d0cd19c99d62fd4eb9) Thanks [@venables](https://github.com/venables)! - Improve JWK encoding/decoding and public key methods

- [#15](https://github.com/agentcommercekit/ack/pull/15) [`2ce8d11`](https://github.com/agentcommercekit/ack/commit/2ce8d11998251a7c274239e3dfa85d2afc99576f) Thanks [@venables](https://github.com/venables)! - Add support for ES256 keys in JWTs

### Patch Changes

- Updated dependencies [[`ad7b0a0`](https://github.com/agentcommercekit/ack/commit/ad7b0a0327c2cd0366a37f7ab96a53a456934fc3), [`829f5e7`](https://github.com/agentcommercekit/ack/commit/829f5e7c4a546f9ec0cf61d0cd19c99d62fd4eb9), [`2ce8d11`](https://github.com/agentcommercekit/ack/commit/2ce8d11998251a7c274239e3dfa85d2afc99576f)]:
  - @agentcommercekit/keys@0.6.0

## 0.3.1

### Patch Changes

- [#9](https://github.com/agentcommercekit/ack/pull/9) [`66741d6`](https://github.com/agentcommercekit/ack/commit/66741d64221a0ca382f9279fbe1babf4a92b52d4) Thanks [@edspencer](https://github.com/edspencer)! - Added Service type export

## 0.2.0

### Minor Changes

- [#3](https://github.com/agentcommercekit/ack/pull/3) [`4104ffe`](https://github.com/agentcommercekit/ack/commit/4104ffeae34c7ae972b375871feb09bbe5d27b73) Thanks [@venables](https://github.com/venables)! - - Upgrade legacy public key formats to use multibase in DID Documents
  - Update base64 methods to be explicit that they use `base64url` encoding
  - Simplify interface for public key encoding methods

### Patch Changes

- Updated dependencies [[`4104ffe`](https://github.com/agentcommercekit/ack/commit/4104ffeae34c7ae972b375871feb09bbe5d27b73)]:
  - @agentcommercekit/keys@0.2.0

## 0.1.0

### Minor Changes

- Initial release of the Agent Commerce Kit (ACK) TypeScript SDK

### Patch Changes

- Updated dependencies []:
  - @agentcommercekit/keys@0.1.0
