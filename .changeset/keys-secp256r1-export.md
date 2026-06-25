---
"@agentcommercekit/keys": patch
---

Fix the `@agentcommercekit/keys/secp256r1` subpath export. The `./secp256r1`
entry was declared in `package.json` exports but the curve module was missing
from the tsdown build, so importing it failed at runtime. The module is now
built alongside the other curves.
