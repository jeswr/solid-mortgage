// AUTHORED-BY Claude Opus 5.5
/**
 * The small-dollar lending journey, headless, against the real pod runtime host and wasm: the
 * twelve steps' pod effects in order, real credentials issued and checked at source, real
 * threshold proofs to two lenders, the score inquiry answered under Maya's authorisation, the
 * one-time payout grant closed by the runtime after one read, Finchly's back office woken by the
 * withdrawal and refused, and the totals computed from the log. Nothing is mocked.
 */

import { verifyCredential } from "@mortgage/vc-kit";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { completesStep, matchesExpectation } from "../../../packages/tour/src/match.js";
import { podUrl, readText, statusOf } from "../../mortgage/world.js";
import { DAY, LOAN } from "../../small-dollar-lending/facts.js";
import {
  CREDENTIAL_PATHS,
  DOCUMENT_PATHS,
  lendingGrantRecords,
  mayaUrl,
  withdrawLendingGrant,
} from "../../small-dollar-lending/grants.js";
import {
  acceptLoan,
  alderDecides,
  applyToFinchly,
  authorisePayout,
  finchlyDecides,
  finchlyReadsAgain,
  makePayments,
  openVault,
  proveToTwoLenders,
  readCredentials,
  readDisclosure,
  shareCashFlow,
  shareCreditSummary,
  shareIncome,
  swiftlineReadsAgain,
  verifyIdentity,
  withdrawFinchly,
} from "../../small-dollar-lending/journey.js";
import { lendingTotals } from "../../small-dollar-lending/ledger.js";
import { TOUR } from "../../small-dollar-lending/tour.js";
import { failingAcl } from "../failing-acl.js";
import { createHarness, type Harness } from "./harness.js";

let h: Harness;
/** The log entries each tour step produced: [first, end). */
const slices = new Map<string, [number, number]>();

const probe = async (owner: Parameters<Harness["host"]["fetchAs"]>[0], path: string) => {
  const before = h.log.length;
  const status = await statusOf(h.host.fetchAs(owner), mayaUrl(h.world(), path));
  // The test's own probes are not the journey's: keep them out of the totals.
  h.log.splice(before);
  return status;
};

const trust = (issuer: string) => [`${podUrl(h.world(), issuer as never, "profile/card")}#me`];

async function step(ids: string[], run: () => Promise<unknown>): Promise<void> {
  const start = h.log.length;
  await run();
  await h.runner.idle();
  expect(h.errors).toEqual([]);
  for (const id of ids) slices.set(id, [start, h.log.length]);
}

beforeAll(async () => {
  h = await createHarness();
}, 180_000);

afterAll(() => h?.stop());

describe("small-dollar lending, step by step", () => {
  test("1. Maya's pod exists once prepared, and holds no credential", async () => {
    await step(["vault"], async () => {
      const view = await openVault(h.world());
      expect(view.drawers).toEqual(
        expect.arrayContaining(["credentials/", "loans/", "banking/", "inbox/", "policies/"]),
      );
      expect(view.credentials).toEqual([]);
    });
    // Opening again writes nothing.
    const writes = h.log.filter((e) => e.source === "pod" && e.kind === "write").length;
    await openVault(h.world());
    expect(h.log.filter((e) => e.source === "pod" && e.kind === "write").length).toBe(writes);
  }, 60_000);

  test("before any grant, no organisation can read or write Maya's credentials", async () => {
    expect(await probe("idv", "credentials/")).toBe(403);
    expect(await probe("fintech-lender", "credentials/")).toBe(403);
    expect(await probe(null as never, "credentials/")).toBe(401);
  });

  test("2 to 5. four issuers fill the pod through their slots, and each credential verifies", async () => {
    await step(["identity"], () => verifyIdentity(h.world()));
    await step(["income"], () => shareIncome(h.world()));
    await step(["cash-flow"], () => shareCashFlow(h.world()));
    await step(["credit-summary"], () => shareCreditSummary(h.world()));
    expect((await readCredentials(h.world())).map((card) => card.issuer)).toEqual([
      "idv",
      "payroll",
      "bank",
      "bureau",
    ]);
    // Running a step again issues nothing new.
    expect(await shareIncome(h.world())).toBe(false);
    const checks = [
      [CREDENTIAL_PATHS.identity, "identity-credential", "idv"],
      [CREDENTIAL_PATHS.income, "employment-income-credential", "payroll"],
      [CREDENTIAL_PATHS.cashFlow, "cash-flow-credential", "bank"],
      [CREDENTIAL_PATHS.creditSummary, "credit-score-credential", "bureau"],
    ] as const;
    for (const [path, kind, issuer] of checks) {
      const body = await readText(h.host.fetchAs("maya"), mayaUrl(h.world(), path));
      const result = await verifyCredential(body, {
        expectShape: kind,
        now: h.calendar.clock(DAY.apply, "12:00"),
        statusFetch: h.host.fetchAs("maya"),
        trustedIssuers: trust(issuer),
        webIdFetch: h.host.fetchAs("maya"),
      });
      expect(result.errors, path).toEqual([]);
    }
    // A slot lets its issuer write and nothing else: Trueline cannot read what it wrote.
    expect(await probe("idv", CREDENTIAL_PATHS.identity)).toBe(403);
    expect(await probe("idv", CREDENTIAL_PATHS.cashFlow)).toBe(403);
  }, 120_000);

  test("6. two quotes from proofs alone: neither lender can read anything in the pod", async () => {
    await step(["prove"], async () => {
      const quotes = await proveToTwoLenders(h.world());
      expect(quotes.map((q) => [q.lender, q.qualified])).toEqual([
        ["fintech-lender", true],
        ["bank", true],
      ]);
      expect(quotes[0]?.proved).toHaveLength(3);
      expect(quotes[1]?.proved).toHaveLength(2);
    });
    for (const lender of ["fintech-lender", "bank"] as const) {
      expect(await probe(lender, CREDENTIAL_PATHS.income)).toBe(403);
      expect(await probe(lender, CREDENTIAL_PATHS.cashFlow)).toBe(403);
    }
    // What a lender received holds no value: the presentation carries proofs and anchors only.
    const presented = h.log.filter(
      (e) => e.source === "pod" && e.pod === "fintech-lender" && e.method === "POST",
    );
    expect(presented).toHaveLength(1);
    const records = await lendingGrantRecords(h.world());
    expect(records.map((r) => [r.code, r.state])).toContainEqual(["A1", "active"]);
  }, 240_000);

  test("7. L1: the consent record is written before Finchly's first read", async () => {
    await step(["apply"], () => applyToFinchly(h.world()));
    const consent = h.log.findIndex(
      (e) => e.source === "pod" && e.path === "/consents/l1-given" && e.kind === "write",
    );
    const firstRead = h.log.findIndex(
      (e) =>
        e.source === "pod" &&
        e.pod === "maya" &&
        e.actor.org === "fintech-lender" &&
        e.kind === "read",
    );
    expect(consent).toBeGreaterThan(-1);
    expect(firstRead).toBe(-1);
    expect(await probe("fintech-lender", CREDENTIAL_PATHS.creditSummary)).toBe(403);
  });

  test("8. one decision, two models; the disclosure is Maya's to keep", async () => {
    await step(["decision"], async () => {
      const decision = await finchlyDecides(h.world());
      expect(decision.bureauOnly.approved).toBe(false);
      expect(decision.withCashFlow.approved).toBe(true);
      await acceptLoan(h.world());
    });
    const disclosure = await readDisclosure(h.world());
    expect(disclosure?.annualPercentageRate).toBe(LOAN.annualPercentageRate);
    expect(disclosure?.totalOfPaymentsUsd).toBe(LOAN.totalOfPaymentsUsd);
    expect(disclosure?.numberOfPayments).toBe(2);
  }, 60_000);

  test("9. Alder's bureau-only model declines, and its notice lands in the pod", async () => {
    await step(["decline-notice"], async () => {
      expect(await alderDecides(h.world())).toBe(mayaUrl(h.world(), DOCUMENT_PATHS.adverseAction));
    });
    expect(await alderDecides(h.world())).toBe(mayaUrl(h.world(), DOCUMENT_PATHS.adverseAction));
    // Alder may write its decision, never read Maya's records.
    expect(await probe("bank", DOCUMENT_PATHS.adverseAction)).toBe(403);
  }, 60_000);

  test("10. Swiftline reads one record, once; the runtime closes the grant", async () => {
    await step(["payout"], () => authorisePayout(h.world()));
    const reads = h.log.filter(
      (e) =>
        e.source === "pod" && e.actor.org === "payout" && e.pod === "maya" && e.kind === "read",
    );
    expect(reads.map((e) => (e as { path: string }).path)).toEqual(["/banking/payout-instruction"]);
    expect(h.log.some((e) => e.source === "app" && e.kind === "grant-used")).toBe(true);
    const before = h.log.length;
    expect(await swiftlineReadsAgain(h.world())).toBe(403);
    h.log.splice(before);
    const l2 = (await lendingGrantRecords(h.world())).find((r) => r.code === "L2");
    expect(l2?.state).toBe("expired");
  }, 60_000);

  test("11. on-time payments become a credential, and are furnished to Quillon", async () => {
    h.day = DAY.payoff;
    await step(["repayments"], () => makePayments(h.world()));
    const body = await readText(
      h.host.fetchAs("maya"),
      mayaUrl(h.world(), CREDENTIAL_PATHS.repayment),
    );
    const result = await verifyCredential(body, {
      expectShape: "repayment-history-credential",
      now: h.calendar.clock(DAY.payoff, "12:00"),
      statusFetch: h.host.fetchAs("maya"),
      trustedIssuers: trust("fintech-lender"),
      webIdFetch: h.host.fetchAs("maya"),
    });
    expect(result.errors).toEqual([]);
    expect(
      h.log.some(
        (e) => e.source === "app" && e.kind === "org-to-org" && e.org === "fintech-lender",
      ),
    ).toBe(true);
  }, 60_000);

  test("a withdrawal whose ACL write fails leaves L1 active, to be withdrawn again", async () => {
    const before = h.log.length;
    const failing = failingAcl(h.world(), "maya", "PUT");
    await expect(withdrawLendingGrant(failing.world, "L1", "16:00")).rejects.toThrow(/503/);
    expect(failing.failed()).toBe(1);
    const l1 = (await lendingGrantRecords(h.world())).find((g) => g.code === "L1");
    expect(l1?.state).toBe("active");
    // The test's own attempt is not the journey's.
    h.log.splice(before);
  }, 60_000);

  test("12. withdrawn: Finchly's back office reads again and the pod refuses", async () => {
    await step(["revoke"], () => withdrawFinchly(h.world()));
    const denied = h.log.filter(
      (e) => e.source === "pod" && e.pod === "maya" && e.kind === "denied",
    );
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({
      actor: { org: "fintech-lender" },
      path: "/credentials/cash-flow",
      pod: "maya",
      status: 403,
    });
    const before = h.log.length;
    expect(await finchlyReadsAgain(h.world())).toBe(403);
    h.log.splice(before);
    const l1 = (await lendingGrantRecords(h.world())).find((r) => r.code === "L1");
    expect(l1?.state).toBe("revoked");
  }, 60_000);

  test("the totals come from the log: five issuers, two lenders, one payment service", () => {
    const totals = lendingTotals(h.log);
    expect(totals).toMatchObject({
      credentials: 5,
      denied: 1,
      issuers: 5,
      lenders: 2,
      paymentServices: 1,
    });
  });

  test("the tour's done and expect patterns match what each step really produced", () => {
    for (const tourStep of TOUR) {
      const slice = slices.get(tourStep.id);
      expect(slice, tourStep.id).toBeDefined();
      const [first, end] = slice as [number, number];
      const own = h.log.slice(first, end);
      const sofar = h.log.slice(0, end);
      if (tourStep.done.event !== undefined) {
        expect(
          own.some((entry) => completesStep(tourStep, entry)),
          `${tourStep.id} completes`,
        ).toBe(true);
      }
      for (const pattern of tourStep.expect) {
        expect(
          sofar.some((entry) => matchesExpectation(entry, pattern)),
          `${tourStep.id} expects ${JSON.stringify(pattern)}`,
        ).toBe(true);
      }
    }
  });
});
