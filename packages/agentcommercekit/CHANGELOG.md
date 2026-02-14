# agentcommercekit

## 0.10.1

### Patch Changes

- Updated dependencies [[`e223835`](https://github.com/agentcommercekit/ack/commit/e2238355ced067c1a5f993fff52f3796055160e2)]:
  - @agentcommercekit/did@0.10.1
  - @agentcommercekit/ack-id@0.10.1
  - @agentcommercekit/ack-pay@0.10.1
  - @agentcommercekit/vc@0.10.1

## 0.10.0

### Minor Changes

- [#33](https://github.com/agentcommercekit/ack/pull/33) [`27e3ffb`](https://github.com/agentcommercekit/ack/commit/27e3ffb0c3dc747c80978e6665e30db9e52fdc97) Thanks [@venables](https://github.com/venables)!
  - Deprecate `createPaymentRequestBody` in favor of `createSignedPaymentRequest`
  - Rename `paymentToken` to `paymentRequestToken` in payment requests and receipts
  - Remove `createPaymentRequestResponse`, which only built a `Response` object in a demo

### Patch Changes

- Updated dependencies [[`27e3ffb`](https://github.com/agentcommercekit/ack/commit/27e3ffb0c3dc747c80978e6665e30db9e52fdc97)]:
  - @agentcommercekit/ack-pay@0.10.0

## 0.9.2

### Patch Changes

- [#32](https://github.com/agentcommercekit/ack/pull/32) [`99a0eda`](https://github.com/agentcommercekit/ack/commit/99a0eda9f7cebd3210c3169ac07eda9972f9e97b) Thanks [@domleboss97](https://github.com/domleboss97)! - Allow providing string value for payment option amount.

- Updated dependencies [[`99a0eda`](https://github.com/agentcommercekit/ack/commit/99a0eda9f7cebd3210c3169ac07eda9972f9e97b)]:
  - @agentcommercekit/ack-pay@0.9.2

## 0.9.1

### Patch Changes

- Updated dependencies [[`a5d7c82`](https://github.com/agentcommercekit/ack/commit/a5d7c822397eb1ab71c1cad0c770457ec62810bb)]:
  - @agentcommercekit/vc@0.9.1
  - @agentcommercekit/ack-id@0.9.1
  - @agentcommercekit/ack-pay@0.9.1

## 0.9.0

### Minor Changes

- [#30](https://github.com/agentcommercekit/ack/pull/30) [`b38740a`](https://github.com/agentcommercekit/ack/commit/b38740a0b9faad5b7a8405a7a4b5dfbde40c3818) Thanks [@domleboss97](https://github.com/domleboss97)! - Update credential signing to return only jwt; add domain and challenge to verifiable presentation signing.

### Patch Changes

- Updated dependencies [[`b38740a`](https://github.com/agentcommercekit/ack/commit/b38740a0b9faad5b7a8405a7a4b5dfbde40c3818), [`05d7c03`](https://github.com/agentcommercekit/ack/commit/05d7c033ea150b840429c112f9c41e2c0c89ac78)]:
  - @agentcommercekit/ack-pay@0.9.0
  - @agentcommercekit/vc@0.9.0
  - @agentcommercekit/ack-id@0.9.0
  - @agentcommercekit/keys@0.9.0
  - @agentcommercekit/did@0.9.0
  - @agentcommercekit/jwt@0.9.0

## 0.8.2

### Patch Changes

- [#28](https://github.com/agentcommercekit/ack/pull/28) [`3d1f83f`](https://github.com/agentcommercekit/ack/commit/3d1f83faafaac388d6b977a1929180d8d20fa751) Thanks [@domleboss97](https://github.com/domleboss97)! - Scope return type of did pkh creation; improve did uri typing

- Updated dependencies [[`3d1f83f`](https://github.com/agentcommercekit/ack/commit/3d1f83faafaac388d6b977a1929180d8d20fa751)]:
  - @agentcommercekit/did@0.8.2
  - @agentcommercekit/ack-id@0.8.2
  - @agentcommercekit/ack-pay@0.8.2
  - @agentcommercekit/vc@0.8.2

## 0.8.1

### Patch Changes

- [#27](https://github.com/agentcommercekit/ack/pull/27) [`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9) Thanks [@venables](https://github.com/venables)! - Add did:pkh support for more chains, including solana

- [#27](https://github.com/agentcommercekit/ack/pull/27) [`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9) Thanks [@venables](https://github.com/venables)! - Add schemas for CAIP-2, CAIP-10, CAIP-19 which are used by did:pkh

- Updated dependencies [[`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9), [`8ea5846`](https://github.com/agentcommercekit/ack/commit/8ea5846b931bad5cd94ad1302ddf00ed51c285c9)]:
  - @agentcommercekit/ack-pay@0.8.1
  - @agentcommercekit/ack-id@0.8.1
  - @agentcommercekit/keys@0.8.1
  - @agentcommercekit/did@0.8.1
  - @agentcommercekit/jwt@0.8.1
  - @agentcommercekit/vc@0.8.1

## 0.8.0

### Patch Changes

- Updated dependencies [[`f21bf4d`](https://github.com/agentcommercekit/ack/commit/f21bf4d399f673559a342c4b0bf9a6e088154408)]:
  - @agentcommercekit/vc@0.8.0
  - @agentcommercekit/ack-id@0.8.0
  - @agentcommercekit/ack-pay@0.8.0

## 0.7.1

### Patch Changes

- Updated dependencies [[`fceb090`](https://github.com/agentcommercekit/ack/commit/fceb09050306374157b739f50f098a07b4cefaad)]:
  - @agentcommercekit/keys@0.7.1
  - @agentcommercekit/ack-id@0.7.1
  - @agentcommercekit/ack-pay@0.7.1
  - @agentcommercekit/did@0.7.1
  - @agentcommercekit/jwt@0.7.1
  - @agentcommercekit/vc@0.7.1

## 0.7.0

### Minor Changes

- Use the official @a2a-js/sdk

### Patch Changes

- Updated dependencies []:
  - @agentcommercekit/ack-id@0.7.0

## 0.6.1

### Patch Changes

- Updated dependencies [[`36da071`](https://github.com/agentcommercekit/ack/commit/36da0717b65d7f882c7a16cd4e6a1667d8dfccb6)]:
  - @agentcommercekit/keys@0.6.1
  - @agentcommercekit/ack-id@0.6.1
  - @agentcommercekit/ack-pay@0.6.1
  - @agentcommercekit/did@0.6.1
  - @agentcommercekit/jwt@0.6.1
  - @agentcommercekit/vc@0.6.1

## 0.6.0

### Minor Changes

- [#19](https://github.com/agentcommercekit/ack/pull/19) [`ad7b0a0`](https://github.com/agentcommercekit/ack/commit/ad7b0a0327c2cd0366a37f7ab96a53a456934fc3) Thanks [@venables](https://github.com/venables)! - Update interfaces to separate key curves from jwt signing algorithms

- [#14](https://github.com/agentcommercekit/ack/pull/14) [`2c8ae7a`](https://github.com/agentcommercekit/ack/commit/2c8ae7ab1b6a2bcc6ae51414e673d168a0f484b6) Thanks [@venables](https://github.com/venables)! - Add zod v4 schema support.

- [#20](https://github.com/agentcommercekit/ack/pull/20) [`829f5e7`](https://github.com/agentcommercekit/ack/commit/829f5e7c4a546f9ec0cf61d0cd19c99d62fd4eb9) Thanks [@venables](https://github.com/venables)! - Improve JWK encoding/decoding and public key methods

### Patch Changes

- Updated dependencies [[`37e8d5d`](https://github.com/agentcommercekit/ack/commit/37e8d5dd76f7e97d077516c824bb5915fbd02889), [`ad7b0a0`](https://github.com/agentcommercekit/ack/commit/ad7b0a0327c2cd0366a37f7ab96a53a456934fc3), [`2c8ae7a`](https://github.com/agentcommercekit/ack/commit/2c8ae7ab1b6a2bcc6ae51414e673d168a0f484b6), [`829f5e7`](https://github.com/agentcommercekit/ack/commit/829f5e7c4a546f9ec0cf61d0cd19c99d62fd4eb9), [`2ce8d11`](https://github.com/agentcommercekit/ack/commit/2ce8d11998251a7c274239e3dfa85d2afc99576f)]:
  - @agentcommercekit/vc@0.6.0
  - @agentcommercekit/ack-pay@0.6.0
  - @agentcommercekit/keys@0.6.0
  - @agentcommercekit/did@0.6.0
  - @agentcommercekit/jwt@0.6.0
  - @agentcommercekit/ack-id@0.6.0

## 0.5.1

### Patch Changes

- [#13](https://github.com/agentcommercekit/ack/pull/13) [`2df90df`](https://github.com/agentcommercekit/ack/commit/2df90df181cde4921342e02dedaf81127a10c739) Thanks [@domleboss97](https://github.com/domleboss97)! - Fix createA2AHandshakePayload signature and loosen type on VC in a2a handshake

- Updated dependencies [[`2df90df`](https://github.com/agentcommercekit/ack/commit/2df90df181cde4921342e02dedaf81127a10c739)]:
  - @agentcommercekit/ack-id@0.5.1

## 0.5.0

### Minor Changes

- [#12](https://github.com/agentcommercekit/ack/pull/12) [`1e0cb72`](https://github.com/agentcommercekit/ack/commit/1e0cb7292dbde63ea3bb5be55161ddfe4db23874) Thanks [@domleboss97](https://github.com/domleboss97)! - Update ack-a2a handshake to include ownership VC exchange

### Patch Changes

- Updated dependencies [[`1e0cb72`](https://github.com/agentcommercekit/ack/commit/1e0cb7292dbde63ea3bb5be55161ddfe4db23874)]:
  - @agentcommercekit/ack-id@0.5.0

## 0.4.0

### Minor Changes

- [#11](https://github.com/agentcommercekit/ack/pull/11) [`70b3fc9`](https://github.com/agentcommercekit/ack/commit/70b3fc913b72a3d1322e88db675845409217039b) Thanks [@venables](https://github.com/venables)! - Add A2A message support to ACK-ID packages

### Patch Changes

- Updated dependencies [[`70b3fc9`](https://github.com/agentcommercekit/ack/commit/70b3fc913b72a3d1322e88db675845409217039b)]:
  - @agentcommercekit/ack-pay@0.4.0
  - @agentcommercekit/ack-id@0.4.0
  - @agentcommercekit/jwt@0.4.0
  - @agentcommercekit/vc@0.4.0

## 0.3.1

### Patch Changes

- Updated dependencies [[`66741d6`](https://github.com/agentcommercekit/ack/commit/66741d64221a0ca382f9279fbe1babf4a92b52d4)]:
  - @agentcommercekit/did@0.3.1
  - @agentcommercekit/ack-id@0.3.1
  - @agentcommercekit/ack-pay@0.3.1
  - @agentcommercekit/vc@0.3.1

## 0.3.0

### Patch Changes

- Updated dependencies [[`606f73c`](https://github.com/agentcommercekit/ack/commit/606f73cf3d3271559aed8d21a2a1c228789a1a9f)]:
  - @agentcommercekit/vc@0.3.0
  - @agentcommercekit/ack-id@0.3.0
  - @agentcommercekit/ack-pay@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`5b1c8b1`](https://github.com/agentcommercekit/ack/commit/5b1c8b1b8105e781f977379f019f96efbcab3e27)]:
  - @agentcommercekit/vc@0.2.1
  - @agentcommercekit/ack-id@0.2.1
  - @agentcommercekit/ack-pay@0.2.1

## 0.2.0

### Minor Changes

- [#3](https://github.com/agentcommercekit/ack/pull/3) [`4104ffe`](https://github.com/agentcommercekit/ack/commit/4104ffeae34c7ae972b375871feb09bbe5d27b73) Thanks [@venables](https://github.com/venables)! - - Upgrade legacy public key formats to use multibase in DID Documents
  - Update base64 methods to be explicit that they use `base64url` encoding
  - Simplify interface for public key encoding methods

### Patch Changes

- Updated dependencies [[`4104ffe`](https://github.com/agentcommercekit/ack/commit/4104ffeae34c7ae972b375871feb09bbe5d27b73)]:
  - @agentcommercekit/keys@0.2.0
  - @agentcommercekit/did@0.2.0
  - @agentcommercekit/ack-id@0.2.0
  - @agentcommercekit/ack-pay@0.2.0
  - @agentcommercekit/jwt@0.2.0
  - @agentcommercekit/vc@0.2.0

## 0.1.0

### Minor Changes

- Initial release of the Agent Commerce Kit (ACK) TypeScript SDK

### Patch Changes

- Updated dependencies []:
  - @agentcommercekit/ack-id@0.1.0
  - @agentcommercekit/ack-pay@0.1.0
  - @agentcommercekit/did@0.1.0
  - @agentcommercekit/jwt@0.1.0
  - @agentcommercekit/keys@0.1.0
  - @agentcommercekit/vc@0.1.0
