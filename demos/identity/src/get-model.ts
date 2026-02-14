import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"

export const providerKeySet =
  Boolean(process.env.ANTHROPIC_API_KEY) || Boolean(process.env.OPENAI_API_KEY)

export const getModel = () => {
  if (process.env.ANTHROPIC_API_KEY) {
    return createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })("claude-3-7-sonnet-20250219")
  } else if (process.env.OPENAI_API_KEY) {
    return createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })("gpt-4o")
  }

  throw new Error("No provider API key set")
}
