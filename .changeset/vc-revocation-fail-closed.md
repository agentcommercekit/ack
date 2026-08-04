---
"@agentcommercekit/vc": minor
"@agentcommercekit/ack-pay": minor
---

Security: fail closed when a credential's revocation status cannot be verified
(CWE-299).

`isRevoked` treated every failure as "not revoked". A network error, DNS
failure, timeout, HTTP 4xx/5xx, non-JSON body, or any body that did not match
the expected shape resolved to `false`, so `verifyParsedCredential` accepted a
revoked credential. Anyone able to disrupt reachability of the status list — or
simply presenting a credential while the status endpoint was down — could use a
revoked credential indefinitely.

The fetched status list was also trusted on shape alone: its proof was never
verified, its issuer never checked, and it was never bound to the URL the
credential pointed at. A tampered or substituted list therefore cleared
revocation for every credential it covered. `statusListIndex` went through
`parseInt`, so a non-numeric value produced `NaN` and read as an unset bit, and
an index past the end of the list also read as unset. The entry's
`statusPurpose` was ignored, and a `credentialStatus` of an unrecognized type
was silently skipped.

`isRevoked(credential, options)` now takes a resolver and throws
`RevocationCheckError` when the status cannot be established, or
`UnsupportedCredentialStatusError` for a status it does not implement. It
verifies the status list credential's proof, requires it to be issued by the
credential's issuer (override with `revocation.trustedStatusListIssuers`),
requires its `id` to match the dereferenced URL, rejects an expired list,
requires the entry and list `statusPurpose` to match, validates
`statusListIndex` and its bounds, restricts the status list URL to `http(s)`,
and applies a 5s timeout (override with `revocation.statusListTimeoutMs`).

`verifyParsedCredential` accepts a `revocation` option and now rejects
credentials whose revocation status is undeterminable, so `verifyPaymentReceipt`
rejects them too. It also checks `trustedIssuers` before the revocation check,
so an untrusted issuer can no longer make the verifier dereference a URL of the
issuer's choosing.

A status list credential stays validly signed after the issuer publishes a newer
version, so anyone holding an older copy could serve it back and clear a later
revocation. `createStatusListCredential` now sets an `expirationDate`, 24 hours
out by default, and issuers must republish the list before it lapses. For
issuers that publish no expiry, `revocation.maxStatusListAgeMs` bounds how old
an accepted list may be.

`RevocationCheckError` carries one fixed message and puts the URL and the
response in `detail` and `cause`. API error handlers return the message of a
`CredentialVerificationError` to the caller, so the detail must not travel with
it.

This release is `minor`, not `patch`: `isRevoked` takes a required second
argument, `isRevocable` accepts fewer shapes, and both throw where they returned
`false`.

The `examples/issuer` status endpoint served the credential wrapped in this
API's `{ ok, data }` envelope, which is not a credential. Every revocation check
against it failed open. It now serves the signed credential directly, as the
W3C Bitstring Status List spec requires.
