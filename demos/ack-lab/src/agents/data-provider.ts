import { Hono } from "hono"
import { cors } from "hono/cors"
import { colors, log } from "@repo/cli-tools"
import { generateText } from "ai"
import { tool } from "ai"
import { z } from "zod"
import { parseJwtCredential, type JwtString } from "agentcommercekit"
import type { CoreMessage } from "ai"
import { BaseAgent } from "./base-agent"
import type {
  DataRequest,
  PriceOffer,
  DataAccessToken,
  DataProviderPolicies
} from "../types"

type RunResult = {
  text: string
  responseMessages: CoreMessage[]
}

/**
 * Data Provider Agent
 * LLM-powered agent that sells access to datasets through negotiation
 */
export class DataProviderAgent extends BaseAgent {
  private negotiations: Map<
    string,
    {
      requestorDid: string
      datasetId: string
      accessDurationHours: number
      currentPrice: number
      rounds: number
      lastOffer?: number
      agreedPrice?: number
    }
  > = new Map()

  private accessTokens: Map<string, DataAccessToken> = new Map()
  private receipts: Set<string> = new Set()
  private messages: CoreMessage[] = []

  // Mock datasets
  private datasets = {
    "financial-markets-2024": {
      name: "Financial Markets Data 2024",
      description:
        "Real-time and historical market data including stocks, bonds, and derivatives",
      size: "500GB",
      updateFrequency: "real-time"
    },
    "consumer-behavior-q4": {
      name: "Consumer Behavior Analytics Q4",
      description: "Aggregated consumer purchasing patterns and preferences",
      size: "250GB",
      updateFrequency: "daily"
    },
    "supply-chain-insights": {
      name: "Global Supply Chain Insights",
      description: "Supply chain performance metrics and predictive analytics",
      size: "100GB",
      updateFrequency: "weekly"
    }
  }

  private dataProviderPolicies: DataProviderPolicies = {
    requireCatenaICC: true,
    maxTransactionSize: 10000,
    dailyTransactionLimit: 50000,
    minPricePerHour: 10, // $10/hour minimum
    maxPricePerHour: 100, // $100/hour maximum
    autoAcceptThreshold: 0.8, // Auto-accept at 80% of max price
    maxNegotiationRounds: 5,
    availableDatasets: Object.keys(this.datasets)
  }

  /**
   * Create HTTP server for the provider
   */
  createServer() {
    const app = new Hono()

    app.use("*", cors())

    // Chat endpoint for natural language communication
    app.post("/chat", async (c) => {
      try {
        const body = await c.req.json()
        const { message } = body

        log(colors.cyan(`💬 Provider received: ${message}`))

        const result = await this.run(message)

        return c.json({ text: result })
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

    // Data access endpoint
    app.get("/data/:tokenId", async (c) => {
      const tokenId = c.req.param("tokenId")
      const token = this.accessTokens.get(tokenId)

      if (!token) {
        return c.json({ error: "Invalid access token" }, 401)
      }

      if (new Date() > token.expiresAt) {
        return c.json({ error: "Access token expired" }, 401)
      }

      // Return mock data
      const dataset =
        this.datasets[token.datasetId as keyof typeof this.datasets]
      return c.json({
        datasetId: token.datasetId,
        metadata: dataset,
        data: {
          // Mock data response
          sample: "This would be the actual dataset content",
          format: "parquet",
          records: 1000000
        }
      })
    })

    return app
  }

  /**
   * Run the agent with a message
   */
  async run(prompt: string): Promise<string> {
    log(colors.cyan(`🔧 DEBUG: Provider received message: "${prompt}"`))

    this.messages.push({
      role: "user",
      content: prompt
    })

    const result = await this._run(this.messages)

    this.messages.push(...result.responseMessages)

    log(colors.cyan(`🔧 DEBUG: Provider responding with: "${result.text}"`))

    return result.text
  }

  /**
   * Internal run method with LLM and tools
   */
  private async _run(messages: CoreMessage[]): Promise<RunResult> {
    const result = await generateText({
      maxSteps: 10,
      model: await this.getModel(),
      messages,
      system: this.getSystemPrompt(),
      tools: {
        verifyCredentials: tool({
          description: "Verify requestor has required Catena ICC credentials",
          parameters: z.object({
            did: z.string().describe("The DID of the requestor to verify")
          }),
          execute: async ({ did }) => {
            try {
              log(colors.cyan(`🔐 Verifying credentials for ${did}`))

              const metadata = await this.fetchCounterpartyMetadata(did as any)
              if (!metadata) {
                return {
                  success: false,
                  error: "Could not fetch requestor metadata"
                }
              }

              const vcParsed = await parseJwtCredential(
                metadata.vc,
                this.resolver
              )
              await this.verifier.verifyCredential(vcParsed)

              // Check if issuer is Catena (mock check)
              // The issuer can be a string or an object with an id property
              const issuerDid =
                typeof vcParsed.issuer === "string"
                  ? vcParsed.issuer
                  : (vcParsed.issuer as any).id || vcParsed.issuer
              const issuerString = String(issuerDid).toLowerCase()
              log(colors.dim(`   Issuer: ${issuerString}`))
              const isCatenaIssued =
                issuerString.includes("catena") || issuerString.includes("5678")

              if (
                this.dataProviderPolicies.requireCatenaICC &&
                !isCatenaIssued
              ) {
                log(colors.red("❌ Requestor does not have Catena ICC"))
                log(
                  colors.dim(
                    `   Expected issuer to contain 'catena', got: ${issuerString}`
                  )
                )
                return {
                  success: false,
                  error: "Catena ICC required for data access"
                }
              }

              log(colors.green("✅ Credentials verified"))
              return {
                success: true,
                did,
                issuer: vcParsed.issuer,
                hasCatenaICC: isCatenaIssued
              }
            } catch (error) {
              log(colors.red(`❌ Credential verification failed: ${error}`))
              return {
                success: false,
                error: `Credential verification failed: ${error}`
              }
            }
          }
        }),

        checkDataAvailability: tool({
          description: "Check if requested dataset is available",
          parameters: z.object({
            datasetId: z.string().describe("The dataset identifier requested")
          }),
          execute: async ({ datasetId }) => {
            const dataset =
              this.datasets[datasetId as keyof typeof this.datasets]

            if (!dataset) {
              return {
                success: false,
                error: `Dataset '${datasetId}' not found`,
                availableDatasets: Object.keys(this.datasets)
              }
            }

            log(colors.green(`✅ Dataset '${datasetId}' is available`))
            return {
              success: true,
              dataset: {
                id: datasetId,
                ...dataset
              }
            }
          }
        }),

        startNegotiation: tool({
          description: "Start price negotiation for data access",
          parameters: z.object({
            requestorDid: z.string().describe("DID of the requestor"),
            datasetId: z.string().describe("Dataset being negotiated"),
            accessDurationHours: z
              .number()
              .describe("Requested access duration in hours")
          }),
          execute: async ({ requestorDid, datasetId, accessDurationHours }) => {
            // Use a simpler negotiation ID format to avoid encoding issues
            const timestamp = Date.now()
            const negotiationId = `neg-${datasetId}-${timestamp}`

            // Calculate starting price (start at maximum)
            const totalPrice =
              this.dataProviderPolicies.maxPricePerHour * accessDurationHours

            this.negotiations.set(negotiationId, {
              requestorDid,
              datasetId,
              accessDurationHours,
              currentPrice: totalPrice,
              rounds: 1
            })

            log(
              colors.yellow(
                `💰 Starting negotiation at $${totalPrice} for ${accessDurationHours} hours`
              )
            )

            return {
              success: true,
              negotiationId,
              initialPrice: totalPrice,
              minAcceptable:
                this.dataProviderPolicies.minPricePerHour * accessDurationHours,
              autoAcceptPrice:
                this.dataProviderPolicies.maxPricePerHour *
                accessDurationHours *
                this.dataProviderPolicies.autoAcceptThreshold,
              message: `I can provide access to ${datasetId} for ${accessDurationHours} hours. My initial price is $${totalPrice} USDC. This includes real-time updates and full API access. (Negotiation ID: ${negotiationId})`
            }
          }
        }),

        evaluateOffer: tool({
          description: "Evaluate a price offer from the requestor",
          parameters: z.object({
            negotiationId: z.string().describe("Negotiation ID"),
            offeredPrice: z
              .number()
              .describe("Price offered by requestor in USDC")
          }),
          execute: async ({ negotiationId, offeredPrice }) => {
            const negotiation = this.negotiations.get(negotiationId)

            if (!negotiation) {
              return {
                success: false,
                error: "Invalid negotiation ID"
              }
            }

            negotiation.rounds++
            negotiation.lastOffer = offeredPrice

            const minPrice =
              this.dataProviderPolicies.minPricePerHour *
              negotiation.accessDurationHours
            const autoAcceptPrice =
              this.dataProviderPolicies.maxPricePerHour *
              negotiation.accessDurationHours *
              this.dataProviderPolicies.autoAcceptThreshold

            log(
              colors.cyan(
                `🤝 Evaluating offer: $${offeredPrice} (round ${negotiation.rounds})`
              )
            )

            // Auto-accept if above threshold
            if (offeredPrice >= autoAcceptPrice) {
              log(colors.green(`✅ Offer exceeds auto-accept threshold`))
              negotiation.currentPrice = offeredPrice
              // Store the agreed price for payment request
              negotiation.agreedPrice = offeredPrice
              return {
                success: true,
                accepted: true,
                finalPrice: offeredPrice,
                negotiationId,
                shouldCreatePayment: true,
                message: `Excellent! I accept your offer of $${offeredPrice} USDC. Creating payment request now.`
              }
            }

            // Reject if below minimum
            if (offeredPrice < minPrice) {
              if (
                negotiation.rounds >=
                this.dataProviderPolicies.maxNegotiationRounds
              ) {
                log(
                  colors.red(
                    `❌ Negotiation failed after ${negotiation.rounds} rounds`
                  )
                )
                this.negotiations.delete(negotiationId)
                return {
                  success: false,
                  accepted: false,
                  message: `I cannot accept less than $${minPrice} USDC. Negotiation terminated.`
                }
              }

              // Counter with a lower price
              const discount =
                0.1 *
                (negotiation.rounds /
                  this.dataProviderPolicies.maxNegotiationRounds)
              const counterPrice = Math.max(
                negotiation.currentPrice * (1 - discount),
                minPrice
              )
              negotiation.currentPrice = counterPrice

              return {
                success: true,
                accepted: false,
                counterOffer: counterPrice,
                message: `Your offer of $${offeredPrice} is below my minimum. I can offer $${counterPrice.toFixed(2)} USDC.`
              }
            }

            // Accept if reasonable and near the end of negotiation
            if (
              negotiation.rounds >=
                this.dataProviderPolicies.maxNegotiationRounds - 1 &&
              offeredPrice >= minPrice * 1.2
            ) {
              negotiation.currentPrice = offeredPrice
              // Store the agreed price for payment request
              negotiation.agreedPrice = offeredPrice
              log(
                colors.green(
                  `🔧 DEBUG: Accepting offer of $${offeredPrice} (stored as agreedPrice)`
                )
              )
              return {
                success: true,
                accepted: true,
                finalPrice: offeredPrice,
                negotiationId,
                shouldCreatePayment: true,
                message: `After consideration, I accept your offer of $${offeredPrice} USDC. Creating payment request now.`
              }
            }

            // Counter offer
            const counterPrice = Math.max(offeredPrice * 1.2, minPrice * 1.5)
            negotiation.currentPrice = counterPrice

            return {
              success: true,
              accepted: false,
              counterOffer: counterPrice,
              roundsRemaining:
                this.dataProviderPolicies.maxNegotiationRounds -
                negotiation.rounds,
              message: `I appreciate your offer of $${offeredPrice}. I can go down to $${counterPrice.toFixed(2)} USDC.`
            }
          }
        }),

        findNegotiation: tool({
          description:
            "Find an active negotiation by dataset or requestor - use this before createPaymentRequest if you need to find the negotiationId",
          parameters: z.object({
            datasetId: z
              .string()
              .describe("Dataset ID to search for")
              .optional(),
            requestorDid: z
              .string()
              .describe("Requestor DID to search for")
              .optional()
          }),
          execute: async ({ datasetId, requestorDid }) => {
            log(
              colors.cyan(
                `🔧 DEBUG: findNegotiation called with datasetId="${datasetId}", requestorDid="${requestorDid}"`
              )
            )

            const negotiations = Array.from(this.negotiations.entries())
            log(
              colors.dim(`🔧 DEBUG: Total negotiations: ${negotiations.length}`)
            )

            let found = negotiations.filter(([id, neg]) => {
              const matchesDataset = datasetId && neg.datasetId === datasetId
              const matchesRequestor =
                requestorDid && neg.requestorDid === requestorDid
              log(
                colors.dim(
                  `🔧 DEBUG: Checking negotiation ${id}: dataset match=${matchesDataset}, requestor match=${matchesRequestor}`
                )
              )
              return matchesDataset || matchesRequestor
            })

            log(
              colors.dim(
                `🔧 DEBUG: Found ${found.length} matching negotiations`
              )
            )

            if (found.length === 0) {
              return {
                success: false,
                error: "No matching negotiations found",
                availableNegotiations: negotiations.map(([id, neg]) => ({
                  id,
                  dataset: neg.datasetId,
                  requestor: neg.requestorDid,
                  agreedPrice: neg.agreedPrice
                }))
              }
            }

            const [negotiationId, negotiation] = found[0]!
            const priceToUse =
              negotiation.agreedPrice || negotiation.currentPrice
            log(
              colors.green(
                `🔧 DEBUG: Found negotiation - agreedPrice: ${negotiation.agreedPrice}, currentPrice: ${negotiation.currentPrice}, using: ${priceToUse}`
              )
            )
            return {
              success: true,
              negotiationId,
              datasetId: negotiation.datasetId,
              requestorDid: negotiation.requestorDid,
              agreedPrice: priceToUse,
              message: `Found negotiation: ${negotiationId}`
            }
          }
        }),

        createPaymentRequest: tool({
          description:
            "Create a payment request after price agreement - call this IMMEDIATELY after accepting an offer",
          parameters: z.object({
            negotiationId: z
              .string()
              .describe("Negotiation ID from evaluateOffer"),
            agreedPrice: z
              .number()
              .describe("Agreed price in USDC from evaluateOffer")
          }),
          execute: async ({ negotiationId, agreedPrice }) => {
            try {
              log(
                colors.cyan(
                  `🔧 DEBUG: createPaymentRequest called with negotiationId="${negotiationId}", agreedPrice=${agreedPrice}`
                )
              )
              log(
                colors.dim(
                  `🔧 DEBUG: Available negotiations: ${Array.from(this.negotiations.keys()).join(", ")}`
                )
              )

              const negotiation = this.negotiations.get(negotiationId)
              if (!negotiation) {
                log(colors.red(`   ❌ Negotiation not found: ${negotiationId}`))
                log(
                  colors.dim(
                    `   Available negotiations: ${Array.from(this.negotiations.keys()).join(", ")}`
                  )
                )
                return {
                  success: false,
                  error: `Invalid negotiation ID: ${negotiationId}. Available: ${Array.from(this.negotiations.keys()).join(", ")}`
                }
              }

              log(
                colors.green(`🔧 DEBUG: Found negotiation for ${negotiationId}`)
              )
              log(
                colors.yellow(
                  `💳 Creating payment request for $${agreedPrice} USDC (Negotiation: ${negotiationId})`
                )
              )

              const amountInSubunits = agreedPrice * 1000000 // USDC has 6 decimals
              log(
                colors.dim(`🔧 DEBUG: Amount in subunits: ${amountInSubunits}`)
              )

              log(colors.dim(`🔧 DEBUG: Creating JWT for ACK-Lab...`))
              const jwt = await this.createAuthJwt()
              log(
                colors.dim(
                  `🔧 DEBUG: JWT created, making request to ${this.ackLabUrl}/payment-request`
                )
              )

              const response = await fetch(
                `${this.ackLabUrl}/payment-request`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`
                  },
                  body: JSON.stringify({ amount: amountInSubunits })
                }
              )

              log(
                colors.dim(
                  `🔧 DEBUG: ACK-Lab response status: ${response.status}`
                )
              )

              if (!response.ok) {
                const errorText = await response.text()
                log(
                  colors.red(`🔧 DEBUG: ACK-Lab error response: ${errorText}`)
                )
                return {
                  success: false,
                  error: `Failed to create payment request: ${response.status} - ${errorText}`
                }
              }

              const responseData = await response.json()
              log(colors.dim(`🔧 DEBUG: ACK-Lab response data:`, responseData))

              const { paymentToken } = responseData

              if (!paymentToken) {
                log(colors.red(`🔧 DEBUG: No paymentToken in response`))
                return {
                  success: false,
                  error: "No payment token received from ACK-Lab"
                }
              }

              log(colors.green("✅ Payment request created"))
              log(
                colors.dim(
                  `🔧 DEBUG: Payment token: ${paymentToken.substring(0, 20)}...`
                )
              )
              return {
                success: true,
                paymentToken,
                amount: agreedPrice,
                message: `Payment of $${agreedPrice} USDC required. Please send payment using this token: ${paymentToken}`
              }
            } catch (error) {
              log(
                colors.red(
                  `🔧 DEBUG: Exception in createPaymentRequest: ${error}`
                )
              )
              log(colors.red(`🔧 DEBUG: Error stack:`, (error as Error).stack))
              return {
                success: false,
                error: `Failed to create payment request: ${error}`
              }
            }
          }
        }),

        verifyPaymentAndGrantAccess: tool({
          description: "Verify payment and grant time-limited access to data",
          parameters: z.object({
            receipt: z.string().describe("Payment receipt JWT"),
            negotiationId: z.string().describe("Negotiation ID")
          }),
          execute: async ({ receipt, negotiationId }) => {
            try {
              log(colors.cyan("🔍 Verifying payment receipt..."))

              const negotiation = this.negotiations.get(negotiationId)
              if (!negotiation) {
                return {
                  success: false,
                  error: "Invalid negotiation ID"
                }
              }

              // Parse receipt
              const parts = receipt.split(".")
              if (parts.length !== 3) {
                return { success: false, error: "Invalid receipt format" }
              }

              const payload = JSON.parse(
                Buffer.from(parts[1]!, "base64").toString()
              )

              // Check if already processed
              if (this.receipts.has(payload.paymentId)) {
                return { success: false, error: "Receipt already used" }
              }

              this.receipts.add(payload.paymentId)

              // Create access token
              const tokenId = crypto.randomUUID()
              const expiresAt = new Date()
              expiresAt.setHours(
                expiresAt.getHours() + negotiation.accessDurationHours
              )

              const accessToken: DataAccessToken = {
                token: `access_${tokenId}` as JwtString,
                datasetId: negotiation.datasetId,
                expiresAt,
                dataUrl: `http://localhost:5681/data/${tokenId}`
              }

              this.accessTokens.set(tokenId, accessToken)

              log(
                colors.green(
                  `✅ Access granted until ${expiresAt.toISOString()}`
                )
              )

              // Clean up negotiation
              this.negotiations.delete(negotiationId)

              return {
                success: true,
                accessToken: accessToken.token,
                dataUrl: accessToken.dataUrl,
                expiresAt: expiresAt.toISOString(),
                message: `Payment verified! Access granted to ${negotiation.datasetId} for ${negotiation.accessDurationHours} hours. Use the access token to retrieve data from: ${accessToken.dataUrl}`
              }
            } catch (error) {
              return {
                success: false,
                error: `Payment verification failed: ${error}`
              }
            }
          }
        })
      }
    })

    return {
      text: result.text,
      responseMessages: result.response.messages
    }
  }

  private getSystemPrompt(): string {
    return `You are a data provider agent that sells access to valuable datasets through negotiation.

Your DID is: ${this.did}

EXAMPLE ACCEPTANCE FLOW:
When you accept an offer (evaluateOffer returns accepted: true):
1. Call evaluateOffer → returns {accepted: true, negotiationId: "xxx", finalPrice: 100}
2. IMMEDIATELY call createPaymentRequest with negotiationId and finalPrice
3. Your final message will include the payment token automatically

AVAILABLE DATASETS:
${Object.entries(this.datasets)
  .map(
    ([id, data]) =>
      `- ${id}: ${data.name} (${data.size}, updates: ${data.updateFrequency})`
  )
  .join("\n")}

PRICING POLICY:
- Minimum: $${this.dataProviderPolicies.minPricePerHour}/hour
- Maximum: $${this.dataProviderPolicies.maxPricePerHour}/hour
- Auto-accept: ${this.dataProviderPolicies.autoAcceptThreshold * 100}% of maximum
- Max negotiation rounds: ${this.dataProviderPolicies.maxNegotiationRounds}

PROCESS:
1. When someone requests data, first verify they have Catena ICC using verifyCredentials
2. Check dataset availability using checkDataAvailability
3. Start negotiation with startNegotiation (begin at maximum price)
4. Evaluate their offers with evaluateOffer
5. CRITICAL: When evaluateOffer returns accepted: true, you MUST call createPaymentRequest IMMEDIATELY in the SAME tool call batch using the negotiationId and finalPrice from evaluateOffer
6. The payment token from createPaymentRequest will be included in your response automatically
7. When they provide receipt, verify and grant access with verifyPaymentAndGrantAccess

CRITICAL RULES:
- If evaluateOffer returns accepted: true AND shouldCreatePayment: true → IMMEDIATELY call createPaymentRequest with the negotiationId and finalPrice
- Call BOTH tools in the SAME response (evaluateOffer then createPaymentRequest)
- Do NOT wait for them to ask for payment
- The payment token will be included in your final response text automatically

NEGOTIATION STRATEGY:
- Start high (maximum price) and gradually decrease
- Auto-accept offers at or above ${this.dataProviderPolicies.autoAcceptThreshold * 100}% of max
- Never go below minimum price
- Be professional but firm in negotiations
- When you accept an offer, your response should mention that the payment token is included

IMPORTANT:
- Always verify Catena ICC before proceeding
- When evaluateOffer accepts an offer → IMMEDIATELY call createPaymentRequest in the SAME response
- If requestor asks for "payment token", "provide payment", or mentions payment after acceptance:
  1. Call findNegotiation with the dataset name (consumer-behavior-q4, etc.)
  2. Then call createPaymentRequest with the found negotiationId and agreed price
- When someone asks for payment token, respond with the token in your message
- Store and track negotiationId throughout the conversation
- Require payment before granting access
- Access tokens are time-limited based on agreement`
  }

  private async getModel() {
    if (process.env.OPENAI_API_KEY) {
      const { openai } = await import("@ai-sdk/openai")
      return openai("gpt-4o")
    } else if (process.env.ANTHROPIC_API_KEY) {
      const { anthropic } = await import("@ai-sdk/anthropic")
      return anthropic("claude-3-5-sonnet-20241022")
    } else {
      throw new Error(
        "No API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY"
      )
    }
  }
}
