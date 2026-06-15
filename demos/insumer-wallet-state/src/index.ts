// Demo: an ACK-Pay-style service gate backed by an InsumerAPI wallet-state
// attestation.
//
// ACK-Pay grants access on proof a payment cleared (a receipt). Its reference
// server never checks the PAYER's wallet first. This adds the missing step:
// before granting access, require a signed, live wallet-state condition.
//
//   With a key:  INSUMER_API_KEY=insr_live_... pnpm demo   (mints fresh, goes green)
//   Without:     pnpm demo                                 (verifies the bundled sample)

import { readFile } from "node:fs/promises"
import { colors, errorMessage, log, logJson, successMessage } from "@repo/cli-tools"

import {
  INSUMER_ISSUER_DID,
  convertInsumerAttestationToVerifiableCredential,
  verifyInsumerAttestationAsAckId,
} from "./insumer-ack-id"

const API = "https://api.insumermodel.com"

/** Get an attestation JWT — mint live with INSUMER_API_KEY, else load the bundled sample. */
async function getAttestationJwt(): Promise<string> {
  const key = process.env.INSUMER_API_KEY
  if (key) {
    const res = await fetch(`${API}/v1/attest`, {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        conditions: [
          { type: "token_balance", chainId: 8453, contractAddress: "native", threshold: "0.0001" },
        ],
        format: "jwt",
      }),
    })
    const json = await res.json()
    if (!json.ok) throw new Error(JSON.stringify(json.error))
    log("• Minted a fresh attestation with your key (1 credit).")
    return json.data.jwt
  }
  const sample = JSON.parse(
    await readFile(new URL("../sample-attestation.json", import.meta.url), "utf8"),
  )
  log("• No INSUMER_API_KEY set — verifying the bundled sample attestation.")
  log(colors.dim("  Get a free key: POST https://api.insumermodel.com/v1/keys/create"))
  return sample.jwt
}

/** Run the ACK-ID gate against an InsumerAPI wallet-state attestation. */
async function main() {
  log("🔐 InsumerAPI wallet-state attestation → ACK-ID gate\n")
  log(`This gate checks the PAYER's live on-chain wallet state before access —
the step ACK-Pay's payment-receipt check leaves open.\n`)

  const token = await getAttestationJwt()

  // trustedIssuers is the service's allowlist — exactly ACK's model.
  const trustedIssuers = [INSUMER_ISSUER_DID]
  const result = await verifyInsumerAttestationAsAckId(token, trustedIssuers)

  log(colors.dim("\nVerification used ONLY the public JWKS — no API key, no secret.\n"))
  log(JSON.stringify(result, null, 2))

  if (result.granted) {
    log(successMessage("\nAccess granted — wallet satisfies the signed, live condition."))
    const vc = await convertInsumerAttestationToVerifiableCredential(token)
    log("\nSame attestation, as an ACK-compatible W3C Verifiable Credential:")
    logJson(vc)
  } else if (result.reason?.toLowerCase().includes("expir")) {
    log(errorMessage("\nSample expired — attestations are valid 30 min by design."))
    log(colors.dim("Set INSUMER_API_KEY and re-run to mint a live one (goes green)."))
  } else {
    log(errorMessage(`\nAccess denied — ${result.reason ?? "condition not met"}.`))
  }
}

main().catch((e: unknown) => {
  log(errorMessage((e as Error).message))
  process.exit(1)
})
