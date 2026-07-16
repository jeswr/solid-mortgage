import {
  type SolidTestAccount,
  type SolidTestServer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { ClosingConfig } from "../lib/server/config";
import { createClosingService } from "../lib/server/pod-rail";
import {
  changeServicingAccess,
  closingRecordIri,
  executeClosing,
  readConsentLedger,
} from "../lib/server/scene";

function expectDenied(status: number): void {
  expect([401, 403]).toContain(status);
}

describe("scene 5 consent receipts and real WAC transfer", () => {
  let pods: SolidTestServer;
  let owner: SolidTestAccount;
  let lender: SolidTestAccount;
  let servicer: SolidTestAccount;
  let podBase: string;

  beforeAll(async () => {
    pods = await startSolidServer({ oidc: true });
    const primary = pods.accounts[0];
    if (primary === undefined) throw new Error("OIDC harness did not provision an owner");
    owner = primary;
    lender = await pods.provisionAccount();
    servicer = await pods.provisionAccount();
    podBase = `${pods.baseUrl}/`;
  }, 120_000);

  afterAll(async () => {
    await pods?.stop();
  });

  test("grant and revoke each write a receipt; revoke removes the lender's actual WAC read", async () => {
    const times = [
      new Date("2026-07-16T14:30:00.000Z"),
      new Date("2026-07-16T14:31:00.000Z"),
      new Date("2026-07-16T14:32:00.000Z"),
    ];
    let timeIndex = 0;
    let id = 0;
    const options = {
      podFetch: owner.authFetch,
      now: () => times[timeIndex++] ?? (times[2] as Date),
      randomId: () => `receipt-${++id}`,
    };

    await executeClosing(podBase, owner.webid, lender.webid, options);
    const record = closingRecordIri(podBase);
    expect((await lender.authFetch(record)).status).toBe(200);
    expectDenied((await servicer.authFetch(record)).status);

    const grant = await changeServicingAccess(
      podBase,
      owner.webid,
      servicer.webid,
      "grant",
      options,
    );
    expect(grant.action).toBe("grant");
    expect((await servicer.authFetch(record)).status).toBe(200);

    const revoke = await changeServicingAccess(
      podBase,
      owner.webid,
      lender.webid,
      "revoke",
      options,
    );
    expect(revoke.action).toBe("revoke");
    expectDenied((await lender.authFetch(record)).status);

    const [grantStored, revokeStored] = await Promise.all([
      owner.authFetch(grant.iri, { headers: { accept: "text/turtle" } }),
      owner.authFetch(revoke.iri, { headers: { accept: "text/turtle" } }),
    ]);
    expect(grantStored.status).toBe(200);
    expect(revokeStored.status).toBe(200);
    expect(await grantStored.text()).toContain("dpv:ConsentGiven");
    expect(await revokeStored.text()).toContain("dpv:ConsentWithdrawn");

    const ledger = await readConsentLedger(podBase, owner.webid, options);
    expect(ledger.map(({ action }) => action)).toEqual(["grant", "revoke"]);
    expect(ledger.map(({ recipient }) => recipient)).toEqual([servicer.webid, lender.webid]);
    expect(ledger.map(({ issuedAt }) => issuedAt)).toEqual([
      "2026-07-16T14:31:00.000Z",
      "2026-07-16T14:32:00.000Z",
    ]);
  }, 120_000);
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
