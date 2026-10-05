# Extension: Web Surface (stub)

**Extracts v2 working draft section 8.2 (OAuth carriage, discovery, keyless
clients) and the Web Bot Auth directory (3.2, L3).**

Core's signed-request carriage already uses the Web Bot Auth wire format. This
extension adds the surfaces that make an agent legible to infrastructure that
is not an ACK verifier: WBA edges, OAuth authorization servers, MCP servers.

## Adds

- **OIDC discovery key resolution** (opt-in profile). For orgs whose JWKS
  lives behind an OAuth2/OIDC `jwks_uri` (a Keycloak realm, a hosted IdP)
  rather than at core's fixed paths.
  Explicitly configured per identity by the verifier, never triggered by a
  404 on the fixed path (core resolution has no fallback). For a configured
  identity, the discovered `jwks_uri` is the sole key location and replaces
  core's fixed path. Key sets from the two locations MUST NOT be unioned; a
  union would stop key removal at either location from revoking.
  Requirements: the RFC 8414 insertion form is fetched first and, when it
  yields a valid document, is authoritative. The OIDC path-append form is
  consulted only when the insertion form returns no document. When both
  were fetched and disagree on `issuer` or `jwks_uri`, the verifier MUST
  reject rather than choose. The discovery document's `issuer` MUST exactly
  equal the identity URL. The `jwks_uri` MUST be same-origin with the
  identity URL. Core's SSRF, redirect, timeout, and size rules apply to
  every fetch, including the `jwks_uri` target.
- **Web Bot Auth directory.** Hosting
  `/.well-known/http-message-signatures-directory` at the agent's signing
  origin (a dedicated subdomain), per the HTTP message signatures directory
  draft, so CDN-style edges that speak that draft recognize the agent. Same
  keys as the core DID document, republished at the location their spec
  requires.
- **OAuth via CIMD.** The identity URL doubles as an OAuth Client ID Metadata
  Document `client_id`: registration by URL alone, `private_key_jwt` client
  authentication, no client secret. Hardware-backed P-256 keys plug in here.
- **DPoP-bound tokens** (RFC 9449), with the `mh` claim binding the `Grant`
  field on the OAuth carriage: base64url SHA-256 over the re-serialized
  (RFC 9651) structured-field form, never raw wire bytes.
- **RP discovery.** The well-known document advertising audience identifier,
  required scopes, accepted carriages, and supported extensions; 401
  challenges naming the same parameters; RFC 9728 protected-resource metadata
  for MCP servers.
- **Keyless clients.** MCP assistant clients with
  `token_endpoint_auth_method: none` and PKCE: bearer sessions that satisfy
  no `cnf`-bound grant and are never an ACK-verified chain; ACK guarantees
  come from a key-holding gateway signing upstream.

## Registers

- Artifact type `dpop+jwt` usage profile and the `mh` DPoP claim.
- The RP discovery document location and schema.
