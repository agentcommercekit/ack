# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agent Commerce Kit (ACK)** is an open-source TypeScript framework enabling AI agents to participate in commerce through two core protocols:

1. **ACK-ID**: Verifiable AI identities with compliance controls using W3C DIDs and Verifiable Credentials
2. **ACK-Pay**: Secure, automated payment processing with auditable receipt verification

The project is structured as a **pnpm monorepo** with Turbo build orchestration, requiring Node.js 22+ and pnpm 10+.

## Essential Commands

### Setup & Development

```bash
pnpm run setup          # Initialize repository (install deps, build packages)
pnpm run build          # Build all packages
pnpm run dev:examples   # Run all example services
pnpm run dev:docs       # Run documentation site locally
```

### Quality Assurance

```bash
pnpm run check          # Run comprehensive checks (format, types, lint, test)
pnpm run test           # Run all tests
pnpm run lint           # Run ESLint
pnpm run check:types    # TypeScript type checking
pnpm run format         # Format code with Prettier
```

### Demos

```bash
pnpm demo:identity      # ACK-ID protocol demonstration
pnpm demo:identity-a2a  # ACK-ID with Google A2A protocol
pnpm demo:payments      # ACK-Pay protocol demonstration
pnpm demo:e2e           # End-to-end demo (ACK-ID + ACK-Pay)
pnpm demo:skyfire-kya   # Skyfire KYA token demonstration
```

### Testing

- Run individual package tests: `pnpm --filter ./packages/[package-name] test`
- All tests use **Vitest** framework and use assertive testing (`it('requires...')`, not `it('should require...')`)
- Test configuration: individual `vitest.config.ts` files per package

## Architecture

### Core Packages (`/packages/` - Published to NPM)

- **`agentcommercekit/`** - Main SDK package (exports everything)
- **`ack-id/`** - Identity protocol implementation
- **`ack-pay/`** - Payment protocol implementation
- **`did/`** - Decentralized Identifier utilities
- **`jwt/`** - JWT creation/verification utilities
- **`keys/`** - Cryptographic key management (Ed25519, secp256k1, secp256r1)
- **`vc/`** - Verifiable Credentials utilities

### Demonstrations (`/demos/`)

Interactive demos showcasing protocol functionality - each can be run independently.

### Example Services (`/examples/`)

Standalone service implementations including credential issuer, verifier, and local DID host.

### Build System

- **Turbo**: Orchestrates builds across packages with dependency graph
- **tsdown**: TypeScript compiler/bundler
- **Output**: `dist/` directories with ESM and TypeScript definitions
- **Dependency Management**: Packages have proper dependency relationships

### Key Technical Patterns

- **ESM-only**: All packages use `"type": "module"`
- **Multi-curve Cryptography**: Ed25519, secp256k1, secp256r1 support
- **Dual Validation**: Both Valibot (primary) and Zod (peer dependency) support
- **Standards Compliance**: W3C DIDs and Verifiable Credentials
- **Modular Design**: Protocols can be used independently

### Development Workflow

1. Changes to core packages require rebuilding: `pnpm run build`
2. Use `pnpm --filter ./packages/[name]` to work on specific packages
3. Run comprehensive checks before commits: `pnpm run check`
4. Demos and examples depend on built packages

### Key Dependencies

- **@noble/curves**: Elliptic curve cryptography
- **multiformats**: Multiformat encoding/decoding
- **valibot**: Runtime validation (primary choice)
- **zod**: Alternative validation (peer dependency)
