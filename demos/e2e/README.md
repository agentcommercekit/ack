# ACK End-to-End Demo

This demo runs through the entire set of Agent Commerce Kit (ACK) protocols, showcasing how they can work seamlessly together to provide trusted, verifiable transactions between agents.

This demo uses both ACK-ID and ACK-Pay to enable two agents to establish a secure connection, establish paywalls, and pay for access, while enabling identity exchange for compliant transactions.

## Getting started

Before starting, please follow the [Getting Started](../../README.md#getting-started) guide at the root of this monorepo.

## Running the demo

You can use the demo by running the following command from the root of this repository:

```sh
pnpm run demo:e2e
```

Alternatively, you can run the demo from this directory with:

```sh
pnpm run demo
```

## Overview of the demo

The interactive CLI will guide you through the following steps:

1. Creation of Client and Server Agents and their identities.
1. Establishing proof of ownership between Users and the Agents they control.
1. Agent to Agent communication, interrupted with a paywall.
1. Payment Execution: The Client Agent makes an on-chain (simulated) payment.
1. Receipt Issuance: A Receipt Issuer provides a Receipt for the payment.
1. Resuming Interaction with Receipt: The Agent retries the request, now including the payment receipt.
1. Receipt Verification & Service Delivery: The Server Agent verifies the receipt and provides the service.

## Learn More

- [Agent Commerce Kit](https://www.agentcommercekit.com) Documentation
- [ACK-ID](https://www.agentcommercekit.com/ack-id) Documentation
- [ACK-Pay](https://www.agentcommercekit.com/ack-pay) Documentation
