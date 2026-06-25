import { input } from "@inquirer/prompts"
import { magenta, yellow } from "yoctocolors"

import { wordWrap } from "./formatters"

/**
 * Waits for the user to press Enter
 */
export async function waitForEnter(
  message = "Press Enter to continue...",
  color = yellow,
) {
  await input({ message: color(message) })
  console.log("")
}

type LogOptions = {
  wrap?: boolean
  width?: number
  spacing?: number
}

/**
 * Prints messages to the console, automatically wrapping them to
 * the default width. Each message will be printed on a new line.
 *
 * @example
 * ```
 * log("Hello, world!")
 * log("Hello, world!", { wrap: false })
 * log("Hello, world!", { width: 40 })
 * log("Hello, world!", { spacing: 2 })
 * log("Hello, world!", { wrap: false, width: 40, spacing: 2 })
 * ```
 */
export function log(...args: (string | LogOptions)[]) {
  const defaults: Required<LogOptions> = {
    wrap: true,
    spacing: 1,
    width: 80,
  }

  const lastArg = args[args.length - 1]
  const options =
    typeof lastArg === "object" ? { ...defaults, ...lastArg } : defaults
  const messages = args.filter((arg): arg is string => typeof arg === "string")

  messages.forEach((message, index) => {
    console.log(options.wrap ? wordWrap(message, options.width) : message)
    if (options.spacing > 0 && index < messages.length - 1) {
      console.log("\n".repeat(options.spacing - 1))
    }
  })
}

export function logJson(obj: Record<string, unknown>, color = magenta) {
  log(color(JSON.stringify(obj, null, 2)), { wrap: false })
}
