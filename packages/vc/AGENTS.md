# @agentcommercekit/vc

W3C Verifiable Credentials: creation, signing, verification, and revocation.

## Internal Dependencies

`did`, `jwt`, `keys`

## Verification Chain

```
verifyParsedCredential() → verifyProof() → check expiry → check revocation → verify trusted issuer → verify claims
```

Claims are verified via the `ClaimVerifier` strategy interface:

```typescript
type ClaimVerifier = {
  accepts(type: string[]): boolean
  verify(
    credentialSubject: CredentialSubject,
    resolver: Resolvable,
  ): Promise<void>
}
```

## Source Layout

- `src/signing/` - Credential and presentation signing
- `src/verification/` - Proof verification, expiration, revocation checks, claim verification
- `src/revocation/` - W3C Bitstring Status List implementation (`makeRevocable()`, `createStatusListCredential()`)
- Standard schema exports

## Key Patterns

- JWT-based proofs (JwtProof2020)
- Revocation via Bitstring Status Lists
- Re-exports `verifyPresentation` from did-jwt-vc
