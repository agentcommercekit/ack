/**
 * Frontend utility for handling both local and Replit environments
 */

/**
 * Check if we're running on Replit by examining the current domain
 */
export function isReplit(): boolean {
  if (typeof window === "undefined") return false
  return window.location.hostname.includes("replit.dev")
}

/**
 * Get the base domain for the current environment
 */
export function getBaseDomain(): string {
  if (typeof window === "undefined") return "localhost"

  if (isReplit()) {
    // Extract the base Replit domain (without port)
    const hostname = window.location.hostname
    return hostname
  }
  return "localhost"
}

/**
 * Generate a service URL for the current environment
 * @param port - The port number for the service
 * @param path - Optional path to append
 */
export function getServiceUrl(port: number, path: string = ""): string {
  if (isReplit()) {
    const domain = getBaseDomain()
    // On Replit, use HTTPS with the domain and port
    // Port 3000 (web UI) is mapped to 80 so we don't include it
    const externalPort = port === 3000 ? "" : `:${port}`
    return `https://${domain}${externalPort}${path}`
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
  const domain = getBaseDomain()
  if (isReplit()) {
    // On Replit, use the domain with encoded colon before port
    return `did:web:${domain}%3A${port}`
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
  if (match) {
    return parseInt(match[1], 10)
  }
  // Also check for unencoded colons (shouldn't happen but just in case)
  const unmatchedColon = did.match(/:(\d+)$/)
  if (unmatchedColon) {
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
