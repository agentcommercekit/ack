# local-did-host

A simple [Hono](https://hono.dev) server for serving `did:web` documents locally. Useful for local development.

## How it works

When someone attempts to resolve a `did:web` document, the resolver fetches `.well-known/did.json` from the referenced host. As an example, attempting to resolve `did:web:example.com` would attempt to fetch `https://example.com/.well-known/did.json`. Similarly, `did:web` supports subpaths on a domain, so `did:web:example.com:special` would resolve to `https://example.com/special/.well-known/did.json`.

This example is a basic [Hono](https://hono.dev) server with dynamic `.well-known/did.json` routes, served at subpaths, by default on the host `0.0.0.0:3458`. There are 2 identities, `agent` and `controller`, served from the subpaths `/agent/.well-known/did.json` and `/controller/.well-known/did.json`, respectively.

Per the `did:web` spec, the `did.json` file is a full DID Document. By its nature, the document does not change often, and should typically be served as a static file from the server. In this example, we are building the DID Document dynamically per-request, which is not suitable for production environments.

## Getting Started

Generate private keys for each identity:

```sh
pnpm run setup
```

## Running the server

```sh
pnpm run dev
```

The server will be available at <http://0.0.0.0:3458>

## Included Identities

By default, the following identities are included.

| Entity       | DID URI                           | Resolved URL                                          |
| ------------ | --------------------------------- | ----------------------------------------------------- |
| `agent`      | did:web:0.0.0.0%3A3458:agent      | <http://0.0.0.0:3458/agent/.well-known/did.json>      |
| `controller` | did:web:0.0.0.0%3A3458:controller | <http://0.0.0.0:3458/controller/.well-known/did.json> |

## References

- The `did-web` spec: <https://w3c-ccg.github.io/did-method-web/>

## License (MIT)

Copyright (c) 2025 [Catena Labs, Inc](https://catenalabs.com).
