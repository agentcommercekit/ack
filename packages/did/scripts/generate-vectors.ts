import { generateKeypair } from "@agentcommercekit/keys"
import { hexStringToBytes, bytesToHexString } from "@agentcommercekit/keys/encoding"
import { createDidKeyUri } from "../src/methods/did-key.ts"

async function main() {
  const privHex = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"
  const privBytes = hexStringToBytes(privHex)

  const ed = await generateKeypair("Ed25519", privBytes)
  const edDid = createDidKeyUri(ed)
  console.log("Ed25519 did:key:", edDid)
  console.log("Ed25519 pubkey:", bytesToHexString(ed.publicKey))

  const secp = await generateKeypair("secp256k1", privBytes)
  const secpDid = createDidKeyUri(secp)
  console.log("secp256k1 did:key:", secpDid)

  const { getPublicKeyBytes } = await import("@agentcommercekit/keys/secp256k1")
  const compressed = getPublicKeyBytes(privBytes, true)
  console.log("secp256k1 pubkey (compressed):", bytesToHexString(compressed))
}
main()
