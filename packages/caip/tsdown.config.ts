import { defineConfig } from "tsdown/config"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/schemas/zod/v3.ts",
    "src/schemas/zod/v4.ts",
    "src/schemas/valibot.ts",
  ],
  dts: true,
  silent: true,
})
