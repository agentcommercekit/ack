export const keyCurves = ["secp256k1", "secp256r1", "Ed25519"] as const
export type KeyCurve = (typeof keyCurves)[number]

/**
 * The multicodec code identifying each curve's public key.
 *
 * A Multikey value is `multibase(base58-btc, varint(code) ‖ key-bytes)`, so
 * these are what let a reader tell one curve's key from another's. The codes
 * for the two elliptic curves identify the compressed point encoding.
 *
 * @see {@link https://github.com/multiformats/multicodec/blob/master/table.csv}
 */
export const keyCurveMulticodecs = {
  secp256k1: 0xe7, // secp256k1-pub
  secp256r1: 0x1200, // p256-pub
  Ed25519: 0xed, // ed25519-pub
} as const satisfies Record<KeyCurve, number>

export function isKeyCurve(curve: unknown): curve is KeyCurve {
  if (typeof curve !== "string") {
    return false
  }

  const curves: readonly string[] = keyCurves
  return curves.includes(curve)
}
