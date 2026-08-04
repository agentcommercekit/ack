import type { Verifiable, W3CCredential } from "../types"

/**
 * Check if a credential carries a proof object that can be verified.
 *
 * This is a shape check only — it says nothing about the proof being valid.
 * Use {@link verifyProof} to establish that, and read the credential it returns
 * rather than the object passed in here.
 *
 * @param credential - The {@link W3CCredential} to check
 * @returns `true` if the credential carries a typed proof, `false` otherwise
 */
export function isVerifiable(
  credential: W3CCredential,
): credential is Verifiable<W3CCredential> {
  return (
    "proof" in credential &&
    credential.proof !== null &&
    typeof credential.proof === "object" &&
    "type" in credential.proof
  )
}
