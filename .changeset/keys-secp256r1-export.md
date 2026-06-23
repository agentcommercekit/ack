---
"@agentcommercekit/keys": patch
---

Build the `./secp256r1` subpath export. The export was declared in `package.json`
but its entry was missing from `tsdown.config.ts`, so `dist/curves/secp256r1.{js,d.ts}`
were never emitted and importing `@agentcommercekit/keys/secp256r1` failed (and
`publint` flagged the missing files). Added the build entry so the export resolves.
