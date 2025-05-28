# ACK: Credential Issuer Example

This example showcases a **Credential Issuer** for [ACK-ID](https://www.agentcommercekit.com/ack-id) and [ACK-Pay](https://www.agentcommercekit.com/ack-pay) Verifiable Credentials. This API is built with [Hono](https://hono.dev).

The API allows for the issuance, verification, and revocation of the following credential types:

- `ControllerCredential`: ACK-ID credentials that prove DID ownership heirarchies.
- `PaymentReceiptCredential`: ACK-Pay credentials that provide proof of payment that satisfies a given Payment Request.

This issuer supports credential revocation using [StatusList2021](https://www.w3.org/community/reports/credentials/CG-FINAL-vc-status-list-2021-20230102/), which is a privacy-preserving, space-efficient mechanism for maintaining a credential revocation list.

## Getting Started

```sh
pnpm run setup
```

## Running the server

```sh
pnpm run dev
```

The server will be available at <http://localhost:3456>

### Database

To simplify the development experience, this API uses a SQLite database. In a production environment, we recommend using a database with native bitwise operations like PostgreSQL.

## API Endpoints

### Authentication

All API endpoints require a **signed payload** to prove ownership of the DIDs involved. This payload is a JWT of the request parameters, signed using your DID.

In local development, each endpoint accepts a `X-Payload-Issuer` header with a DID-URI as a value. This bypasses the signed payload requirement, and simulates that you signed by the payload. NOTE: This `did` MUST be resolvable, which makes using the [`local-did-host`](../local-did-host/) server helpful.

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

### Controller Credential Endpoints

#### POST /credentials/controller

Create a new ControllerCredential that proves one DID controls another

**Request Payload**, signed by the controller

```ts
SignedPayload<{
  controller: "did:..."
  subject: "did:..."
}>
```

**Response Body**

```json
{
  "ok": true,
  "data": {
    "credential": {
      ...
    }
    "jwt": "credential-jwt"
  }
}
```

**Sample cURL**

```sh
curl --request POST \
  --url http://localhost:3456/credentials/controller \
  --header 'Content-Type: application/json' \
  --header 'X-Payload-Issuer: did:web:0.0.0.0%3A3458:controller' \
  --data '{
  "controller": "did:web:0.0.0.0%3A3458:controller",
  "subject": "did:web:0.0.0.0%3A3458:agent"
}'
```

#### GET /credentials/controller/:id

Retrieve a credential by its identifier

**Response Body**

```json
{
  "ok": true,
  "data": {
    "credential": {
      ...
    }
    "jwt": "credential-jwt"
  }
}
```

**Sample cURL**

```sh
curl --request GET \
  --url http://localhost:3456/credentials/controller/abc123
```

#### DELETE /credentials/controller

Revoke a credential by its identifier

**Request Payload**, signed by the controller

```ts
SignedPayload<{
  id: "credential-id"
}>
```

**Response Body**

```json
{
  "ok": true,
  "data": null
}
```

**Sample cURL**

```sh
curl --request DELETE \
  --url http://localhost:3456/credentials/controller \
  --header 'Content-Type: application/json' \
  --header 'X-Payload-Issuer: did:web:0.0.0.0%3A3458:controller' \
  --data '{
  "id": "abc123"
}'
```

### Payment Receipt Endpoints

#### POST /credentials/receipts

Generate a payment receipt credential that proves a payment was made

**Request Payload**, signed by the wallet that made the payment:

```ts
SignedPayload<{
  metadata: {
    txHash: "0x123..."
  }
  payerDid: "did:..."
  paymentToken: "jwt-token"
  paymentOptionId: "option-id"
}>
```

**Response Body**

```json
{
  "ok": true,
  "data": {
    "credential": {
      ...
    }
    "jwt": "credential-jwt"
  }
}
```

**Sample cURL**

```sh
curl --request POST \
  --url http://localhost:3456/credentials/receipts \
  --header 'Content-Type: application/json' \
  --header 'X-Payload-Issuer: did:web:0.0.0.0%3A3458:wallet' \
  --data '{
  "metadata": {
    "txHash": "0x123abc456def"
  },
  "payerDid": "did:web:0.0.0.0%3A3458:wallet",
  "paymentToken": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
  "paymentOptionId": "option1"
}'
```

#### GET /credentials/receipts/:id

Retrieve a payment receipt credential by its identifier

**Response Body**

```json
{
  "ok": true,
  "data": {
    "credential": {
      ...
    }
    "jwt": "credential-jwt"
  }
}
```

**Sample cURL**

```sh
curl --request GET \
  --url http://localhost:3456/credentials/receipts/abc123
```

#### DELETE /credentials/receipts

Revokes a payment receipt credential by flipping the bit on the credential's Status List.

For demo purposes, we only allow the original payment token issuer to revoke the receipt.

**Request Payload**, signed by the original payment token issuer

```ts
SignedPayload<{
  id: "receipt-id"
}>
```

**Response Body**

```json
{
  "ok": true,
  "data": null
}
```

**Sample cURL**

```sh
curl --request DELETE \
  --url http://localhost:3456/credentials/receipts \
  --header 'Content-Type: application/json' \
  --header 'X-Payload-Issuer: did:web:0.0.0.0%3A3458:payee' \
  --data '{
  "id": "abc123"
}'
```

### Status Endpoints

#### GET /status/:listId

Retrieve a StatusList2021 credential for checking revocation status

**Response Body**

```json
{
  "ok": true,
  "data": "jwt-string"
}
```

**Sample cURL**

```sh
curl --request GET \
  --url http://localhost:3456/status/1
```

### DID Endpoints

#### GET /.well-known/did.json

Return the DID document for the issuer

**Response Body**

```json
{
  "@context": [...],
  "id": "did:web:...",
  "verificationMethod": [...],
  "authentication": [...],
  "assertionMethod": [...]
}
```

**Sample cURL**

```sh
curl --request GET \
  --url http://localhost:3456/.well-known/did.json
```

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
