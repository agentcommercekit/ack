# ACK-ID: Agent Identity Demo

**ACK-ID** is a protocol built on W3C Standards designed to bring verifiable, secure, compliant identity, reputation, and service discovery to agents.

This interactive command-line demo showcases the core functionality of ACK-ID by providing a step-by-step walkthrough of:

- **Owner Identity Creation**: Establishing unique, decentralized identifiers (DIDs) for entities (individuals or organizations) that own AI agents.
- **Agent Identity Creation**: Giving AI agents their own DIDs, distinct from but linked to their owners.
- **Verifiable Credential (VC) Issuance**: Creating digitally signed, tamper-proof credentials that prove an agent's ownership by its owner.
- **Agent-to-Agent Interaction with Verification**: Demonstrating how one agent can securely verify another agent's identity and ownership before engaging in an interaction.

## Demo Video

https://github.com/user-attachments/assets/ccb8b934-5092-4de3-8960-93ee160073aa

## Getting started

Before starting, please follow the [Getting Started](../../README.md#getting-started) guide at the root of this monorepo.

This demo requires an OpenAI or Anthropic API key. The demo will ask you for one of these keys, but you can also set them as environment variables in your `<root>/demos/identity/.env` file, using the name `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`.

### Running the demo

You can use the demo by running the following command from the root of this repository:

```sh
pnpm run demo:identity
```

Alternatively, you can run the demo from this directory with:

```sh
pnpm run demo
```

## Overview of the Demo

The interactive CLI will guide you through the following steps:

1. **Agent setup**: The demo creates 2 agents (a Client Agent, and a Server Agent), both controlled by separate "Owners". Each agent and owner have their own public/private keypairs, and present their public keys using Decentralized IDs (DIDs). Each Agent DID has a "controller" field pointing to their Owner.
1. **Ownership proof**: Each "Owner" signs a Verifiable Credential proving that they are in fact the controller of the Agent. This is called a `ControllerCredential`.
1. **Start communicating**: Both the Client Agent and the Server Agent start HTTP servers, listening for inbound triggers (in this case, a chat message). The Client Agent begins chatting with the Server Agent, but the Server Agent refuses to perform any action until it has verified the Client's identity.
1. **DID Exchange**: The server requests the Client identity. The Client sends its DID to the Server (`did:web:...`)
1. **Identity Verification:** The Server performs a full DID lookup. It locates a `serviceEndpoint` in the Client's DID Document to privately request a `ControllerCredential` from the Client. Additionally, it can check that is is only chatting to this client over the preferred Chat endpoint from the DID Document.
1. **Fulfillment**: Once the Server verifies the Client identity, it fulfills the Client Agent's request.

## Learn More

- [Agent Commerce Kit](https://www.agentcommercekit.com) Documentation
- [ACK-ID](https://www.agentcommercekit.com/ack-id) Documentation

## Example DIDs

There are many types of `did` URIs, all of which serve the purpose of presenting public key information. The ACK-ID protocol supports all DID resolution methods.

Our standard libraries include resolution for:

- **`did:web`** - `did:web` IDs point to a Web URL that will contain the DID Document. This document is secured with SSL and domain registration/control. It is the most popular method for our use-case. For example `did:web:catenalabs.com`
- **`did:key`** - `did:key` IDs include the public key in their URI. The DID Document is generated from the DID URI itself, and can not be augmented with additional properties and does not support key rotation. For example `did:key:zQ3shg46zUAVeEV8pwAYtx4oKj3PvM8vAfpUM1bGKmx3Zibrz`
- **`did:pkh`** - `did:pkh` is similar to `did:key`, except it uses a blockchain address instead of a public key in the URI. This is useful for all crypto wallets, which by default have a `did:pkh` URI. Like `did:key`, it does not allow for key rotation, and can not support additional properties. For example `did:pkh:eip155:84532:0xED89740111defE504ebB87354F73eCd7c2124A1c`

There are many more DID methods available, all of which work with ACK-ID. You can see a list of known methods [here](https://w3c.github.io/did-extensions/methods/#did-methods).

### DID Documents

Each of the `did` URIs above will resolve to a "DID Document". This document is a Web Standard way of broadcasting one or many public keys for different purposes.

Here is a minimal `did:key` DID Document:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security#EcdsaSecp256k1VerificationKey2019"
  ],
  "id": "did:key:zQ3shg46zUAVeEV8pwAYtx4oKj3PvM8vAfpUM1bGKmx3Zibrz",
  "verificationMethod": [
    {
      "id": "did:key:zQ3shg46zUAVeEV8pwAYtx4oKj3PvM8vAfpUM1bGKmx3Zibrz#jwk-1",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:key:zQ3shg46zUAVeEV8pwAYtx4oKj3PvM8vAfpUM1bGKmx3Zibrz",
      "publicKeyJwk": {
        "kty": "EC",
        "crv": "secp256k1",
        "x": "FQF5E7ERHtLPRqShdQHoeyCHuODr83nX8MYLgMIyjYM",
        "y": "D7_oq8eqpms7qwC1CUZJ9BzhBrFRtTLLCpme39a67n8"
      }
    }
  ],
  "authentication": [
    "did:key:zQ3shg46zUAVeEV8pwAYtx4oKj3PvM8vAfpUM1bGKmx3Zibrz#jwk-1"
  ],
  "assertionMethod": [
    "did:key:zQ3shg46zUAVeEV8pwAYtx4oKj3PvM8vAfpUM1bGKmx3Zibrz#jwk-1"
  ]
}
```

The ACK-ID protocol suggests additional properties on these documents, asserting **Ownership Chains**, and allowing **Service Discovery**.

Here is a more complete `did:web`-based DID Document with those claims:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security#EcdsaSecp256k1VerificationKey2019"
  ],
  "id": "did:web:agent.example.com",
  "verificationMethod": [
    {
      "id": "did:web:agent.example.com#jwk-1",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:web:agent.example.com",
      "publicKeyJwk": {
        "kty": "EC",
        "crv": "secp256k1",
        "x": "9XnNNAuc_GLLYl6BEr5CJ_bhWRBzEon---ELTxCo51M",
        "y": "l0jv5rBkUx11hDSf4Nx8xSiQOEyRUDbz_YSab2KczP4"
      }
    }
  ],
  "authentication": ["did:web:agent.example.com#jwk-1"],
  "assertionMethod": ["did:web:agent.example.com#jwk-1"],
  "controller": "did:key:zQ3shg46zUAVeEV8pwAYtx4oKj3PvM8vAfpUM1bGKmx3Zibrz",
  "service": [
    {
      "id": "did:web:agent.example.com/v1/messages",
      "type": "MessagingEndpoint",
      "serviceEndpoint": "http://agent.example.com/v1/messages"
    },
    {
      "id": "did:web:agent.example.com/identity",
      "type": "IdentityService",
      "serviceEndpoint": "http://agent.example.com/identity"
    }
  ]
}
```

Note that this document must use a did-resolution method that supports custom attributes. Methods like `did:key` and `did:pkh` are not suitable for this type of document.
