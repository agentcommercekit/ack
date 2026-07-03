/**
 * End-to-end workflow eval for MCP tools.
 *
 * Simulates what an AI agent would do: generate a keypair, create
 * credentials, sign them, verify them, issue a payment request,
 * verify it, create a receipt, and verify the receipt. If any step
 * produces invalid output, the whole workflow fails.
 */
import {
  createControllerCredential,
  createDidKeyUri,
  createDidPkhUri,
  createDidWebUri,
  createJwt,
  createJwtSigner,
  createPaymentReceipt,
  createSignedPaymentRequest,
  generateKeypair,
  getControllerClaimVerifier,
  getDidResolver,
  keypairToJwk,
  parseJwtCredential,
  signCredential,
  verifyJwt,
  verifyParsedCredential,
  verifyPaymentRequestToken,
  verifyPaymentReceipt,
  type DidUri,
  type JwtString,
  type PaymentRequestInit,
} from "agentcommercekit"
import { describe, expect, it } from "vitest"

import { curveToAlg } from "../util"

const resolver = getDidResolver()

describe("full agent workflow", () => {
  it("creates and verifies an identity + payment cycle end-to-end", async () => {
    // 1. Generate keypairs for owner and agent
    const ownerKeypair = await generateKeypair("secp256k1")
    const agentKeypair = await generateKeypair("secp256k1")
    const ownerDid = createDidKeyUri(ownerKeypair)
    const agentDid = createDidKeyUri(agentKeypair)

    // Verify JWK round-trip works (this is how MCP tools pass keys)
    const ownerJwk = keypairToJwk(ownerKeypair)
    expect(ownerJwk.crv).toBe("secp256k1")

    // 2. Owner creates a controller credential for the agent
    const credential = createControllerCredential({
      subject: agentDid,
      controller: ownerDid,
    })

    expect(credential.type).toContain("ControllerCredential")
    expect(credential.credentialSubject.id).toBe(agentDid)

    // 3. Owner signs the credential
    const signedCredential = await signCredential(credential, {
      did: ownerDid,
      signer: createJwtSigner(ownerKeypair),
      alg: curveToAlg(ownerKeypair.curve),
    })

    expect(signedCredential).toMatch(/^eyJ/)

    // 4. Anyone can verify the signed credential (signature + expiry)
    // Note: controller claim verification requires did:web (not did:key)
    // — see the "rejects a forged controller claim" test for that path
    const parsed = await parseJwtCredential(signedCredential, resolver)
    await verifyParsedCredential(parsed, { resolver })

    expect(parsed.issuer).toEqual({ id: ownerDid })
    expect(parsed.credentialSubject.controller).toBe(ownerDid)

    // 5. Agent creates a payment request
    const paymentInit: PaymentRequestInit = {
      id: crypto.randomUUID(),
      description: "API access fee",
      paymentOptions: [
        {
          id: "option-eth",
          amount: "0.001",
          decimals: 18,
          currency: "ETH",
          recipient: "0x1234567890abcdef1234567890abcdef12345678",
          network: "eip155:11155111",
        },
      ],
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    }

    const { paymentRequest, paymentRequestToken } =
      await createSignedPaymentRequest(paymentInit, {
        issuer: agentDid,
        signer: createJwtSigner(agentKeypair),
        algorithm: curveToAlg(agentKeypair.curve),
      })

    expect(paymentRequest.id).toBe(paymentInit.id)
    expect(paymentRequestToken).toMatch(/^eyJ/)

    // 6. Verify the payment request token
    const { paymentRequest: verifiedRequest } = await verifyPaymentRequestToken(
      paymentRequestToken,
      { resolver },
    )

    expect(verifiedRequest.id).toBe(paymentInit.id)
    expect(verifiedRequest.paymentOptions[0]!.currency).toBe("ETH")

    // 7. After payment, agent issues a receipt
    const receipt = createPaymentReceipt({
      paymentRequestToken,
      paymentOptionId: "option-eth",
      issuer: agentDid,
      payerDid: ownerDid,
      metadata: { txHash: "0xabc123" },
    })

    expect(receipt.type).toContain("PaymentReceiptCredential")

    // 8. Sign and verify the receipt
    const signedReceipt = await signCredential(receipt, {
      did: agentDid,
      signer: createJwtSigner(agentKeypair),
      alg: curveToAlg(agentKeypair.curve),
    })

    const { receipt: verifiedReceipt } = await verifyPaymentReceipt(
      signedReceipt,
      { resolver },
    )

    expect(verifiedReceipt.issuer).toEqual({ id: agentDid })
  })

  it("throws for a credential signed by the wrong key", async () => {
    const ownerKeypair = await generateKeypair("secp256k1")
    const attackerKeypair = await generateKeypair("secp256k1")
    const ownerDid = createDidKeyUri(ownerKeypair)
    const agentDid = createDidKeyUri(await generateKeypair("secp256k1"))

    const credential = createControllerCredential({
      subject: agentDid,
      controller: ownerDid,
    })

    // Attacker signs with their own key but claims to be the owner.
    // The DID resolver will find the owner's public key, which won't
    // match the attacker's signature — rejection happens at parse time.
    const signedByAttacker = await signCredential(credential, {
      did: ownerDid,
      signer: createJwtSigner(attackerKeypair),
      alg: "ES256K",
    })

    await expect(
      parseJwtCredential(signedByAttacker as JwtString, resolver),
    ).rejects.toThrow()
  })

  it("rejects a controller credential with a forged controller claim", async () => {
    const realOwnerKeypair = await generateKeypair("secp256k1")
    const attackerKeypair = await generateKeypair("secp256k1")
    const realOwnerDid = createDidKeyUri(realOwnerKeypair)
    const attackerDid = createDidKeyUri(attackerKeypair)
    const agentDid = createDidKeyUri(await generateKeypair("secp256k1"))

    // Attacker creates a credential claiming agent is controlled by realOwner
    // but signs with their own key (using their own DID as issuer)
    const credential = createControllerCredential({
      subject: agentDid,
      controller: realOwnerDid,
      issuer: attackerDid,
    })

    const signedByAttacker = await signCredential(credential, {
      did: attackerDid,
      signer: createJwtSigner(attackerKeypair),
      alg: "ES256K",
    })

    // Without controller claim verifier, this would pass (just checks signature)
    // With it, it should fail because the issuer isn't authorized
    const parsed = await parseJwtCredential(
      signedByAttacker as JwtString,
      resolver,
    )
    await expect(
      verifyParsedCredential(parsed, {
        resolver,
        verifiers: [getControllerClaimVerifier()],
        trustedIssuers: [realOwnerDid],
      }),
    ).rejects.toThrow()
  })

  it("creates did:web and did:pkh URIs", () => {
    const webDid = createDidWebUri("https://example.com")
    expect(webDid).toBe("did:web:example.com")

    const webDidWithPath = createDidWebUri("https://example.com/agents/1")
    expect(webDidWithPath).toMatch(/^did:web:/)

    const pkhDid = createDidPkhUri(
      "eip155:1",
      "0x1234567890abcdef1234567890abcdef12345678",
    )
    expect(pkhDid).toMatch(/^did:pkh:eip155:1:/)
  })

  it("creates and verifies a raw JWT for challenge-response", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)
    const audience = "did:web:verifier.example.com"

    const jwt = await createJwt(
      { challenge: "nonce-abc123", aud: audience },
      { issuer: did, signer: createJwtSigner(keypair) },
      { alg: curveToAlg(keypair.curve) },
    )

    expect(jwt).toMatch(/^eyJ/)

    const result = await verifyJwt(jwt, { resolver, issuer: did, audience })
    expect(result.payload.challenge).toBe("nonce-abc123")
    expect(result.issuer).toBe(did)
  })

  it("throws for a payment request from an untrusted issuer", async () => {
    const keypair = await generateKeypair("secp256k1")
    const did = createDidKeyUri(keypair)

    const { paymentRequestToken } = await createSignedPaymentRequest(
      {
        id: crypto.randomUUID(),
        paymentOptions: [
          {
            id: "opt-1",
            amount: 100,
            decimals: 6,
            currency: "USDC",
            recipient: "0xrecipient",
          },
        ],
      },
      {
        issuer: did,
        signer: createJwtSigner(keypair),
        algorithm: "ES256K",
      },
    )

    // Valid token, but issuer doesn't match expected
    await expect(
      verifyPaymentRequestToken(paymentRequestToken, {
        resolver,
        issuer: "did:key:z6MkWrongIssuer",
      }),
    ).rejects.toThrow()
  })
})
