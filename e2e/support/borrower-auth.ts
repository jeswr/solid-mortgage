/**
 * sm-36 — the borrower's REAL DPoP-bound Solid-OIDC session for worker
 * processes. The run-long dev issuer lives in the Playwright runner process
 * (e2e/support/global-setup.ts); workers obtain tokens over HTTP through its
 * `client_credentials` grant (the standard Solid service-account flow) and
 * mint a fresh single-use RFC 9449 proof per request — the same recipe as
 * `@mortgage/solid-kit/auth/service`'s `createServicePodFetch`, surfaced as
 * per-request HEADERS so Playwright's `route.continue({ headers })` can
 * attach the session to a page's API calls without ever fulfilling a
 * response from the test (nothing on the auth path is mocked).
 */

import { createDevDpopClient, type DevDpopClient } from "@mortgage/solid-kit/testing";
import type { Page } from "@playwright/test";

export interface BorrowerSession {
  /** The borrower WebID (the token's `webid` claim). */
  readonly webid: string;
  /** The dev issuer origin the tokens come from. */
  readonly issuer: string;
  /** DPoP-bound credentials for one request (fresh single-use proof). */
  authHeaders(method: string, url: string): Promise<Record<string, string>>;
  /**
   * Authenticated Node-side fetch for app API routes. Adds the
   * `X-Forwarded-*` pair the apps' `trustForwardedHeaders` posture
   * reconstructs the DPoP `htu` from (the Vercel shape, exercised locally —
   * the per-app suites' `authedPost` recipe).
   */
  authedFetch(url: string, init?: RequestInit): Promise<Response>;
  /**
   * Attach the session to a page's API calls under `pattern`: every
   * intercepted request CONTINUES to the real server with fresh DPoP
   * headers bound to its own method + htu (RFC 9449: scheme/authority/path
   * only, never the query).
   */
  authenticatePage(page: Page, pattern: string): Promise<void>;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is unset — is the sm-65 global setup wired?`);
  }
  return value;
}

/** RFC 9449: `htu` binds scheme/authority/path only. */
function htuOf(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}

const TOKEN_REFRESH_SKEW_MS = 30_000;

/** Build the borrower session from the global-setup environment exports. */
export async function borrowerSessionFromEnv(): Promise<BorrowerSession> {
  const issuer = requiredEnv("MORTGAGE_E2E_BORROWER_OIDC_ISSUER");
  const webid = requiredEnv("MORTGAGE_E2E_POD_WEBID");
  const clientId = requiredEnv("MORTGAGE_E2E_BORROWER_CLIENT_ID");
  const clientSecret = requiredEnv("MORTGAGE_E2E_BORROWER_CLIENT_SECRET");
  const client: DevDpopClient = await createDevDpopClient();

  let cached: { token: string; expiresAtMs: number } | undefined;
  let refreshing: Promise<string> | undefined;

  async function requestToken(): Promise<string> {
    const endpoint = `${issuer}/token`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        dpop: await client.proof("POST", endpoint),
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "webid",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!response.ok) {
      throw new Error(`borrower token request was refused (${response.status})`);
    }
    const body = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof body.access_token !== "string" || body.access_token === "") {
      throw new Error("borrower token response carried no access token");
    }
    const lifetimeMs =
      typeof body.expires_in === "number" && body.expires_in > 0 ? body.expires_in * 1000 : 60_000;
    cached = { token: body.access_token, expiresAtMs: Date.now() + lifetimeMs };
    return body.access_token;
  }

  function accessToken(): Promise<string> {
    if (cached !== undefined && Date.now() < cached.expiresAtMs - TOKEN_REFRESH_SKEW_MS) {
      return Promise.resolve(cached.token);
    }
    refreshing ??= requestToken().finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  }

  async function authHeaders(method: string, url: string): Promise<Record<string, string>> {
    const token = await accessToken();
    return {
      authorization: `DPoP ${token}`,
      dpop: await client.proof(method, htuOf(url), { accessToken: token }),
    };
  }

  return {
    webid,
    issuer,
    authHeaders,
    async authedFetch(url, init = {}) {
      const target = new URL(url);
      const headers: Record<string, string> = {
        ...(init.headers as Record<string, string> | undefined),
        ...(await authHeaders(init.method ?? "GET", url)),
        "x-forwarded-host": target.host,
        "x-forwarded-proto": target.protocol.replace(/:$/, ""),
      };
      return fetch(url, { ...init, headers });
    },
    async authenticatePage(page, pattern) {
      await page.route(pattern, async (route) => {
        const request = route.request();
        const auth = await authHeaders(request.method(), request.url());
        await route.continue({ headers: { ...request.headers(), ...auth } });
      });
    },
  };
}
