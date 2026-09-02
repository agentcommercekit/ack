---
"@agentcommercekit/caip": patch
---

Allow a hyphen in the CAIP-2 chain namespace, per spec (`namespace: [-a-z0-9]{3,8}`). `caip2NamespacePattern` previously omitted the hyphen, diverging from both the spec and the sibling `caip19AssetNamespacePattern`.
