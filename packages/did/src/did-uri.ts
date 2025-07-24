export type DidUri<
  TMethod extends string = string,
  TIdentifier extends string = string
> = `did:${TMethod}:${TIdentifier}`

/**
 * Check if a value is a did uri
 *
 * @param val - The value to check
 * @returns `true` if the value is a did uri, `false` otherwise
 */
export function isDidUri(val: unknown): val is DidUri {
  return (
    typeof val === "string" &&
    val.startsWith("did:") &&
    val.split(":").length >= 3
  )
}
