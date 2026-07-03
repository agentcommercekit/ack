# Agent Commerce Kit Demos

In this directory you'll find several Demos walking you through different parts of the Agent Commerce Kit.

We recommend running the demos from the root of the project with the command below, but each demo can also be run directly from its project directory with `pnpm run demo`.

## Demos

### Identity demo

An example of server and client agents identifying each other using ACK-ID.

```sh
pnpm demo:identity
```

[View the code](./identity)

### Payments demo

An example of a server requiring and verifying payment, using ACK-Pay.

```sh
pnpm demo:payments
```

[View the code](./payments)

### End-to-End demo

A combined demo showcasing ACK-ID and ACK-Pay together.

```sh
pnpm demo:e2e
```

[View the code](./e2e)

### Identity A2A demo

An example of two A2A-compatible agents using ACK-ID to verify each other's identity, built on Google's A2A (Agent2Agent) protocol.

```sh
pnpm demo:identity-a2a
```

[View the code](./identity-a2a)

### Skyfire KYA demo

A demo showing how Skyfire KYA (Know Your Agent) tokens can work on top of ACK-ID's identity infrastructure.

```sh
pnpm demo:skyfire-kya
```

[View the code](./skyfire-kya)

## Note

These demos are designed as interactive walkthroughs of various ACK flows. The source code is designed with this in mind, and may not be suitable for production environments.
