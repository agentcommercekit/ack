export const keyCurves = ["secp256k1", "secp256r1", "Ed25519"] as const
export type KeyCurve = (typeof keyCurves)[number]

export function isKeyCurve(curve: unknown): curve is KeyCurve {
  if (typeof curve !== "string") {
    return false
  }

  return keyCurves.includes(curve as KeyCurve)
}
