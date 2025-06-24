import * as v from "valibot"

// Minimal agent card schema to ensure it has a URL
const objectWithUrlSchema = v.object({
  url: v.pipe(v.string(), v.url())
})

export async function fetchUrlFromAgentCardUrl(
  agentCardUrl: string | URL
): Promise<string> {
  const url = new URL(agentCardUrl)
  const response = await fetch(url)
  const agentCard = v.parse(objectWithUrlSchema, await response.json())

  return agentCard.url
}
