# @agentcommercekit/ack-id

ACK Identity protocol. Controller credentials for proving ownership chains, plus optional A2A (Agent-to-Agent) authentication support.

## Internal Dependencies

`did`, `jwt`, `keys`, `vc`

## Subpath Exports

| Export            | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `.`               | Controller credentials and claim verifier            |
| `./a2a`           | A2A message signing, verification, service endpoints |
| `./schemas/*`     | Standard schema exports                              |
| `./a2a/schemas/*` | A2A-specific schema exports                          |

The `/a2a` subpath is separate because it depends on the optional `@a2a-js/sdk` peer dependency.

## Source Layout

- `src/controller-credential.ts` - Create controller credentials
- `src/controller-claim-verifier.ts` - Verify controller claims via DID resolution
- `src/a2a/` - A2A protocol integration:
  - `sign-message.ts` - JWT-based message signatures
  - `verify.ts` - Challenge-response verification
  - `service-endpoints.ts` - Service endpoint helpers
  - Separate schema exports for A2A types

## Key Pattern

Controller credentials prove an ownership chain: a subject DID is controlled by a controller DID. Verification resolves both DIDs and checks the relationship.
