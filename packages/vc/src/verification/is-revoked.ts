import { BitBuffer } from "bit-buffers"
import { isStatusListCredential } from "../revocation/is-status-list-credential"
import type {
  BitstringStatusListCredential,
  Revocable
} from "../revocation/types"
import type { W3CCredential } from "../types"

/**
 * Check if a credential is revocable
 *
 * @param credential - The {@link W3CCredential} to check
 * @returns `true` if the credential is revocable, `false` otherwise
 */
export function isRevocable<T extends W3CCredential>(
  credential: T
): credential is Revocable<T> {
  return (
    credential.credentialStatus !== undefined &&
    "statusListCredential" in credential.credentialStatus &&
    "statusListIndex" in credential.credentialStatus
  )
}

async function fetchStatusList(
  credential: Revocable<W3CCredential>
): Promise<BitstringStatusListCredential | undefined> {
  const statusListUrl = credential.credentialStatus.statusListCredential

  try {
    const statusListResponse = await fetch(statusListUrl)
    const statusListJson = (await statusListResponse.json()) as unknown

    if (!isStatusListCredential(statusListJson)) {
      return undefined
    }

    return statusListJson
  } catch {
    return undefined
  }
}

/**
 * Check if a credential is revoked
 *
 * @param credential - The {@link W3CCredential} to check
 * @returns `true` if the credential is revoked, `false` otherwise
 */
export async function isRevoked(credential: W3CCredential): Promise<boolean> {
  if (!isRevocable(credential)) {
    return false
  }

  const statusListVc = await fetchStatusList(credential)

  // Cannot verify if status list is not found
  if (!statusListVc) {
    return false
  }

  const statusList = BitBuffer.fromBitstring(
    statusListVc.credentialSubject.encodedList
  )

  const index = parseInt(credential.credentialStatus.statusListIndex, 10)

  return statusList.test(index)
}
