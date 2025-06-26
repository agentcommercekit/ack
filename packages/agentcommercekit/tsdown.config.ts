import { defineConfig } from "tsdown/config"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/schemas/valibot.ts",
    "src/schemas/zod/v3.ts",
    "src/schemas/zod/v4.ts",
    "src/a2a/index.ts",
    "src/a2a/schemas/zod/v3.ts",
    "src/a2a/schemas/zod/v4.ts",
    "src/a2a/schemas/valibot.ts"
  ],
  dts: true,
  silent: true
})
