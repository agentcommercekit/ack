import type {
  DidUri,
  JwtString,
  Verifiable,
  W3CCredential
} from "agentcommercekit"

/**
 * Agent policies from ACK-Lab
 */
export interface AgentPolicies {
  /** Must counterparty have Catena-issued ICC? */
  requireCatenaICC: boolean
  /** Max USDC per transaction */
  maxTransactionSize: number
  /** Max USDC per day */
  dailyTransactionLimit: number
  /** Optional: whitelist of DIDs */
  trustedAgents?: string[]
}

/**
 * Swap request from user
 */
export interface SwapRequest {
  /** Amount of input token */
  amountIn: number
  /** "USDC" or "ETH" */
  tokenIn: string
  /** "USDC" or "ETH" */
  tokenOut: string
}

/**
 * Payment request structure
 */
export interface PaymentRequest {
  id: string
  issuer: DidUri
  amount: number
  recipient: DidUri
  expiresAt: Date
}

/**
 * Agent metadata from ACK-Lab
 */
export interface AgentMetadata {
  did: DidUri
  vc: JwtString
  policies?: AgentPolicies
}

/**
 * Token balances (in subunits)
 * USDC uses 6 decimals, ETH uses 18
 */
export interface TokenBalances {
  [key: string]: string
}

/**
 * ACK-Lab agent data
 */
export interface AgentData {
  did: DidUri
  vc: JwtString
  policies: AgentPolicies
  privateKey: string
}

/**
 * Policy check result
 */
export interface PolicyResult {
  allowed: boolean
  reason?: string
}

/**
 * Swap execution result
 */
export interface SwapResult {
  success: boolean
  amountOut?: number
  tokenOut?: string
  error?: string
}

/**
 * Data request from requestor
 */
export interface DataRequest {
  /** Dataset identifier */
  datasetId: string
  /** Purpose of data use */
  purpose: string
  /** Requested access duration in hours */
  accessDurationHours: number
  /** Requestor's DID */
  requestorDid: DidUri
}

/**
 * Price offer in negotiation
 */
export interface PriceOffer {
  /** Offered price in USDC */
  priceUsdc: number
  /** Dataset being negotiated */
  datasetId: string
  /** Access duration in hours */
  accessDurationHours: number
}

/**
 * Access token for data
 */
export interface DataAccessToken {
  /** JWT access token */
  token: JwtString
  /** Dataset ID */
  datasetId: string
  /** Expiration timestamp */
  expiresAt: Date
  /** Data endpoint URL */
  dataUrl: string
}

/**
 * Data provider policies
 */
export interface DataProviderPolicies extends AgentPolicies {
  /** Minimum price per hour in USDC */
  minPricePerHour: number
  /** Maximum price per hour in USDC */
  maxPricePerHour: number
  /** Auto-accept threshold (percentage of max price, e.g., 0.8 = 80%) */
  autoAcceptThreshold: number
  /** Maximum negotiation rounds */
  maxNegotiationRounds: number
  /** Available datasets */
  availableDatasets: string[]
}
