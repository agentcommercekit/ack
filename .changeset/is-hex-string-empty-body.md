---
"@agentcommercekit/keys": patch
---

`isHexString` now returns `true` for a bare `0x` prefix with an empty body, matching its documented behavior. The check required at least one hex digit after the prefix, so `isHexString("0x")` returned `false` even though the JSDoc example states it returns `true`. A bare empty string with no prefix (`""`) continues to return `false`.
