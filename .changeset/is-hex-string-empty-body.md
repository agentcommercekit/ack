---
"@agentcommercekit/keys": patch
---

`isHexString` now returns `true` for a bare `0x` prefix with an empty body, matching its documented behavior. The check required at least one hex digit after the prefix, so `isHexString("0x")` returned `false` even though the JSDoc example states it returns `true`. A bare empty string with no prefix (`""`) continues to return `false`.

`isHexString` also now accepts an uppercase `0X` prefix (e.g. `isHexString("0XABCDEF")` and `isHexString("0X")` both return `true`), making its prefix handling case-insensitive and consistent with `hexStringToBytes`, which already lower-cased the value before checking for the prefix.
