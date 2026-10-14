/**
 * sm-36 — the CROSS-APP BORROWER JOURNEY: the five SPEC §2 scenes driven
 * end-to-end across the stakeholder zones as ONE borrower's story on the
 * single pre-seeded harness pod (sm-65 global setup: real vc-kit-signed
 * credentials, captured genuine operand anchors, pod-hosted issuer documents
 * + Bitstring status lists).
 *
 * What is REAL here (nothing on the auth/issuance/verification/grant path is
 * ever mocked or fulfilled from the test):
 *  - the borrower's DPoP-bound Solid-OIDC session (run-long dev issuer,
 *    client_credentials over HTTP; fresh single-use proof per request);
 *  - every credential signature (the verifications app runs AS the seeded
 *    issuers — same identity IRIs, same signing keys), every fail-closed
 *    verifyCredential chain against pod-served issuer docs + status lists;
 *  - the UltraHonk Tier-A proofs (proved in this process, bound to each
 *    lender's own single-use nonce) verified by the lenders' REAL verifiers
 *    against the SEEDED operand anchors read from the borrower's vault;
 *  - the pod writes: scene-1 issuance, scene-3 application + Loan Estimate +
 *    AUS decision, scene-4 re-issue + status-list revocation, scene-5
 *    closing record + ACL documents + DPV consent receipts.
 *
 * Deliberate scope notes:
 *  - The seeded pod runs the harness's FIXED-OWNER mode (SPEC §7), so WAC
 *    enforcement itself is not observable here — the OIDC-mode enforcement
 *    of the same seeds/ACLs is proven by test/mortgage-seed-integration.test.ts
 *    and e2e/closing.spec.ts. This journey asserts the apps' own decision-0015
 *    boundaries adversarially (anonymous → 401 challenges) and every pod
 *    state transition by direct reads.
 *  - The wallet zone is the Mode-1 IN-BROWSER pod (its own SharedWorker pod,
 *    structurally disjoint from this Node-side vault) — its journey beats run
 *    in e2e/wallet.spec.ts; this suite covers the six Node-pod zones.
 *
 * Scene → real state transitions asserted (summary):
 *  1. Fill the vault — all three verification flows report issued+verified
 *     (full chain against pod-served docs); a DELETEd asset slot (404 proven)
 *     is re-filled through the verifications app's REAL issue rail and the
 *     new signed VC verifies from the pod, subject-bound to the borrower.
 *  2. Shop without undressing — both lenders mint nonces; in-process
 *     UltraHonk proofs over the pinned hidden values, anchored by the SEEDED
 *     vault anchors, earn `qualified: true` from both REAL verify routes.
 *  3. One-click application — URLA prefill FROM the pod (source: "pod");
 *     submit rewrites /mortgage/application (submittedBy = borrower WebID)
 *     and the Loan Estimate renders; the AUS reads the granted loan file,
 *     verifies all four credentials (property's appraisal feeding in), rules
 *     "Approve", and its decision DOCUMENT overwrites /mortgage/decision
 *     (creator flips to the AUS service WebID).
 *  4. Nothing goes stale — the lender freshness check greens over the
 *     BACKDATED (−30d/+14d) employment VC; one-click re-issue through the
 *     verifications app revokes seeded status index 42 (the pre-reissue
 *     credential body now FAILS verification with STATUS_REVOKED) and the
 *     replacement + renewed anchor verify with an advanced window; the AUS
 *     re-runs to "Approve" over the replacement.
 *  5. Close and stay in control — the eClose writes the ClosingRecord
 *     (404 → 200 proven), grants the lender in the record's ACL document,
 *     transfers to the servicer, revokes the lender (ACL no longer names
 *     it), refuses a REPEAT close (409), and the DPV consent-receipt ledger
 *     shows grant/grant/revoke.
 *
 * axe (WCAG 2.x A/AA, zero violations) runs at every scene state; the R1
 * ConceptDemoBanner is asserted on every zone surface the journey visits.
 */

import { MORT } from "@mortgage/data-model";
import {
  CAPTURED_OPERAND_ENC,
  DEMO_CREDIT_SCORE,
  DEMO_MONTHLY_INCOME_USD,
} from "@mortgage/solid-kit/mortgage-seed";
import { type DevOidcIssuer, startDevOidcIssuer } from "@mortgage/solid-kit/testing";
import { proveTierA, tierAProofToJson, verifyCredential } from "@mortgage/vc-kit";
import { expect, test } from "@playwright/test";
import { AppRunner } from "./support/app-runner";
import { acknowledgeInterstitial, expectAxeClean, expectBannerVisible } from "./support/banners";
import { type BorrowerSession, borrowerSessionFromEnv } from "./support/borrower-auth";
import type { SeedIssuerExport } from "./support/mortgage-issuance";

const DAY_MS = 24 * 60 * 60 * 1000;
const PROVE_TIMEOUT = 300_000;
const SERVICE_CLIENT = { clientId: "journey-service", clientSecret: "e2e-journey-service-secret" };

/** The closing scene's granted parties (ACL/receipt agents; RFC 2606 .example). */
const LENDER_AGENT = "https://lender.example/orgs/underwriting#id";
const SERVICER_AGENT = "https://servicer.example/orgs/servicing#id";

const INCOME_STATEMENT = { field: MORT.monthlyGrossIncomeUsd, op: "ge", bound: 7000 } as const;
const SCORE_STATEMENT = { field: MORT.creditScoreValue, op: "ge", bound: 620 } as const;

const runner = new AppRunner();
let borrower: BorrowerSession;
let serviceIssuer: DevOidcIssuer;
let podOrigin = "";
let podBase = "";
let seededAt: Date;
let issuersByRole: Map<string, SeedIssuerExport>;

const origins = {
  closing: "",
  gse: "",
  lender53: "",
  lenderBoa: "",
  property: "",
  verifications: "",
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is unset — is the sm-65 global setup wired?`);
  }
  return value;
}

function seedIssuer(role: string): SeedIssuerExport {
  const entry = issuersByRole.get(role);
  if (entry === undefined) throw new Error(`no exported seed issuer for role ${role}`);
  return entry;
}

/** Read one pod resource's raw body over the fixed-owner transport. */
async function podBody(path: string): Promise<string> {
  const response = await fetch(`${podBase}${path}`);
  expect(response.status, `GET ${path}`).toBe(200);
  return response.text();
}

/** The vc-kit verification seams for pod-served issuer docs + status lists. */
const podSeams = { statusFetch: fetch.bind(globalThis), webIdFetch: fetch.bind(globalThis) };

test.describe("cross-app borrower journey (sm-36, five scenes on the seeded pod)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    test.setTimeout(300_000);
    podOrigin = requiredEnv("MORTGAGE_E2E_POD_ORIGIN");
    podBase = `${podOrigin}/`;
    seededAt = new Date(requiredEnv("MORTGAGE_E2E_SEEDED_AT"));
    const exported = JSON.parse(
      requiredEnv("MORTGAGE_E2E_SEED_ISSUERS"),
    ) as readonly SeedIssuerExport[];
    issuersByRole = new Map(exported.map((entry) => [entry.role, entry]));
    borrower = await borrowerSessionFromEnv();

    // ONE service identity for the three pod-writing apps (decision 0015 L4).
    // http-schemed WebID: pod-side verifiers dereference it with a plain fetch.
    serviceIssuer = await startDevOidcIssuer({
      clientCredentials: SERVICE_CLIENT,
      webidScheme: "http",
    });

    const employment = seedIssuer("employment");
    const bank = seedIssuer("bank");
    const bureau = seedIssuer("bureau");
    const appraisal = seedIssuer("appraisal");
    const title = seedIssuer("title");
    const trustedCredentialIssuers = [
      employment.iri,
      bank.iri,
      bureau.iri,
      appraisal.iri,
      title.iri,
    ].join(",");

    const shared = {
      MORTGAGE_TRUSTED_OIDC_ISSUERS: borrower.issuer,
      MORTGAGE_POD_ALLOWED_ORIGINS: podOrigin,
      MORTGAGE_DEV_ALLOW_LOOPBACK: "1",
      // Reconstruct the DPoP htu from the forwarded host (the Vercel posture,
      // exercised locally — the per-app suites' recipe).
      MORTGAGE_TRUST_FORWARDED_HEADERS: "1",
    };
    const servicePodEnv = (prefix: string) => ({
      [`${prefix}_POD_SERVICE_ISSUER`]: serviceIssuer.issuer,
      [`${prefix}_POD_SERVICE_CLIENT_ID`]: SERVICE_CLIENT.clientId,
      [`${prefix}_POD_SERVICE_CLIENT_SECRET`]: SERVICE_CLIENT.clientSecret,
    });
    const flowIssuerEnv = (flow: string, issuer: SeedIssuerExport) => ({
      [`MORTGAGE_VERIFICATIONS_${flow}_ISSUER_WEBID`]: issuer.iri,
      [`MORTGAGE_VERIFICATIONS_${flow}_ISSUER_KEY_JWK`]: issuer.privateJwkJson,
      [`MORTGAGE_VERIFICATIONS_${flow}_ISSUER_KEY_VM`]: issuer.verificationMethod,
      [`MORTGAGE_VERIFICATIONS_${flow}_STATUS_LIST_URL`]: issuer.statusListUrl,
    });

    [
      origins.verifications,
      origins.lenderBoa,
      origins.lender53,
      origins.gse,
      origins.property,
      origins.closing,
    ] = await Promise.all([
      runner.start({
        command: "start",
        packageName: "@mortgage/app-verifications",
        readyPath: "/verifications/api/health",
        env: {
          ...shared,
          ...servicePodEnv("MORTGAGE_VERIFICATIONS"),
          MORTGAGE_VERIFICATIONS_SERVICE_WEBID: serviceIssuer.webid,
          // The app IS the seeded issuers: same identity IRIs, same signing
          // keys, same pod-hosted status lists (scene-4 re-issue re-signs the
          // SEEDED credential, which only the signing issuer can do).
          ...flowIssuerEnv("EMPLOYMENT", employment),
          ...flowIssuerEnv("ASSETS", bank),
          ...flowIssuerEnv("CREDIT", bureau),
        },
      }),
      runner.start({
        command: "start",
        packageName: "@mortgage/app-lender-boa",
        readyPath: "/lender-boa/api/health",
        env: {
          ...shared,
          MORTGAGE_TRUSTED_ANCHOR_ISSUERS: [employment.iri, bureau.iri].join(","),
          MORTGAGE_TRUSTED_CREDENTIAL_ISSUERS: trustedCredentialIssuers,
        },
      }),
      runner.start({
        command: "start",
        packageName: "@mortgage/app-lender-53",
        readyPath: "/lender-53/api/health",
        env: {
          ...shared,
          MORTGAGE_TRUSTED_ANCHOR_ISSUERS: [employment.iri, bureau.iri].join(","),
        },
      }),
      runner.start({
        command: "start",
        packageName: "@mortgage/app-gse",
        readyPath: "/gse/api/health",
        env: {
          ...shared,
          ...servicePodEnv("MORTGAGE_AUS"),
          MORTGAGE_AUS_SERVICE_WEBID: serviceIssuer.webid,
          MORTGAGE_TRUSTED_CREDENTIAL_ISSUERS: trustedCredentialIssuers,
        },
      }),
      runner.start({
        command: "start",
        packageName: "@mortgage/app-property",
        readyPath: "/property/api/health",
        env: { ...shared },
      }),
      runner.start({
        command: "start",
        packageName: "@mortgage/app-closing",
        readyPath: "/closing/api/health",
        env: {
          ...shared,
          ...servicePodEnv("MORTGAGE_CLOSING"),
          MORTGAGE_CLOSING_SERVICE_WEBID: serviceIssuer.webid,
          MORTGAGE_LENDER_SERVICE_WEBID: LENDER_AGENT,
          MORTGAGE_SERVICER_SERVICE_WEBID: SERVICER_AGENT,
        },
      }),
    ]);
  });

  test.afterAll(async () => {
    runner.stopAll();
    await serviceIssuer?.stop();
  });

  // ── Scene 1 — fill the vault ──────────────────────────────────────────────

  test("scene 1: the vault verifies end-to-end, and the issuer rail REALLY issues into it", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    // The issuer rail is a real decision-0015 boundary: anonymous → 401.
    const anonymous = await fetch(`${origins.verifications}/verifications/api/issue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ flow: "assets" }),
    });
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("www-authenticate")).toBeTruthy();

    // The seeded vault: all three flows issued + FULLY verified (signature,
    // issuer binding, window, pod-hosted status list, shape — and the
    // employment window is EXACTLY the backdated scene-4 seed, −30d/+14d).
    interface FlowState {
      id: string;
      issued?: boolean;
      verified?: boolean;
      fresh?: boolean;
      window?: { validFrom?: string; validUntil?: string };
    }
    const flowsUrl = `${origins.verifications}/verifications/api/flows`;
    const initial = await borrower.authedFetch(flowsUrl);
    expect(initial.status).toBe(200);
    const initialFlows = ((await initial.json()) as { flows: FlowState[] }).flows;
    for (const id of ["employment", "assets", "credit"]) {
      const flow = initialFlows.find((entry) => entry.id === id);
      expect(flow?.issued, `${id} issued: ${JSON.stringify(initialFlows)}`).toBe(true);
      expect(flow?.verified, `${id} verified: ${JSON.stringify(flow)}`).toBe(true);
    }
    const employment = initialFlows.find((entry) => entry.id === "employment");
    expect(employment?.fresh).toBe(true);
    expect(new Date(employment?.window?.validFrom ?? "").getTime()).toBe(
      seededAt.getTime() - 30 * DAY_MS,
    );
    expect(new Date(employment?.window?.validUntil ?? "").getTime()).toBe(
      seededAt.getTime() + 14 * DAY_MS,
    );

    // A REAL issuance transition: empty the asset slot (proven 404), then the
    // branded flow re-fills it through the real rail — driven from the UI
    // with the borrower's real DPoP session attached to the page's API calls.
    const assetsIri = `${podBase}mortgage/credentials/assets`;
    const deleted = await fetch(assetsIri, { method: "DELETE" });
    expect([200, 204, 205].includes(deleted.status), `DELETE assets: ${deleted.status}`).toBe(true);
    expect((await fetch(assetsIri)).status).toBe(404);
    const drained = await borrower.authedFetch(flowsUrl);
    const drainedAssets = ((await drained.json()) as { flows: FlowState[] }).flows.find(
      (entry) => entry.id === "assets",
    );
    expect(drainedAssets?.issued, "the flows read is live, not vacuous").toBe(false);

    await borrower.authenticatePage(page, "**/verifications/api/**");
    await page.goto(`${origins.verifications}/verifications/assets`);
    await acknowledgeInterstitial(page, "The Work Number, Finicity, or Equifax");
    await page.getByRole("button", { name: "Issue credential", exact: true }).click();
    const outcome = page.locator("[data-panel-outcome]");
    await expect(outcome).toHaveAttribute("data-panel-outcome", "ok", { timeout: 60_000 });
    await expect(outcome).toContainText("Credential saved in Alex's pod.");

    // The signed VC is REALLY in the vault and passes the full fail-closed
    // chain, subject-bound to the authenticated borrower (decision 0015 L3).
    const issuedBody = await podBody("mortgage/credentials/assets");
    const verification = await verifyCredential(issuedBody, {
      expectShape: "asset-credential",
      now: new Date(),
      trustedIssuers: [seedIssuer("bank").iri],
      ...podSeams,
    });
    expect(verification.verified, JSON.stringify(verification.errors)).toBe(true);
    expect(verification.credential?.subject).toBe(borrower.webid);

    // Scene-1 state: banner + axe on the branded issuer surface.
    await expectBannerVisible(page, { organization: "The Work Number, Finicity, or Equifax" });
    await expectAxeClean(page);
  });

  // ── Scene 2 — shop without undressing (two competing lenders) ───────────

  test("scene 2: REAL ZK pre-qual at BOTH lenders over the SEEDED vault anchors", async ({
    page,
  }) => {
    test.setTimeout(PROVE_TIMEOUT * 2);

    // The anchors come FROM the borrower's vault — the seeded, issuer-signed
    // operand anchors carrying the captured genuine encodings.
    const incomeAnchor = await podBody("mortgage/zk/anchor-income");
    const scoreAnchor = await podBody("mortgage/zk/anchor-score");
    const incomeEnc = CAPTURED_OPERAND_ENC[DEMO_MONTHLY_INCOME_USD];
    const scoreEnc = CAPTURED_OPERAND_ENC[DEMO_CREDIT_SCORE];
    if (incomeEnc === undefined || scoreEnc === undefined) {
      throw new Error("captured operand encodings missing from the seed canon");
    }
    expect(incomeAnchor).toContain(incomeEnc);
    expect(scoreAnchor).toContain(scoreEnc);

    interface ChallengeStatement {
      id: "income" | "score";
      field: string;
      nonce: string;
    }
    const prequalAt = async (origin: string, basePath: string) => {
      const challengeResponse = await borrower.authedFetch(
        `${origin}${basePath}/api/prequal/challenge`,
        { method: "POST" },
      );
      expect(challengeResponse.status, `${basePath} challenge`).toBe(200);
      const { statements } = (await challengeResponse.json()) as {
        statements: ChallengeStatement[];
      };
      const challenges = Object.fromEntries(statements.map((entry) => [entry.id, entry]));
      // Exact-namespace pin: the lender is asking about THESE typed fields.
      expect(challenges.income?.field).toBe(MORT.monthlyGrossIncomeUsd);
      expect(challenges.score?.field).toBe(MORT.creditScoreValue);
      if (challenges.income === undefined || challenges.score === undefined) {
        throw new Error(`${basePath}: challenge missing a statement`);
      }

      // REAL UltraHonk proofs over the pinned hidden values, bound to this
      // lender's own single-use nonces.
      const [incomeProof, scoreProof] = await Promise.all([
        proveTierA({
          statement: INCOME_STATEMENT,
          value: DEMO_MONTHLY_INCOME_USD,
          operandEnc: incomeEnc,
          nonce: challenges.income.nonce,
        }),
        proveTierA({
          statement: SCORE_STATEMENT,
          value: DEMO_CREDIT_SCORE,
          operandEnc: scoreEnc,
          nonce: challenges.score.nonce,
        }),
      ]);
      const verifyResponse = await borrower.authedFetch(`${origin}${basePath}/api/prequal/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          presentations: {
            income: {
              nonce: challenges.income.nonce,
              proof: tierAProofToJson(incomeProof),
              anchorVc: incomeAnchor,
            },
            score: {
              nonce: challenges.score.nonce,
              proof: tierAProofToJson(scoreProof),
              anchorVc: scoreAnchor,
            },
          },
        }),
      });
      const payload = (await verifyResponse.json()) as {
        qualified: boolean;
        results: Record<string, { verified: boolean }>;
        rateQuote: { illustrative: boolean; notAnOffer: boolean };
      };
      expect(verifyResponse.status, `${basePath} verify: ${JSON.stringify(payload)}`).toBe(200);
      expect(payload.qualified).toBe(true);
      expect(payload.results.income?.verified).toBe(true);
      expect(payload.results.score?.verified).toBe(true);
      expect(payload.rateQuote.illustrative).toBe(true);
      expect(payload.rateQuote.notAnOffer).toBe(true);
    };

    // Primary lender, then the competing quote — no values revealed to either.
    await prequalAt(origins.lenderBoa, "/lender-boa");
    await prequalAt(origins.lender53, "/lender-53");

    // Scene-2 surfaces: banner + axe on both lender zones.
    await page.goto(`${origins.lenderBoa}/lender-boa/prequal`);
    // The limitation items sit in the collapsed "Technical details" disclosure.
    await page.locator("summary", { hasText: "Technical details" }).click();
    await expect(
      page.getByText("Live proofs are bound to an issuer-signed operand anchor"),
    ).toBeVisible();
    await expectBannerVisible(page, {
      organization: "Bank of America",
      role: "primary mortgage lender",
    });
    await expectAxeClean(page);

    await page.goto(`${origins.lender53}/lender-53`);
    await acknowledgeInterstitial(page, "Fifth Third Bank");
    await expect(
      page.getByRole("heading", {
        name: "Second lender's prequalification criteria",
      }),
    ).toBeVisible();
    await expectBannerVisible(page, {
      organization: "Fifth Third Bank",
      role: "competing mortgage lender",
    });
    await expectAxeClean(page);
  });

  // ── Scene 3 — one-click application, then the AUS underwrites ───────────

  test("scene 3: pod-prefilled application + Loan Estimate, and the AUS decides from granted data", async ({
    page,
  }) => {
    test.setTimeout(240_000);

    // URLA prefill FROM the pod (the seeded persona + the pinned VC values).
    await borrower.authenticatePage(page, "**/lender-boa/api/**");
    await page.goto(`${origins.lenderBoa}/lender-boa/application`);
    await expect(page.locator("[data-prefill-source]")).toHaveAttribute(
      "data-prefill-source",
      "pod",
    );
    await expect(page.getByLabel("Name")).toHaveValue("Alex Rivera");
    await expect(page.getByLabel("Employer")).toHaveValue("Ridgeline Analytics LLC");
    await expect(page.getByLabel("Monthly gross income")).toHaveValue("$8,500");

    // Submit: the application + instant lender decision land IN the pod.
    const decisionBefore = await podBody("mortgage/decision");
    await page.getByRole("button", { name: "Submit application" }).click();
    const estimate = page.locator("[data-loan-estimate]");
    await expect(estimate).toBeVisible({ timeout: 30_000 });
    await expect(estimate).toContainText("delivered or placed in the mail within 3 business days");
    const application = await podBody("mortgage/application");
    expect(application, "submittedBy is the AUTHENTICATED borrower").toContain(borrower.webid);
    await expectBannerVisible(page, {
      organization: "Bank of America",
      role: "primary mortgage lender",
    });
    await expectAxeClean(page);

    // The AUS rail is a real decision-0015 boundary: anonymous → 401.
    const anonymous = await fetch(`${origins.gse}/gse/api/aus/run`, { method: "POST" });
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("www-authenticate")).toBeTruthy();

    // Underwrite from the UI with the real session: every credential —
    // including property's appraisal feed — verifies, and the rules approve.
    await borrower.authenticatePage(page, "**/gse/api/**");
    await page.goto(`${origins.gse}/gse/underwriting`);
    await page.getByRole("button", { name: "Run AUS" }).click();
    const result = page.locator("[data-aus-result]");
    await expect(result).toHaveAttribute("data-aus-result", "approve", { timeout: 120_000 });
    await expect(page.getByText("AUS recommendation: Accept")).toBeVisible();
    for (const code of [
      "EVIDENCE_EMPLOYMENT_INCOME",
      "EVIDENCE_ASSETS",
      "EVIDENCE_CREDIT_SCORE",
      "EVIDENCE_APPRAISAL",
      "CREDIT_SCORE_MINIMUM",
      "DEBT_TO_INCOME",
      "LOAN_TO_VALUE",
      "RESERVES",
    ]) {
      await expect(page.locator(`[data-finding="${code}"]`), code).toContainText("pass ·");
    }

    // The decision DOCUMENT was really replaced in the pod: new content,
    // created by the AUS service identity the borrower's grant names.
    const decisionAfter = await podBody("mortgage/decision");
    expect(decisionAfter).not.toBe(decisionBefore);
    expect(decisionAfter).toContain(serviceIssuer.webid);

    await expectBannerVisible(page, {
      organization: "Freddie Mac",
      role: "automated underwriting service",
    });
    await expectAxeClean(page);

    // Property services fed the loan file (appraisal + title are the seeded,
    // verified credentials) — its branded surfaces carry the banner too.
    await page.goto(`${origins.property}/property`);
    await expectBannerVisible(page, { organization: "Cotality and First American" });
    await expectAxeClean(page);
    await page.goto(`${origins.property}/property/appraisal`);
    await expect(page.locator("[data-appraised-value]").first()).toBeVisible();
    await expectBannerVisible(page, {
      organization: "Cotality",
      role: "property appraisal provider",
    });
    await expectAxeClean(page);
    await page.goto(`${origins.property}/property/title`);
    await expect(page.locator("[data-title-status]").first()).toHaveAttribute(
      "data-title-status",
      "clear",
    );
    await expectBannerVisible(page, {
      organization: "First American",
      role: "title insurance provider",
    });
    await expectAxeClean(page);
  });

  // ── Scene 4 — nothing goes stale ─────────────────────────────────────────

  test("scene 4: freshness check, one-click RE-ISSUE (old index revoked for real), AUS re-run", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const employment = seedIssuer("employment");

    // The lender's pre-close freshness check greens over the BACKDATED VC
    // (fail-closed verify against the pod-hosted issuer doc + status list).
    interface FreshnessReport {
      greenTick: boolean;
      fresh: boolean;
      verified: boolean;
      window: { validFrom?: string; validUntil?: string };
    }
    const freshnessUrl = `${origins.lenderBoa}/lender-boa/api/freshness`;
    const before = await borrower.authedFetch(freshnessUrl);
    expect(before.status).toBe(200);
    const beforeReport = (await before.json()) as FreshnessReport;
    expect(beforeReport.verified).toBe(true);
    expect(beforeReport.fresh).toBe(true);
    expect(beforeReport.greenTick).toBe(true);
    const seededValidUntil = seededAt.getTime() + 14 * DAY_MS;
    expect(new Date(beforeReport.window.validUntil ?? "").getTime()).toBe(seededValidUntil);

    // The same check on the lender's UI surface.
    await borrower.authenticatePage(page, "**/lender-boa/api/**");
    await page.goto(`${origins.lenderBoa}/lender-boa/freshness`);
    await page.getByRole("button", { name: "Check credential validity" }).click();
    await expect(page.locator("[data-freshness-result]")).toHaveAttribute(
      "data-freshness-result",
      "green",
      { timeout: 60_000 },
    );
    await expectAxeClean(page);

    // One-click re-issue through the EXISTING grant, from the branded flow
    // page. The verifications app re-signs AS the seeded issuer and revokes
    // the seeded status index (42 — pinned by the seed canon).
    const oldCredential = await podBody("mortgage/credentials/income");
    const oldAnchor = await podBody("mortgage/zk/anchor-income");
    await borrower.authenticatePage(page, "**/verifications/api/**");
    await page.goto(`${origins.verifications}/verifications/employment`);
    await acknowledgeInterstitial(page, "The Work Number, Finicity, or Equifax");
    await page.getByRole("button", { name: "Re-issue credential" }).click();
    const outcome = page.locator("[data-panel-outcome]");
    await expect(outcome).toHaveAttribute("data-panel-outcome", "ok", { timeout: 60_000 });
    await expect(outcome).toContainText("New credential issued.");
    await expect(outcome).toContainText(
      "Previous credential revoked on the status list (entry 42)",
    );

    // The pod REALLY changed: replacement credential + renewed anchor.
    const newCredential = await podBody("mortgage/credentials/income");
    const newAnchor = await podBody("mortgage/zk/anchor-income");
    expect(newCredential).not.toBe(oldCredential);
    expect(newAnchor).not.toBe(oldAnchor);
    const incomeEnc = CAPTURED_OPERAND_ENC[DEMO_MONTHLY_INCOME_USD];
    expect(newAnchor).toContain(incomeEnc ?? "MISSING_CANON_ENCODING");

    // Revocation is REAL: the pre-reissue credential now FAILS the chain with
    // STATUS_REVOKED against the pod-hosted list the issuer re-signed…
    const now = new Date();
    const oldVerification = await verifyCredential(oldCredential, {
      expectShape: "employment-income-credential",
      now,
      trustedIssuers: [employment.iri],
      ...podSeams,
    });
    expect(oldVerification.verified).toBe(false);
    expect(oldVerification.errors.map((error) => error.code)).toContain("STATUS_REVOKED");

    // …while the replacement fully verifies with an ADVANCED window.
    const newVerification = await verifyCredential(newCredential, {
      expectShape: "employment-income-credential",
      now,
      trustedIssuers: [employment.iri],
      ...podSeams,
    });
    expect(newVerification.verified, JSON.stringify(newVerification.errors)).toBe(true);
    expect(newVerification.credential?.subject).toBe(borrower.webid);
    expect(new Date(newVerification.credential?.validUntil ?? "").getTime()).toBeGreaterThan(
      seededValidUntil,
    );

    // The lender's freshness check now reports the renewed window…
    const after = await borrower.authedFetch(freshnessUrl);
    const afterReport = (await after.json()) as FreshnessReport;
    expect(afterReport.greenTick).toBe(true);
    expect(new Date(afterReport.window.validUntil ?? "").getTime()).toBeGreaterThan(
      seededValidUntil,
    );

    // …and the AUS re-runs to Approve over the REPLACEMENT credential.
    const rerun = await borrower.authedFetch(`${origins.gse}/gse/api/aus/run`, { method: "POST" });
    expect(rerun.status).toBe(200);
    const rerunReport = (await rerun.json()) as { outcome: string };
    expect(rerunReport.outcome).toBe("approve");

    // Scene-4 state: banner + axe on the re-issued flow surface.
    await expectBannerVisible(page, { organization: "The Work Number, Finicity, or Equifax" });
    await expectAxeClean(page);
  });

  // ── Scene 5 — close and stay in control ─────────────────────────────────

  test("scene 5: eClose writes the record, grants transfer, revocation sticks, ledger receipts", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const recordIri = `${podBase}mortgage/closing-record`;
    const aclIri = `${recordIri}.acl`;

    // No ceremony has happened yet on this pod.
    expect((await fetch(recordIri)).status).toBe(404);

    await borrower.authenticatePage(page, "**/closing/api/**");
    await page.goto(`${origins.closing}/closing`);
    await acknowledgeInterstitial(page, "Wolters Kluwer (eOriginal) or Truist");

    // BOTH branded surfaces carry their banners (eClose shell + servicer section).
    await expectBannerVisible(page, {
      organization: "Wolters Kluwer (eOriginal)",
      role: "digital closing platform",
    });
    await expect(
      page.locator("[data-concept-demo-banner]").filter({ hasText: "Truist" }),
    ).toBeVisible();

    // eSign: the ClosingRecord REALLY lands in the pod, and the record's ACL
    // document names the lender with Read (the close-time grant).
    await page.getByRole("button", { name: "eSign closing documents" }).click();
    await expect(page.getByText("Closing record saved in Alex's pod")).toBeVisible({
      timeout: 30_000,
    });
    expect((await fetch(recordIri)).status).toBe(200);
    const aclAfterClose = await podBody("mortgage/closing-record.acl");
    expect(aclAfterClose).toContain(LENDER_AGENT);
    expect(aclAfterClose).toContain(borrower.webid);

    // Servicing transfer: the servicer is granted…
    await page.getByRole("button", { name: "Grant servicer access" }).click();
    await expect(page.getByText("Servicer read access granted", { exact: false })).toBeVisible({
      timeout: 30_000,
    });
    expect(await podBody("mortgage/closing-record.acl")).toContain(SERVICER_AGENT);

    // …and the lender's access is REVOKED: its rule is gone from the ACL.
    await page.getByRole("button", { name: "Revoke lender access" }).click();
    await expect(page.getByText("Lender read access revoked", { exact: false })).toBeVisible({
      timeout: 30_000,
    });
    const aclAfterRevoke = await podBody("mortgage/closing-record.acl");
    expect(aclAfterRevoke).not.toContain(LENDER_AGENT);
    expect(aclAfterRevoke).toContain(SERVICER_AGENT);

    // A REPEAT close is refused and cannot restore the revoked lender.
    const repeat = await borrower.authedFetch(`${origins.closing}/closing/api/scene/close`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(repeat.status).toBe(409);
    expect(await podBody("mortgage/closing-record.acl")).not.toContain(LENDER_AGENT);

    // The consent-receipt ledger recorded every transition (decision 0006).
    await page.getByRole("button", { name: "Show consent receipts" }).click();
    const cards = page.locator("[data-receipt-card]");
    await expect(cards).toHaveCount(3, { timeout: 30_000 });
    await expect(cards.nth(0)).toHaveAttribute("data-receipt-action", "grant");
    await expect(cards.nth(0)).toContainText(LENDER_AGENT);
    await expect(cards.nth(1)).toHaveAttribute("data-receipt-action", "grant");
    await expect(cards.nth(1)).toContainText(SERVICER_AGENT);
    await expect(cards.nth(2)).toHaveAttribute("data-receipt-action", "revoke");
    await expect(cards.nth(2)).toContainText(LENDER_AGENT);
    await expect(
      page.getByText("This app saves the receipts; Solid's permission system does not."),
    ).toBeVisible();

    // Scene-5 state: axe over the closed + ledger-rendered surface.
    await expectAxeClean(page);
  });
});
