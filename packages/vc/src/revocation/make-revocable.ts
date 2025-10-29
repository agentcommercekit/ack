import type { W3CCredential } from "../types"
import type { Revocable } from "./types"

type RevocationOptions = {
  /**
   * The ID of the status list entry.
   */
  id: string
  /**
   * The index of the status list entry.
   */
  statusListIndex: number
  /**
   * The URL of the status list.
   */
  statusListUrl: string
}

/**
 * Makes a credential revocable by adding a status list entry to it.
 *
 * @param credential - The credential to make revocable.
 * @param options - The {@link RevocationOptions} to use
 * @returns A {@link Revocable<T>} credential
 */
export function makeRevocable<T extends W3CCredential>(
  credential: T,
  { id, statusListIndex, statusListUrl }: RevocationOptions,
): Revocable<T> {
  return {
    ...credential,
    credentialStatus: {
      id,
      type: "BitstringStatusListEntry",
      statusPurpose: "revocation",
      statusListIndex: statusListIndex.toString(),
      statusListCredential: statusListUrl,
    },
  }
}
