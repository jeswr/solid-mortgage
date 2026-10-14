/**
 * wallet (sm-28) e2e — AND the sm-foo closure: the Mode-1 in-browser pod
 * booted as a REAL SharedWorker in a real browser (the one path Vitest
 * structurally cannot cover), against the REAL production app server.
 *
 * What is real here: the SharedWorker + sparq-wasm pod (bundler-resolved
 * worker entry + wasm asset), the seed (signed credentials issued in the
 * worker), verify-on-view in the browser, the UltraHonk proofs produced
 * in-page (bb.js + noir wasm), the WAC ACL + DPV receipt writes into the
 * pod, and the cross-tab shared-pod property.
 *
 * The ONLY substitution: the two lender apps are not running, so their
 * `/api/prequal/*` endpoints are fulfilled at the network boundary — the
 * RESPONSES are mocked, never the proof. The spec then verifies the
 * browser-produced presentations OUT-OF-BAND: nonce → challenge field
 * equality (a proof bound to our nonce cannot be precomputed or replayed),
 * anchor-operand binding, and the full wire contract shape the real verifier
 * parses (which apps/wallet/test/present-contract.test.ts drives against the
 * REAL verifier with the same client code).
 */
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { MORT } from "@mortgage/data-model";
import { challengeFieldOf, normalizeFieldHex } from "@mortgage/vc-kit";
import { expect, type Page, test } from "@playwright/test";
import { bannerFullText, INTERSTITIAL_CONTINUE_LABEL } from "../packages/ui/src/disclaimers";
import { AppRunner } from "./support/app-runner";

/**
 * OPERAND_ENC PROVENANCE: genuine sparq term encodings captured from
 * `sparq_zk_compose::build::encode_int_literal` at sparq commit 947480b0 —
 * the same fixture set as packages/vc-kit/test/zk-support.ts and the wallet
 * seed (apps/wallet/lib/pod/seed.ts, kept in lock-step by its unit suite).
 */
const CAPTURED_OPERAND_ENC: Readonly<Record<number, string>> = {
  8500: "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
  742: "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
};

const PROVE_TIMEOUT = 300_000;
const POD_BOOT_TIMEOUT = 120_000;

const runner = new AppRunner();
let appOrigin = "";

interface CapturedPresentation {
  readonly nonce: string;
  readonly proof: {
    readonly member: string;
    readonly proof: readonly number[];
    readonly publicInputs: readonly string[];
    readonly verifierTarget: string;
  };
  readonly anchorVc: string;
}

interface CapturedVerify {
  readonly lender: string;
  readonly presentations: Record<string, CapturedPresentation>;
}

/** Nonces minted per lender by the mocked challenge endpoint. */
const mintedNonces = new Map<string, { income: string; score: string }>();
const capturedVerifies: CapturedVerify[] = [];

/**
 * Fulfil the two lender zones' prequal endpoints at the network boundary
 * (they are separate apps not running in this suite). Same-origin paths, so
 * COEP is unaffected. Everything else continues to the REAL app server.
 */
async function mockLenderZones(page: Page): Promise<void> {
  await page.route("**/lender-{boa,53}/api/prequal/challenge", async (route) => {
    const lender = new URL(route.request().url()).pathname.split("/")[1] ?? "unknown";
    const nonces = { income: randomUUID(), score: randomUUID() };
    mintedNonces.set(lender, nonces);
    await route.fulfill({
      json: {
        simulated: true,
        statements: [
          {
            id: "income",
            field: MORT.monthlyGrossIncomeUsd,
            op: "ge",
            bound: 7000,
            nonce: nonces.income,
          },
          { id: "score", field: MORT.creditScoreValue, op: "ge", bound: 620, nonce: nonces.score },
        ],
      },
    });
  });
  await page.route("**/lender-{boa,53}/api/prequal/verify", async (route) => {
    const lender = new URL(route.request().url()).pathname.split("/")[1] ?? "unknown";
    const payload = route.request().postDataJSON() as {
      presentations: Record<string, CapturedPresentation>;
    };
    capturedVerifies.push({ lender, presentations: payload.presentations });
    await route.fulfill({
      json: {
        simulated: true,
        qualified: true,
        results: { income: { verified: true }, score: { verified: true } },
        rateQuote: {
          simulated: true,
          illustrative: true,
          notAnOffer: true,
          product: "30-year fixed (concept demo)",
          interestRatePercent: 6.125,
          aprPercent: 6.31,
          disclaimer: "Illustrative figure, not an offer of credit.",
        },
      },
    });
  });
}

async function enterDemo(page: Page, path: string): Promise<void> {
  await page.goto(`${appOrigin}${path}`);
  const consent = page.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL });
  if (await consent.isVisible().catch(() => false)) await consent.click();
}

/** The decision-0011 disclosure strip must be present and truthful. */
async function expectSimulatedStrip(page: Page): Promise<void> {
  const strip = page.locator("[data-simulated-login]");
  await expect(strip).toBeVisible();
  await expect(strip).toContainText("Simulated login.");
}

async function expectAxeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe("wallet — Data Vault (sm-28) + real-SharedWorker pod (sm-foo)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    appOrigin = await runner.start({
      command: "start",
      packageName: "@mortgage/app-wallet",
      readyPath: "/wallet/api/health",
      env: {
        // The production posture the DPoP htu reconstruction expects.
        MORTGAGE_TRUST_FORWARDED_HEADERS: "1",
        // A trusted-issuer list is CONFIGURED (as deployed) so the anonymous
        // rail check below exercises the decision-0015 401 challenge, not the
        // unconfigured 503. No token is ever minted against it here — this
        // suite is the Mode-1 in-browser journey; the authenticated Mode-2
        // rail runs in apps/wallet/test/pod-auth.test.ts with real issuers.
        MORTGAGE_TRUSTED_OIDC_ISSUERS: "https://oidc.demo.example",
      },
    });
  });

  test.afterAll(() => {
    runner.stopAll();
  });

  test("health probe answers for the tour dock @smoke", async () => {
    const response = await fetch(`${appOrigin}/wallet/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "wallet", simulated: true });
  });

  test("the Mode-2 grant rail fails closed without a session (decision 0015)", async () => {
    const grants = await fetch(`${appOrigin}/wallet/api/grants`);
    expect(grants.status).toBe(401);
    expect(grants.headers.get("www-authenticate")).toBeTruthy();
    const change = await fetch(`${appOrigin}/wallet/api/grants/change`, { method: "POST" });
    expect(change.status).toBe(401);
  });

  test("home: banner copy, COOP/COEP, the REAL SharedWorker pod boots, profile reads from it, axe", async ({
    page,
  }) => {
    test.setTimeout(POD_BOOT_TIMEOUT + 60_000);
    const response = await page.goto(`${appOrigin}/wallet`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response?.headers()["cross-origin-embedder-policy"]).toBe("require-corp");
    await page.getByRole("button", { name: INTERSTITIAL_CONTINUE_LABEL }).click();

    const banner = page.locator("[data-concept-demo-banner]");
    await expect(banner).toContainText(
      bannerFullText({ organization: "Verizon", role: "consumer data custodian" }),
    );
    await expectSimulatedStrip(page);

    // sm-foo (a): the REAL SharedWorker pod host boots from the bundled
    // worker entry (wasm asset resolved by the bundler), seeds, and answers.
    await expect(page.locator("[data-vault-ready]")).toBeVisible({ timeout: POD_BOOT_TIMEOUT });
    const strip = page.locator("[data-simulated-login]");
    await expect(strip).toContainText("Alex Rivera");
    await expect(strip).toContainText("one pod, shared across your tabs");

    // sm-foo (b), read side: the profile renders FROM the seeded pod.
    await expect(page.locator("[data-profile-name]")).toHaveText("Alex Rivera", {
      timeout: 30_000,
    });
    await expectAxeClean(page);
  });

  test("credential wallet: verify-on-view passes for all five signed credentials + axe", async ({
    page,
  }) => {
    test.setTimeout(POD_BOOT_TIMEOUT + 120_000);
    await enterDemo(page, "/wallet/credentials");
    const cards = page.locator("[data-credential-card]");
    await expect(cards).toHaveCount(5, { timeout: POD_BOOT_TIMEOUT });
    // The full fail-closed chain (signature, issuer key binding, window,
    // status, shape) ran in the browser against pod-served documents.
    await expect(page.locator('[data-credential-status="valid"]')).toHaveCount(5, {
      timeout: 60_000,
    });
    await expect(page.locator("[data-closing-record]")).toBeVisible();
    await expectSimulatedStrip(page);
    await expectAxeClean(page);
  });

  test("scene 2: REAL in-browser proofs, VP-POSTed to BOTH lenders (responses mocked at the boundary only)", async ({
    page,
  }) => {
    test.setTimeout(PROVE_TIMEOUT);
    await mockLenderZones(page);
    await enterDemo(page, "/wallet/prequal");

    // The proving surface is cross-origin isolated (bb.js multithreading).
    expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(true);
    // The decision-0005 honesty content is on the surface.
    await expect(page.getByText("research-grade", { exact: false }).first()).toBeVisible();

    const run = page.locator("[data-prequal-run]");
    await expect(run).toBeEnabled({ timeout: POD_BOOT_TIMEOUT });
    await run.click();

    for (const lender of ["lender-boa", "lender-53"]) {
      await expect(
        page.locator(`[data-prequal-lender="${lender}"] [data-prequal-outcome="qualified"]`),
        lender,
      ).toBeVisible({ timeout: PROVE_TIMEOUT });
    }
    // R5: the rendered rate is tagged as an illustrative figure.
    await expect(page.getByText("illustrative figure", { exact: false }).first()).toBeVisible();
    await expectAxeClean(page);

    // ── Out-of-band verification of the captured presentations ──────────
    expect(capturedVerifies.map((entry) => entry.lender).sort()).toEqual([
      "lender-53",
      "lender-boa",
    ]);
    for (const captured of capturedVerifies) {
      const nonces = mintedNonces.get(captured.lender);
      expect(nonces).toBeDefined();
      const expectations = [
        ["income", nonces?.income, CAPTURED_OPERAND_ENC[8500]],
        ["score", nonces?.score, CAPTURED_OPERAND_ENC[742]],
      ] as const;
      for (const [id, nonce, operandEnc] of expectations) {
        const presentation = captured.presentations[id];
        expect(presentation, `${captured.lender}:${id}`).toBeDefined();
        if (presentation === undefined || nonce === undefined) throw new Error("unreachable");
        // The single-use lender nonce came back untouched…
        expect(presentation.nonce).toBe(nonce);
        // …and the PROOF is cryptographically bound to it: publicInputs[0]
        // is the challenge field derived from that exact nonce, baked into
        // the UltraHonk transcript — a precomputed or replayed proof would
        // carry a different challenge. (Full gate-chain verification of
        // this client's output runs against the REAL verifier in
        // apps/wallet/test/present-contract.test.ts.)
        expect(normalizeFieldHex(presentation.proof.publicInputs[0] ?? "", "challenge")).toBe(
          await challengeFieldOf(nonce),
        );
        // The anchor-operand binding the verifier's equality gate checks.
        expect(normalizeFieldHex(presentation.proof.publicInputs[1] ?? "", "operand")).toBe(
          normalizeFieldHex(operandEnc, "operand"),
        );
        expect(presentation.anchorVc).toContain(operandEnc);
        // The sanctioned full-ZK flavour and a genuine-size transcript.
        expect(presentation.proof.verifierTarget).toBe("evm");
        expect(presentation.proof.proof.length).toBeGreaterThan(1000);
        expect(presentation.proof.publicInputs).toHaveLength(5);
      }
    }
  });

  test("grants + ledger: real WAC ACL + receipts in the pod; revocation immutable; shared across tabs", async ({
    page,
    context,
  }) => {
    test.setTimeout(POD_BOOT_TIMEOUT + 120_000);
    await enterDemo(page, "/wallet/grants");
    const lenderRow = page.locator('[data-grant-party="lender-boa"]');
    await expect(lenderRow).toHaveAttribute("data-grant-state", "none", {
      timeout: POD_BOOT_TIMEOUT,
    });

    // sm-foo (b), write side: the grant writes a REAL WAC ACL document plus a
    // DPV receipt into the in-browser pod through browserPodFetch.
    await page.locator('[data-grant-action="grant-lender-boa"]').click();
    await expect(lenderRow).toHaveAttribute("data-grant-state", "granted", { timeout: 30_000 });
    await expect(page.locator("[data-grants-notice]")).toContainText("Receipt written");

    await page.locator('[data-grant-action="revoke-lender-boa"]').click();
    await expect(lenderRow).toHaveAttribute("data-grant-state", "revoked", { timeout: 30_000 });
    // Immutable revocation: the grant control is dead for this party.
    await expect(page.locator('[data-grant-action="grant-lender-boa"]')).toBeDisabled();
    await expect(lenderRow).toContainText("cannot be silently re-granted");
    await expectAxeClean(page);

    // The ledger renders both receipts (decision 0006), oldest first. The
    // navigation is CLIENT-SIDE (the header nav link), as a user's would be:
    // a hard navigation drops the tab's SharedWorker connection and — with no
    // other tab open — the per-visitor pod honestly resets with it.
    await page.getByRole("link", { name: "Consent receipts" }).click();
    const cards = page.locator("[data-receipt-card]");
    await expect(cards).toHaveCount(2, { timeout: 60_000 });
    await expect(cards.nth(0)).toHaveAttribute("data-receipt-action", "grant");
    await expect(cards.nth(1)).toHaveAttribute("data-receipt-action", "revoke");
    await expect(
      page.getByText("Records of permission changes, not a log of every data read."),
    ).toBeVisible();
    await expectAxeClean(page);

    // sm-foo (c): a SECOND TAB on the same origin reads the SAME pod — the
    // receipts written above are visible with no further writes, proving the
    // SharedWorker hosts ONE per-visitor pod, not per-tab state.
    const second = await context.newPage();
    await second.goto(`${appOrigin}/wallet/ledger`);
    await expect(second.locator("[data-receipt-card]")).toHaveCount(2, {
      timeout: POD_BOOT_TIMEOUT,
    });
    await expectSimulatedStrip(second);
    await second.close();
  });
});
