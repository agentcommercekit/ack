import { default as figlet } from "figlet"
import stripAnsi from "strip-ansi"
import wrapAnsi from "wrap-ansi"
import colors from "yoctocolors"

export function demoHeader(message: string) {
  return colors.blue(
    figlet.textSync(message, {
      font: "Standard",
      horizontalLayout: "full",
      verticalLayout: "full",
    }),
  )
}

export function demoFooter(message: string) {
  return colors.bold(
    colors.cyan(
      figlet.textSync(message, {
        font: "Small",
      }),
    ),
  )
}

/**
 * Creates a section header with an optional step number
 */
export function sectionHeader(
  message: string,
  { step }: { step?: number } = {},
) {
  const stepMessage = [
    step ? colors.bold(`Step ${step}:`) : undefined,
    message,
  ].filter(Boolean)

  const stepMessageLength = stripAnsi(stepMessage.join(" ")).length
  const divider = "─".repeat(stepMessageLength)

  return `
${colors.bold(divider)}
${stepMessage.join(" ")}
${colors.bold(divider)}
`
}

/**
 * Creates a success message with a check mark
 */
export function successMessage(message: string) {
  return colors.green(`✓ ${message}`)
}

/**
 * Creates an error message with an X
 */
export function errorMessage(message: string) {
  return colors.red(`✗ ${message}`)
}

/**
 * Wraps text to a given width, preserving ANSI color codes
 */
export function wordWrap(text: string, width = 80) {
  return wrapAnsi(text, width, { trim: true, hard: true })
}

export function link(url: string) {
  return colors.bold(colors.underline(url))
}
