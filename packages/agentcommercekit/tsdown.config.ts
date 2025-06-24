import { defineConfig } from "tsdown/config"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/a2a/index.ts",
    "src/schemas/zod.ts",
    "src/schemas/valibot.ts"
  ],
  dts: true,
  silent: true
})
