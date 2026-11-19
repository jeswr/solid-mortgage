/**
 * Decision-0015 authenticated-caller boundary + the REAL grant boundary for
 * the AUS run route. Route-level tests against REAL fixtures: real DPoP-bound
 * Solid-OIDC tokens from loopback dev issuers, a real WAC-enforcing sparq
 * pod, the app's REAL client-credentials service identity reading through a
 * REAL borrower grant, REAL Ed25519-signed credentials verified by the real
 * vc-kit verifier — no mocked verification anywhere. Mirrors
 * apps/closing/test/pod-auth.test.ts.
 *
 * Acceptance (the sm-32 security bar):
 *   - anonymous callers are rejected (401 + WWW-Authenticate);
 *   - caller-supplied pod/webid parameters are rejected (400);
 *   - an authenticated caller without a bound pod is refused (403);
 *   - an unconfigured service identity fails closed (503) — never anonymous IO;
 *   - the happy path reads the REAL granted loan file over the service
 *     identity, verifies the REAL signatures, runs the deterministic rules,
 *     and writes the shape-valid decision into the pod;
 *   - a NON-granted reader (direct AND as a configured service identity) is
 *     denied by the pod's WAC, and REVOKING the grant genuinely shuts the
 *     run off;
 *   - scene 4: a stale employment credential refers the file; the re-issued
 *     credential re-runs to approve.
 */
import {
  buildLoanApplication,
  FIBO,
  MORT,
  resourceToTurtle,
  UnderwritingDecision,
  validate,
} from "@mortgage/data-model";
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
import { DataFactory, Parser, Store } from "n3";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { AusEvidence } from "../lib/aus/rules";
import { type AusRailService, createAusRailService } from "../lib/server/aus-rail";
import type { AusConfig } from "../lib/server/config";
import type { AusRunReport } from "../lib/server/underwrite";
import {
  alex,
  CREDENTIAL_ISSUER,
  type CredentialRig,
  credentialRig,
  FRESH_WINDOW,
  issuerControls,
  resolveIssuerKey,
  STALE_WINDOW,
} from "./support";

const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const APP_ORIGIN = "http://127.0.0.1";
const AUS_CLIENT = { clientId: "gse-aus-service", clientSecret: "test-aus-secret" };
const ROGUE_CLIENT = { clientId: "rogue-aus-service", clientSecret: "test-rogue-secret" };

function apiUrl(path: string): string {
  return `${APP_ORIGIN}/gse/api${path}`;
}

/** An authenticated Request: fresh single-use DPoP proof per call. */
async function authedRequest(
  issuer: DevOidcIssuer,
  method: string,
  path: string,
  options: { query?: string; body?: string } = {},
): Promise<Request> {
  // RFC 9449: `htu` binds scheme/authority/path only — never the query.
  const headers: Record<string, string> = await issuer.authHeaders(method, apiUrl(path));
  if (options.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${apiUrl(path)}${options.query ?? ""}`, {
    method,
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
}

let pods: SolidTestServer;
let podBase = "";
let owner: SolidTestAccount;
let outsider: SolidTestAccount; // a real pod identity the grant does NOT name
let borrower: DevOidcIssuer; // the API caller; profile claims the pod, pod acks back
let unbound: DevOidcIssuer; // trusted issuer, but its profile claims no storage
let ausService: DevOidcIssuer; // the app's own service identity (GRANTED)
let rogueService: DevOidcIssuer; // a service identity the grant does NOT name
let rig: CredentialRig;
let config: AusConfig;
let service: AusRailService;

const incomeIri = () => `${podBase}mortgage/credentials/income`;
const decisionIri = () => `${podBase}mortgage/decision`;

/** Owner-authored PUT of a loan-file resource (fixture writes, not app code). */
async function ownerPut(iri: string, body: string): Promise<void> {
  const response = await owner.authFetch(iri, {
    body,
    headers: { "content-type": "text/turtle" },
    method: "PUT",
  });
  if (!response.ok) throw new Error(`fixture PUT ${iri} failed (${response.status})`);
}

/** Read + parse the decision document as the pod owner (real authenticated read). */
async function readDecision(): Promise<{ turtle: string; decision: UnderwritingDecision }> {
  const response = await owner.authFetch(decisionIri(), {
    headers: { accept: "text/turtle" },
  });
  if (!response.ok) throw new Error(`decision read failed (${response.status})`);
  const turtle = await response.text();
  const store = new Store(new Parser({ format: "text/turtle" }).parse(turtle));
  return {
    decision: new UnderwritingDecision(DataFactory.namedNode(decisionIri()), store, DataFactory),
    turtle,
  };
}

function verifySeams() {
  return {
    isControlledBy: issuerControls,
    resolveKey: resolveIssuerKey,
    statusFetch: rig.host.fetch,
  };
}

beforeAll(async () => {
  pods = await startSolidServer({ oidc: true });
  const primary = pods.accounts[0];
  if (primary === undefined) throw new Error("OIDC harness did not provision an owner");
  owner = primary;
  outsider = await pods.provisionAccount();
  podBase = `${pods.baseUrl}/`;
  [borrower, unbound, ausService, rogueService] = await Promise.all([
    startDevOidcIssuer({ storage: podBase }),
    startDevOidcIssuer(),
    // http-schemed WebIDs: the POD's verifier dereferences them with a plain fetch.
    startDevOidcIssuer({ clientCredentials: AUS_CLIENT, webidScheme: "http" }),
    startDevOidcIssuer({ clientCredentials: ROGUE_CLIENT, webidScheme: "http" }),
  ]);

  // Backward acknowledgment (decision 0015 L2.3): the pod's owner-only-writable
  // profile card names the borrower — publicly readable, as WebID docs are.
  await seedPod(
    pods.baseUrl,
    [profileCardFixture({ name: alex.name, storage: podBase, webid: borrower.webid })],
    { fetch: owner.authFetch, ownerWebid: owner.webid },
  );

  // The sm-28-modelled grant: the borrower's wallet authorises the AUS app's
  // service identity (Read for the loan file + Write for the decision
  // delivery) over the mortgage container. NOBODY else is named.
  const container = await owner.authFetch(`${podBase}mortgage/`, {
    body: "",
    headers: { "content-type": "text/turtle" },
    method: "PUT",
  });
  if (!container.ok) throw new Error(`container seed failed (${container.status})`);
  await ownerPut(
    `${podBase}mortgage/.acl`,
    containerGrantAcl({
      agents: [{ webid: ausService.webid }],
      containerPath: "/mortgage/",
      ownerWebid: owner.webid,
    }),
  );

  // The GRANTED loan file: the lender-written application plus four REAL
  // Ed25519-signed credentials attesting the borrower, status-listed on the
  // rig's hosted Bitstring list.
  rig = await credentialRig(NOW);
  const application = buildLoanApplication({
    amortizationType: FIBO.AmortizationType_fixedRate,
    created: new Date(NOW.getTime() - 3 * DAY_MS),
    iri: `${podBase}mortgage/application`,
    loanPurpose: FIBO.MortgageLoanPurpose_RealPropertyPurchase,
    loanTermMonths: alex.loanTermMonths,
    occupancy: FIBO.PropertyUsage_primaryResidence,
    property: { address: alex.subjectPropertyAddress },
    requestedAmountUsd: alex.requestedLoanUsd,
    submittedBy: borrower.webid,
  });
  await ownerPut(`${podBase}mortgage/application`, await resourceToTurtle(application));
  const [income, assets, credit, appraisal] = await Promise.all([
    rig.issueEmployment({
      credentialId: incomeIri(),
      index: 11,
      subject: borrower.webid,
      window: FRESH_WINDOW,
    }),
    rig.issueAssets({
      credentialId: `${podBase}mortgage/credentials/assets`,
      index: 12,
      subject: borrower.webid,
      window: FRESH_WINDOW,
    }),
    rig.issueCredit({
      credentialId: `${podBase}mortgage/credentials/credit`,
      index: 13,
      subject: borrower.webid,
      window: FRESH_WINDOW,
    }),
    rig.issueAppraisal({
      credentialId: `${podBase}mortgage/credentials/appraisal`,
      index: 14,
      subject: borrower.webid,
      window: FRESH_WINDOW,
    }),
  ]);
  await ownerPut(incomeIri(), income.body);
  await ownerPut(`${podBase}mortgage/credentials/assets`, assets.body);
  await ownerPut(`${podBase}mortgage/credentials/credit`, credit.body);
  await ownerPut(`${podBase}mortgage/credentials/appraisal`, appraisal.body);

  config = {
    allowInsecureLoopback: true,
    podAllowedOrigins: [pods.baseUrl],
    podServiceClientId: AUS_CLIENT.clientId,
    podServiceClientSecret: AUS_CLIENT.clientSecret,
    podServiceIssuer: ausService.issuer,
    serviceWebId: ausService.webid,
    trustedAnchorIssuers: [],
    trustedCredentialIssuers: [CREDENTIAL_ISSUER],
    trustedOidcIssuers: [borrower.issuer, unbound.issuer],
    trustForwardedHeaders: false,
  };
  service = createAusRailService({ config, now: () => NOW, verifySeams: verifySeams() });
}, 120_000);

afterAll(async () => {
  await pods?.stop();
  await borrower?.stop();
  await unbound?.stop();
  await ausService?.stop();
  await rogueService?.stop();
});

describe("boundary rejections (decision 0015 L1–L2)", () => {
  test("anonymous callers get 401 + WWW-Authenticate", async () => {
    const response = await service.run(new Request(apiUrl("/aus/run"), { method: "POST" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).not.toBeNull();
  });

  test("caller-supplied pod/webid are rejected 400 in query and body", async () => {
    const query = await service.run(
      await authedRequest(borrower, "POST", "/aus/run", {
        query: `?pod=${encodeURIComponent(podBase)}`,
      }),
    );
    expect(query.status).toBe(400);
    expect(((await query.json()) as { error: string }).error).toBe("param_rejected");
    const body = await service.run(
      await authedRequest(borrower, "POST", "/aus/run", {
        body: JSON.stringify({ webid: borrower.webid }),
      }),
    );
    expect(body.status).toBe(400);
  });

  test("a trusted caller with no pod binding is refused 403", async () => {
    const response = await service.run(await authedRequest(unbound, "POST", "/aus/run"));
    expect(response.status).toBe(403);
  });

  test("an unconfigured OIDC-issuer allowlist fails closed (503)", async () => {
    const unconfigured = createAusRailService({
      config: { ...config, trustedOidcIssuers: [] },
    });
    const response = await unconfigured.run(new Request(apiUrl("/aus/run"), { method: "POST" }));
    expect(response.status).toBe(503);
  });

  test("an unconfigured service identity fails closed (503) — never anonymous IO", async () => {
    const unconfigured = createAusRailService({
      config: { ...config, podServiceClientSecret: undefined },
    });
    const response = await unconfigured.run(await authedRequest(borrower, "POST", "/aus/run"));
    expect(response.status).toBe(503);
  });

  test("an unconfigured credential-issuer allowlist fails closed (503)", async () => {
    const unconfigured = createAusRailService({
      config: { ...config, trustedCredentialIssuers: [] },
      now: () => NOW,
      verifySeams: verifySeams(),
    });
    const response = await unconfigured.run(await authedRequest(borrower, "POST", "/aus/run"));
    expect(response.status).toBe(503);
  }, 60_000);
});

describe("the grant boundary is the pod's own WAC (decision 0015 L4)", () => {
  test("readers the grant does not name are denied by the pod itself", async () => {
    // Anonymous: the loan file is private.
    const anonymous = await fetch(incomeIri(), { headers: { accept: "text/turtle" } });
    expect(anonymous.ok).toBe(false);
    expect([401, 403]).toContain(anonymous.status);
    // A REAL authenticated identity that simply is not in the grant.
    const stranger = await outsider.authFetch(incomeIri(), {
      headers: { accept: "text/turtle" },
    });
    expect(stranger.ok).toBe(false);
    expect([401, 403]).toContain(stranger.status);
  });

  test("an AUS whose service identity the grant does not name fails closed — no decision", async () => {
    const rogue = createAusRailService({
      config: {
        ...config,
        podServiceClientId: ROGUE_CLIENT.clientId,
        podServiceClientSecret: ROGUE_CLIENT.clientSecret,
        podServiceIssuer: rogueService.issuer,
        serviceWebId: rogueService.webid,
      },
      now: () => NOW,
      verifySeams: verifySeams(),
    });
    const response = await rogue.run(await authedRequest(borrower, "POST", "/aus/run"));
    expect(response.ok).toBe(false);
    expect([403, 502]).toContain(response.status);
    expect(((await response.json()) as { error: string }).error).toBe("pod_access");
    // The run never produced a decision document.
    const decision = await owner.authFetch(decisionIri(), {
      headers: { accept: "text/turtle" },
    });
    expect(decision.status).toBe(404);
  }, 60_000);
});

describe("the authenticated happy path (scene 3 — REAL grant read + REAL verification)", () => {
  test("run: verifies the real credentials, approves, and writes the decision into the pod", async () => {
    const response = await service.run(await authedRequest(borrower, "POST", "/aus/run"));
    expect(response.status).toBe(200);
    const report = (await response.json()) as AusRunReport;

    // The deterministic outcome over the persona figures.
    expect(report.outcome).toBe("approve");
    expect(report.recommendation).toBe("Approve");
    expect(report.findings.every((finding) => finding.pass)).toBe(true);
    expect(report.qualifying.evaluated).toBe(true);

    // EVERY credential came back from the REAL verifier green: signature,
    // trusted issuer, validity window, Bitstring status, and shape — over
    // documents read through the REAL granted service fetch.
    expect(report.evidence).toHaveLength(4);
    for (const evidence of report.evidence as AusEvidence[]) {
      expect(evidence.verified).toBe(true);
      expect(evidence.subjectBound).toBe(true);
      expect(evidence.fresh).toBe(true);
      expect(evidence.verifyErrors).toEqual([]);
    }

    // The decision DOCUMENT (status, recommendation, conditions) landed in
    // the borrower's pod, shape-valid, attributed to the AUS service
    // identity — proven on a REAL authenticated read of the written document.
    expect(report.decisionIri).toBe(decisionIri());
    const written = await readDecision();
    const shapeReport = await validate(written.turtle, {
      expect: "underwriting-decision",
      focusNode: decisionIri(),
    });
    expect(shapeReport.conforms).toBe(true);
    expect(written.decision.decisionStatus).toBe(MORT.DecisionStatus_ApprovedWithConditions);
    expect(written.decision.ausRecommendation).toBe(FIBO.UnderwritingDecision_Approve);
    expect(written.decision.creatorIri).toBe(ausService.webid);
    expect(written.decision.evaluatesIri).toBe(`${podBase}mortgage/application`);
    expect(written.decision.approvedAmount?.amountValue).toBe(alex.requestedLoanUsd);

    // The delivered decision is itself grant-protected, not public.
    const anonymous = await fetch(decisionIri(), { headers: { accept: "text/turtle" } });
    expect(anonymous.ok).toBe(false);
    expect([401, 403]).toContain(anonymous.status);
  }, 120_000);
});

describe("scene 4 — stale evidence refers; the re-issued credential re-runs to approve", () => {
  test("a lapsed employment credential downgrades the run to refer", async () => {
    const stale = await rig.issueEmployment({
      credentialId: incomeIri(),
      index: 21,
      subject: borrower.webid,
      window: STALE_WINDOW,
    });
    await ownerPut(incomeIri(), stale.body);

    const response = await service.run(await authedRequest(borrower, "POST", "/aus/run"));
    expect(response.status).toBe(200);
    const report = (await response.json()) as AusRunReport;
    expect(report.outcome).toBe("refer");
    const employment = (report.evidence as AusEvidence[]).find(
      (entry) => entry.kind === "employment-income",
    );
    expect(employment?.fresh).toBe(false);
    // Fail-closed presentation over the wire too: no qualifying figures and
    // no risk findings are emitted when the evidence gate failed.
    expect(report.qualifying.evaluated).toBe(false);
    expect(report.findings.some((finding) => finding.category === "risk")).toBe(false);

    // The pod decision now records the referral (scene-4 truth in the vault).
    const written = await readDecision();
    expect(written.decision.decisionStatus).toBe(MORT.DecisionStatus_Suspended);
    expect(written.decision.ausRecommendation).toBe(FIBO.UnderwritingDecision_Refer);
  }, 120_000);

  test("the one-click re-issue through the existing grant re-runs to approve", async () => {
    const reissued = await rig.issueEmployment({
      credentialId: incomeIri(),
      index: 22,
      subject: borrower.webid,
      window: FRESH_WINDOW,
    });
    await ownerPut(incomeIri(), reissued.body);

    const response = await service.run(await authedRequest(borrower, "POST", "/aus/run"));
    expect(response.status).toBe(200);
    const report = (await response.json()) as AusRunReport;
    expect(report.outcome).toBe("approve");

    const written = await readDecision();
    expect(written.decision.decisionStatus).toBe(MORT.DecisionStatus_ApprovedWithConditions);
  }, 120_000);
});

describe("the appraisal must appraise the APPLICATION's property (real pod)", () => {
  test("a verified appraisal for a DIFFERENT property refers the run — no LTV from a mismatched appraisal", async () => {
    // A GENUINE, fully-signed, fresh, subject-bound appraisal — of another,
    // much higher-value property. Only the property binding can stop it.
    const appraisalIri = `${podBase}mortgage/credentials/appraisal`;
    const foreign = await rig.issueAppraisal({
      address: {
        addressLocality: "Columbus",
        addressRegion: "OH",
        postalCode: "43004",
        streetAddress: "9 Grander Estate Boulevard",
      },
      appraisedValueUsd: 900000,
      credentialId: appraisalIri,
      index: 31,
      subject: borrower.webid,
      window: FRESH_WINDOW,
    });
    await ownerPut(appraisalIri, foreign.body);

    const response = await service.run(await authedRequest(borrower, "POST", "/aus/run"));
    expect(response.status).toBe(200);
    const report = (await response.json()) as AusRunReport;
    expect(report.outcome).toBe("refer");

    // The verifier itself GREENED this credential (it is genuine) — the
    // property BINDING is what fails, and only it.
    const appraisalEvidence = (report.evidence as AusEvidence[]).find(
      (entry) => entry.kind === "appraisal",
    );
    expect(appraisalEvidence?.verified).toBe(true);
    expect(appraisalEvidence?.subjectBound).toBe(true);
    expect(appraisalEvidence?.fresh).toBe(true);
    expect(appraisalEvidence?.propertyBound).toBe(false);
    expect(appraisalEvidence?.verifyErrors).toContain("PROPERTY_MISMATCH");
    const finding = report.findings.find((entry) => entry.code === "EVIDENCE_APPRAISAL");
    expect(finding?.pass).toBe(false);
    expect(finding?.observed).toContain("different property");

    // Fail-closed presentation: the inflated denominator never becomes an
    // LTV — no qualifying figures, no risk findings.
    expect(report.qualifying.evaluated).toBe(false);
    expect(report.findings.some((entry) => entry.category === "risk")).toBe(false);

    // The pod decision records the referral.
    const written = await readDecision();
    expect(written.decision.decisionStatus).toBe(MORT.DecisionStatus_Suspended);
    expect(written.decision.ausRecommendation).toBe(FIBO.UnderwritingDecision_Refer);

    // Restore the matching appraisal and prove the run greens again — the
    // referral above was the binding, not some other drift.
    const restored = await rig.issueAppraisal({
      credentialId: appraisalIri,
      index: 32,
      subject: borrower.webid,
      window: FRESH_WINDOW,
    });
    await ownerPut(appraisalIri, restored.body);
    const rerun = await service.run(await authedRequest(borrower, "POST", "/aus/run"));
    expect(rerun.status).toBe(200);
    expect(((await rerun.json()) as AusRunReport).outcome).toBe("approve");
  }, 120_000);
});

describe("revocation genuinely shuts the run off (REAL WAC)", () => {
  test("after the borrower revokes the grant, the AUS is denied by the pod", async () => {
    // The borrower's wallet withdraws the AUS grant: the rewritten container
    // ACL no longer names the service identity.
    await ownerPut(
      `${podBase}mortgage/.acl`,
      containerGrantAcl({
        agents: [],
        containerPath: "/mortgage/",
        ownerWebid: owner.webid,
      }),
    );

    const response = await service.run(await authedRequest(borrower, "POST", "/aus/run"));
    expect(response.ok).toBe(false);
    expect([403, 502]).toContain(response.status);
    expect(((await response.json()) as { error: string }).error).toBe("pod_access");

    // The pod itself refuses the revoked service identity — and still serves
    // its owner (the revocation removed one agent, not the data).
    const ownerRead = await owner.authFetch(decisionIri(), {
      headers: { accept: "text/turtle" },
    });
    expect(ownerRead.status).toBe(200);
  }, 120_000);
});
