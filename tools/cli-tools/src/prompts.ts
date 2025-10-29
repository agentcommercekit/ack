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
  let options: Required<LogOptions> = {
    wrap: true,
    spacing: 1,
    width: 80,
  }

  if (typeof args[args.length - 1] === "object") {
    options = Object.assign(options, args.pop())
  }

  const messages = args as string[]

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
