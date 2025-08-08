/**
 * Utility for handling both local and Replit environments
 */

/**
 * Port mapping for Replit - maps local ports to external ports
 */
const REPLIT_PORT_MAPPING: Record<number, number> = {
  3000: 80, // Web UI
  5677: 3000, // Router
  5678: 3001, // Swap Requestor
  5679: 3002, // Swap Executor
  5680: 3003, // ACK-Lab
  5681: 4200, // Data Provider
  5682: 5000 // Data Requestor
}

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
 * Get the external port for Replit
 * @param localPort - The local port number
 */
function getReplitExternalPort(localPort: number): string {
  const externalPort = REPLIT_PORT_MAPPING[localPort]
  if (!externalPort) {
    // If not mapped, use the local port as-is
    return `:${localPort}`
  }
  // Port 80 doesn't need to be specified in URLs
  return externalPort === 80 ? "" : `:${externalPort}`
}

/**
 * Generate a service URL for the current environment
 * @param port - The port number for the service
 * @param path - Optional path to append
 */
export function getServiceUrl(port: number, path: string = ""): string {
  if (isReplit() && process.env.REPLIT_DEV_DOMAIN) {
    // On Replit, use the external domain with the mapped port
    const externalPort = getReplitExternalPort(port)
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
    // On Replit, use the external domain with mapped external port
    const externalPort = REPLIT_PORT_MAPPING[port] || port
    // Port 80 is omitted in DID Web URIs
    if (externalPort === 80) {
      return `did:web:${process.env.REPLIT_DEV_DOMAIN}`
    }
    return `did:web:${process.env.REPLIT_DEV_DOMAIN}%3A${externalPort}`
  }
  // Local development - use localhost with encoded colon
  return `did:web:localhost%3A${port}`
}

/**
 * Get the local port from external port (reverse mapping for Replit)
 */
function getLocalPortFromExternal(externalPort: number): number {
  // Find the local port that maps to this external port
  for (const [local, external] of Object.entries(REPLIT_PORT_MAPPING)) {
    if (external === externalPort) {
      return parseInt(local, 10)
    }
  }
  // If not found in mapping, assume it's the same
  return externalPort
}

/**
 * Extract port from a DID Web URI
 */
export function extractPortFromDid(did: string): number | null {
  // Match patterns like did:web:localhost%3A5678 or did:web:domain%3A5678
  const match = did.match(/%3A(\d+)/)
  if (match && match[1]) {
    const port = parseInt(match[1], 10)
    // If on Replit and the DID contains the Replit domain, convert external to local port
    if (isReplit() && did.includes(process.env.REPLIT_DEV_DOMAIN || "")) {
      return getLocalPortFromExternal(port)
    }
    return port
  }
  // Also check for unencoded colons (shouldn't happen but just in case)
  const unmatchedColon = did.match(/:(\d+)$/)
  if (unmatchedColon && unmatchedColon[1]) {
    const port = parseInt(unmatchedColon[1], 10)
    if (isReplit() && did.includes(process.env.REPLIT_DEV_DOMAIN || "")) {
      return getLocalPortFromExternal(port)
    }
    return port
  }
  // Check if it's a Replit domain without port (port 80)
  if (
    isReplit() &&
    did.includes(process.env.REPLIT_DEV_DOMAIN || "") &&
    !did.match(/%3A\d+/)
  ) {
    return 3000 // Port 80 maps to local port 3000
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
