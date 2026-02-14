import { defineConfig } from "tsdown/config"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/encoding/index.ts",
    "src/curves/ed25519.ts",
    "src/curves/secp256k1.ts",
  ],
  dts: true,
  silent: true,
})
