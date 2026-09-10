# Single-use payment grant lifecycle examples

Run from the repository root after installing its pinned dependencies:

```sh
pnpm --filter @docs/agentcommercekit test
```

These executable examples specify the ordering in ACK-Pay core Section 4.1.
Request/grant and payment validation are explicit inputs; the examples do
not implement cryptography or verify x402 payloads. They cover the unpaid
challenge, paid retry, concurrent requests, and uncertain execution outcome.

The in-memory claim is atomic within one process only. A production adapter
needs durable atomic claims shared across the RP's acceptance domain and
rail-specific recovery. The examples do not test distributed storage,
settlement, record-retention deadlines, or exactly-once execution.
