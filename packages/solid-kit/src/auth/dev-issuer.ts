/**
 * Test-only dev Solid-OIDC issuer (sm-22) — the harness's dev-issuer/DPoP fixture
 * (src/harness.ts, lifted from sparq's oidc.test.mjs) EXTENDED with the endpoints a
 * BROWSER LOGIN needs: `/authorize` (authorization-code + PKCE S256 + `dpop_jkt`) and
 * `/token` (code + refresh grants, DPoP-bound, RFC 9068 `at+jwt` minting), so
 * `createAuthClient` completes a real `@jeswr/solid-auth-core` login against it in tests,
 * and `verifyApiRequest` verifies the tokens it mints. The harness's own minimal issuer
 * (discovery + JWKS + WebID only) is untouched — pod boot stays in harness.ts
 * (decision 0009).
 *
 * NEVER a production issuer: codes/refresh tokens live in process memory, every
 * authorization request is auto-approved (there is no resource owner to ask), and the
 * whole thing serves loopback HTTP. Exported via `@mortgage/solid-kit/testing` only.
 */
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { PersistedSession, SessionStore } from "@jeswr/solid-auth-core";
import {
  base64url,
  calculateJwkThumbprint,
  EmbeddedJWK,
  exportJWK,
  generateKeyPair,
  type JWK,
  jwtVerify,
  SignJWT,
} from "jose";

const DEFAULT_TOKEN_LIFETIME_SECONDS = 300;
/** DPoP proof `iat` freshness window the fixture accepts (RFC 9449 recommends small). */
const PROOF_FRESHNESS_SECONDS = 300;

/** Everything {@link DevOidcIssuer.mintAccessToken} lets a (negative) test override. */
export interface DevAccessTokenOverrides {
  /** The `webid` claim. Defaults to the issuer's own WebID. */
  webid?: string;
  /** The `aud` claim. Defaults to `"solid"`. */
  audience?: string;
  /** Issue time (epoch seconds). Defaults to now. */
  issuedAtSeconds?: number;
  /** Lifetime from `issuedAtSeconds`. Defaults to the issuer's token lifetime. */
  expiresInSeconds?: number;
  /** The JOSE `typ` header. Defaults to `"at+jwt"` (RFC 9068). */
  typ?: string;
}

/** A DPoP client key: mints RFC 9449 proofs for arbitrary requests (test plumbing). */
export interface DevDpopClient {
  /** The key's JWK SHA-256 thumbprint — what `cnf.jkt` must equal. */
  readonly jkt: string;
  /** Mint a proof for `method`+`htu`. Fresh single-use `jti` unless overridden. */
  proof(
    method: string,
    htu: string,
    options?: { accessToken?: string; jti?: string; issuedAtSeconds?: number },
  ): Promise<string>;
}

/** Mint an independent DPoP client key (proof generator) for tests. */
export async function createDevDpopClient(): Promise<DevDpopClient> {
  const keys = await generateKeyPair("ES256", { extractable: true });
  const publicJwk = await exportJWK(keys.publicKey);
  const jkt = await calculateJwkThumbprint(publicJwk);
  return {
    jkt,
    async proof(method, htu, options = {}) {
      const claims: Record<string, unknown> = {
        htm: method,
        htu,
        jti: options.jti ?? randomUUID(),
      };
      if (options.accessToken !== undefined) {
        claims.ath = base64url.encode(
          createHash("sha256").update(options.accessToken, "ascii").digest(),
        );
      }
      return new SignJWT(claims)
        .setProtectedHeader({ alg: "ES256", jwk: publicJwk, typ: "dpop+jwt" })
        .setIssuedAt(options.issuedAtSeconds)
        .sign(keys.privateKey);
    },
  };
}

/** The running dev issuer. */
export interface DevOidcIssuer {
  /** The issuer origin (loopback HTTP, dynamic port). */
  readonly issuer: string;
  /**
   * The single identity this issuer authenticates. HTTPS-SCHEMED
   * (`https://localhost:<port>/profile#me`) even though the fixture serves plain HTTP:
   * verifiers hard-require `https:` WebID claims (RFC-conformant — and
   * `@jeswr/solid-api-auth`'s `allowInsecureLoopback` does NOT relax the claim scheme),
   * so the fixture plays a TLS terminator's role in name only. Dereference the profile
   * through {@link profileFetch}, which maps the https URL onto the real loopback HTTP
   * port.
   */
  readonly webid: string;
  /**
   * The TLS-termination stand-in: a fetch that rewrites requests for this issuer's
   * https-schemed URLs onto its actual loopback HTTP listener (all other URLs pass
   * through). Inject wherever the WebID profile is dereferenced — `profileFetch` on
   * `createAuthClient`, `webidFetch` on the API verifier.
   */
  readonly profileFetch: typeof fetch;
  /** The issuer's public JWKS (e.g. for `createLocalJWKSet` in verifier tests). */
  readonly jwks: { keys: JWK[] };
  /**
   * Headless credentials for an arbitrary request — the harness `identity.headers`
   * pattern: a cached `at+jwt` bound to an internal DPoP key plus a fresh single-use
   * proof per call. For driving `verifyApiRequest`-style resource servers directly.
   */
  authHeaders(method: string, htu: string): Promise<{ authorization: string; dpop: string }>;
  /** Mint an access token bound to `jkt`, with overrides for negative tests. */
  mintAccessToken(jkt: string, overrides?: DevAccessTokenOverrides): Promise<string>;
  stop(): Promise<void>;
}

/** Options for {@link startDevOidcIssuer}. */
export interface StartDevOidcIssuerOptions {
  /** Access-token lifetime (seconds). Default 300. */
  tokenLifetimeSeconds?: number;
}

interface AuthorizationCodeRecord {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  nonce: string;
}

interface RefreshTokenRecord {
  /** The DPoP key thumbprint the refresh token is bound to (key continuity). */
  jkt: string;
  webid: string;
}

class TokenEndpointError extends Error {
  constructor(
    readonly error: string,
    message: string,
  ) {
    super(message);
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
}

async function readForm(request: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

/** Verify an RFC 9449 DPoP proof (signature, typ, htm/htu, jti, freshness) → its jkt. */
async function verifyProof(proof: string, expected: { htm: string; htu: string }): Promise<string> {
  const { payload, protectedHeader } = await jwtVerify(proof, EmbeddedJWK, { typ: "dpop+jwt" });
  if (payload.htm !== expected.htm || payload.htu !== expected.htu) {
    throw new TokenEndpointError("invalid_dpop_proof", "DPoP proof htm/htu mismatch");
  }
  if (typeof payload.jti !== "string" || payload.jti === "") {
    throw new TokenEndpointError("invalid_dpop_proof", "DPoP proof missing jti");
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    typeof payload.iat !== "number" ||
    Math.abs(nowSeconds - payload.iat) > PROOF_FRESHNESS_SECONDS
  ) {
    throw new TokenEndpointError("invalid_dpop_proof", "DPoP proof iat outside freshness window");
  }
  return calculateJwkThumbprint(protectedHeader.jwk as JWK);
}

/**
 * Boot the dev issuer on a dynamic loopback port (`listen(0)` — nothing references the
 * URL before bind, mirroring harness.ts's identity server).
 */
export async function startDevOidcIssuer(
  options: StartDevOidcIssuerOptions = {},
): Promise<DevOidcIssuer> {
  const tokenLifetimeSeconds = options.tokenLifetimeSeconds ?? DEFAULT_TOKEN_LIFETIME_SECONDS;
  const issuerKeys = await generateKeyPair("ES256", { extractable: true });
  const issuerJwk: JWK = {
    ...(await exportJWK(issuerKeys.publicKey)),
    alg: "ES256",
    kid: "dev-issuer-signing-key",
    use: "sig",
  };

  let issuer = "";
  let webid = "";
  const authorizationCodes = new Map<string, AuthorizationCodeRecord>();
  const refreshTokens = new Map<string, RefreshTokenRecord>();

  async function mintAccessToken(
    jkt: string,
    overrides: DevAccessTokenOverrides = {},
  ): Promise<string> {
    const issuedAt = overrides.issuedAtSeconds ?? Math.floor(Date.now() / 1000);
    return new SignJWT({
      client_id: "https://app.example/client",
      cnf: { jkt },
      webid: overrides.webid ?? webid,
    })
      .setProtectedHeader({ alg: "ES256", kid: issuerJwk.kid, typ: overrides.typ ?? "at+jwt" })
      .setIssuer(issuer)
      .setSubject(overrides.webid ?? webid) // RFC 9068 basic sanity — verifiers require it
      .setAudience(overrides.audience ?? "solid")
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + (overrides.expiresInSeconds ?? tokenLifetimeSeconds))
      .sign(issuerKeys.privateKey);
  }

  async function mintIdToken(clientId: string, nonce: string): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    return new SignJWT({ webid, nonce })
      .setProtectedHeader({ alg: "ES256", kid: issuerJwk.kid })
      .setIssuer(issuer)
      .setSubject(webid)
      .setAudience(clientId)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + tokenLifetimeSeconds)
      .sign(issuerKeys.privateKey);
  }

  function handleAuthorize(url: URL, response: ServerResponse): void {
    const params = url.searchParams;
    const clientId = params.get("client_id") ?? "";
    const redirectUri = params.get("redirect_uri") ?? "";
    const state = params.get("state") ?? "";
    const nonce = params.get("nonce") ?? "";
    const codeChallenge = params.get("code_challenge") ?? "";
    const scope = params.get("scope") ?? "";
    if (
      clientId === "" ||
      redirectUri === "" ||
      state === "" ||
      nonce === "" ||
      codeChallenge === "" ||
      params.get("response_type") !== "code" ||
      params.get("code_challenge_method") !== "S256" ||
      !scope.split(/\s+/u).includes("webid")
    ) {
      sendJson(response, 400, { error: "invalid_request" });
      return;
    }
    // Auto-approve: there is no resource owner in the fixture. Single-use code.
    const code = randomUUID();
    authorizationCodes.set(code, { clientId, redirectUri, codeChallenge, nonce });
    const location = new URL(redirectUri);
    location.searchParams.set("code", code);
    location.searchParams.set("state", state);
    response.statusCode = 302;
    response.setHeader("location", location.href);
    response.end();
  }

  async function handleToken(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const form = await readForm(request);
    const proofHeader = request.headers.dpop;
    if (typeof proofHeader !== "string" || proofHeader === "") {
      throw new TokenEndpointError("invalid_dpop_proof", "token request carried no DPoP proof");
    }
    const jkt = await verifyProof(proofHeader, { htm: "POST", htu: `${issuer}/token` });
    const grantType = form.get("grant_type");

    if (grantType === "authorization_code") {
      const code = form.get("code") ?? "";
      const record = authorizationCodes.get(code);
      authorizationCodes.delete(code); // single-use, burned even on failure
      if (record === undefined) {
        throw new TokenEndpointError("invalid_grant", "unknown or replayed authorization code");
      }
      if (form.get("client_id") !== record.clientId) {
        throw new TokenEndpointError("invalid_grant", "client_id mismatch");
      }
      if (form.get("redirect_uri") !== record.redirectUri) {
        throw new TokenEndpointError("invalid_grant", "redirect_uri mismatch");
      }
      const verifier = form.get("code_verifier") ?? "";
      const challenge = base64url.encode(createHash("sha256").update(verifier, "ascii").digest());
      if (verifier === "" || challenge !== record.codeChallenge) {
        throw new TokenEndpointError("invalid_grant", "PKCE code_verifier mismatch");
      }
      const refreshToken = randomUUID();
      refreshTokens.set(refreshToken, { jkt, webid });
      sendJson(response, 200, {
        access_token: await mintAccessToken(jkt),
        token_type: "DPoP",
        expires_in: tokenLifetimeSeconds,
        refresh_token: refreshToken,
        id_token: await mintIdToken(record.clientId, record.nonce),
        scope: "openid webid offline_access",
      });
      return;
    }

    if (grantType === "refresh_token") {
      const presented = form.get("refresh_token") ?? "";
      const record = refreshTokens.get(presented);
      if (record === undefined) {
        throw new TokenEndpointError("invalid_grant", "unknown or rotated refresh token");
      }
      if (record.jkt !== jkt) {
        // Key continuity: the refresh token is DPoP-bound to the ORIGINAL key.
        throw new TokenEndpointError(
          "invalid_grant",
          "refresh token is bound to a different DPoP key",
        );
      }
      refreshTokens.delete(presented); // rotate
      const rotated = randomUUID();
      refreshTokens.set(rotated, record);
      sendJson(response, 200, {
        access_token: await mintAccessToken(jkt),
        token_type: "DPoP",
        expires_in: tokenLifetimeSeconds,
        refresh_token: rotated,
        scope: "openid webid offline_access",
      });
      return;
    }

    throw new TokenEndpointError("unsupported_grant_type", `grant_type ${String(grantType)}`);
  }

  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", issuer);
    if (request.method === "GET" && url.pathname === "/.well-known/openid-configuration") {
      sendJson(response, 200, {
        issuer,
        jwks_uri: `${issuer}/jwks`,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: ["openid", "webid", "offline_access"],
        token_endpoint_auth_methods_supported: ["none"],
        dpop_signing_alg_values_supported: ["ES256"],
        // oauth4webapi defaults to expecting RS256 ID tokens without this.
        id_token_signing_alg_values_supported: ["ES256"],
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/jwks") {
      sendJson(response, 200, { keys: [issuerJwk] });
      return;
    }
    if (request.method === "GET" && url.pathname === "/profile") {
      response.setHeader("content-type", "text/turtle");
      response.end(`<${webid}> <http://www.w3.org/ns/solid/terms#oidcIssuer> <${issuer}> .\n`);
      return;
    }
    if (request.method === "GET" && url.pathname === "/authorize") {
      handleAuthorize(url, response);
      return;
    }
    if (request.method === "POST" && url.pathname === "/token") {
      handleToken(request, response).catch((error: unknown) => {
        if (error instanceof TokenEndpointError) {
          sendJson(response, 400, { error: error.error, error_description: error.message });
        } else {
          sendJson(response, 500, { error: "server_error" });
        }
      });
      return;
    }
    response.statusCode = 404;
    response.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "localhost", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("dev issuer failed to bind a TCP port");
  }
  issuer = `http://localhost:${address.port}`;
  const httpsOrigin = `https://localhost:${address.port}`;
  webid = `${httpsOrigin}/profile#me`;

  const profileFetch: typeof fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === httpsOrigin || url.startsWith(`${httpsOrigin}/`)) {
      const target = `${issuer}${url.slice(httpsOrigin.length)}`;
      return input instanceof Request ? fetch(new Request(target, input)) : fetch(target, init);
    }
    return fetch(input as Parameters<typeof fetch>[0], init);
  };

  // The headless-credentials identity (harness `identity.headers` pattern).
  const headlessClient = await createDevDpopClient();
  let cachedToken: { value: string; mintedAt: number } | undefined;
  const tokenRefreshMs = 60_000;

  return {
    issuer,
    webid,
    profileFetch,
    jwks: { keys: [issuerJwk] },
    mintAccessToken,
    async authHeaders(method, htu) {
      const now = Date.now();
      if (cachedToken === undefined || now - cachedToken.mintedAt >= tokenRefreshMs) {
        cachedToken = { value: await mintAccessToken(headlessClient.jkt), mintedAt: now };
      }
      const proof = await headlessClient.proof(method, htu, { accessToken: cachedToken.value });
      return { authorization: `DPoP ${cachedToken.value}`, dpop: proof };
    },
    stop() {
      server.closeAllConnections();
      return new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      });
    },
  };
}

// ── Client-side test doubles (browser storage seams for Node test runs) ─────────────

/**
 * In-memory {@link SessionStore} for `createAuthClient({ store })` in Node tests. Shared
 * across client instances to simulate a persisted credential surviving a "reload".
 * (An injected store is assumed durable by the engine — that is exactly the semantics
 * a shared in-process Map gives a test.)
 */
export class InMemorySessionStore implements SessionStore {
  readonly #sessions = new Map<string, PersistedSession>();
  get(issuer: string): Promise<PersistedSession | undefined> {
    return Promise.resolve(this.#sessions.get(issuer));
  }
  put(session: PersistedSession): Promise<void> {
    this.#sessions.set(session.issuer, session);
    return Promise.resolve();
  }
  delete(issuer: string): Promise<void> {
    this.#sessions.delete(issuer);
    return Promise.resolve();
  }
}

/**
 * A minimal in-memory `localStorage` stand-in (Node lacks a functional one) for the
 * engine's silent-restore pointer + recent-accounts list in tests. Covers only the
 * members the engine touches.
 */
export function createMemoryLocalStorage(): Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "clear"
> {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, String(value));
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    clear: () => {
      entries.clear();
    },
  };
}
