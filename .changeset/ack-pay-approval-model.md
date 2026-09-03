---
"@agentcommercekit/ack-pay": minor
---

Add a minimal HITL payment approval request/decision model for demos.

`PaymentApprovalRequest` and `PaymentApprovalDecision` give examples a shared
object shape for pre-execution human sign-off without pulling a policy engine
into ACK core. Docs in `docs/ack-pay/hitl.mdx` show the request → decision →
receipt path.
