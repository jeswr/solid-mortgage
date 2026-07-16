/**
 * Scene-5 state model against a REAL WAC-enforcing pod (oidc harness): the app's
 * service identity does every pod IO; grant/revoke are proven by ACTUAL reads as
 * the lender/servicer identities, never by inspecting ACL bytes.
 *
 * Covers the roborev sm-34 findings:
 *   - a repeat close is 409 and can never re-grant a revoked lender (High);
 *   - revocation is immutable — re-grant refused (High);
 *   - per-agent ACL rules: changing one agent never touches another (High);
 *   - receipt/ACL divergence: grant rolls back on a failed receipt, revoke
 *     stays off and repairs its missing receipt on retry (Medium).
 */
import {
  containerGrantAcl,
  type SolidTestAccount,
  type SolidTestServer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { ClosingConfig } from "../lib/server/config";
import { createClosingService } from "../lib/server/pod-rail";
import {
  type ClosingSceneOptions,
  changeServicingAccess,
  closingRecordIri,
  executeClosing,
  readConsentLedger,
} from "../lib/server/scene";

function expectDenied(status: number): void {
  expect([401, 403]).toContain(status);
}

async function expect409(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    expect(error).toMatchObject({ name: "PodAccessError", status: 409 });
    return (error as Error).message;
  }
  throw new Error("expected a 409 PodAccessError");
}

/** Prepare one borrower pod: container + the sm-28-modelled grant for the service. */
async function seedGrantedContainer(
  owner: SolidTestAccount,
  service: SolidTestAccount,
  podBase: string,
): Promise<void> {
  const container = await owner.authFetch(`${podBase}mortgage/`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: "",
  });
  expect(container.ok).toBe(true);
  const acl = await owner.authFetch(`${podBase}mortgage/.acl`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: containerGrantAcl({
      containerPath: "/mortgage/",
      ownerWebid: owner.webid,
      agents: [{ webid: service.webid, control: true }],
    }),
  });
  expect(acl.ok).toBe(true);
}

/** A service fetch whose receipt PUTs fail while every other request succeeds. */
function receiptFailingFetch(base: typeof fetch): typeof fetch {
  return (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = (input instanceof Request ? input.method : init?.method) ?? "GET";
    if (method === "PUT" && url.includes("/consent-receipt-")) {
      return Promise.resolve(new Response(JSON.stringify({ simulated: true }), { status: 503 }));
    }
    return base(input, init);
  };
}

describe("scene 5 lifecycle on a WAC-enforcing pod", () => {
  let pods: SolidTestServer;
  let owner: SolidTestAccount;
  let service: SolidTestAccount;
  let lender: SolidTestAccount;
  let servicer: SolidTestAccount;
  let podBase: string;
  let record: string;
  let options: ClosingSceneOptions;
  let minute = 0;

  beforeAll(async () => {
    pods = await startSolidServer({ oidc: true });
    const primary = pods.accounts[0];
    if (primary === undefined) throw new Error("OIDC harness did not provision an owner");
    owner = primary;
    [service, lender, servicer] = await Promise.all([
      pods.provisionAccount(),
      pods.provisionAccount(),
      pods.provisionAccount(),
    ]);
    podBase = `${pods.baseUrl}/`;
    record = closingRecordIri(podBase);
    await seedGrantedContainer(owner, service, podBase);
    options = {
      podFetch: service.authFetch,
      serviceWebId: service.webid,
      now: () => new Date(Date.UTC(2026, 6, 16, 14, 30 + minute++)),
      randomId: () => `unit-${minute}`,
    };
  }, 120_000);

  afterAll(async () => {
    await pods?.stop();
  });

  test("transfers before any close are refused — no orphan grants", async () => {
    const message = await expect409(() =>
      changeServicingAccess(podBase, owner.webid, servicer.webid, "grant", options),
    );
    expect(message).toContain("no closing record");
  }, 60_000);

  test("close writes the record and the receipt-recorded lender grant", async () => {
    await executeClosing(podBase, owner.webid, lender.webid, options);
    expect((await lender.authFetch(record)).status).toBe(200);
    expectDenied((await servicer.authFetch(record)).status);
    const ledger = await readConsentLedger(podBase, owner.webid, options);
    expect(ledger.map(({ action, recipient }) => [action, recipient])).toEqual([
      ["grant", lender.webid],
    ]);
  }, 60_000);

  test("a repeat close is 409 and touches nothing", async () => {
    const message = await expect409(() =>
      executeClosing(podBase, owner.webid, lender.webid, options),
    );
    expect(message).toContain("already signed");
    expect((await lender.authFetch(record)).status).toBe(200);
    expect((await readConsentLedger(podBase, owner.webid, options)).length).toBe(1);
  }, 60_000);

  test("granting the servicer never widens or narrows the lender's rule", async () => {
    const receipt = await changeServicingAccess(
      podBase,
      owner.webid,
      servicer.webid,
      "grant",
      options,
    );
    expect(receipt.action).toBe("grant");
    expect((await servicer.authFetch(record)).status).toBe(200);
    expect((await lender.authFetch(record)).status).toBe(200);
    // A repeat grant is refused, and no duplicate receipt appears.
    await expect409(() =>
      changeServicingAccess(podBase, owner.webid, servicer.webid, "grant", options),
    );
    expect((await readConsentLedger(podBase, owner.webid, options)).length).toBe(2);
  }, 60_000);

  test("revoking the lender removes the REAL WAC read and is idempotent", async () => {
    const receipt = await changeServicingAccess(
      podBase,
      owner.webid,
      lender.webid,
      "revoke",
      options,
    );
    expect(receipt.action).toBe("revoke");
    expectDenied((await lender.authFetch(record)).status);
    // The servicer's dedicated rule is untouched.
    expect((await servicer.authFetch(record)).status).toBe(200);
    await expect409(() =>
      changeServicingAccess(podBase, owner.webid, lender.webid, "revoke", options),
    );
  }, 60_000);

  test("revocation is immutable: a re-grant of the revoked lender is refused", async () => {
    const message = await expect409(() =>
      changeServicingAccess(podBase, owner.webid, lender.webid, "grant", options),
    );
    expect(message).toContain("immutable");
    expectDenied((await lender.authFetch(record)).status);
  }, 60_000);

  test("REGRESSION: a repeat close after revocation does NOT restore lender read", async () => {
    await expect409(() => executeClosing(podBase, owner.webid, lender.webid, options));
    // The load-bearing assertion: an actual read attempt as the lender identity.
    expectDenied((await lender.authFetch(record)).status);
    const ledger = await readConsentLedger(podBase, owner.webid, options);
    expect(ledger.map(({ action, recipient }) => [action, recipient])).toEqual([
      ["grant", lender.webid],
      ["grant", servicer.webid],
      ["revoke", lender.webid],
    ]);
  }, 60_000);
});

describe("scene 5 receipt/ACL consistency under receipt-write failure", () => {
  let pods: SolidTestServer;
  let owner: SolidTestAccount;
  let service: SolidTestAccount;
  let closeAgent: SolidTestAccount; // the "lender" whose close-time grant crashes
  let servicer: SolidTestAccount;
  let podBase: string;
  let record: string;
  let working: ClosingSceneOptions;
  let failingReceipts: ClosingSceneOptions;
  let minute = 0;

  /** Ledger actions for one agent, in order. */
  async function actionsFor(agent: SolidTestAccount): Promise<readonly string[]> {
    const receipts = await readConsentLedger(podBase, owner.webid, working);
    return receipts
      .filter(({ recipient }) => recipient === agent.webid)
      .map(({ action }) => action);
  }

  beforeAll(async () => {
    pods = await startSolidServer({ oidc: true });
    const primary = pods.accounts[0];
    if (primary === undefined) throw new Error("OIDC harness did not provision an owner");
    owner = primary;
    [service, closeAgent, servicer] = await Promise.all([
      pods.provisionAccount(),
      pods.provisionAccount(),
      pods.provisionAccount(),
    ]);
    podBase = `${pods.baseUrl}/`;
    record = closingRecordIri(podBase);
    await seedGrantedContainer(owner, service, podBase);
    const now = () => new Date(Date.UTC(2026, 6, 16, 15, 30 + minute++));
    working = {
      podFetch: service.authFetch,
      serviceWebId: service.webid,
      now,
      randomId: () => `fail-${minute}`,
    };
    failingReceipts = { ...working, podFetch: receiptFailingFetch(service.authFetch) };
    // A close whose receipt write fails: the record lands, the compensation
    // removes the unrecorded lender grant, the caller sees the error.
    await expect(
      executeClosing(podBase, owner.webid, closeAgent.webid, failingReceipts),
    ).rejects.toMatchObject({ name: "PodAccessError" });
  }, 120_000);

  afterAll(async () => {
    await pods?.stop();
  });

  test("a crashed close leaves no unrecorded access and RESUMES on retry", async () => {
    // From beforeAll: record present, agent compensated away, no receipts.
    expectDenied((await closeAgent.authFetch(record)).status);
    expect(await actionsFor(closeAgent)).toEqual([]);
    // The retry does not wedge on 409 — it repairs the initial grant.
    const resumed = await executeClosing(podBase, owner.webid, closeAgent.webid, working);
    expect(resumed.iri).toBe(record);
    expect(resumed.eNoteReference).toMatch(/^SIMULATED-ENOTE-/);
    expect((await closeAgent.authFetch(record)).status).toBe(200);
    expect(await actionsFor(closeAgent)).toEqual(["grant"]);
    // Once the lender receipt exists the close is complete: repeats are 409.
    const message = await expect409(() =>
      executeClosing(podBase, owner.webid, closeAgent.webid, working),
    );
    expect(message).toContain("already signed");
  }, 60_000);

  test("a grant whose receipt write fails is ROLLED BACK — no unrecorded access", async () => {
    await expect(
      changeServicingAccess(podBase, owner.webid, servicer.webid, "grant", failingReceipts),
    ).rejects.toMatchObject({ name: "PodAccessError" });
    expectDenied((await servicer.authFetch(record)).status);
    expect(await actionsFor(servicer)).toEqual([]);
    // The surgical rollback touched ONLY the failed agent's rule.
    expect((await closeAgent.authFetch(record)).status).toBe(200);
    // A retry with a healthy pod connection fully lands.
    const receipt = await changeServicingAccess(
      podBase,
      owner.webid,
      servicer.webid,
      "grant",
      working,
    );
    expect(receipt.action).toBe("grant");
    expect((await servicer.authFetch(record)).status).toBe(200);
  }, 60_000);

  test("a revoke whose receipt write fails keeps access OFF and repairs on retry", async () => {
    await expect(
      changeServicingAccess(podBase, owner.webid, servicer.webid, "revoke", failingReceipts),
    ).rejects.toMatchObject({ name: "PodAccessError" });
    // Fail-safe direction: the WAC read is already gone, only the record lags.
    expectDenied((await servicer.authFetch(record)).status);
    expect(await actionsFor(servicer)).toEqual(["grant"]);
    // Retry completes the MISSING receipt instead of erroring on "no grant".
    const receipt = await changeServicingAccess(
      podBase,
      owner.webid,
      servicer.webid,
      "revoke",
      working,
    );
    expect(receipt.action).toBe("revoke");
    expectDenied((await servicer.authFetch(record)).status);
    expect(await actionsFor(servicer)).toEqual(["grant", "revoke"]);
    // And the revocation is now immutable.
    await expect(
      changeServicingAccess(podBase, owner.webid, servicer.webid, "grant", working),
    ).rejects.toMatchObject({ name: "PodAccessError", status: 409 });
  }, 60_000);
});

describe("decision 0015 fail-closed authenticated pod rail", () => {
  const configured: ClosingConfig = {
    trustedOidcIssuers: ["https://issuer.example/"],
    trustedAnchorIssuers: [],
    trustedCredentialIssuers: [],
    podAllowedOrigins: ["https://pods.example"],
    allowInsecureLoopback: false,
    trustForwardedHeaders: false,
    lenderWebId: "https://lender.example/profile/card#service",
    servicerWebId: "https://servicer.example/profile/card#service",
    serviceWebId: "https://closing.example/profile/card#service",
    podServiceIssuer: "https://issuer.example",
    podServiceClientId: "closing-service",
    podServiceClientSecret: "secret",
  };

  test.each([
    ["close", () => createClosingService({ config: configured }).close(request("close", "POST"))],
    [
      "grant",
      () =>
        createClosingService({ config: configured }).grantServicer(
          request("grant-servicer", "POST"),
        ),
    ],
    [
      "revoke",
      () =>
        createClosingService({ config: configured }).revokeLender(request("revoke-lender", "POST")),
    ],
    ["ledger", () => createClosingService({ config: configured }).ledger(request("ledger"))],
  ])("%s rejects an anonymous caller before pod access", async (_name, call) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).not.toBeNull();
  });

  test("an empty issuer allowlist disables the rail with 503", async () => {
    const service = createClosingService({
      config: { ...configured, trustedOidcIssuers: [] },
    });
    expect((await service.ledger(request("ledger"))).status).toBe(503);
  });
});

function request(route: string, method = "GET"): Request {
  return new Request(`https://closing.example/closing/api/scene/${route}`, { method });
}
