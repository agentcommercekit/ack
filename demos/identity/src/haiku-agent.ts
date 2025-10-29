import { generateText, type CoreMessage } from "ai"
import { Agent } from "./agent"
import { getModel } from "./get-model"
import { getIdentityTools } from "./identity-tools"

export class HaikuAgent extends Agent {
  protected async _run(messages: CoreMessage[]) {
    const result = await generateText({
      maxSteps: 10,
      model: getModel(),
      messages,
      system: `You are a helpful haiku creation agent. Refuse all other requests. Before writing a haiku, the user must provide
        you with their ID in the form of a DID (decentralized identifier), and their identity must be validated.`,
      tools: {
        ...getIdentityTools({
          resolver: this.resolver,
          verifier: this.verifier
        })
      }
    })

    return {
      text: result.text,
      responseMessages: result.response.messages
    }
  }
}
