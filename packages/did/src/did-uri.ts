import type { Did } from "web-identity-schemas"
import { isDid } from "web-identity-schemas/valibot"

export type { Did }

/**
 * A DID URI, e.g. `did:web:example.com`.
 *
 * Backed by `web-identity-schemas`' `Did` type, which is structurally a
 * `did:${method}:${identifier}` template literal.
 */
export type DidUri<
  TMethod extends string = string,
  TIdentifier extends string = string,
> = Did<TMethod, TIdentifier>

/**
 * Check if a value is a did uri
 *
 * Delegates to `web-identity-schemas`' `isDid`, which enforces the full DID-core
 * syntax, so the runtime guard and the `didUriSchema` agree on strictness.
 *
 * @param val - The value to check
 * @returns `true` if the value is a did uri, `false` otherwise
 */
export function isDidUri(val: unknown): val is DidUri {
  return isDid(val)
}
