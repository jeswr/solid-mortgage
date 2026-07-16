/**
 * Scene-3/4 pod rail: URLA prefill FROM a seeded pod (real in-memory sparq
 * Solid server via the solid-kit harness), the application + Loan Estimate
 * write-back, and the freshness re-check with the stale → re-issue → green
 * loop (decision 0007).
 */

import { fetchRdf, parseRdf } from "@jeswr/fetch-rdf";
import { PERSONA_VALUES, personas, validate } from "@mortgage/data-model";
import { type SolidTestServer, seedPod, startSolidServer } from "@mortgage/solid-kit/testing";
import { reissueCredential, StatusIndexAllocator } from "@mortgage/vc-kit";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { LenderConfig } from "../lib/server/config";
import { checkEmploymentFreshness } from "../lib/server/freshness";
import { monthlyPrincipalAndInterest, submitApplication, TRID_LE_TIMING } from "../lib/server/loan";
import { PodAccessError } from "../lib/server/pod";
import { demoPrefill, prefillFromPod } from "../lib/server/prefill";
import {
  ANCHOR_ISSUER,
  type AnchorRig,
  anchorRig,
  issuerControls,
  issuerKey,
  resolveIssuerKey,
} from "./support";

const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;

let server: SolidTestServer;
let podBase: string;
let webId: string;
let config: LenderConfig;
let rig: AnchorRig;

/** The base config plus an extra allowlisted pod origin (provisioned accounts). */
function configWith(origin: string): LenderConfig {
  return { ...config, podAllowedOrigins: [...config.podAllowedOrigins, origin] };
}

const alex = PERSONA_VALUES[0];
if (alex === undefined) throw new Error("persona fixtures missing");

beforeAll(async () => {
  server = await startSolidServer({});
  podBase = `${server.baseUrl}/`;
  const [persona] = await personas({
    now: NOW,
    podBases: { "alex-rivera": podBase },
  });
  if (persona === undefined) throw new Error("persona factory returned nothing");
  webId = persona.webId;
  await seedPod(
    server.baseUrl,
    persona.resources.map((resource) => ({ path: resource.path, body: resource.turtle })),
  );
  config = {
    trustedOidcIssuers: [],
    trustedAnchorIssuers: [],
    trustedCredentialIssuers: [ANCHOR_ISSUER],
    podAllowedOrigins: [server.baseUrl],
    allowInsecureLoopback: true,
    trustForwardedHeaders: false,
  };
  rig = await anchorRig(NOW);
}, 120_000);

afterAll(async () => {
  await server.stop();
});

describe("SSRF allowlist (fail-closed)", () => {
  test("an empty allowlist disables the rail with 503", async () => {
    await expect(
      prefillFromPod(podBase, webId, { ...config, podAllowedOrigins: [] }),
    ).rejects.toMatchObject({ status: 503 });
  });

  test("a non-allowlisted origin is refused 403", async () => {
    await expect(prefillFromPod("https://evil.example/", webId, config)).rejects.toMatchObject({
      status: 403,
    });
  });

  test("non-loopback http is refused even when dev mode is on", async () => {
    await expect(
      prefillFromPod("http://pods.internal/", webId, {
        ...config,
        podAllowedOrigins: ["http://pods.internal"],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test("loopback http is refused when dev mode is OFF", async () => {
    await expect(
      prefillFromPod(podBase, webId, { ...config, allowInsecureLoopback: false }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("scene 3 — URLA prefill from the granted pod", () => {
  test("prefills the URLA subset from the seeded persona resources", async () => {
    const prefill = await prefillFromPod(podBase, webId, config);
    expect(prefill.source).toBe("pod");
    expect(prefill.borrower.name).toBe(alex.name);
    expect(prefill.borrower.birthDate).toBe(alex.birthDate);
    expect(prefill.borrower.maritalStatus).toBe("Unmarried");
    expect(prefill.employment.employerName).toBe(alex.employerName);
    expect(prefill.employment.monthlyGrossIncomeUsd).toBe(alex.monthlyGrossIncomeUsd);
    expect(prefill.credit.creditScoreValue).toBe(alex.creditScoreValue);
    expect(prefill.credit.totalMonthlyDebtUsd).toBe(alex.totalMonthlyDebtUsd);
    expect(prefill.assets.accounts[0]?.providerName).toBe(alex.bankName);
    expect(prefill.assets.accounts[0]?.amountUsd).toBe(alex.bankBalanceUsd);
  });

  test("the demo fallback mirrors the same persona values", () => {
    const prefill = demoPrefill();
    expect(prefill.source).toBe("demo");
    expect(prefill.borrower.name).toBe(alex.name);
    expect(prefill.employment.monthlyGrossIncomeUsd).toBe(alex.monthlyGrossIncomeUsd);
  });
});

describe("scene 3 — application submit + Loan Estimate delivery", () => {
  test("writes the application and decision into the pod and returns the LE", async () => {
    const result = await submitApplication(podBase, webId, config, { now: () => NOW });
    expect(result.applicationIri).toBe(`${podBase}mortgage/application`);
    expect(result.decisionIri).toBe(`${podBase}mortgage/decision`);
    expect(result.decisionStatus).toBe("ApprovedWithConditions");
    expect(result.loanEstimate.loanAmountUsd).toBe(alex.requestedLoanUsd);
    expect(result.loanEstimate.tridTiming).toBe(
      "delivered or placed in the mail within 3 business days of the application",
    );
    expect(result.loanEstimate.monthlyPrincipalAndInterestUsd).toBe(
      monthlyPrincipalAndInterest(alex.requestedLoanUsd, 6.125, 360),
    );

    // The delivered documents are real pod resources conforming to their shapes.
    const application = await fetchRdf(result.applicationIri);
    const applicationReport = await validate(application.dataset, {
      expect: "loan-application",
      focusNode: result.applicationIri,
    });
    expect(applicationReport.conforms).toBe(true);
    const decision = await fetchRdf(result.decisionIri);
    const decisionReport = await validate(decision.dataset, {
      expect: "underwriting-decision",
      focusNode: result.decisionIri,
    });
    expect(decisionReport.conforms).toBe(true);
  });

  test("re-submitting updates conditionally (no lost-update clobber)", async () => {
    const again = await submitApplication(podBase, webId, config, { now: () => NOW });
    expect(again.applicationIri).toBe(`${podBase}mortgage/application`);
  });

  test("TRID copy constant carries the exact required formulation", () => {
    expect(TRID_LE_TIMING).toBe(
      "delivered or placed in the mail within 3 business days of the application",
    );
  });
});

describe("scene 4 — freshness re-check (decision 0007)", () => {
  const seams = {
    resolveKey: resolveIssuerKey,
    isControlledBy: issuerControls,
    statusFetch: rigStatusFetch,
  };
  function rigStatusFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return rig.host.fetch(input, init);
  }
  /** Offline seams that reach neither a WebID doc nor a status list (network-free). */
  const offlineSeams = {
    resolveKey: async () => undefined,
    statusFetch: async () => new Response(null, { status: 404 }),
    webIdFetch: async () => new Response(null, { status: 404 }),
  };

  test("503s when no credential-issuer allowlist is configured (fail closed)", async () => {
    await expect(
      checkEmploymentFreshness(
        podBase,
        { ...config, trustedCredentialIssuers: [] },
        {
          now: () => NOW,
        },
      ),
    ).rejects.toMatchObject({ status: 503 });
  });

  test("the UNSIGNED persona VC is window-fresh but does NOT verify (no green tick)", async () => {
    // The seeded persona employment VC is a shape-conforming but UNSIGNED graph
    // (signing arrives with the sm-26 seed tooling); SHACL conformance alone must
    // never earn a green tick — the signature/issuer gate fails closed.
    const report = await checkEmploymentFreshness(podBase, config, {
      now: () => NOW,
      seams: offlineSeams,
    });
    expect(report.fresh).toBe(true); // validFrom −30d / validUntil +14d
    expect(report.verified).toBe(false);
    expect(report.greenTick).toBe(false);
    expect(report.decision).toBe("blocked-invalid");
  });

  test("stale → one-click re-issue → green tick", async () => {
    // A second pod holds a LAPSED employment VC signed by the stub issuer.
    const account = await server.provisionAccount();
    const stalePod = `${account.baseUrl}/`;
    const config = configWith(account.baseUrl);
    const credentialId = `${stalePod}mortgage/credentials/income`;
    const stale = await rig.issueEmployment({
      subject: `${stalePod}profile/card#me`,
      credentialId,
      validFrom: new Date(NOW.getTime() - 40 * DAY_MS),
      validUntil: new Date(NOW.getTime() - 2 * DAY_MS),
      index: 42,
    });
    await seedPod(account.baseUrl, [{ path: "/mortgage/credentials/income", body: stale.body }]);

    const staleReport = await checkEmploymentFreshness(stalePod, config, {
      now: () => NOW,
      seams,
    });
    expect(staleReport.fresh).toBe(false);
    expect(staleReport.decision).toBe("blocked-stale");
    expect(staleReport.greenTick).toBe(false);

    // The one-click re-issue (the verifications app's act, exercised here via
    // vc-kit): same claims, fresh window, old index revoked.
    const allocator = new StatusIndexAllocator();
    const staleDataset = await parseRdf(stale.body, "text/turtle", { baseIRI: credentialId });
    const reissued = await reissueCredential(staleDataset, {
      key: await issuerKey(),
      now: NOW,
      validity: {
        validFrom: NOW,
        validUntil: new Date(NOW.getTime() + 14 * DAY_MS),
      },
      statusList: rig.list,
      allocator,
    });
    const replace = await fetch(credentialId, {
      method: "PUT",
      headers: { "content-type": "text/turtle" },
      body: reissued.issued.body,
    });
    expect(replace.ok).toBe(true);

    const freshReport = await checkEmploymentFreshness(stalePod, config, {
      now: () => NOW,
      seams,
    });
    expect(freshReport.fresh).toBe(true);
    expect(freshReport.verified).toBe(true);
    expect(freshReport.greenTick).toBe(true);
    expect(freshReport.decision).toBe("stands");
  }, 60_000);

  test("a revoked replacement blocks the decision (revocation stays separate from freshness)", async () => {
    const account = await server.provisionAccount();
    const pod = `${account.baseUrl}/`;
    const config = configWith(account.baseUrl);
    const revoked = await rig.issueEmployment({
      subject: `${pod}profile/card#me`,
      credentialId: `${pod}mortgage/credentials/income`,
      validFrom: new Date(NOW.getTime() - 1 * DAY_MS),
      validUntil: new Date(NOW.getTime() + 14 * DAY_MS),
      index: 77,
    });
    await seedPod(account.baseUrl, [{ path: "/mortgage/credentials/income", body: revoked.body }]);
    await rig.list.revoke(77, { now: NOW });
    const report = await checkEmploymentFreshness(pod, config, { now: () => NOW, seams });
    expect(report.fresh).toBe(true);
    expect(report.verified).toBe(false); // STATUS_REVOKED
    expect(report.verifyErrors).toContain("STATUS_REVOKED");
    expect(report.greenTick).toBe(false);
    expect(report.decision).toBe("blocked-invalid");
  }, 60_000);

  test("an untrusted issuer never verifies (no green tick)", async () => {
    const account = await server.provisionAccount();
    const pod = `${account.baseUrl}/`;
    const config = {
      ...configWith(account.baseUrl),
      trustedCredentialIssuers: ["https://someone-else.example/org"],
    };
    const vc = await rig.issueEmployment({
      subject: `${pod}profile/card#me`,
      credentialId: `${pod}mortgage/credentials/income`,
      validFrom: new Date(NOW.getTime() - 1 * DAY_MS),
      validUntil: new Date(NOW.getTime() + 14 * DAY_MS),
      index: 88,
    });
    await seedPod(account.baseUrl, [{ path: "/mortgage/credentials/income", body: vc.body }]);
    const report = await checkEmploymentFreshness(pod, config, { now: () => NOW, seams });
    expect(report.verified).toBe(false);
    expect(report.verifyErrors).toContain("UNTRUSTED_ISSUER");
    expect(report.greenTick).toBe(false);
  }, 60_000);

  test("SUBSTITUTION: a valid credential for a DIFFERENT borrower never greens (holder binding)", async () => {
    // A fully valid, signed, non-revoked, in-window employment VC — but its
    // subject is someone else. Dropping it into this pod must NOT green the
    // tick: the subject must equal the borrower the check is run for.
    const victim = "https://victim.example/profile/card#me";
    const account = await server.provisionAccount();
    const pod = `${account.baseUrl}/`;
    const config = configWith(account.baseUrl);
    const foreign = await rig.issueEmployment({
      subject: victim,
      credentialId: `${pod}mortgage/credentials/income`,
      validFrom: new Date(NOW.getTime() - 1 * DAY_MS),
      validUntil: new Date(NOW.getTime() + 14 * DAY_MS),
      index: 91,
    });
    await seedPod(account.baseUrl, [{ path: "/mortgage/credentials/income", body: foreign.body }]);
    // The credential subject is NOT this pod's owner — caller-independent binding rejects it.
    const report = await checkEmploymentFreshness(pod, config, { now: () => NOW, seams });
    expect(report.fresh).toBe(true);
    expect(report.verifyErrors).toContain("SUBJECT_MISMATCH");
    expect(report.verified).toBe(false);
    expect(report.greenTick).toBe(false);
    expect(report.decision).toBe("blocked-invalid");
  }, 60_000);

  test("a pod without the credential 404s", async () => {
    const account = await server.provisionAccount();
    await expect(
      checkEmploymentFreshness(`${account.baseUrl}/`, configWith(account.baseUrl), {
        now: () => NOW,
        seams: offlineSeams,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("PodAccessError surface", () => {
  test("carries an HTTP status for the route layer", () => {
    const error = new PodAccessError(403, "nope");
    expect(error.status).toBe(403);
    expect(error.name).toBe("PodAccessError");
  });
});
