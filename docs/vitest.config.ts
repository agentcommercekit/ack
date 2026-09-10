import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["ack-pay/rfc/vectors/**/*.test.ts"],
    watch: false,
  },
})
