export const keypairAlgorithms = ["secp256k1", "secp256r1", "Ed25519"] as const
export type KeypairAlgorithm = (typeof keypairAlgorithms)[number]

export interface Keypair {
  publicKey: Uint8Array
  privateKey: Uint8Array
  algorithm: KeypairAlgorithm
}

export interface KeypairBase58 {
  publicKey: string
  privateKey: string
  algorithm: KeypairAlgorithm
}
