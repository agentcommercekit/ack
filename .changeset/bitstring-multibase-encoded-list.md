---
"@agentcommercekit/vc": patch
---

`isRevoked` now reads a Bitstring Status List `encodedList` in the form the
specification defines: the Multibase base64url (`u` prefix, no padding) form of
the GZIP-compressed bitstring. It passed that value straight to
`BitBuffer.fromBitstring`, which expects plain padded base64, so every list
from a conformant issuer, including the example in the specification, failed
as an unreadable `encodedList` and the credential's status could not be
determined. Lists without the `u` prefix are read exactly as before.
