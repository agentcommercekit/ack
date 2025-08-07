import { generateText, tool, type CoreMessage } from "ai"
import { z } from "zod"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { colors, log } from "@repo/cli-tools"
import { parseJwtCredential, type JwtString } from "agentcommercekit"
import { BaseAgent } from "./base-agent"
import type { DataRequest, PriceOffer } from "../types"

/**
 * Data Requestor Agent
 * Requests datasets and negotiates prices with data providers
 */
export class DataRequestorAgent extends BaseAgent {
  private messages: CoreMessage[] = []
  private currentNegotiation: {
    negotiationId?: string
    datasetId?: string
    providerDid?: string
    currentOffer?: number
    maxBudget?: number
    rounds?: number
    agreedPrice?: number
    accessToken?: string
    paymentToken?: string
  } = {}

  /**
   * Get system prompt for the agent
   */
  private getSystemPrompt(): string {
    return `You are a data requestor agent that acquires datasets for analysis and insights.

Your DID is: ${this.did}

NEGOTIATION STRATEGY:
- Start with low offers (20-30% of expected price)
- Increase offers gradually (15-25% each round)
- Maximum budget varies by dataset value
- Accept counter-offers if reasonable

AUTOMATED FLOW:
When a user requests a dataset, AUTOMATICALLY:
1. Call discoverDataset to check availability
2. IMMEDIATELY call requestDataAccess to start negotiation
3. When you receive a price, IMMEDIATELY call makeOffer with an initial low offer
4. Continue negotiation automatically with makeOffer until agreement
5. When makeOffer returns accepted with paymentToken → IMMEDIATELY call sendPayment
6. After payment confirmation, call retrieveData to get access

CRITICAL: Execute the ENTIRE flow automatically without stopping for user confirmation.
- If requestDataAccess returns a price → IMMEDIATELY make an offer
- If makeOffer returns a counter → IMMEDIATELY make another offer
- If makeOffer returns accepted WITH paymentToken → IMMEDIATELY call sendPayment
- If makeOffer returns accepted WITHOUT paymentToken → STOP making offers and wait for token
- NEVER call makeOffer again once you receive accepted=true
- NEVER call sendPayment without a valid paymentToken from makeOffer
- The provider will include the payment token when they accept your offer
- Continue until the transaction is complete

Available tools (EXECUTE IN SEQUENCE):
- discoverDataset: Check what datasets are available
- requestDataAccess: Request access and get initial price
- makeOffer: Negotiate price (use multiple times)
- sendPayment: Pay agreed price
- retrieveData: Get data access after payment

The provider is at: did:web:localhost:5681`
  }

  /**
   * Run the agent with user input
   */
  async run(userInput: string): Promise<void> {
    this.messages.push({
      role: "user",
      content: userInput
    })

    // Check for API keys
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      log(colors.red("\n❌ No API key found!"))
      log(colors.yellow("Please set one of the following in your .env file:"))
      log(colors.dim("  ANTHROPIC_API_KEY=your_key_here"))
      log(colors.dim("  or"))
      log(colors.dim("  OPENAI_API_KEY=your_key_here"))

      this.messages.push({
        role: "assistant",
        content:
          "I need an API key to process your request. Please add either ANTHROPIC_API_KEY or OPENAI_API_KEY to your .env file."
      })
      return
    }

    const model = process.env.OPENAI_API_KEY
      ? (await import("@ai-sdk/openai")).openai("gpt-4o")
      : (await import("@ai-sdk/anthropic")).anthropic(
          "claude-3-5-sonnet-20241022"
        )

    log(
      colors.dim(
        `Using model: ${process.env.OPENAI_API_KEY ? "OpenAI GPT-4o" : "Anthropic Claude"}`
      )
    )

    const result = await generateText({
      model,
      system: this.getSystemPrompt(),
      messages: this.messages,
      maxSteps: 15, // More steps for negotiation
      tools: {
        discoverDataset: tool({
          description: "Discover available datasets from the provider",
          parameters: z.object({
            query: z
              .string()
              .describe("Search query or dataset category")
              .optional()
          }),
          execute: async ({ query }) => {
            log(colors.cyan("🔍 Discovering available datasets..."))

            // For demo, we know the provider has these datasets
            const availableDatasets = [
              "financial-markets-2024",
              "consumer-behavior-q4",
              "supply-chain-insights"
            ]

            log(colors.green(`   ✓ Found ${availableDatasets.length} datasets`))

            return {
              success: true,
              datasets: availableDatasets,
              message: `Available datasets: ${availableDatasets.join(", ")}`
            }
          }
        }),

        requestDataAccess: tool({
          description:
            "Request access to a specific dataset and start negotiation",
          parameters: z.object({
            datasetId: z.string().describe("Dataset identifier"),
            accessDurationHours: z
              .number()
              .describe("How many hours of access needed"),
            purpose: z.string().describe("Purpose of data use")
          }),
          execute: async ({ datasetId, accessDurationHours, purpose }) => {
            log(colors.cyan(`📊 Requesting access to ${datasetId}...`))

            // Store negotiation context
            this.currentNegotiation = {
              datasetId,
              providerDid: "did:web:localhost%3A5681",
              rounds: 0,
              maxBudget: accessDurationHours * 80 // Max $80/hour budget
            }

            // Send request to provider
            const providerUrl = "http://localhost:5681/chat"
            const requestMessage = `I need access to the ${datasetId} dataset for ${accessDurationHours} hours. Purpose: ${purpose}. My DID is ${this.did}.`

            log(colors.dim(`   Sending to provider: ${requestMessage}`))

            const response = await fetch(providerUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: requestMessage
              })
            })

            if (!response.ok) {
              return {
                success: false,
                error: `Failed to contact provider: ${response.status}`
              }
            }

            const result = await response.json()
            log(colors.green(`   ✓ Provider response: ${result.text}`))

            // Extract price from response
            const priceMatch = result.text.match(/\$(\d+(?:\.\d+)?)/g)
            if (priceMatch) {
              const price = parseFloat(priceMatch[0].replace("$", ""))
              log(colors.yellow(`   💰 Initial price: $${price}`))

              // Extract negotiation ID from provider's response
              // Match various formats including neg-dataset-timestamp or full DIDs
              const negotiationIdMatch = result.text.match(
                /Negotiation ID:\s*([^\s\)]+)/i
              )
              if (negotiationIdMatch) {
                this.currentNegotiation.negotiationId = negotiationIdMatch[1]
                log(
                  colors.dim(
                    `   Negotiation ID: ${this.currentNegotiation.negotiationId}`
                  )
                )
              } else {
                // Generate a negotiation ID if not found (for tracking)
                this.currentNegotiation.negotiationId = `${this.currentNegotiation.datasetId}-${Date.now()}`
                log(
                  colors.dim(
                    `   Generated negotiation ID: ${this.currentNegotiation.negotiationId}`
                  )
                )
              }

              return {
                success: true,
                initialPrice: price,
                providerMessage: result.text,
                shouldNegotiate: true,
                message: `Provider asking $${price}. This seems high, I should negotiate.`
              }
            }

            return {
              success: true,
              providerMessage: result.text
            }
          }
        }),

        makeOffer: tool({
          description:
            "Make a price offer during negotiation. Call this multiple times to negotiate.",
          parameters: z.object({
            offerPrice: z.number().describe("Price to offer in USDC")
          }),
          execute: async ({ offerPrice }) => {
            // Check if we already have a payment token (offer was accepted)
            if (this.currentNegotiation.paymentToken) {
              log(colors.yellow("   ⚠️ Offer already accepted, payment token received. Should proceed with payment instead."))
              return {
                success: false,
                error: "Offer already accepted. Please proceed with payment using the token.",
                paymentToken: this.currentNegotiation.paymentToken,
                agreedPrice: this.currentNegotiation.agreedPrice
              }
            }

            this.currentNegotiation.rounds =
              (this.currentNegotiation.rounds || 0) + 1
            this.currentNegotiation.currentOffer = offerPrice

            log(
              colors.cyan(
                `💵 Making offer: $${offerPrice} (round ${this.currentNegotiation.rounds})`
              )
            )

            // Send offer to provider
            const offerMessage = `I'd like to offer $${offerPrice} USDC for access to ${this.currentNegotiation.datasetId}.${this.currentNegotiation.negotiationId ? ` (Negotiation: ${this.currentNegotiation.negotiationId})` : ""}`

            const response = await fetch("http://localhost:5681/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: offerMessage
              })
            })

            if (!response.ok) {
              return {
                success: false,
                error: "Failed to send offer"
              }
            }

            const result = await response.json()
            log(colors.green(`   ✓ Provider response: ${result.text}`))

            // Check if offer was accepted (more precise detection)
            if (
              (result.text.toLowerCase().includes("i accept") ||
                result.text.toLowerCase().includes("accept your offer") ||
                result.text.toLowerCase().includes("have accepted your offer") ||
                result.text.toLowerCase().includes("accepted your offer") ||
                result.text.toLowerCase().includes("accepted at")) &&
              !result.text.toLowerCase().includes("cannot accept") &&
              !result.text.toLowerCase().includes("acceptable")
            ) {
              log(colors.green("   🎉 Offer accepted by provider!"))
              this.currentNegotiation.agreedPrice = offerPrice

              // Check if payment token is in the response (provider should include it)
              const paymentTokenMatch = result.text.match(
                /eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/
              )

              if (paymentTokenMatch) {
                log(colors.green("   💳 Payment token received!"))
                this.currentNegotiation.paymentToken = paymentTokenMatch[0]
                return {
                  success: true,
                  accepted: true,
                  agreedPrice: offerPrice,
                  paymentToken: paymentTokenMatch[0],
                  message: `Offer accepted at $${offerPrice}! Payment token received. Proceeding with payment.`
                }
              }

              // Provider accepted but hasn't sent token yet - ask for it explicitly
              log(
                colors.cyan("   💳 Requesting payment token from provider...")
              )
              const paymentRequestMessage = `Thank you for accepting my offer of $${offerPrice} USDC. Please provide the payment token so I can complete the payment.`

              const paymentResponse = await fetch(
                "http://localhost:5681/chat",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    message: paymentRequestMessage
                  })
                }
              )

              if (paymentResponse.ok) {
                const tokenResult = await paymentResponse.json()
                log(colors.green(`   ✓ Provider response: ${tokenResult.text}`))

                // Look for payment token in response
                const tokenMatch = tokenResult.text.match(
                  /eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/
                )

                if (tokenMatch) {
                  log(colors.green("   💳 Payment token received!"))
                  this.currentNegotiation.paymentToken = tokenMatch[0]
                  return {
                    success: true,
                    accepted: true,
                    agreedPrice: offerPrice,
                    paymentToken: tokenMatch[0],
                    message: `Offer accepted at $${offerPrice}! Payment token received. Proceeding with payment.`
                  }
                }
              }

              // Still no token - return error
              log(
                colors.red(
                  "   ❌ Provider accepted but didn't provide payment token"
                )
              )
              return {
                success: false,
                error:
                  "Provider accepted offer but failed to provide payment token"
              }
            }

            // Extract counter-offer
            const counterMatch = result.text.match(/\$(\d+(?:\.\d+)?)/g)
            if (counterMatch) {
              const counterPrice = parseFloat(
                counterMatch[counterMatch.length - 1].replace("$", "")
              )

              // Decide next offer
              const nextOffer = Math.min(
                offerPrice * 1.2, // Increase by 20%
                counterPrice * 0.9, // Or 90% of their counter
                this.currentNegotiation.maxBudget || counterPrice
              )

              return {
                success: true,
                accepted: false,
                counterOffer: counterPrice,
                suggestedNextOffer: Math.round(nextOffer),
                rounds: this.currentNegotiation.rounds,
                message: `Provider countered with $${counterPrice}. ${this.currentNegotiation.rounds < 4 ? `I should offer $${Math.round(nextOffer)} next.` : "Getting close to agreement."}`
              }
            }

            return {
              success: true,
              providerMessage: result.text
            }
          }
        }),

        sendPayment: tool({
          description:
            "Send payment for agreed data access price. ONLY call this when you have a valid payment token (JWT string starting with 'eyJ').",
          parameters: z.object({
            paymentToken: z
              .string()
              .describe("Payment token from provider (must be a JWT string)")
          }),
          execute: async ({ paymentToken }) => {
            // Validate payment token
            if (
              !paymentToken ||
              paymentToken === "undefined" ||
              paymentToken === "null"
            ) {
              log(colors.red("   ❌ No valid payment token provided"))
              return {
                success: false,
                error:
                  "No payment token available. Please wait for the provider to send a payment request first."
              }
            }

            // Check if it looks like a JWT token
            if (
              !paymentToken.startsWith("eyJ") ||
              paymentToken.split(".").length !== 3
            ) {
              log(
                colors.red(
                  `   ❌ Invalid payment token format: ${paymentToken.substring(0, 20)}...`
                )
              )
              return {
                success: false,
                error:
                  "Invalid payment token format. The token should be a JWT string starting with 'eyJ'."
              }
            }

            log(colors.cyan("💸 Sending payment..."))

            const jwt = await this.createAuthJwt()
            const paymentUrl = `${this.ackLabUrl}/payment`

            const response = await fetch(paymentUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`
              },
              body: JSON.stringify({ paymentToken })
            })

            if (!response.ok) {
              return {
                success: false,
                error: "Payment failed"
              }
            }

            const { receipt } = await response.json()
            log(colors.green("   ✓ Payment sent successfully"))

            // Send receipt to provider
            log(colors.cyan("   Sending receipt to provider..."))
            const receiptMessage = `Payment complete! Here is my receipt: ${receipt}`

            const providerResponse = await fetch("http://localhost:5681/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: receiptMessage
              })
            })

            if (!providerResponse.ok) {
              return {
                success: false,
                error: "Failed to deliver receipt"
              }
            }

            const result = await providerResponse.json()

            // Extract access token and URL
            const tokenMatch = result.text.match(/access_[a-zA-Z0-9-]+/)
            const urlMatch = result.text.match(/http:\/\/[^\s]+/)

            if (tokenMatch) {
              this.currentNegotiation.accessToken = tokenMatch[0]
            }

            return {
              success: true,
              accessToken: tokenMatch?.[0],
              dataUrl: urlMatch?.[0],
              providerMessage: result.text,
              message: `Payment confirmed! ${tokenMatch ? `Access granted with token: ${tokenMatch[0]}` : "Access granted."}`
            }
          }
        }),

        retrieveData: tool({
          description: "Retrieve data using the access token",
          parameters: z.object({
            accessToken: z.string().describe("Access token from provider"),
            dataUrl: z.string().describe("Data endpoint URL")
          }),
          execute: async ({ accessToken, dataUrl }) => {
            log(colors.cyan("📥 Retrieving data..."))

            // Extract token ID from URL
            const tokenId = dataUrl.split("/").pop()

            const response = await fetch(dataUrl, {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            })

            if (!response.ok) {
              return {
                success: false,
                error: `Failed to retrieve data: ${response.status}`
              }
            }

            const data = await response.json()

            log(colors.green("   ✅ Data retrieved successfully"))
            log(colors.dim(`   Dataset: ${data.datasetId}`))
            log(colors.dim(`   Records: ${data.data.records}`))

            return {
              success: true,
              dataset: data.datasetId,
              metadata: data.metadata,
              recordCount: data.data.records,
              message: `Successfully retrieved ${data.metadata.name} with ${data.data.records} records!`
            }
          }
        })
      }
    })

    // Handle the response
    let responseText = result.text

    if (!responseText || responseText.trim() === "") {
      if (result.toolCalls && result.toolCalls.length > 0) {
        const toolNames = result.toolCalls.map((tc) => tc.toolName)

        if (toolNames.includes("retrieveData")) {
          responseText =
            "Data successfully retrieved! The transaction is complete."
        } else if (toolNames.includes("sendPayment")) {
          responseText = "Payment sent! Waiting for access token..."
        } else if (toolNames.includes("makeOffer")) {
          responseText = "Negotiating price with the provider..."
        } else {
          responseText = "Processing your data request..."
        }
      }
    }

    this.messages.push({
      role: "assistant",
      content: responseText
    })

    log(colors.dim("\nAgent response:"))
    log(responseText)
  }

  /**
   * Create HTTP server for the requestor
   */
  createServer() {
    const app = new Hono()

    app.use("*", cors())

    // Chat endpoint
    app.post("/chat", async (c) => {
      try {
        const body = await c.req.json()
        const { message } = body

        log(colors.cyan(`💬 Requestor received: ${message}`))

        // Reset state for new request
        this.currentNegotiation = {}

        await this.run(message)

        // Get the last assistant message
        const lastMessage = this.messages[this.messages.length - 1]
        const responseText =
          lastMessage?.role === "assistant"
            ? lastMessage.content
            : "Request processed"

        return c.json({ text: responseText })
      } catch (error) {
        log(colors.red("Error in chat endpoint:"))
        console.error(error)
        return c.json({ error: "Internal server error" }, 500)
      }
    })

    // Identity endpoint
    app.get("/identity/vc", (c) => {
      if (!this.ownershipVc) {
        return c.json({ error: "No ownership VC available" }, 404)
      }
      return c.json(this.ownershipVc)
    })

    return app
  }
}
