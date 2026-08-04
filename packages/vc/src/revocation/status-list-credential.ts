import { createCredential } from "../create-credential"
import type { BitstringStatusListCredential } from "./types"

type BitstringStatusListSubject =
  BitstringStatusListCredential["credentialSubject"]

type CreateStatusListCredentialParams = {
  /**
   * The URL of the status list.
   */
  url: string
  /**
   * The encoded list of the status list.
   */
  encodedList: string
  /**
   * The issuer of the status list credential.
   */
  issuer: string
  /**
   * When the status list credential stops being valid.
   *
   * Defaults to 24 hours from now. Every version of a status list stays validly
   * signed after the issuer publishes a later one, so a party that kept an
   * earlier copy can serve it back and clear a revocation that happened after
   * it. An expiry bounds how long that replay works. Issuers must re-sign and
   * republish the list before it lapses.
   *
   * Pass `null` for a list with no expiry. Do this only for a list you cannot
   * re-sign on a schedule, and expect verifiers to bound its age themselves.
   */
  expirationDate?: Date | null
}

const DEFAULT_STATUS_LIST_LIFETIME_MS = 24 * 60 * 60 * 1000

/**
 * Generates a status list credential.
 *
 * @param params - The {@link CreateStatusListCredentialParams} to use
 * @returns A {@link BitstringStatusListCredential}
 */
export function createStatusListCredential({
  url,
  encodedList,
  issuer,
  expirationDate = new Date(Date.now() + DEFAULT_STATUS_LIST_LIFETIME_MS),
}: CreateStatusListCredentialParams): BitstringStatusListCredential {
  const credentialSubject: BitstringStatusListSubject = {
    id: `${url}#list`,
    type: "BitstringStatusList",
    statusPurpose: "revocation",
    encodedList,
  }

  const credential = createCredential({
    id: url,
    type: "BitstringStatusListCredential",
    issuer,
    subject: `${url}#list`,
    attestation: {
      type: "BitstringStatusList",
      statusPurpose: "revocation",
      encodedList,
    },
    expirationDate: expirationDate ?? undefined,
  })

  return { ...credential, credentialSubject }
}
