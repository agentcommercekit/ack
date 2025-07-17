import { createCredential } from "../create-credential"
import type { BitstringStatusListCredential } from "./types"

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
  issuer
}: CreateStatusListCredentialParams): BitstringStatusListCredential {
  return createCredential({
    id: url,
    type: "BitstringStatusListCredential",
    issuer,
    subject: `${url}#list`,
    attestation: {
      type: "BitstringStatusList",
      statusPurpose: "revocation",
      encodedList
    }
  })
}
