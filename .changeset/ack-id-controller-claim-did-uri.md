---
"@agentcommercekit/ack-id": patch
---

Require `controllerClaimSchema` `id` and `controller` fields to be DID URIs in both Valibot and Zod, rejecting empty strings and other non-DID values at the schema boundary.
