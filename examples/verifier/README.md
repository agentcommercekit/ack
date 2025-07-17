# ACK Example: Credential Verifier

This example showcases a **Credential Verifier** for [ACK-ID](https://www.agentcommercekit.com/ack-id) and [ACK-Pay](https://www.agentcommercekit.com/ack-pay) Verifiable Credentials. This API is built with [Hono](https://hono.dev).

- `ControllerCredential`: ACK-ID credentials that prove DID ownership hierarchies.
- `PaymentReceiptCredential`: ACK-Pay credentials that provide proof of payment that satisfies a given Payment Request.

This verifier uses [Bitstring Status List](https://www.w3.org/TR/vc-bitstring-status-list/), to check if a credential is revoked.

# Installation

## Getting Started

```sh
pnpm run setup
```

## Running the server

```sh
pnpm run dev
```

## API Endpoints

### Response format

All API responses respond as JSON objects with the following format:

```json
{
  "ok": true,
  "data": <anything>
}
```

or

```json
{
  "ok": false,
  "error": "string error message"
}
```

### Verification Endpoints

#### POST /verify

Verify a Credential

**Request Payload**

```json
{
  "credential": "<credential as a JWT string or raw credential>"
}
```

**Response Body**

```json
{
  "ok": true,
  "data": null
}
```

If the credential isn't valid, the API will respond with an error.

**Sample cURL**

```sh
curl --request POST \
  --url http://localhost:3457/verify \
  --header 'Content-Type: application/json' \
  --data '{
  "credential": "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiQ29udHJvbGxlckNyZWRlbnRpYWwiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiY29udHJvbGxlciI6ImRpZDp3ZWI6MC4wLjAuMCUzQTM0NTg6Y29udHJvbGxlciJ9LCJjcmVkZW50aWFsU3RhdHVzIjp7ImlkIjoiaHR0cDovL2xvY2FsaG9zdDozNDU2L3N0YXR1cy8wIzAiLCJ0eXBlIjoiU3RhdHVzTGlzdDIwMjFFbnRyeSIsInN0YXR1c1B1cnBvc2UiOiJyZXZvY2F0aW9uIiwic3RhdHVzTGlzdEluZGV4IjoiMCIsInN0YXR1c0xpc3RDcmVkZW50aWFsIjoiaHR0cDovL2xvY2FsaG9zdDozNDU2L3N0YXR1cy8wIn19LCJzdWIiOiJkaWQ6d2ViOjAuMC4wLjAlM0EzNDU4OmFnZW50IiwianRpIjoiaHR0cDovL2xvY2FsaG9zdDozNDU2L2NyZWRlbnRpYWxzL2NvbnRyb2xsZXIvMSIsIm5iZiI6MTc0NzQ1MTE4NSwiaXNzIjoiZGlkOndlYjpsb2NhbGhvc3QlM0EzNDU2In0.q1PaaSbuE0rEGWM87Y-dEO9TVuY3tRm1BV1C24OiDHIfDH2f74HALVIS1yLgUyqgHZbgRQGPpJ57kAKBUnDu_w"
}'
```

Or:

```sh
curl --request POST \
  --url http://localhost:3457/verify \
  --header 'Content-Type: application/json' \
  --data '{
    "credential": {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "id": "http://localhost:3456/credentials/controller/1",
      "type": ["VerifiableCredential", "ControllerCredential"],
      "issuer": {
        "id": "did:web:localhost%3A3456"
      },
      "issuanceDate": "2025-05-17T03:06:25.000Z",
      "credentialSubject": {
        "controller": "did:web:0.0.0.0%3A3458:controller",
        "id": "did:web:0.0.0.0%3A3458:agent"
      },
      "credentialStatus": {
        "id": "http://localhost:3456/status/0#0",
        "type": "BitstringStatusListEntry",
        "statusPurpose": "revocation",
        "statusListIndex": "0",
        "statusListCredential": "http://localhost:3456/status/0"
      },
      "proof": {
        "type": "JwtProof2020",
        "jwt": "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiQ29udHJvbGxlckNyZWRlbnRpYWwiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiY29udHJvbGxlciI6ImRpZDp3ZWI6MC4wLjAuMCUzQTM0NTg6Y29udHJvbGxlciJ9LCJjcmVkZW50aWFsU3RhdHVzIjp7ImlkIjoiaHR0cDovL2xvY2FsaG9zdDozNDU2L3N0YXR1cy8wIzAiLCJ0eXBlIjoiU3RhdHVzTGlzdDIwMjFFbnRyeSIsInN0YXR1c1B1cnBvc2UiOiJyZXZvY2F0aW9uIiwic3RhdHVzTGlzdEluZGV4IjoiMCIsInN0YXR1c0xpc3RDcmVkZW50aWFsIjoiaHR0cDovL2xvY2FsaG9zdDozNDU2L3N0YXR1cy8wIn19LCJzdWIiOiJkaWQ6d2ViOjAuMC4wLjAlM0EzNDU4OmFnZW50IiwianRpIjoiaHR0cDovL2xvY2FsaG9zdDozNDU2L2NyZWRlbnRpYWxzL2NvbnRyb2xsZXIvMSIsIm5iZiI6MTc0NzQ1MTE4NSwiaXNzIjoiZGlkOndlYjpsb2NhbGhvc3QlM0EzNDU2In0.q1PaaSbuE0rEGWM87Y-dEO9TVuY3tRm1BV1C24OiDHIfDH2f74HALVIS1yLgUyqgHZbgRQGPpJ57kAKBUnDu_w"
      }
    }
  }'
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
