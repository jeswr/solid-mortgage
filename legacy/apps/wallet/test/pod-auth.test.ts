/**
 * SECURITY-CRITICAL suite: the wallet's Mode-2 grant rail (decisions 0006 +
 * 0015), driven end-to-end with REAL fixtures — real DPoP-bound Solid-OIDC
 * tokens from loopback dev issuers, a real WAC-enforcing sparq pod, the
 * app's REAL client-credentials service identity, the real route handlers.
 * No mocked verification anywhere (closing pod-auth pattern).
 *
 * Acceptance (the brief's revocation semantics, at the route boundary):
 *   - grant materialises a REAL WAC effect: the grantee's authenticated read
 *     of the container AND a member resource succeeds, and a DPV receipt is
 *     written;
 *   - revoke removes it: the grantee's authenticated read → 401/403;
 *   - revocation is IMMUTABLE: re-granting a revoked party is 409;
 *   - repeat operations are idempotent-in-effect 409s that change nothing;
 *   - decision-0015 boundary: anonymous 401, pod/webid overrides 400, unbound
 *     caller 403, unconfigured service identity 503, unknown party 400.
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
import { configFromEnv, type WalletConfig } from "../lib/server/config";
import { createWalletService, type WalletService } from "../lib/server/wallet-rail";

const APP_ORIGIN = "http://127.0.0.1";
const SERVICE_CLIENT = { clientId: "wallet-service", clientSecret: "test-service-secret" };

function apiUrl(route: string): string {
  return `${APP_ORIGIN}/wallet/api/${route}`;
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
let lender: SolidTestAccount; // grantee 1 (party "lender-boa")
let gse: SolidTestAccount; // grantee 2 (party "gse")
let borrower: DevOidcIssuer; // the API caller; profile claims the pod, pod acks back
let unbound: DevOidcIssuer; // trusted issuer, but its profile claims no storage
let serviceIssuer: DevOidcIssuer; // the wallet's own service identity (client_credentials)
let config: WalletConfig;
let service: WalletService;

const CONTAINER_PATH = "/mortgage/";
const MEMBER_PATH = "/mortgage/profile";

beforeAll(async () => {
  pods = await startSolidServer({ oidc: true });
  const primary = pods.accounts[0];
  if (primary === undefined) throw new Error("OIDC harness did not provision an owner");
  owner = primary;
  [lender, gse] = await Promise.all([pods.provisionAccount(), pods.provisionAccount()]);
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
  // The decision-0003 custodian grant: the pod names the wallet's OWN service
  // identity over the mortgage container (Control — it manages the very ACL).
  const container = await owner.authFetch(`${podBase}mortgage/`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: "",
  });
  if (!container.ok) throw new Error(`container seed failed (${container.status})`);
  // A member document, to prove acl:default inheritance carries the grant.
  const member = await owner.authFetch(`${podBase}${MEMBER_PATH.slice(1)}`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: `<${borrower.webid}> <http://xmlns.com/foaf/0.1/name> "Alex Rivera" .\n`,
  });
  if (!member.ok) throw new Error(`member seed failed (${member.status})`);
  const acl = await owner.authFetch(`${podBase}mortgage/.acl`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: containerGrantAcl({
      containerPath: CONTAINER_PATH,
      ownerWebid: owner.webid,
      agents: [{ webid: serviceIssuer.webid, control: true }],
    }),
  });
  if (!acl.ok) throw new Error(`custodian grant seed failed (${acl.status})`);

  config = {
    ...configFromEnv({} as NodeJS.ProcessEnv),
    trustedOidcIssuers: [borrower.issuer, unbound.issuer],
    podAllowedOrigins: [pods.baseUrl],
    allowInsecureLoopback: true,
    trustForwardedHeaders: false,
    serviceWebId: serviceIssuer.webid,
    podServiceIssuer: serviceIssuer.issuer,
    podServiceClientId: SERVICE_CLIENT.clientId,
    podServiceClientSecret: SERVICE_CLIENT.clientSecret,
    partyWebIds: { "lender-boa": lender.webid, gse: gse.webid },
  };
  service = createWalletService({ config });
}, 120_000);

afterAll(async () => {
  await pods?.stop();
  await borrower?.stop();
  await unbound?.stop();
  await serviceIssuer?.stop();
});

describe("boundary rejections (decision 0015 L1–L2)", () => {
  test("anonymous callers get 401 + WWW-Authenticate on every route", async () => {
    for (const [route, method] of [
      ["grants", "GET"],
      ["grants/change", "POST"],
      ["ledger", "GET"],
    ] as const) {
      const handler =
        route === "grants"
          ? service.grants
          : route === "ledger"
            ? service.ledger
            : service.changeGrant;
      const response = await handler(new Request(apiUrl(route), { method }));
      expect(response.status, route).toBe(401);
      expect(response.headers.get("www-authenticate"), route).not.toBeNull();
    }
  });

  test("caller-supplied pod/webid are rejected 400 in query and body", async () => {
    const query = await service.grants(
      await authedRequest(borrower, "GET", "grants", { query: `?pod=${podBase}` }),
    );
    expect(query.status).toBe(400);
    const body = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "lender-boa", action: "grant", webid: borrower.webid }),
      }),
    );
    expect(body.status).toBe(400);
    expect(((await body.json()) as { error: string }).error).toBe("param_rejected");
  });

  test("a trusted caller with no pod binding is refused 403", async () => {
    const response = await service.grants(await authedRequest(unbound, "GET", "grants"));
    expect(response.status).toBe(403);
  });

  test("an unconfigured service identity fails closed with 503 (never anonymous IO)", async () => {
    const unconfigured = createWalletService({
      config: { ...config, podServiceClientSecret: undefined },
    });
    const response = await unconfigured.ledger(await authedRequest(borrower, "GET", "ledger"));
    expect(response.status).toBe(503);
  });

  test("an unknown or unconfigured party is rejected before any pod IO", async () => {
    const unknown = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "mallory", action: "grant" }),
      }),
    );
    expect(unknown.status).toBe(400);
    // "servicer" is a KNOWN party id but has no configured WebID here.
    const unconfiguredParty = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "servicer", action: "grant" }),
      }),
    );
    expect(unconfiguredParty.status).toBe(503);
  });
});

describe("the grant lifecycle (REAL WAC effects; decision 0006 receipts)", () => {
  test("grant → real read; revoke → real 403; immutable + idempotent; receipted", async () => {
    const containerIri = `${podBase}mortgage/`;
    const memberIri = `${podBase}${MEMBER_PATH.slice(1)}`;

    // Nothing to revoke yet.
    const early = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "lender-boa", action: "revoke" }),
      }),
    );
    expect(early.status).toBe(409);

    // GRANT the lender: a REAL WAC effect on container AND member.
    const grant = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "lender-boa", action: "grant" }),
      }),
    );
    expect(grant.status).toBe(200);
    const granted = (await grant.json()) as { receipt: { action: string; recipient: string } };
    expect(granted.receipt.action).toBe("grant");
    expect(granted.receipt.recipient).toBe(lender.webid);
    expect((await lender.authFetch(containerIri)).status).toBe(200);
    expect((await lender.authFetch(memberIri)).status).toBe(200);
    // The other provisioned identity gained nothing.
    expect([401, 403]).toContain((await gse.authFetch(memberIri)).status);

    // Repeat grant: recorded already — 409, nothing touched.
    const regrant = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "lender-boa", action: "grant" }),
      }),
    );
    expect(regrant.status).toBe(409);
    expect((await lender.authFetch(memberIri)).status).toBe(200);

    // The dashboard reflects the live standing.
    const dashboard = await service.grants(await authedRequest(borrower, "GET", "grants"));
    expect(dashboard.status).toBe(200);
    const { standings, parties } = (await dashboard.json()) as {
      standings: readonly { agent: string; granted: boolean; revoked: boolean }[];
      parties: readonly { id: string; webid: string }[];
    };
    expect(parties.map((party) => party.id).sort()).toEqual(["gse", "lender-boa"]);
    expect(standings.find((entry) => entry.agent === lender.webid)).toMatchObject({
      granted: true,
      revoked: false,
    });

    // REVOKE: the WAC rule is gone — a real authenticated read now fails.
    const revoke = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "lender-boa", action: "revoke" }),
      }),
    );
    expect(revoke.status).toBe(200);
    expect([401, 403]).toContain((await lender.authFetch(containerIri)).status);
    expect([401, 403]).toContain((await lender.authFetch(memberIri)).status);

    // Repeat revoke: idempotent in effect — 409, access stays off.
    const rerevoke = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "lender-boa", action: "revoke" }),
      }),
    );
    expect(rerevoke.status).toBe(409);
    expect([401, 403]).toContain((await lender.authFetch(memberIri)).status);

    // IMMUTABLE revocation: the revoked party can never be re-granted.
    const afterRevoke = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "lender-boa", action: "grant" }),
      }),
    );
    expect(afterRevoke.status).toBe(409);
    expect([401, 403]).toContain((await lender.authFetch(memberIri)).status);

    // A DIFFERENT party still grants fine (immutability is per-agent).
    const grantGse = await service.changeGrant(
      await authedRequest(borrower, "POST", "grants/change", {
        body: JSON.stringify({ party: "gse", action: "grant" }),
      }),
    );
    expect(grantGse.status).toBe(200);
    expect((await gse.authFetch(memberIri)).status).toBe(200);
    // The lender's revocation survived the unrelated ACL rebuild.
    expect([401, 403]).toContain((await lender.authFetch(memberIri)).status);

    // The ledger holds one receipt per transition, in order (decision 0006).
    const ledger = await service.ledger(await authedRequest(borrower, "GET", "ledger"));
    expect(ledger.status).toBe(200);
    const { receipts } = (await ledger.json()) as {
      receipts: readonly { action: string; recipient: string; resource: string }[];
    };
    expect(receipts.map(({ action, recipient }) => [action, recipient])).toEqual([
      ["grant", lender.webid],
      ["revoke", lender.webid],
      ["grant", gse.webid],
    ]);
    for (const receipt of receipts) expect(receipt.resource).toBe(containerIri);
  }, 120_000);
});
