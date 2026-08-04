# @agentcommercekit/vc

Package for creating, signing, verifying, and managing W3C Verifiable Credentials.

This package is part of the [Agent Commerce Kit](https://www.agentcommercekit.com).

## Installation

```sh
npm i @agentcommercekit/vc
# or
pnpm add @agentcommercekit/vc
```

## Usage

### Creating and Signing a Credential

```ts
import { getDidResolver } from "@agentcommercekit/did"
import { createJwtSigner } from "@agentcommercekit/jwt"
import { generateKeypair } from "@agentcommercekit/keys"
import { createCredential, signCredential } from "@agentcommercekit/vc"

const issuerDid = createDidWebUri("https://issuer.example.com")

// Create credential
const credential = createCredential({
  type: "ExampleCredential",
  issuer: issuerDid,
  subject: "did:example:subject",
  attestation: {
    claim: "value",
  },
})

// Sign credential
const resolver = getDidResolver()
const issuerKeypair = await generateKeypair("secp256k1")
const signer = createJwtSigner(issuerKeypair)

const { jwt, verifiableCredential } = await signCredential(credential, {
  did: issuerDid,
  signer,
  resolver,
})

// jwt - signed credential in jwt form
// verifiableCredential - signed credential object
```

### Verifying a Credential

```ts
import {
  parsedJwtCredential,
  verifyParsedCredential,
} from "@agentcommercekit/vc"

// Parse JWT credential
const parsed = await parsedJwtCredential(jwt, resolver)

// Verify credential
await verifyParsedCredential(credential, {
  resolver,
  trustedIssuers: ["did:example:issuer"],
})
```

### Revocation

```ts
import { makeRevocable, isRevoked } from "@agentcommercekit/vc"

// Make credential revocable
const revocableCredential = await makeRevocable(credential, {
  id: "https://example.com/status/1#0"
  statusListUrl: "https://example.com/status/1",
  statusListIndex: 0
})

// Check if credential is revoked
const revoked = await isRevoked(credential, { resolver })
```

`isRevoked` fails closed. It resolves the status list credential, verifies its
proof, and requires it to be issued by the credential's issuer (override with
`trustedStatusListIssuers`) and bound to the URL the credential points at. If
the status cannot be established — the list is unreachable, unsigned, expired,
served by the wrong issuer, or too short to cover the credential's index — it
throws a `RevocationCheckError` rather than reporting "not revoked". A
`credentialStatus` this library does not implement throws
`UnsupportedCredentialStatusError` for the same reason.

Pass the credential decoded from a verified proof, not a caller-supplied
object: an unverified `credentialStatus` is attacker-controlled.

Issuers must serve the status list credential itself at the status list URL,
signed and unwrapped. A body wrapped in an API envelope is not a credential and
will fail the check.

Every version of a status list stays validly signed after the issuer publishes a
later one, so a party holding an older copy can serve it back and clear a
revocation that happened after it. `createStatusListCredential` therefore sets an
`expirationDate` 24 hours out by default; republish the list before it lapses, or
pass your own `expirationDate`. When you consume lists from an issuer that
publishes no expiry, set `maxStatusListAgeMs` to bound how old an accepted list
may be:

```ts
await isRevoked(credential, { resolver, maxStatusListAgeMs: 60 * 60 * 1000 })
```

`RevocationCheckError` uses one fixed message and puts the URL and the response
in `detail` and `cause`. `UnsupportedCredentialStatusError` does the same with
the status it could not read. Log `detail`; do not return it to a caller.

Two limits on the fetch are worth knowing. `statusListTimeoutMs` bounds the
status list request only, not the DID resolution that verifies its proof. And
the request does not follow redirects, so serve the credential at the URL the
`statusListCredential` names.

## API Reference

### Creation and Signing

- `createCredential(params)` - Create a new unsigned W3C Verifiable Credential
- `signCredential(credential, options)` - Sign a credential and return both JWT and parsed formats
- `isCredential(value)` - Type guard for W3C Verifiable Credentials

### Verification

- `verifyParsedCredential(credential, options)` - Verify a credential's proof, expiration, and other claims
- `verifyProof(proof, resolver)` - Verify a credential's proof
- `isExpired(credential)` - Check if a credential is expired
- `isRevoked(credential, options)` - Check if a credential has been revoked, against a verified status list credential
- `parsedJwtCredential(jwt, resolver)` - Parse a JWT credential string into a W3C Credential

### Revocation

- `makeRevocable(credential, options)` - Add revocation status to a credential
- `createStatusListCredential(options)` - Create a credential for status list management

### Schema Validation

```ts
// Zod v4 schemas

// Valibot schemas
import { credentialSchema } from "@agentcommercekit/vc/schemas/valibot"
// Zod schema
import { credentialSchema } from "@agentcommercekit/vc/schemas/zod"
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
