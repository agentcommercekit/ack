---
"@agentcommercekit/ack-pay": patch
---

Reject malformed, fractional, zero, and negative string payment amounts while preserving positive integer strings for values larger than JavaScript's safe integer range.
