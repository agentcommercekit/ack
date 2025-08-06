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
