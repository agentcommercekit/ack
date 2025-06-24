import { colors } from "./colors"

export function createLogger(name: string, color: colors.Format = colors.gray) {
  return {
    log: (...args: Parameters<typeof console.log>) => {
      console.log(color(`[${name}]`), ...args)
    }
  }
}

export type Logger = ReturnType<typeof createLogger>
