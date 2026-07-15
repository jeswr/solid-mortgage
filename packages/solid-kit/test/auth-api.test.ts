/**
 * Security-surface tests for verifyApiRequest + the VP-POST nonce store (sm-22,
 * decision 0012). Exhaustive negatives: every DPoP/token failure mode must produce a
 * challenge Response, and a captured proof must never verify twice (jti replay).
 *
 * Requests are plain RequestLike objects (headers/method/url) — no HTTP server needed;
 * the verifier reconstructs `htu` from the absolute URL exactly as it would in a route
 * handler.
 */
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createApiVerifier,
  createNonceStore,
  type DpopApiVerifier,
  verifyApiRequest,
} from "../src/auth/api.js";
import {
  createDevDpopClient,
  type DevDpopClient,
  type DevOidcIssuer,
  startDevOidcIssuer,
} from "../src/auth/dev-issuer.js";

const API_URL = "https://lender.example/api/present";

describe("verifyApiRequest — DPoP-bound Solid-OIDC verification", () => {
  let issuer: DevOidcIssuer;
  let rogueIssuer: DevOidcIssuer;
  let client: DevDpopClient;
  let verifier: DpopApiVerifier;

  const makeVerifier = () =>
    createApiVerifier({
      trustedIssuers: [issuer.issuer],
      allowInsecureLoopback: true,
      bidirectionalMode: "strict",
      webidFetch: issuer.profileFetch, // TLS-strip seam: the https-schemed WebID lives on the loopback HTTP port
    });

  /** A fully valid request: fresh token bound to `client`, fresh proof with ath. */
  async function validRequest(url = API_URL, method = "POST") {
    const accessToken = await issuer.mintAccessToken(client.jkt);
    const dpop = await client.proof(method, url, { accessToken });
    return {
      headers: { authorization: `DPoP ${accessToken}`, dpop },
      method,
      url,
    };
  }

  beforeAll(async () => {
    issuer = await startDevOidcIssuer();
    rogueIssuer = await startDevOidcIssuer();
    client = await createDevDpopClient();
    verifier = makeVerifier();
  }, 30_000);

  afterAll(async () => {
    await issuer.stop();
    await rogueIssuer.stop();
  });

  function expectChallenge(result: unknown, status: number): asserts result is Response {
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(status);
  }

  test("accepts a valid DPoP-bound token and returns the WebID", async () => {
    const result = await verifyApiRequest(await validRequest(), { verifier });
    expect(result).toEqual({
      webid: issuer.webid,
      issuer: issuer.issuer,
      clientId: "https://app.example/client",
    });
  });

  test("REJECTS a replayed DPoP proof (jti single-use)", async () => {
    const request = await validRequest();
    const first = await verifyApiRequest(request, { verifier });
    expect(first).not.toBeInstanceOf(Response);

    const replayed = await verifyApiRequest(request, { verifier });
    expectChallenge(replayed, 401);
    expect(replayed.headers.get("www-authenticate")).toBeTruthy();
  });

  test("rejects a request with no credentials (401 + WWW-Authenticate)", async () => {
    const result = await verifyApiRequest(
      { headers: {}, method: "POST", url: API_URL },
      { verifier },
    );
    expectChallenge(result, 401);
    expect(result.headers.get("www-authenticate")).toBeTruthy();
  });

  test("rejects a Bearer (non-DPoP) presentation of the token", async () => {
    const { headers, method, url } = await validRequest();
    const result = await verifyApiRequest(
      {
        headers: { authorization: headers.authorization.replace(/^DPoP/u, "Bearer") },
        method,
        url,
      },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects a missing DPoP proof header", async () => {
    const { headers, method, url } = await validRequest();
    const result = await verifyApiRequest(
      { headers: { authorization: headers.authorization }, method, url },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects a proof signed by a DIFFERENT key than cnf.jkt binds (stolen token)", async () => {
    const thief = await createDevDpopClient();
    const accessToken = await issuer.mintAccessToken(client.jkt); // bound to `client`
    const dpop = await thief.proof("POST", API_URL, { accessToken });
    const result = await verifyApiRequest(
      { headers: { authorization: `DPoP ${accessToken}`, dpop }, method: "POST", url: API_URL },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects an htu mismatch (proof minted for a different URL)", async () => {
    const accessToken = await issuer.mintAccessToken(client.jkt);
    const dpop = await client.proof("POST", "https://other.example/api/steal", { accessToken });
    const result = await verifyApiRequest(
      { headers: { authorization: `DPoP ${accessToken}`, dpop }, method: "POST", url: API_URL },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects an htm mismatch (proof minted for a different method)", async () => {
    const accessToken = await issuer.mintAccessToken(client.jkt);
    const dpop = await client.proof("GET", API_URL, { accessToken });
    const result = await verifyApiRequest(
      { headers: { authorization: `DPoP ${accessToken}`, dpop }, method: "POST", url: API_URL },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects a proof missing the ath access-token hash", async () => {
    const accessToken = await issuer.mintAccessToken(client.jkt);
    const dpop = await client.proof("POST", API_URL); // no accessToken → no ath claim
    const result = await verifyApiRequest(
      { headers: { authorization: `DPoP ${accessToken}`, dpop }, method: "POST", url: API_URL },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects a stale proof (iat far outside the freshness window)", async () => {
    const accessToken = await issuer.mintAccessToken(client.jkt);
    const dpop = await client.proof("POST", API_URL, {
      accessToken,
      issuedAtSeconds: Math.floor(Date.now() / 1000) - 3600,
    });
    const result = await verifyApiRequest(
      { headers: { authorization: `DPoP ${accessToken}`, dpop }, method: "POST", url: API_URL },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects a token from an UNTRUSTED issuer", async () => {
    const rogueClient = await createDevDpopClient();
    const accessToken = await rogueIssuer.mintAccessToken(rogueClient.jkt);
    const dpop = await rogueClient.proof("POST", API_URL, { accessToken });
    const result = await verifyApiRequest(
      { headers: { authorization: `DPoP ${accessToken}`, dpop }, method: "POST", url: API_URL },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects an EXPIRED access token", async () => {
    const accessToken = await issuer.mintAccessToken(client.jkt, {
      issuedAtSeconds: Math.floor(Date.now() / 1000) - 3600,
      expiresInSeconds: 60,
    });
    const dpop = await client.proof("POST", API_URL, { accessToken });
    const result = await verifyApiRequest(
      { headers: { authorization: `DPoP ${accessToken}`, dpop }, method: "POST", url: API_URL },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects a token whose JOSE typ is not at+jwt", async () => {
    const accessToken = await issuer.mintAccessToken(client.jkt, { typ: "JWT" });
    const dpop = await client.proof("POST", API_URL, { accessToken });
    const result = await verifyApiRequest(
      { headers: { authorization: `DPoP ${accessToken}`, dpop }, method: "POST", url: API_URL },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("rejects a TAMPERED token (signature no longer verifies)", async () => {
    const { headers, method, url } = await validRequest();
    const [h, payload, signature] = headers.authorization.slice("DPoP ".length).split(".");
    const tampered = `${h}.${payload?.slice(0, -2)}aa.${signature}`;
    const result = await verifyApiRequest(
      { headers: { ...headers, authorization: `DPoP ${tampered}` }, method, url },
      { verifier },
    );
    expectChallenge(result, 401);
  });

  test("requireOwner without a configured ownerWebId FAILS CLOSED (503)", async () => {
    const result = await verifyApiRequest(await validRequest(), {
      verifier,
      requireOwner: true,
    });
    expectChallenge(result, 503);
  });

  test("requireOwner enforces the owner WebID (403 for a different verified WebID)", async () => {
    const owned = createApiVerifier({
      trustedIssuers: [issuer.issuer],
      ownerWebId: "https://someone-else.example/profile#me",
      allowInsecureLoopback: true,
      bidirectionalMode: "strict",
      webidFetch: issuer.profileFetch,
    });
    const result = await verifyApiRequest(await validRequest(), {
      verifier: owned,
      requireOwner: true,
    });
    expectChallenge(result, 403);
  });

  test("same-origin CSRF check refuses a cross-site Origin", async () => {
    const request = await validRequest();
    const result = await verifyApiRequest(
      { ...request, headers: { ...request.headers, origin: "https://evil.example" } },
      { verifier, assertSameOrigin: true },
    );
    expectChallenge(result, 403);
  });
});

describe("dev issuer — authorization-code DPoP key continuity (dpop_jkt)", () => {
  test("a code pre-bound via dpop_jkt only exchanges with the SAME DPoP key", async () => {
    const issuer = await startDevOidcIssuer();
    try {
      const bound = await createDevDpopClient();
      const thief = await createDevDpopClient();
      const verifier = "test-code-verifier-0123456789-0123456789-abc";
      const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");

      const authorize = async (): Promise<string> => {
        const url = new URL(`${issuer.issuer}/authorize`);
        url.searchParams.set("client_id", "https://app.example/clientid.jsonld");
        url.searchParams.set("redirect_uri", "http://localhost:1/callback");
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "openid webid offline_access");
        url.searchParams.set("state", "state-1");
        url.searchParams.set("nonce", "nonce-1");
        url.searchParams.set("code_challenge", challenge);
        url.searchParams.set("code_challenge_method", "S256");
        url.searchParams.set("dpop_jkt", bound.jkt);
        const response = await fetch(url, { redirect: "manual" });
        expect(response.status).toBe(302);
        const location = new URL(response.headers.get("location") ?? "");
        return location.searchParams.get("code") ?? "";
      };

      const exchange = async (code: string, key: typeof bound): Promise<Response> =>
        fetch(`${issuer.issuer}/token`, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            dpop: await key.proof("POST", `${issuer.issuer}/token`),
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: "https://app.example/clientid.jsonld",
            redirect_uri: "http://localhost:1/callback",
            code_verifier: verifier,
          }).toString(),
        });

      // A DIFFERENT key than the dpop_jkt pre-binding is refused.
      const stolen = await exchange(await authorize(), thief);
      expect(stolen.status).toBe(400);
      expect(((await stolen.json()) as { error: string }).error).toBe("invalid_grant");

      // The bound key succeeds (fresh code — the stolen attempt burned the first one).
      const legitimate = await exchange(await authorize(), bound);
      expect(legitimate.status).toBe(200);
    } finally {
      await issuer.stop();
    }
  }, 20_000);
});

describe("createNonceStore — per-session single-use VP-POST challenges", () => {
  test("a minted nonce consumes exactly once", () => {
    const store = createNonceStore();
    const nonce = store.mint("session-a");
    expect(store.consume("session-a", nonce)).toBe(true);
    expect(store.consume("session-a", nonce)).toBe(false); // single-use
  });

  test("nonces are high-entropy and unique per mint", () => {
    const store = createNonceStore();
    const first = store.mint("session-a");
    const second = store.mint("session-b");
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43,}$/u); // 32 bytes base64url, no padding
  });

  test("a wrong guess neither validates nor burns the live challenge", () => {
    const store = createNonceStore();
    const nonce = store.mint("session-a");
    expect(store.consume("session-a", "not-the-nonce")).toBe(false);
    expect(store.consume("session-a", nonce)).toBe(true); // still live after the bad guess
  });

  test("challenges are per-session: another session's key never validates", () => {
    const store = createNonceStore();
    const nonce = store.mint("session-a");
    expect(store.consume("session-b", nonce)).toBe(false);
    expect(store.consume("session-a", nonce)).toBe(true);
  });

  test("re-minting replaces the session's challenge (old nonce dies)", () => {
    const store = createNonceStore();
    const stale = store.mint("session-a");
    const fresh = store.mint("session-a");
    expect(store.consume("session-a", stale)).toBe(false);
    expect(store.consume("session-a", fresh)).toBe(true);
  });

  test("an expired challenge never validates", () => {
    let now = 1_000_000;
    const store = createNonceStore({ ttlMs: 60_000, now: () => now });
    const nonce = store.mint("session-a");
    now += 60_001;
    expect(store.consume("session-a", nonce)).toBe(false);
    expect(store.size).toBe(0); // expired entry dropped
  });

  test("the store is bounded: the oldest session evicts beyond maxEntries", () => {
    const store = createNonceStore({ maxEntries: 2 });
    const first = store.mint("session-1");
    store.mint("session-2");
    store.mint("session-3");
    expect(store.size).toBe(2);
    expect(store.consume("session-1", first)).toBe(false); // evicted
  });

  test("capacity pressure drops EXPIRED challenges before any live one", () => {
    let now = 1_000_000;
    const store = createNonceStore({ maxEntries: 2, ttlMs: 60_000, now: () => now });
    store.mint("stale-session"); // will be expired by the time capacity is hit
    now += 60_001;
    const live = store.mint("live-session");
    const fresh = store.mint("fresh-session"); // overflow: the expired entry must go first
    expect(store.size).toBe(2);
    expect(store.consume("live-session", live)).toBe(true); // survived the eviction
    expect(store.consume("fresh-session", fresh)).toBe(true);
  });
});
