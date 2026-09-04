---
"@agentcommercekit/did": patch
---

Fixed `did:jwks` resolution not applying a URL policy to the `jwks_uri`
an OIDC discovery document can point resolution at.

`did:jwks` resolution (via `jwks-did-resolver`) falls back to fetching an
OpenID configuration document when the direct JWKS endpoint is unavailable,
and follows a `jwks_uri` found there. Unlike `did:web`, where the fetch
target is built deterministically from the DID string itself, this
OIDC-discovered target comes from response content an attacker-controlled
DID host can shape - a classic SSRF shape, since it could point at an
internal service, a cloud metadata endpoint (e.g. `169.254.169.254`), or
other loopback/private/link-local addresses.

Every fetch the jwks resolver makes (the direct JWKS try, the OpenID
configuration fetch, and the discovered `jwks_uri` fetch) now goes through a
policy check requiring `https:` and rejecting loopback, unspecified,
private (RFC1918), and link-local IPv4/IPv6 targets, including
IPv4-mapped/compatible IPv6 forms.

This is a hostname/IP-literal check performed before each request; it does
not protect against DNS rebinding (a hostname resolving to a disallowed IP
only at connect time), which would require enforcement at the socket layer.
