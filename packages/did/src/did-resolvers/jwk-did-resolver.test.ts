import { describe, expect, it } from 'vitest';
import { resolveJwkDid } from './jwk-did-resolver.js';

describe('resolveJwkDid', () => {
  it('should resolve a valid did:jwk URI', async () => {
    // Örnek Ed25519 JWK (base64url encoded)
    const jwk = { kty: 'OKP', crv: 'Ed25519', x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo' };
    const encoded = Buffer.from(JSON.stringify(jwk)).toString('base64url');
    const did = `did:jwk:${encoded}`;

    const result = await resolveJwkDid(did);

    expect(result.didResolutionMetadata.error).toBeUndefined();
    expect(result.didDocument?.id).toBe(did);
    expect(result.didDocument?.verificationMethod?.[0].publicKeyJwk).toEqual(jwk);
  });

  it('should return error for invalid DID format', async () => {
    const result = await resolveJwkDid('did:jwk:invalid-payload!!!');
    expect(result.didResolutionMetadata.error).toBe('notFound');
  });
});