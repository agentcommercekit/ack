import type { W3CCredential } from "./types"

type CreateCredentialParams<T extends W3CCredential> = {
  /**
   * The ID of the credential.
   */
  id?: string
  /**
   * The type of the credential, in addition to "VerifiableCredential".
   */
  type?: string | string[]
  /**
   * The issuer of the credential.
   */
  issuer: string
  /**
   * The subject of the credential.
   */
  subject: string
  /**
   * The attestation of the credential.
   */
  attestation?: Omit<T["credentialSubject"], "id">
  /**
   * The issuance date of the credential.
   */
  issuanceDate?: Date
  /**
   * The expiration date of the credential.
   */
  expirationDate?: Date
}

/**
 * Creates a new, unsigned Verifiable Credential.
 *
 * @param params - The {@link CreateCredentialParams} to build the credential from
 * @returns A new, unsigned {@link W3CCredential}
 */
export function createCredential<T extends W3CCredential>({
  id,
  type,
  issuer,
  subject,
  attestation,
  issuanceDate,
  expirationDate,
}: CreateCredentialParams<T>): T {
  const credentialTypes = [type]
    .flat()
    .filter((t): t is string => !!t && t !== "VerifiableCredential")

  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", ...credentialTypes],
    id,
    issuer: { id: issuer },
    credentialSubject: { id: subject, ...attestation },
    issuanceDate: (issuanceDate ?? new Date()).toISOString(),
    expirationDate: expirationDate?.toISOString(),
  } as T
}
