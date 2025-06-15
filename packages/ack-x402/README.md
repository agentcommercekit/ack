# @agentcommercekit/ack-x402

True integration of x402 payments with ACK identity and receipt systems.

## Overview

This package demonstrates a complete integration of:
- **ACK-ID**: Agent identity verification
- **x402**: Payment processing
- **ACK-Pay**: Receipt issuance and verification

## Installation

```bash
pnpm add @agentcommercekit/ack-x402
```

## Usage

### Running the Demo

```bash
# Start the server
pnpm server

# In another terminal, run the client
pnpm client
```

### Integration Flow

1. **Initial Request**: Client requests protected resource without authentication
2. **Identity + Payment**: Server requires both ACK-ID credential and x402 payment
3. **Receipt Issuance**: After verification, server issues ACK-Pay receipt
4. **Future Access**: Client uses receipt for 24-hour access without payment

### Headers

- `X-IDENTITY`: JWT-encoded ACK-ID controller credential
- `X-PAYMENT`: Base64-encoded x402 payment proof
- `Authorization`: Bearer token with ACK-Pay receipt

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Dev server
pnpm dev
```

## License

MIT