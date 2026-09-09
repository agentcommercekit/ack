import type { Resolvable } from "@agentcommercekit/did"
import { BitBuffer } from "bit-buffers"

import { isStatusListCredential } from "../revocation/is-status-list-credential"
import type {
  BitstringStatusListCredential,
  Revocable,
} from "../revocation/types"
import type { Verifiable, W3CCredential } from "../types"
import {
  RevocationCheckError,
  UnsupportedCredentialStatusError,
} from "./errors"
import { isVerifiable } from "./is-verifiable"
import { verifyProof } from "./verify-proof"

const DEFAULT_STATUS_LIST_TIMEOUT_MS = 5_000

/**
 * Tolerance for a status list dated ahead of this machine's clock.
 *
 * Matches the skew `did-jwt` allows when it checks `nbf`, so this check is no
 * stricter than the proof verification below it. Without it, an issuer whose
 * clock leads by a second fails every revocation check.
 */
const CLOCK_SKEW_MS = 300_000

/**
 * Cap on the status list response body, applied while the body arrives.
 */
const MAX_STATUS_LIST_BYTES = 5_000_000

/**
 * Default cap on the `encodedList` string, which is gzipped and then base64
 * encoded.
 *
 * `BitBuffer.fromBitstring` inflates with no output limit, so the compressed
 * length is the only bound available on what the decode allocates. This does
 * not make the decode cheap: deflate reaches roughly 1000:1, so 64 KB can still
 * produce tens of megabytes. It bounds the cost, and the list must already
 * carry a valid proof from a trusted issuer to get this far.
 *
 * A sparse list of a few hundred thousand entries compresses to well under
 * this. A large list with many bits set does not, so callers that consume one
 * can raise the cap through `maxEncodedListBytes`.
 */
const DEFAULT_MAX_ENCODED_LIST_BYTES = 64 * 1024

export type RevocationCheckOptions = {
  /**
   * The resolver used to verify the status list credential's proof.
   */
  resolver: Resolvable
  /**
   * The DIDs accepted as issuers of the status list credential. Defaults to the
   * issuer of the credential being checked, which is the only party the
   * credential itself vouches for.
   */
  trustedStatusListIssuers?: string[]
  /**
   * Milliseconds to wait for the status list credential. Defaults to 5000.
   *
   * This bounds the status list fetch only. Verifying the list's proof resolves
   * the issuer's DID, and that resolution carries its own timeout policy.
   */
  statusListTimeoutMs?: number
  /**
   * Cap on the length of the list's `encodedList` string. Defaults to 65536.
   *
   * The decode inflates this string with no output limit, so the cap is the
   * only bound on what it allocates. Raise it to consume a large list with many
   * bits set, which compresses less than a sparse one. A fixed 5 MB cap on the
   * whole response body applies first, so raising this beyond that has no
   * effect.
   */
  maxEncodedListBytes?: number
  /**
   * Reject a status list issued more than this many milliseconds ago.
   *
   * A status list credential stays validly signed after the issuer revokes a
   * credential in a later version of the list. Anyone who kept a copy of the
   * earlier list can serve it back and clear the revocation. An expiry on the
   * list closes that replay, and this option closes it for issuers that publish
   * a list with no expiry. Off by default, because the W3C Bitstring Status
   * List specification does not require an expiry.
   */
  maxStatusListAgeMs?: number
}

/**
 * Message for every failure that leaves the revocation status unknown.
 *
 * The detail goes in the error's `cause`, not its message. `RevocationCheckError`
 * extends `CredentialVerificationError`, and API error handlers return that
 * message to the caller. A message naming the URL and the remote HTTP status
 * turns a verifier into a probe for hosts and ports it can reach.
 */
const UNDETERMINED_STATUS_MESSAGE =
  "Unable to determine credential revocation status"

function undetermined(detail: string, cause?: unknown): RevocationCheckError {
  return new RevocationCheckError(UNDETERMINED_STATUS_MESSAGE, {
    cause,
    detail,
  })
}

/**
 * Normalize an absolute `http(s)` URL, or return `undefined` if the value is
 * not one. Restricting the scheme keeps status list resolution from being
 * pointed at `file:`, `data:` or similar targets.
 */
function toHttpUrl(value: string): string | undefined {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    return undefined
  }

  return url.protocol === "https:" || url.protocol === "http:"
    ? url.href
    : undefined
}

/**
 * Check if a credential carries a status entry this library can evaluate.
 *
 * @param credential - The {@link W3CCredential} to check
 * @returns `true` if the credential has a well-formed `BitstringStatusListEntry`,
 *   `false` otherwise
 */
export function isRevocable<T extends W3CCredential>(
  credential: T,
): credential is Revocable<T> {
  const status = credential.credentialStatus

  return (
    typeof status === "object" &&
    status !== null &&
    status.type === "BitstringStatusListEntry" &&
    "statusPurpose" in status &&
    typeof status.statusPurpose === "string" &&
    "statusListCredential" in status &&
    typeof status.statusListCredential === "string" &&
    "statusListIndex" in status &&
    typeof status.statusListIndex === "string"
  )
}

/**
 * `parseInt` maps non-numeric input to `NaN` and silently accepts trailing
 * garbage; both resolve to an unset bit, i.e. "not revoked". Require the exact
 * non-negative integer string the spec calls for instead.
 */
function parseStatusListIndex(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw undetermined(
      `Invalid statusListIndex: '${value}' is not a non-negative integer`,
    )
  }

  const index = Number(value)

  if (!Number.isSafeInteger(index)) {
    throw undetermined(`statusListIndex out of range: '${value}'`)
  }

  return index
}

/**
 * Read a response body, stopping as soon as it passes `limit` bytes.
 *
 * `response.text()` buffers the whole body first, so a server that streams
 * chunks without a `content-length` can put any amount of data in memory before
 * a size check on the result runs.
 */
async function readBoundedText(
  response: Response,
  limit: number,
): Promise<string | undefined> {
  if (!response.body) {
    return ""
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let text = ""

  try {
    for (;;) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- sequential reads bound the body as it arrives
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      received += value.byteLength

      if (received > limit) {
        return undefined
      }

      text += decoder.decode(value, { stream: true })
    }
  } finally {
    await reader.cancel()
  }

  return text + decoder.decode()
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(url, {
      // The specification serves the status list credential as a verifiable
      // credential media type. A server that enforces content negotiation
      // answers 406 to a request that asks only for `application/json`.
      headers: {
        accept: "application/vc+ld+json, application/ld+json, application/json",
      },
      // The scheme check applies to this URL only. Following a redirect would
      // send the request to a host the check never saw, which is how a status
      // list URL becomes a probe for internal addresses. The status list
      // credential must be served at the URL the credential names anyway: its
      // `id` has to match that URL to pass the binding check below.
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw undetermined(
      `Could not fetch status list credential from '${url}'`,
      error,
    )
  }

  if (!response.ok) {
    throw undetermined(
      `Fetching status list credential from '${url}' returned HTTP ${response.status}`,
    )
  }

  const declaredLength = Number(response.headers.get("content-length"))

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_STATUS_LIST_BYTES
  ) {
    throw undetermined(
      `Status list credential from '${url}' declares ${declaredLength} bytes, over the ${MAX_STATUS_LIST_BYTES} byte limit`,
    )
  }

  let body: string | undefined

  try {
    body = await readBoundedText(response, MAX_STATUS_LIST_BYTES)
  } catch (error) {
    throw undetermined(
      `Could not read status list credential from '${url}'`,
      error,
    )
  }

  if (body === undefined) {
    throw undetermined(
      `Status list credential from '${url}' is over the ${MAX_STATUS_LIST_BYTES} byte limit`,
    )
  }

  try {
    return JSON.parse(body) as unknown
  } catch (error) {
    throw undetermined(
      `Status list credential from '${url}' is not valid JSON`,
      error,
    )
  }
}

async function verifyStatusListProof(
  proof: Verifiable<W3CCredential>["proof"],
  resolver: Resolvable,
  url: string,
): Promise<Verifiable<W3CCredential>> {
  try {
    return await verifyProof(proof, resolver)
  } catch (error) {
    throw undetermined(
      `Status list credential from '${url}' has an invalid proof`,
      error,
    )
  }
}

/**
 * Reject a status list that was issued too long ago.
 *
 * The issuer signs a new version of the list every time it revokes something.
 * Every earlier version stays validly signed, so a party that kept one can
 * serve it back and clear a revocation that happened after it. An expiry on the
 * list closes this; an age bound closes it for issuers that publish no expiry.
 */
function assertStatusListIsFresh(
  credential: BitstringStatusListCredential,
  url: string,
  maxAgeMs: number | undefined,
): void {
  const issuedAt = Date.parse(credential.issuanceDate)

  if (Number.isNaN(issuedAt)) {
    throw undetermined(
      `Status list credential from '${url}' has an unreadable issuanceDate`,
    )
  }

  const ageMs = Date.now() - issuedAt

  // Reject a future `issuanceDate` whether or not a maximum age is set. A
  // pre-dated list is not evidence of the current status, and a negative age
  // would pass the limit below however low the caller sets it. Allow the same
  // clock skew the proof verification allows, so an issuer whose clock leads
  // slightly does not fail every check.
  if (ageMs < -CLOCK_SKEW_MS) {
    throw undetermined(
      `Status list credential from '${url}' is dated ${-ageMs}ms in the future`,
    )
  }

  if (maxAgeMs === undefined) {
    return
  }

  if (ageMs > maxAgeMs) {
    throw undetermined(
      `Status list credential from '${url}' is ${ageMs}ms old, over the ${maxAgeMs}ms limit`,
    )
  }
}

/**
 * Fetch the status list credential a status entry points at, and establish that
 * it is the list that entry refers to: signed, by a trusted issuer, bound to
 * the same URL, and unexpired.
 */
async function resolveStatusListCredential(
  statusListUrl: string,
  {
    resolver,
    trustedIssuers,
    timeoutMs,
    maxAgeMs,
  }: {
    resolver: Resolvable
    trustedIssuers: string[]
    timeoutMs: number
    maxAgeMs?: number
  },
): Promise<BitstringStatusListCredential> {
  const url = toHttpUrl(statusListUrl)

  if (!url) {
    throw undetermined(
      `Status list credential URL is not an absolute http(s) URL: '${statusListUrl}'`,
    )
  }

  const body = await fetchJson(url, timeoutMs)

  if (!isStatusListCredential(body) || !isVerifiable(body)) {
    throw undetermined(
      `'${url}' did not return a signed BitstringStatusListCredential`,
    )
  }

  // Only the proof is authoritative. The fetched body is attacker-controlled
  // wherever the transport or the host is, so every check below reads the
  // credential decoded from the verified proof, never the fetched object.
  const verified = await verifyStatusListProof(body.proof, resolver, url)

  // `isStatusListCredential` only inspects the subject, so check the credential
  // type too. Otherwise anything the trusted issuer signed with a subject that
  // happens to carry these fields passes as a status list.
  if (
    !isStatusListCredential(verified) ||
    !verified.type.includes("BitstringStatusListCredential")
  ) {
    throw undetermined(
      `Status list credential from '${url}' is not a BitstringStatusListCredential`,
    )
  }

  if (!trustedIssuers.includes(verified.issuer.id)) {
    throw undetermined(
      `Status list credential from '${url}' was issued by '${verified.issuer.id}', which is not a trusted status list issuer`,
    )
  }

  // Bind the list to the URL the credential pointed at. Without this, any list
  // the issuer has ever signed — an empty one, say — could be served in place
  // of the one that actually carries this credential's bit.
  if (verified.id === undefined || toHttpUrl(verified.id) !== url) {
    throw undetermined(
      `Status list credential from '${url}' declares a different id: '${verified.id ?? ""}'`,
    )
  }

  // Check the expiry directly rather than through `isExpired`: this path
  // must throw `undetermined()` with a URL-specific message (isExpired only
  // returns a boolean), and must reject a list that expires at exactly `now`
  // (`<=`), whereas isExpired's own bound is strict (`<`). The expiry is the
  // main bound on status list replay, so a malformed one must not quietly
  // remove it.
  if (verified.expirationDate !== undefined) {
    const expiresAt = Date.parse(verified.expirationDate)

    if (Number.isNaN(expiresAt)) {
      throw undetermined(
        `Status list credential from '${url}' has an unreadable expirationDate`,
      )
    }

    if (expiresAt <= Date.now()) {
      throw undetermined(`Status list credential from '${url}' is expired`)
    }
  }

  assertStatusListIsFresh(verified, url, maxAgeMs)

  return verified
}

/**
 * Check if a credential has been revoked.
 *
 * Fails closed: any status that cannot be established — an unreachable,
 * malformed, unsigned, wrongly-issued or too-short status list, or a
 * `credentialStatus` this library does not implement — throws rather than
 * returning `false`. "We could not check" is not "not revoked".
 *
 * @param credential - The {@link W3CCredential} to check. Callers must pass a
 *   credential decoded from a verified proof: a `credentialStatus` on an
 *   unverified object is attacker-controlled.
 * @param options - The {@link RevocationCheckOptions} to use
 * @returns `true` if the credential is revoked, `false` if it is verifiably not
 * @throws {RevocationCheckError} if the revocation status cannot be determined
 * @throws {UnsupportedCredentialStatusError} if the status cannot be evaluated
 */
export async function isRevoked(
  credential: W3CCredential,
  options: RevocationCheckOptions,
): Promise<boolean> {
  const status = credential.credentialStatus

  if (status === undefined || status === null) {
    return false
  }

  if (!isRevocable(credential)) {
    throw new UnsupportedCredentialStatusError(undefined, {
      detail: `Cannot evaluate credentialStatus of type '${status.type}'`,
    })
  }

  const { statusPurpose, statusListIndex, statusListCredential } =
    credential.credentialStatus

  if (statusPurpose !== "revocation") {
    throw new UnsupportedCredentialStatusError(undefined, {
      detail: `Cannot evaluate credentialStatus with statusPurpose '${statusPurpose}'`,
    })
  }

  const index = parseStatusListIndex(statusListIndex)

  const statusList = await resolveStatusListCredential(statusListCredential, {
    resolver: options.resolver,
    trustedIssuers: options.trustedStatusListIssuers ?? [credential.issuer.id],
    timeoutMs: options.statusListTimeoutMs ?? DEFAULT_STATUS_LIST_TIMEOUT_MS,
    maxAgeMs: options.maxStatusListAgeMs,
  })

  if (statusList.credentialSubject.statusPurpose !== statusPurpose) {
    throw undetermined(
      `Status list at '${statusListCredential}' tracks '${statusList.credentialSubject.statusPurpose}', not '${statusPurpose}'`,
    )
  }

  // A list that packs several bits per entry puts them at
  // `statusListIndex * statusSize`. Reading bit `index` on such a list reads
  // some other credential's status, so reject what this code cannot decode.
  const { statusSize } = statusList.credentialSubject

  if (statusSize !== undefined && statusSize !== 1) {
    throw undetermined(
      `Status list at '${statusListCredential}' uses statusSize ${statusSize}, which this version cannot read`,
    )
  }

  const { encodedList } = statusList.credentialSubject
  const maxEncodedListBytes =
    options.maxEncodedListBytes ?? DEFAULT_MAX_ENCODED_LIST_BYTES

  // `encodedList` inflates to a much larger buffer, so bound it before decoding.
  if (encodedList.length > maxEncodedListBytes) {
    throw undetermined(
      `Status list at '${statusListCredential}' has an encodedList over the ${maxEncodedListBytes} byte limit`,
    )
  }

  let bits: BitBuffer

  try {
    bits = BitBuffer.fromBitstring(encodedList)
  } catch (error) {
    throw undetermined(
      `Status list at '${statusListCredential}' has an unreadable encodedList`,
      error,
    )
  }

  // An index past the end of the list is not evidence of anything: the list
  // simply does not cover this credential.
  if (index >= bits.length) {
    throw undetermined(
      `statusListIndex ${index} is outside the status list at '${statusListCredential}', which holds ${bits.length} entries`,
    )
  }

  return bits.test(index)
}
