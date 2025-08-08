import { generateText, tool, type CoreMessage } from "ai"
import { z } from "zod"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { colors, log } from "@repo/cli-tools"
import { parseJwtCredential, type JwtString } from "agentcommercekit"
import { BaseAgent } from "./base-agent"
import {
  getServiceUrl,
  createDidWebForEnvironment
} from "../utils/endpoint-utils"
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

  public emitEvent?: (eventData: any) => void

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

CRITICAL PAYMENT HANDLING:
- If makeOffer returns accepted WITH paymentToken → IMMEDIATELY call sendPayment
- If makeOffer returns accepted WITHOUT paymentToken → IMMEDIATELY call requestPaymentToken
- NEVER call makeOffer again once you receive accepted=true
- NEVER call sendPayment without a valid paymentToken (JWT starting with 'eyJ')
- The provider should include the payment token when they accept your offer
- If no token provided in acceptance, use requestPaymentToken tool immediately
- Continue until the transaction is complete

PAYMENT TOKEN VALIDATION:
- Payment tokens must be JWT format (eyJ...xxx.xxx)
- Payment tokens must have 3 parts separated by dots
- Never proceed with payment if token is undefined, null, or invalid format

Available tools (EXECUTE IN SEQUENCE):
- discoverDataset: Check what datasets are available
- requestDataAccess: Request access and get initial price
- makeOffer: Negotiate price (use multiple times)
- requestPaymentToken: Request payment token if not provided with acceptance
- sendPayment: Pay agreed price
- retrieveData: Get data access after payment

The provider is at: ${createDidWebForEnvironment(5681)}`
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
            this.emitEvent?.({
              type: "step_started",
              step: "dataset-discovery",
              message: "Discovering available datasets..."
            })

            // For demo, we know the provider has these datasets
            const availableDatasets = [
              "financial-markets-2024",
              "consumer-behavior-q4",
              "supply-chain-insights"
            ]

            log(colors.green(`   ✓ Found ${availableDatasets.length} datasets`))
            this.emitEvent?.({
              type: "step_completed",
              step: "dataset-discovery",
              message: `Found ${availableDatasets.length} available datasets`,
              data: {
                datasetCount: availableDatasets.length,
                datasets: availableDatasets
              }
            })

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
            this.emitEvent?.({
              type: "step_started",
              step: "credential-verification",
              message: "Verifying credentials and requesting dataset access...",
              data: { datasetId, accessDurationHours, purpose }
            })

            // Store negotiation context
            this.currentNegotiation = {
              datasetId,
              providerDid: createDidWebForEnvironment(5681),
              rounds: 0,
              maxBudget: accessDurationHours * 80 // Max $80/hour budget
            }

            // Send request to provider
            const providerUrl = getServiceUrl(5681, "/chat")
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

              this.emitEvent?.({
                type: "step_completed",
                step: "credential-verification",
                message: "Credentials verified, starting price negotiation...",
                data: {
                  initialPrice: price,
                  negotiationId: this.currentNegotiation.negotiationId
                }
              })

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
              log(
                colors.yellow(
                  "   ⚠️ Offer already accepted, payment token received. Should proceed with payment instead."
                )
              )
              return {
                success: false,
                error:
                  "Offer already accepted. Please proceed with payment using the token.",
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

            this.emitEvent?.({
              type: "step_progress",
              step: "price-negotiation",
              message: `Making offer: $${offerPrice} (round ${this.currentNegotiation.rounds})`,
              data: {
                offerPrice,
                round: this.currentNegotiation.rounds,
                negotiationId: this.currentNegotiation.negotiationId
              }
            })

            // Send offer to provider
            const offerMessage = `I'd like to offer $${offerPrice} USDC for access to ${this.currentNegotiation.datasetId}.${this.currentNegotiation.negotiationId ? ` (Negotiation: ${this.currentNegotiation.negotiationId})` : ""}`

            const response = await fetch(getServiceUrl(5681, "/chat"), {
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
                result.text
                  .toLowerCase()
                  .includes("have accepted your offer") ||
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

                this.emitEvent?.({
                  type: "step_completed",
                  step: "price-negotiation",
                  message: `Offer accepted at $${offerPrice}! Payment token received.`,
                  data: {
                    agreedPrice: offerPrice,
                    paymentToken: paymentTokenMatch[0],
                    negotiationId: this.currentNegotiation.negotiationId
                  }
                })

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
                getServiceUrl(5681, "/chat"),
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

                // Look for payment token in response - improved regex
                const tokenMatch = tokenResult.text.match(
                  /eyJ[A-Za-z0-9_\-+/=]+\.[A-Za-z0-9_\-+/=]+\.[A-Za-z0-9_\-+/=]+/
                )

                if (tokenMatch) {
                  const token = tokenMatch[0]
                  // Validate token format
                  if (token.split(".").length === 3) {
                    log(colors.green("   💳 Valid payment token received!"))
                    this.currentNegotiation.paymentToken = token
                    return {
                      success: true,
                      accepted: true,
                      agreedPrice: offerPrice,
                      paymentToken: token,
                      message: `Offer accepted at $${offerPrice}! Payment token received. Proceeding with payment.`
                    }
                  } else {
                    log(
                      colors.red("   ❌ Invalid payment token format received")
                    )
                  }
                }
              }

              // Still no token - return error but with specific guidance
              log(
                colors.red(
                  "   ❌ Provider accepted but didn't provide payment token"
                )
              )
              return {
                success: false,
                accepted: true, // Still accepted, just missing token
                agreedPrice: offerPrice,
                error:
                  "Provider accepted offer but failed to provide payment token. Will retry payment token request.",
                shouldRetryTokenRequest: true
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
            this.emitEvent?.({
              type: "step_started",
              step: "payment-processing",
              message: "Processing payment...",
              data: { paymentToken: paymentToken.substring(0, 20) + "..." }
            })

            // Validate payment token
            if (
              !paymentToken ||
              paymentToken === "undefined" ||
              paymentToken === "null"
            ) {
              log(colors.red("   ❌ No valid payment token provided"))
              this.emitEvent?.({
                type: "step_failed",
                step: "payment-processing",
                message: "No valid payment token provided",
                error: "Missing payment token"
              })
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

            const providerResponse = await fetch(getServiceUrl(5681, "/chat"), {
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

            this.emitEvent?.({
              type: "step_completed",
              step: "payment-processing",
              message: "Payment confirmed! Access granted.",
              data: {
                accessToken: tokenMatch?.[0],
                dataUrl: urlMatch?.[0],
                receipt: receipt
              }
            })

            return {
              success: true,
              accessToken: tokenMatch?.[0],
              dataUrl: urlMatch?.[0],
              providerMessage: result.text,
              message: `Payment confirmed! ${tokenMatch ? `Access granted with token: ${tokenMatch[0]}` : "Access granted."}`
            }
          }
        }),

        requestPaymentToken: tool({
          description:
            "Request payment token from provider after offer acceptance - use when makeOffer returns accepted but no token",
          parameters: z.object({
            agreedPrice: z
              .number()
              .describe("The agreed price from the accepted offer"),
            datasetId: z.string().describe("Dataset ID from negotiation")
          }),
          execute: async ({ agreedPrice, datasetId }) => {
            log(colors.cyan("💳 Requesting payment token from provider..."))

            const tokenRequestMessage = `I accepted your offer for $${agreedPrice} USDC for ${datasetId}. Please provide the payment token so I can complete the payment.`

            const response = await fetch(getServiceUrl(5681, "/chat"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: tokenRequestMessage
              })
            })

            if (!response.ok) {
              return {
                success: false,
                error: "Failed to request payment token from provider"
              }
            }

            const result = await response.json()
            log(colors.green(`   ✓ Provider response: ${result.text}`))

            // Look for payment token in response
            const tokenMatch = result.text.match(
              /eyJ[A-Za-z0-9_\-+/=]+\.[A-Za-z0-9_\-+/=]+\.[A-Za-z0-9_\-+/=]+/
            )

            if (tokenMatch) {
              const token = tokenMatch[0]
              if (token.split(".").length === 3) {
                log(colors.green("   💳 Payment token received!"))
                this.currentNegotiation.paymentToken = token
                return {
                  success: true,
                  paymentToken: token,
                  message: `Payment token received: ${token.substring(0, 50)}...`
                }
              }
            }

            return {
              success: false,
              error: "Provider did not provide a valid payment token",
              providerResponse: result.text
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
            this.emitEvent?.({
              type: "step_started",
              step: "data-access",
              message: "Retrieving data...",
              data: { accessToken, dataUrl }
            })

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

            this.emitEvent?.({
              type: "step_completed",
              step: "data-access",
              message: `Data retrieved successfully! ${data.data.records} records`,
              data: {
                dataset: data.datasetId,
                recordCount: data.data.records,
                metadata: data.metadata
              }
            })

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

    // Event stream for real-time progress updates
    const eventControllers = new Set<ReadableStreamDefaultController>()

    // Server-Sent Events endpoint
    app.get("/events", (c) => {
      let streamController: ReadableStreamDefaultController

      const stream = new ReadableStream({
        start(controller) {
          streamController = controller

          // Send initial connection event
          controller.enqueue(
            `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`
          )

          // Store the controller for sending events
          eventControllers.add(controller)

          console.log(
            `📡 SSE client connected. Total clients: ${eventControllers.size}`
          )
        },
        cancel() {
          if (streamController) {
            eventControllers.delete(streamController)
            console.log(
              `📡 SSE client disconnected. Total clients: ${eventControllers.size}`
            )
          }
        }
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      })
    })

    // Helper function to emit events to all connected clients
    this.emitEvent = (eventData: any) => {
      const event = {
        ...eventData,
        timestamp: new Date().toISOString()
      }

      console.log("🔄 Emitting event:", event)

      eventControllers.forEach((controller) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
        } catch (error) {
          console.error("Error writing to event stream:", error)
          eventControllers.delete(controller)
        }
      })
    }

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
