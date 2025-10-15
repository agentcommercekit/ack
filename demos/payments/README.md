# ACK-Pay: Payments Demo

**ACK-Pay** is a protocol built on W3C Standards designed to facilitate secure, verifiable, and interoperable financial transactions among autonomous agents, services, and human participants.

This interactive command-line demo showcases a common use case: the **Server-Initiated payment flow**. You will see:

- A **Client Agent** attempting to access a protected resource.
- A **Server Agent** requiring payment and issuing a formal Payment Request.
- The Client Agent making a payment using **USDC on the Base Sepolia testnet** or **USDC on Solana devnet**, or a **Stripe** simulated card payment.
- A **Receipt Service** verifying the on-chain payment and issuing a cryptographically **Verifiable Credential (VC)** as a payment receipt.
- The Client Agent using this receipt to gain access to the resource.

## ACK-Pay Components in This Demo

- **Client**: The interactive script you'll be running. It wants to access a resource and needs to make a payment.
- **Server**: A simple HTTP server that protects a resource and issues Payment Requests.
- **Receipt Service**: An HTTP service that validates on-chain payments and issues verifiable receipts (VCs).
- **Payment Service**: This demo shows two paths, one with a Payment Service, one without. When performing credit card payments, the demo uses a Payment Service to settle with the Card Networks. When performing an on-chain stablecoin payment, the demo bypasses the Payment Agent. In a full ACK-Pay deployment, a dedicated Payment Service helps facilitate:
  - Abstracting different payment methods (e.g., allowing payment via credit cards, other cryptocurrencies, or bank transfers).
  - Handling currency conversions.
  - Integrating compliance checks (KYC/AML).
  - Facilitating complex payment routing.

You can learn more about the full ACK-Pay protocol at [www.agentcommercekit.com](https://www.agentcommercekit.com).

## Demo Video

https://github.com/user-attachments/assets/193b8f66-443f-457f-9370-32835f3b1c85

## Getting started

Before starting, please follow the [Getting Started](../../README.md#getting-started) guide at the root of this monorepo.

### Running the demo

You can use the demo by running the following command from the root of this repository:

```sh
pnpm run demo:payments
```

Alternatively, you can run the demo from this directory with:

```sh
pnpm run demo
```

## Overview of the Demo

The interactive CLI will guide you through the following steps:

1. **Client requests resource**: The Client attempts to fetch data from the Server Agent, who responds with an HTTP `402 Payment Required` status. This response contains a `PaymentRequest` which includes details on how to pay for access to this resource and offers multiple payment options.
2. **Client makes payment**: If the client chooses to pay via Credit Card, they will pay via a sample Payment Service. Alternatively, the Client can use the information from the Payment Request to transfer USDC from its wallet to the Server's wallet on:
   - Base Sepolia (EVM), or
   - Solana devnet (SPL token, USDC mint configurable via env)
3. **Client requests a receipt**: Once the payment transaction is complete, the Client or the Payment Service will request a formal Receipt **Verifiable Credential (VC)**. For on-chain payments, the Client provides the Receipt Service with proof of the on-chain transaction and the original Payment Request.
4. **Receipt Service verifies payment**: The Receipt Service verifies all of the provided data, performs on-chain transaction verification if required, and verifies the integrity of the original payment request. If all is successful, it issues a Receipt Credential (VC).
5. **Client presents receipt to Server**: The Client retries the request to the Server, this time presenting the Verifiable Credential (receipt). The Server verifies the receipt and, if valid, grants access to the protected resource.

## Next Steps / Further Exploration

In a production implementation, the Server would likely rely upon a Payment Service as an intermediary between the Server, Client, and Receipt Service. The Payment Service would offer multiple payment methods and currencies, and facilitate the Receipt generation. It would also provide immediate feedback to the Server, allow the Server to satisfy the original Client request without any Client interaction.
