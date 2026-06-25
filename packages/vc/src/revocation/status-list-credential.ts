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
}

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
  })

  return { ...credential, credentialSubject }
}
