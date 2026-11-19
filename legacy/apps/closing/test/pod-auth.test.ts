/**
 * Decision-0015 authenticated-caller boundary for the closing scene routes.
 * Route-level tests against REAL fixtures: real DPoP-bound Solid-OIDC tokens
 * from loopback dev issuers, a real WAC-enforcing sparq pod, the app's REAL
 * client-credentials service identity, the real route handlers — no mocked
 * verification anywhere. Mirrors apps/property/test/pod-auth.test.ts.
 *
 * Acceptance (the roborev sm-34 Highs, at the route boundary):
 *   - anonymous callers are rejected (401 + WWW-Authenticate);
 *   - caller-supplied pod/webid parameters are rejected (400);
 *   - an authenticated caller without a bound pod is refused (403);
 *   - an unconfigured service identity fails closed (503) — never anonymous IO;
 *   - the authenticated happy path drives close → grant → revoke with REAL WAC
 *     effects, and a REPEAT close is 409 that provably does not restore the
 *     revoked lender's read.
 */
import {
  containerGrantAcl,
  type DevOidcIssuer,
  profileCardFixture,
  type SolidTestAccount,
  type SolidTestServer,
  seedPod,
  startDevOidcIssuer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { ClosingConfig } from "../lib/server/config";
import { type ClosingService, createClosingService } from "../lib/server/pod-rail";
import { closingRecordIri } from "../lib/server/scene";

const APP_ORIGIN = "http://127.0.0.1";
const SERVICE_CLIENT = { clientId: "closing-service", clientSecret: "test-service-secret" };

function apiUrl(route: string): string {
  return `${APP_ORIGIN}/closing/api/scene/${route}`;
}

/** An authenticated Request: fresh single-use DPoP proof per call. */
async function authedRequest(
  issuer: DevOidcIssuer,
  method: string,
  route: string,
  options: { query?: string; body?: string } = {},
): Promise<Request> {
  // RFC 9449: `htu` binds scheme/authority/path only — never the query.
  const headers: Record<string, string> = await issuer.authHeaders(method, apiUrl(route));
  if (options.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${apiUrl(route)}${options.query ?? ""}`, {
    method,
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
}

let pods: SolidTestServer;
let podBase = "";
let owner: SolidTestAccount;
let lender: SolidTestAccount;
let servicer: SolidTestAccount;
let borrower: DevOidcIssuer; // the API caller; profile claims the pod, pod acks back
let unbound: DevOidcIssuer; // trusted issuer, but its profile claims no storage
let serviceIssuer: DevOidcIssuer; // the app's own service identity (client_credentials)
let config: ClosingConfig;
let service: ClosingService;

beforeAll(async () => {
  pods = await startSolidServer({ oidc: true });
  const primary = pods.accounts[0];
  if (primary === undefined) throw new Error("OIDC harness did not provision an owner");
  owner = primary;
  [lender, servicer] = await Promise.all([pods.provisionAccount(), pods.provisionAccount()]);
  podBase = `${pods.baseUrl}/`;
  [borrower, unbound, serviceIssuer] = await Promise.all([
    startDevOidcIssuer({ storage: podBase }),
    startDevOidcIssuer(),
    // http-schemed WebID: the POD's verifier dereferences it with a plain fetch.
    startDevOidcIssuer({ clientCredentials: SERVICE_CLIENT, webidScheme: "http" }),
  ]);

  // Backward acknowledgment (decision 0015 L2.3): the pod's owner-only-writable
  // profile card names the borrower — publicly readable, as WebID docs are.
  await seedPod(
    pods.baseUrl,
    [profileCardFixture({ webid: borrower.webid, name: "Alex Rivera", storage: podBase })],
    { fetch: owner.authFetch, ownerWebid: owner.webid },
  );
  // The sm-28-modelled grant: the borrower's wallet authorises the closing
  // app's service identity over the mortgage container.
  const container = await owner.authFetch(`${podBase}mortgage/`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: "",
  });
  if (!container.ok) throw new Error(`container seed failed (${container.status})`);
  const acl = await owner.authFetch(`${podBase}mortgage/.acl`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: containerGrantAcl({
      containerPath: "/mortgage/",
      ownerWebid: owner.webid,
      agents: [{ webid: serviceIssuer.webid, control: true }],
    }),
  });
  if (!acl.ok) throw new Error(`grant seed failed (${acl.status})`);

  config = {
    trustedOidcIssuers: [borrower.issuer, unbound.issuer],
    trustedAnchorIssuers: [],
    trustedCredentialIssuers: [],
    podAllowedOrigins: [pods.baseUrl],
    allowInsecureLoopback: true,
    trustForwardedHeaders: false,
    lenderWebId: lender.webid,
    servicerWebId: servicer.webid,
    serviceWebId: serviceIssuer.webid,
    podServiceIssuer: serviceIssuer.issuer,
    podServiceClientId: SERVICE_CLIENT.clientId,
    podServiceClientSecret: SERVICE_CLIENT.clientSecret,
  };
  service = createClosingService({ config });
}, 120_000);

afterAll(async () => {
  await pods?.stop();
  await borrower?.stop();
  await unbound?.stop();
  await serviceIssuer?.stop();
});

describe("boundary rejections (decision 0015 L1–L2)", () => {
  test("anonymous callers get 401 + WWW-Authenticate", async () => {
    const response = await service.close(new Request(apiUrl("close"), { method: "POST" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).not.toBeNull();
  });

  test("caller-supplied pod/webid are rejected 400 in query and body", async () => {
    const query = await service.close(
      await authedRequest(borrower, "POST", "close", { query: `?pod=${podBase}` }),
    );
    expect(query.status).toBe(400);
    const body = await service.close(
      await authedRequest(borrower, "POST", "close", {
        body: JSON.stringify({ webid: borrower.webid }),
      }),
    );
    expect(body.status).toBe(400);
  });

  test("a trusted caller with no pod binding is refused 403", async () => {
    const response = await service.ledger(await authedRequest(unbound, "GET", "ledger"));
    expect(response.status).toBe(403);
  });

  test("an unconfigured service identity fails closed with 503 (never anonymous IO)", async () => {
    const unconfigured = createClosingService({
      config: { ...config, podServiceClientSecret: undefined },
    });
    const response = await unconfigured.ledger(await authedRequest(borrower, "GET", "ledger"));
    expect(response.status).toBe(503);
  });
});

describe("the authenticated closing lifecycle (REAL WAC effects)", () => {
  test("close → grant servicer → revoke lender → repeat close stays revoked", async () => {
    const record = closingRecordIri(podBase);

    // Transfers before the ceremony are refused — no orphan grants.
    const early = await service.grantServicer(
      await authedRequest(borrower, "POST", "grant-servicer"),
    );
    expect(early.status).toBe(409);

    const close = await service.close(await authedRequest(borrower, "POST", "close"));
    expect(close.status).toBe(200);
    const closed = (await close.json()) as { iri: string; eNoteReference: string };
    expect(closed.iri).toBe(record);
    // The lender's grant is real: an actual authenticated read succeeds.
    expect((await lender.authFetch(record)).status).toBe(200);

    const grant = await service.grantServicer(
      await authedRequest(borrower, "POST", "grant-servicer"),
    );
    expect(grant.status).toBe(200);
    expect((await servicer.authFetch(record)).status).toBe(200);

    const revoke = await service.revokeLender(
      await authedRequest(borrower, "POST", "revoke-lender"),
    );
    expect(revoke.status).toBe(200);
    expect([401, 403]).toContain((await lender.authFetch(record)).status);
    expect((await servicer.authFetch(record)).status).toBe(200);

    // REGRESSION (roborev sm-34 High): a repeat close is 409 and does NOT
    // silently restore the revoked lender — proven by a real read attempt.
    const reclose = await service.close(await authedRequest(borrower, "POST", "close"));
    expect(reclose.status).toBe(409);
    expect([401, 403]).toContain((await lender.authFetch(record)).status);
    expect((await servicer.authFetch(record)).status).toBe(200);

    const ledger = await service.ledger(await authedRequest(borrower, "GET", "ledger"));
    expect(ledger.status).toBe(200);
    const { receipts } = (await ledger.json()) as {
      receipts: readonly { action: string; recipient: string }[];
    };
    expect(receipts.map(({ action, recipient }) => [action, recipient])).toEqual([
      ["grant", lender.webid],
      ["grant", servicer.webid],
      ["revoke", lender.webid],
    ]);
  }, 120_000);
});
