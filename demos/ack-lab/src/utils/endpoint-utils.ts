/**
 * Utility for handling both local and Replit environments
 */

/**
 * Check if we're running on Replit
 */
export function isReplit(): boolean {
  return !!process.env.REPLIT_DEV_DOMAIN
}

/**
 * Get the base domain for the current environment
 */
export function getBaseDomain(): string {
  if (isReplit() && process.env.REPLIT_DEV_DOMAIN) {
    return process.env.REPLIT_DEV_DOMAIN
  }
  return "localhost"
}

/**
 * Generate a service URL for the current environment
 * @param port - The port number for the service
 * @param path - Optional path to append
 */
export function getServiceUrl(port: number, path: string = ""): string {
  if (isReplit() && process.env.REPLIT_DEV_DOMAIN) {
    // On Replit, use the external domain with the port
    // For port 3000 (web UI), Replit maps it to port 80
    const externalPort = port === 3000 ? "" : `:${port}`
    return `https://${process.env.REPLIT_DEV_DOMAIN}${externalPort}${path}`
  }
  // Local development
  return `http://localhost:${port}${path}`
}

/**
 * Get all service endpoints for the current environment
 */
export function getServiceEndpoints() {
  return {
    router: getServiceUrl(5677),
    swapRequestor: getServiceUrl(5678),
    swapExecutor: getServiceUrl(5679),
    ackLab: getServiceUrl(5680),
    dataProvider: getServiceUrl(5681),
    dataRequestor: getServiceUrl(5682),
    webUI: getServiceUrl(3000)
  }
}

/**
 * Create a DID Web URI for the current environment
 * @param port - The port number for the service
 */
export function createDidWebForEnvironment(port: number): string {
  if (isReplit() && process.env.REPLIT_DEV_DOMAIN) {
    // On Replit, use the external domain with port
    return `did:web:${process.env.REPLIT_DEV_DOMAIN}%3A${port}`
  }
  // Local development - use localhost with encoded colon
  return `did:web:localhost%3A${port}`
}

/**
 * Extract port from a DID Web URI
 */
export function extractPortFromDid(did: string): number | null {
  // Match patterns like did:web:localhost%3A5678 or did:web:domain%3A5678
  const match = did.match(/%3A(\d+)/)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  // Also check for unencoded colons (shouldn't happen but just in case)
  const unmatchedColon = did.match(/:(\d+)$/)
  if (unmatchedColon && unmatchedColon[1]) {
    return parseInt(unmatchedColon[1], 10)
  }
  return null
}

/**
 * Get the URL for a DID-based service
 */
export function getUrlFromDid(did: string): string | null {
  const port = extractPortFromDid(did)
  if (!port) return null
  return getServiceUrl(port)
}
