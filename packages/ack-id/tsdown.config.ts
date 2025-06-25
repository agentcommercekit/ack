import { defineConfig } from "tsdown/config"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/schemas/valibot.ts",
    "src/schemas/zod.ts",
    "src/a2a/index.ts",
    "src/a2a/schemas/zod.ts",
    "src/a2a/schemas/valibot.ts"
  ],
  dts: true,
  silent: true
})
