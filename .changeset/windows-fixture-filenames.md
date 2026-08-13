---
"@agentcommercekit/did": patch
---

Rename `did:pkh` test fixture files to remove `:` characters, which are
invalid in Windows filenames

The three JSON fixtures under `test-fixtures/did-pkh/` used the literal
`did:pkh:...` URI (colons included) as their filename. `:` is a reserved
character on Windows/NTFS, so these files failed to check out correctly on
Windows, breaking `pkh-did-resolver.test.ts` for Windows contributors and CI
runners.

Renamed the three fixtures to replace `:` with `_` (e.g.
`did_pkh_eip155_1_0x....json`) and updated the corresponding static imports
in `pkh-did-resolver.test.ts`. File contents are unchanged.
