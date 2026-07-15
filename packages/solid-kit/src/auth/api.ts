/**
 * Server-side API-route verification (sm-22; decision 0012 rail 1): the lender's
 * `/api/**` route handlers verify DPoP-bound Solid-OIDC via `@jeswr/solid-api-auth`
 * (RFC 9068 `at+jwt` + RFC 9449 proof-of-possession + jti replay protection + the
 * SSRF-guarded bidirectional WebID↔issuer check), and the VP-POST rail's per-session
 * single-use nonces are minted/consumed here.
 *
 * SERVER-ONLY subpath (`@mortgage/solid-kit/auth/api`) — never import from browser code.
 */
import {
  ApiAuthError,
  type ApiCredentials,
  apiAuthErrorToResponse,
  DpopApiVerifier,
  type DpopApiVerifierOptions,
  InProcessReplayStore,
  type RateLimiter,
  type ReplayStore,
  type RequestLike,
  TokenBucketRateLimiter,
  verifyRequest,
} from "@jeswr/solid-api-auth/next";

// Re-export the verifier surface so apps type against solid-kit only.
export {
  ApiAuthError,
  type ApiCredentials,
  apiAuthErrorToResponse,
  DpopApiVerifier,
  type DpopApiVerifierOptions,
  InProcessReplayStore,
  type RateLimiter,
  type ReplayStore,
  type RequestLike,
  TokenBucketRateLimiter,
};

/**
 * Build the process-wide verifier. Construct ONCE (module scope) and reuse across
 * requests — issuer discovery, JWKS, and the jti replay store live on the instance;
 * a per-request verifier would let every captured DPoP proof replay cleanly.
 *
 * Decision-0012 defaults over `@jeswr/solid-api-auth`: solid-kit routes authenticate ANY
 * verified WebID (the borrower posting a VP is not the app owner), so `ownerWebId` is not
 * required here — the holder-binding check (`token WebID === credentialSubject.id`) is the
 * caller's per-presentation comparison against the returned `webid`.
 */
export function createApiVerifier(options: DpopApiVerifierOptions): DpopApiVerifier {
  return new DpopApiVerifier(options);
}

/** Options for {@link verifyApiRequest}. */
export interface VerifyApiRequestOptions {
  /** The pre-built, process-wide verifier ({@link createApiVerifier}). */
  verifier: DpopApiVerifier;
  /**
   * Require the verified WebID to equal the verifier's configured `ownerWebId` (the full
   * write gate; fail-closed 503 when unset). Default `false`: any verified WebID is
   * accepted and identity is returned — the VP-POST posture (decision 0012).
   */
  requireOwner?: boolean;
  /** Also enforce the same-origin CSRF check before verifying. Default `false`. */
  assertSameOrigin?: boolean;
  /** Optional per-WebID rate limiter (consumed AFTER successful verification). */
  rateLimiter?: RateLimiter;
}

/** The verified caller: the DPoP-bound token's WebID (plus issuer/client for logging). */
export interface VerifiedApiRequest {
  /** The authenticated WebID. */
  webid: string;
  /** The token's (trusted) issuer. */
  issuer: string;
  /** The token's `client_id`, when present. */
  clientId?: string;
}

/**
 * Verify a route-handler request's DPoP-bound Solid-OIDC credentials. Returns the
 * verified `{ webid }` on success, or the challenge `Response` (401/403/429/503 with
 * `WWW-Authenticate`) the handler should return as-is — discriminate with
 * `instanceof Response`. Never throws for auth failures; a non-auth error still becomes
 * a generic 500 `Response` (detail is never leaked to the client).
 *
 * Accepts any {@link RequestLike} — a web/Next `Request` maps straight in, and a Node
 * server can pass `{ headers, method, url }` with `url` ABSOLUTE (the DPoP `htu` binding
 * is reconstructed from it).
 */
export async function verifyApiRequest(
  request: RequestLike,
  options: VerifyApiRequestOptions,
): Promise<VerifiedApiRequest | Response> {
  try {
    const credentials = await verifyRequest(request.headers, request.method, request.url, {
      verifier: options.verifier,
      requireOwner: options.requireOwner ?? false,
      assertSameOrigin: options.assertSameOrigin ?? false,
      rateLimiter: options.rateLimiter,
    });
    const verified: VerifiedApiRequest = {
      webid: credentials.webId,
      issuer: credentials.issuer,
    };
    if (credentials.clientId !== undefined) verified.clientId = credentials.clientId;
    return verified;
  } catch (error) {
    return apiAuthErrorToResponse(error);
  }
}

// ── VP-POST nonce rail (decision 0012) ──────────────────────────────────────────────

/** Options for {@link createNonceStore}. */
export interface NonceStoreOptions {
  /** Challenge lifetime in ms. Default 5 minutes (a VP is minted and posted promptly). */
  ttlMs?: number;
  /** Bound on concurrently tracked sessions; oldest evicted beyond it. Default 10 000. */
  maxEntries?: number;
  /** Injected clock (`Date.now`) for deterministic tests. */
  now?: () => number;
}

/**
 * Per-session, single-use challenge nonces for the VP-POST rail: the lender mints a nonce
 * for the session, the borrower's wallet embeds it in the VP/proof it POSTs, and the
 * verifying route consumes it — equality is enforced and a nonce can never verify twice.
 */
export interface NonceStore {
  /**
   * Mint the session's challenge. AT MOST ONE challenge is live per session — minting
   * again replaces (and so invalidates) any previous unconsumed nonce.
   */
  mint(sessionKey: string): string;
  /**
   * Consume the session's challenge: `true` iff `nonce` equals the live, unexpired
   * challenge for `sessionKey` — in which case it is DELETED (single-use). A wrong guess
   * returns `false` WITHOUT burning the live challenge (an attacker cannot invalidate a
   * pending legitimate presentation), and an expired challenge is dropped.
   */
  consume(sessionKey: string, nonce: string): boolean;
  /** Number of live challenges (diagnostics/tests). */
  readonly size: number;
}

/** Constant-time string comparison (length-safe) — no early exit on first mismatch. */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bytesA = encoder.encode(a);
  const bytesB = encoder.encode(b);
  let diff = bytesA.length ^ bytesB.length;
  const length = Math.max(bytesA.length, bytesB.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (bytesA[i] ?? 0) ^ (bytesB[i] ?? 0);
  }
  return diff === 0;
}

const NONCE_BYTES = 32;

function randomNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  // base64url without padding (edge-safe: no node:crypto / Buffer).
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

/**
 * In-process {@link NonceStore}. Same horizontal-scaling caveat as
 * `@jeswr/solid-api-auth`'s replay store: process-local, so a multi-instance deployment
 * must swap in a shared implementation (Redis `SET key nonce EX ttl NX` + `GETDEL`) —
 * the interface is the seam.
 */
export function createNonceStore(options: NonceStoreOptions = {}): NonceStore {
  const ttlMs = options.ttlMs ?? 5 * 60_000;
  const maxEntries = options.maxEntries ?? 10_000;
  const now = options.now ?? Date.now;
  /** Insertion-ordered, so eviction drops the oldest-minted challenge first. */
  const live = new Map<string, { nonce: string; expiresAt: number }>();

  return {
    mint(sessionKey: string): string {
      const nonce = randomNonce();
      // Delete-then-set keeps insertion order meaningful for eviction.
      live.delete(sessionKey);
      live.set(sessionKey, { nonce, expiresAt: now() + ttlMs });
      if (live.size > maxEntries) {
        const oldest = live.keys().next();
        if (!oldest.done) live.delete(oldest.value);
      }
      return nonce;
    },
    consume(sessionKey: string, nonce: string): boolean {
      const entry = live.get(sessionKey);
      if (entry === undefined) return false;
      if (entry.expiresAt <= now()) {
        live.delete(sessionKey);
        return false;
      }
      if (!timingSafeEqualStrings(entry.nonce, nonce)) return false;
      live.delete(sessionKey);
      return true;
    },
    get size(): number {
      return live.size;
    },
  };
}
