import { valibotSchema } from "@ai-sdk/valibot"
import { colors } from "@repo/cli-tools"
import { generateText, tool, type CoreMessage } from "ai"
import * as v from "valibot"
import { Agent } from "./agent"
import { getModel } from "./get-model"

const agentResponseSchema = v.object({
  text: v.string()
})

export class ClientAgent extends Agent {
  haikuComplete = false

  protected async _run(messages: CoreMessage[]) {
    const result = await generateText({
      model: getModel(),
      messages,
      system: `Your goal is to help a user generate a haiku, delegating to a dedicated haiku agent.

        If asked for identity verification, your DID is ${this.did}`,

      tools: {
        callHaikuAgent: tool({
          description: "Call or respond to the haiku agent",
          parameters: valibotSchema(
            v.object({
              message: v.pipe(
                v.string(),
                v.description("The message to send to the haiku agent")
              )
            })
          ),
          execute: async ({ message }) => {
            console.log(colors.dim(`> Agent ${this.did} calling haiku agent`))

            const response = await fetch(`http://localhost:5679/chat`, {
              method: "POST",
              body: JSON.stringify({ message }),
              headers: {
                "Content-Type": "application/json"
              }
            })

            const { text } = v.parse(agentResponseSchema, await response.json())

            console.log(
              colors.dim(`< Received response from haiku agent: ${text}`)
            )

            return text
          }
        }),
        isComplete: tool({
          description:
            "Call this when you have received a haiku to indicate that the haiku is complete",
          parameters: valibotSchema(v.object({})),
          execute: async () => {
            console.log(colors.gray("> Haiku complete"))
            this.haikuComplete = true

            return Promise.resolve("success")
          }
        })
      }
    })

    return {
      text: result.text,
      responseMessages: result.response.messages
    }
  }
}
