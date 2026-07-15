/**
 * Integration tests for createAuthClient (sm-22): a REAL @jeswr/solid-auth-core
 * authorization-code + PKCE + DPoP login against the dev issuer (the harness dev-issuer
 * fixture pattern extended with /authorize + /token — the harness's own issuer serves
 * discovery/JWKS only, so it cannot host a login itself), then the full decision-0012
 * rail: the session's guarded authFetch calling API routes protected by verifyApiRequest,
 * including the per-session single-use VP-POST nonce. Session restore round-trips through
 * a second client instance sharing the injected store (the "reload").
 *
 * All ports are dynamic. DPoP proofs are single-use (jti replay) — never reuse captured
 * headers here; replay negatives live in auth-api.test.ts.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { createApiVerifier, createNonceStore, verifyApiRequest } from "../src/auth/api.js";
import { type CreateAuthClientOptions, createAuthClient } from "../src/auth/client.js";
import {
  createMemoryLocalStorage,
  type DevOidcIssuer,
  InMemorySessionStore,
  startDevOidcIssuer,
} from "../src/auth/dev-issuer.js";

/** Drive the OP's authorization page headlessly: follow the 302 back to the callback. */
async function popupDriver(authorizationUrl: URL): Promise<string> {
  const response = await fetch(authorizationUrl, { redirect: "manual" });
  const location = response.headers.get("location");
  if (response.status !== 302 || location === null) {
    throw new Error(`dev issuer refused the authorization request: ${response.status}`);
  }
  return location;
}

interface TestApiServer {
  origin: string;
  stop(): Promise<void>;
}

/** A minimal Node host for verifyApiRequest-protected routes (the lender's /api/**). */
async function startApiServer(
  nonces: ReturnType<typeof createNonceStore>,
  options: {
    trustedIssuer: string;
    webidFetch: typeof fetch;
  },
): Promise<TestApiServer> {
  const verifier = createApiVerifier({
    trustedIssuers: [options.trustedIssuer],
    allowInsecureLoopback: true,
    bidirectionalMode: "strict",
    // The dev issuer's TLS-strip seam: its https-schemed WebID lives on loopback HTTP.
    webidFetch: options.webidFetch,
  });

  let origin = "";
  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = `${origin}${request.url ?? "/"}`;
    if (request.url === "/api/redirect") {
      // Same-origin redirect bait: a credentialed client must REFUSE to follow it.
      response.statusCode = 302;
      response.setHeader("location", `${origin}/api/whoami`);
      response.end();
      return;
    }
    const auth = await verifyApiRequest(
      { headers: request.headers, method: request.method ?? "GET", url },
      { verifier },
    );
    if (auth instanceof Response) {
      response.statusCode = auth.status;
      const challenge = auth.headers.get("www-authenticate");
      if (challenge !== null) response.setHeader("www-authenticate", challenge);
      response.setHeader("content-type", "application/json");
      response.end(await auth.text());
      return;
    }
    if (request.method === "GET" && request.url === "/api/nonce") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ nonce: nonces.mint(auth.webid) }));
      return;
    }
    if (request.method === "POST" && request.url === "/api/present") {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk as Buffer);
      const presentation = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        nonce?: string;
      };
      if (
        typeof presentation.nonce !== "string" ||
        !nonces.consume(auth.webid, presentation.nonce)
      ) {
        response.statusCode = 400;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ error: "invalid_nonce" }));
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ webid: auth.webid }));
      return;
    }
    if (request.method === "GET" && request.url === "/api/whoami") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ webid: auth.webid }));
      return;
    }
    response.statusCode = 404;
    response.end();
  };

  const server: Server = createServer((request, response) => {
    handle(request, response).catch(() => {
      response.statusCode = 500;
      response.end();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("api server bind failed");
  origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    stop() {
      server.closeAllConnections();
      return new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      });
    },
  };
}

describe("createAuthClient — real Solid-OIDC login + the decision-0012 API rail", () => {
  let issuer: DevOidcIssuer;
  let api: TestApiServer;
  const nonces = createNonceStore();
  /** Shared across client instances — the durable credential surviving a "reload". */
  const store = new InMemorySessionStore();

  const clientOptions = (): CreateAuthClientOptions => ({
    callbackUri: `${issuer.issuer}/callback.html`,
    clientId: `${issuer.issuer}/clientid.jsonld`,
    authFlow: { getCode: popupDriver },
    store,
    allowInsecureLoopback: true,
    allowedOrigins: [api.origin],
    // The dev issuer's WebID is https-schemed but served on its loopback HTTP port.
    profileFetch: issuer.profileFetch,
  });

  beforeAll(async () => {
    vi.stubGlobal("localStorage", createMemoryLocalStorage());
    issuer = await startDevOidcIssuer();
    api = await startApiServer(nonces, {
      trustedIssuer: issuer.issuer,
      webidFetch: issuer.profileFetch,
    });
  }, 30_000);

  afterAll(async () => {
    await api.stop();
    await issuer.stop();
    vi.unstubAllGlobals();
  });

  test("login() completes the authorization-code + PKCE + DPoP flow", async () => {
    const client = createAuthClient(clientOptions());
    expect(client.simulated).toBe(false);
    expect(client.webId).toBeNull();

    const result = await client.login(issuer.webid);
    expect(result.webId).toBe(issuer.webid);
    expect(client.webId).toBe(issuer.webid);
    // The engine reports the issuer as a normalised URL href (trailing slash).
    expect(client.issuer).toBe(new URL(issuer.issuer).href);
  }, 20_000);

  test("authFetch carries the DPoP-bound token verifyApiRequest accepts; anonymous is 401", async () => {
    const client = createAuthClient(clientOptions());
    await client.login(issuer.webid);

    const whoami = await client.authFetch(`${api.origin}/api/whoami`);
    expect(whoami.status).toBe(200);
    expect(await whoami.json()).toEqual({ webid: issuer.webid });

    // Prove the route is actually protected before trusting the 200 above.
    const anonymous = await fetch(`${api.origin}/api/whoami`);
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("www-authenticate")).toBeTruthy();
  }, 20_000);

  test("VP-POST nonce rail: minted challenge verifies once, never twice", async () => {
    const client = createAuthClient(clientOptions());
    await client.login(issuer.webid);

    const minted = await client.authFetch(`${api.origin}/api/nonce`);
    expect(minted.status).toBe(200);
    const { nonce } = (await minted.json()) as { nonce: string };
    expect(nonce.length).toBeGreaterThanOrEqual(43); // 32 random bytes base64url

    const present = (body: unknown) =>
      client.authFetch(`${api.origin}/api/present`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

    const first = await present({ nonce });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ webid: issuer.webid });

    // Same nonce on a FRESH authenticated request (fresh DPoP proof, so the failure
    // below is the nonce's single-use rule, not jti replay).
    const second = await present({ nonce });
    expect(second.status).toBe(400);
    expect(await second.json()).toEqual({ error: "invalid_nonce" });
  }, 20_000);

  test("session restore round-trip: a second client silently restores from the shared store", async () => {
    const first = createAuthClient(clientOptions());
    await first.login(issuer.webid);

    // A "reload": fresh client, same injected store + localStorage pointer.
    const second = createAuthClient(clientOptions());
    const outcome = await second.restore();
    expect(outcome).toEqual({ outcome: "restored", webId: issuer.webid });
    expect(second.webId).toBe(issuer.webid);

    // The restored session's token (a fresh refresh-grant mint) works against the API.
    const whoami = await second.authFetch(`${api.origin}/api/whoami`);
    expect(whoami.status).toBe(200);
    expect(await whoami.json()).toEqual({ webid: issuer.webid });

    // Logout deletes the credential: the NEXT client cannot restore (fail-closed).
    await second.logout();
    expect(second.webId).toBeNull();
    const third = createAuthClient(clientOptions());
    expect(await third.restore()).toEqual({ outcome: "login" });
  }, 30_000);

  test("authFetch REFUSES redirects — a 3xx never re-attaches the credential", async () => {
    const client = createAuthClient(clientOptions());
    await client.login(issuer.webid);
    // Even a same-(allowed-)origin redirect is refused: following it would let the
    // engine mint a fresh DPoP credential for the hop (roborev sm-22 High).
    await expect(client.authFetch(`${api.origin}/api/redirect`)).rejects.toThrow(/redirect/iu);
  }, 20_000);

  test("session-change listeners fire on login and logout", async () => {
    const client = createAuthClient(clientOptions());
    const seen: Array<string | null> = [];
    const unsubscribe = client.onSessionChange(({ webId }) => {
      seen.push(webId);
    });
    await client.login(issuer.webid);
    await client.logout();
    unsubscribe();
    expect(seen).toContain(issuer.webid);
    expect(seen.at(-1)).toBeNull();
  }, 20_000);
});
