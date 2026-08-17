```markdown
# ACK: Credential Issuer Example

This example showcases a **Credential Issuer** for [ACK-ID](https://www.agentcommercekit.com/ack-id) and [ACK-Pay](https://www.agentcommercekit.com/ack-pay) Verifiable Credentials. This API is built with [Hono](https://hono.dev).

The API allows for the issuance, verification, and revocation of the following credential types:

- `ControllerCredential`: ACK-ID credentials that prove DID ownership hierarchies.
- `PaymentReceiptCredential`: ACK-Pay credentials that provide proof of payment that satisfies a given Payment Request.

This issuer supports credential revocation using [Bitstring Status List](https://www.w3.org/TR/vc-bitstring-status-list/), which is a privacy-preserving, space-efficient mechanism for maintaining a credential revocation list.

## Getting Started

```sh
pnpm run setup
Running the server
Bash
pnpm run dev
The server will be available at http://localhost:3456

Database
To simplify the development experience, this API uses a SQLite database. In a production environment, we recommend using a database with native bitwise operations like PostgreSQL.

API Endpoints
Authentication
All API endpoints require a signed payload to prove ownership of the DIDs involved. This payload is a JWT of the request parameters, signed using your DID.

Response format
All API responses respond as JSON objects with the following format:

JSON
{
  "ok": true,
  "data": <anything>
}
or

JSON
{
  "ok": false,
  "error": "string error message"
}
Controller Credential Endpoints
POST /credentials/controller
Create a new ControllerCredential that proves one DID controls another

Request Payload, signed by the controller

TypeScript
SignedPayload<{
  controller: "did:..."
  subject: "did:..."
}>
Response Body

JSON
{
  "ok": true,
  "data": {
    "credential": {
      ...
    }
    "jwt": "credential-jwt"
  }
}
Sample cURL

Bash
curl --request POST \
  --url http://localhost:3456/credentials/controller \
  --header 'Content-Type: application/json' \
  --data '{
  "payload": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6d2ViOmV4YW1wbGUuY29tIn0.signature"
}'
GET /credentials/controller/:id
Retrieve a credential by its identifier

Response Body

JSON
{
  "ok": true,
  "data": {
    "credential": {
      ...
    }
    "jwt": "credential-jwt"
  }
}
Sample cURL

Bash
curl --request GET \
  --url http://localhost:3456/credentials/controller/abc123
DELETE /credentials/controller
Revoke a credential by its identifier

Request Payload, signed by the controller

TypeScript
SignedPayload<{
  id: "credential-id"
}>
Response Body

JSON
{
  "ok": true,
  "data": null
}
Sample cURL

Bash
curl --request DELETE \
  --url http://localhost:3456/credentials/controller \
  --header 'Content-Type: application/json' \
  --data '{
  "payload": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6d2ViOmV4YW1wbGUuY29tIn0.signature"
}'
Payment Receipt Endpoints
POST /credentials/receipts
Generate a payment receipt credential that proves a payment was made

Request Payload, signed by the wallet that made the payment:

TypeScript
SignedPayload<{
  metadata: {
    txHash: "0x123..."
  }
  payerDid: "did:..."
  paymentRequestToken: "jwt-token"
  paymentOptionId: "option-id"
}>
Response Body

JSON
{
  "ok": true,
  "data": {
    "credential": {
      ...
    }
    "jwt": "credential-jwt"
  }
}
Sample cURL

Bash
curl --request POST \
  --url http://localhost:3456/credentials/receipts \
  --header 'Content-Type: application/json' \
  --data '{
  "payload": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6d2ViOmV4YW1wbGUuY29tIn0.signature"
}'
GET /credentials/receipts/:id
Retrieve a payment receipt credential by its identifier

Response Body

JSON
{
  "ok": true,
  "data": {
    "credential": {
      ...
    }
    "jwt": "credential-jwt"
  }
}
Sample cURL

Bash
curl --request GET \
  --url http://localhost:3456/credentials/receipts/abc123
DELETE /credentials/receipts
Revokes a payment receipt credential by flipping the bit on the credential's Status List.

For demo purposes, we only allow the original payment request token issuer to revoke the receipt.

Request Payload, signed by the original payment request token issuer

TypeScript
SignedPayload<{
  id: "receipt-id"
}>
Response Body

JSON
{
  "ok": true,
  "data": null
}
Sample cURL

Bash
curl --request DELETE \
  --url http://localhost:3456/credentials/receipts \
  --header 'Content-Type: application/json' \
  --data '{
  "payload": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6d2ViOmV4YW1wbGUuY29tIn0.signature"
}'
Status Endpoints
GET /status/:listId
Retrieve a Bitstring Status List credential for checking revocation status.

Unlike the other endpoints, this one returns the signed credential directly
rather than in the { ok, data } envelope. Verifiers dereference this URL as
the credential's statusListCredential and expect the credential itself; a
wrapped body cannot be verified, so revocation checks would fail.

Response Body

JSON
{
  "@context": ["[https://www.w3.org/2018/credentials/v1](https://www.w3.org/2018/credentials/v1)"],
  "id": "http://localhost:3456/status/0",
  "type": ["VerifiableCredential", "BitstringStatusListCredential"],
  "issuer": { "id": "did:web:..." },
  "credentialSubject": {
    "id": "http://localhost:3456/status/0#list",
    "type": "BitstringStatusList",
    "statusPurpose": "revocation",
    "encodedList": "..."
  },
  "proof": { "type": "JwtProof2020", "jwt": "jwt-string" }
}
Sample cURL

Bash
curl --request GET \
  --url http://localhost:3456/status/0
DID Endpoints
GET /.well-known/did.json
Return the DID document for the issuer

Response Body

JSON
{
  "@context": [...],
  "id": "did:web:...",
  "verificationMethod": [...],
  "authentication": [...],
  "assertionMethod": [...]
}
Sample cURL

Bash
curl --request GET \
  --url http://localhost:3456/.well-known/did.json
License (MIT)
Copyright (c) 2025 Catena Labs, Inc.