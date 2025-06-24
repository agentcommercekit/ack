/**
 * Generates a random JTI for use in A2A messages
 * @returns a random JTI
 */
export function generateRandomJti(): string {
  return crypto.randomUUID()
}

/**
 * Generates a random nonce for use in A2A messages
 * @returns a random nonce
 */
export function generateRandomNonce(): string {
  return crypto.randomUUID()
}
