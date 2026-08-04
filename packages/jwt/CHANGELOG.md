# @agentcommercekit/jwt

## 0.11.0

### Minor Changes

- [#130](https://github.com/agentcommercekit/ack/pull/130)
  [`3f3be14`](https://github.com/agentcommercekit/ack/commit/3f3be1476b2f1d8dd28c687f6b211694ee625269)
  Thanks [@EfeDurmaz16](https://github.com/EfeDurmaz16)! - `verifyJwt` now fails
  when an `audience` is supplied and the token carries no non-empty `aud` claim,
  matching jose and PyJWT semantics. `did-jwt` only validates `aud` when the
  token carries one, so previously a token that omitted `aud` verified even when
  the caller expected an audience, allowing cross-service replay. There is no
  flag: supplying `audience` is the signal. Callers that accept audience-less
  tokens should omit the `audience` option.

  `verifyA2ASignedMessage` no longer passes `audience` to `verifyJwt`: signed
  A2A messages do not carry an `aud` claim, so the option never provided any
  check there. The handshake flow is unchanged and still verifies `aud`.

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

- Updated dependencies
  [[`e5c6951`](https://github.com/agentcommercekit/ack/commit/e5c6951d60e00514f9eb4f525f30ef5d1d729057),
  [`8e9cf8e`](https://github.com/agentcommercekit/ack/commit/8e9cf8ef687d4c1517da55eb373cbe38e628e538),
  [`97985ca`](https://github.com/agentcommercekit/ack/commit/97985caa33c305367484c09d658b680323bbb982)]:
  - @agentcommercekit/keys@0.11.0

## 0.9.0

### Patch Changes

- Updated dependencies
  [[`05d7c03`](https://github.com/agentcommercekit/ack/commit/05d7c033ea150b840429c112f9c41e2c0c89ac78)]:
  - @agentcommercekit/keys@0.9.0

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

## 0.4.0

### Minor Changes

- [#11](https://github.com/agentcommercekit/ack/pull/11)
  [`70b3fc9`](https://github.com/agentcommercekit/ack/commit/70b3fc913b72a3d1322e88db675845409217039b)
  Thanks [@venables](https://github.com/venables)! - Add A2A message support to
  ACK-ID packages

## 0.2.0

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
