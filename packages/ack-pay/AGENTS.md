# @agentcommercekit/ack-pay

ACK Payment protocol. Payment requests (as signed JWTs), payment receipts (as Verifiable Credentials), and verification for both.

## Internal Dependencies

`did`, `jwt`, `keys`, `vc`

## Key Types

```typescript
type PaymentRequest = {
  id: string
  description?: string
  serviceCallback?: string
  expiresAt?: string
  paymentOptions: PaymentOption[]
}

type PaymentOption = {
  id: string
  amount: number | string
  decimals: number
  currency: string
  recipient: string
  network?: string
  paymentService?: string | DidUri
  receiptService?: string | DidUri
}
```

## Source Layout

- `src/payment-request.ts` - Payment request types
- `src/create-payment-request-token.ts` / `verify-payment-request-token.ts` - JWT-based request tokens
- `src/create-payment-receipt.ts` / `verify-payment-receipt.ts` - VC-based receipts
- `src/receipt-claim-verifier.ts` - ClaimVerifier implementation for payment receipts
- Standard schema exports

## Key Patterns

- Payment requests are signed JWTs (designed for HTTP 402 responses)
- A single request can offer multiple payment options (different currencies/networks)
- Payment receipts are W3C Verifiable Credentials that prove payment was made
- Receipt verification uses the vc package's ClaimVerifier strategy
