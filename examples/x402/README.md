# ACK ID + x402 example

This example shows how to use ACK ID to verify a server's identity, and then use x402 to require payment to access protected routes.

The example consists of two parts:

1. A server that implements the ACK ID protocol to serve a Verifiable Credential that allows buyers to verify the server's identity, and the x402 payment middleware to require payment to access protected routes.
2. A client that purchases a product from the server by first verifying the server's identity using ACK ID, and then sending a x402 payment using the x402-fetch library.

## Server

The server is a simple Hono server that implements the ACK ID protocol to serve a Verifiable Credential that allows buyers to verify the server's identity, and the x402 payment middleware to require payment to access protected routes.

The server hosts the following API endpoints:

- `GET /identify` - Returns the server's Verifiable Credential
- `GET /buy` - A protected endpoint that requires payment to access

### Configure the server

The server requires 2 private keys to run:

- `SERVER_PRIVATE_KEY` - The private key for the server
- `CONTROLLER_PRIVATE_KEY` - The private key for the controller

You can generate these keys by running `pnpm run setup`.

### Run the server

To run the server:

```sh
pnpm install
pnpm run dev
```

The server will be available at `http://localhost:5000`.

## Client

The client is a simple script that purchases a product from the server by first verifying the server's identity using ACK ID, and then sending a x402 payment using the x402-fetch library.

### Configure the client

The client sends a small $0.03 payment to the server, on the Sepolia testnet. To do this it requires a wallet's private key, from which it will derive the account to send the payment from.

You can choose not to provide a private key, in which case the client will use a random account to send the payment from. This is useful for testing, but you will not be able to verify the payment was made.

- `PRIVATE_KEY` - The wallet private key for the buyer

This should be placed in the .env file. If you don't fill this in, the example will still run but the actual payment at the end will fail. However, the client will still verify the server's identity and go through the x402 payment process.

### Run the example

To run the example and buy the product from the server:

```sh
pnpm install
pnpm run buy
```

The client will make a request to the server's `/identity` endpoint to verify the server's identity using ACK ID, and then make a request to the server's `/buy` endpoint, which requires payment to access. The server will verify the client's identity using ACK ID, and then send a x402 payment using the x402-fetch library.

Running the example will give you output like this:

```sh
pnpm run buy

> x402@ buy /Users/ed/Code/catena/ack/examples/x402
> tsx bin/buy.ts

[dotenv@17.2.2] injecting env (1) from .env -- tip: 🛠️  run anywhere with `dotenvx run -- yourcommand`
Client account 0xE302B76b44dF928D37E67D041c461D685AEb56a0 - this will be used to sign the payment
Verifying server identity using ACK ID...
Received Verifiable Credential:
{
  "credentialSubject": {
    "controller": "did:web:localhost%3A5000:trusted",
    "id": "did:web:localhost%3A5000"
  },
  "issuer": {
    "id": "did:web:localhost%3A5000"
  },
  "type": [
    "VerifiableCredential",
    "ControllerCredential"
  ],
  "@context": [
    "https://www.w3.org/2018/credentials/v1"
  ],
  "issuanceDate": "2025-09-18T22:48:06.000Z",
  "proof": {
    "type": "JwtProof2020",
    "jwt": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiQ29udHJvbGxlckNyZWRlbnRpYWwiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiY29udHJvbGxlciI6ImRpZDp3ZWI6bG9jYWxob3N0JTNBNTAwMDp0cnVzdGVkIn19LCJzdWIiOiJkaWQ6d2ViOmxvY2FsaG9zdCUzQTUwMDAiLCJuYmYiOjE3NTgyMzU2ODYsImlzcyI6ImRpZDp3ZWI6bG9jYWxob3N0JTNBNTAwMCJ9.i2DbDq7RY4W9jVw6ADoySN8-PjVK-0bIU1z3oRLQabI8zmK4yOPZVsWScLYnYu8MAatOQG3y87t2jNLab2xLDA"
  }
}
✅ VC verified successfully
✅ Seller identity verified, proceeding with purchase...
Making request to http://localhost:5000/buy
✅ Purchase complete, received response:
{
  "message": "Here is the content you paid for. Enjoy!"
}
```
