// AUTHORED-BY Claude Opus 5.5
/**
 * The small business loan journey, headless, against the real pod runtime host and wasm (demo
 * 3's harness: `createNodePodHost`, the same host and wasm the service worker runs). Starts cold,
 * as a visitor who pressed "Try it yourself" does: only the mortgage seed. Every grant is a real
 * ACL the pod enforces, every credential is signed and checked at source by vc-kit, the totals
 * are computed from the log. Nothing is mocked.
 */

import { verifyCredential } from "@mortgage/vc-kit";
import { beforeAll, describe, expect, test } from "vitest";
import { type EvidencePattern, matchesEvidence } from "../../../packages/lens/src/examiner.js";
import { completesStep, matchesExpectation } from "../../../packages/tour/src/match.js";
import { podUrl, putResource, readText, statusOf } from "../../mortgage/world.js";
import {
  buildRecord,
  cashFlowUrl,
  measure,
  monthsUpTo,
} from "../../small-business-loan/cash-flow.js";
import { DAY, LENDER_PATHS, LOAN, LOAN_PAYMENT, PATHS } from "../../small-business-loan/facts.js";
import {
  approveLoanRequest,
  grantRecords,
  LOAN_GRANTS,
  loanGrant,
  pendingRequest,
  requestLoanAccess,
} from "../../small-business-loan/grants.js";
import {
  approveApplication,
  approveMonitoring,
  assessment,
  decision,
  ensureApplication,
  ensureMonitoringRequest,
  holderCashFlow,
  loanGrantRows,
  publishCashFlowStep,
  quarterStep,
  readDelivered,
  repaidStep,
  taxComplianceStep,
} from "../../small-business-loan/journey.js";
import { loanTotals } from "../../small-business-loan/ledger.js";
import { readAssessment, readCovenantTest } from "../../small-business-loan/lender.js";
import { LOAN_COMPLIANCE } from "../../small-business-loan/mount.js";
import { isPrepared, prepareSmallBusinessLoan } from "../../small-business-loan/prepare.js";
import { readTaxCredential, taxCredentialUrl, taxVersions } from "../../small-business-loan/tax.js";
import { TOUR } from "../../small-business-loan/tour.js";
import { createHarness, type Harness } from "../business-kyb/harness.js";

let h: Harness;
const slices = new Map<string, [number, number]>();
const url = (path: string) => podUrl(h.world(), "northwind", path);

/** App notes reach the host's serial queue; a step's notes belong to that step's slice. */
const pendingNotes: Promise<unknown>[] = [];
const flushNotes = async () => {
  await Promise.all(pendingNotes.splice(0));
};

/** A probe the test makes, kept out of the journey's log. */
async function probe<T>(run: () => Promise<T>): Promise<T> {
  await flushNotes();
  const before = h.log.length;
  const result = await run();
  h.log.splice(before);
  return result;
}

async function step<T>(id: string, day: number, run: () => Promise<T>): Promise<T> {
  h.day = day;
  await flushNotes();
  const start = h.log.length;
  const result = await run();
  await flushNotes();
  slices.set(id, [start, h.log.length]);
  return result;
}

beforeAll(async () => {
  h = await createHarness();
  const world = h.world.bind(h);
  h.world = (day) => ({
    ...world(day),
    note: (note) => {
      pendingNotes.push(h.host.note(note));
    },
  });
}, 180_000);

describe("small business loan, from a cold start", () => {
  test("the pods start without Northwind's credentials; preparing puts demo 3's there once", async () => {
    expect(await probe(() => isPrepared(h.world(DAY.cashFlow)))).toBe(false);
    expect(await prepareSmallBusinessLoan(h.world(DAY.cashFlow))).toBe(true);
    for (const path of [PATHS.identity, PATHS.ownership]) {
      expect(await probe(() => statusOf(h.host.fetchAs("northwind"), url(path)))).toBe(200);
    }
    const writes = h.log.length;
    expect(await prepareSmallBusinessLoan(h.world(DAY.cashFlow))).toBe(false);
    expect(h.log.length - writes).toBeLessThan(4); // only the two checks, no writes
    await flushNotes();
    h.log.splice(0); // the preparation is not part of the journey's totals
  }, 180_000);

  test("before S1, Alder can neither write nor create the cash flow record", async () => {
    const status = await probe(async () => {
      const response = await h.host.fetchAs("bank")(cashFlowUrl(h.world()), {
        body: "",
        headers: { "content-type": "text/turtle" },
        method: "PUT",
      });
      return response.status;
    });
    expect([401, 403]).toContain(status);
  });

  test("1. S1 approved; Alder writes twelve months into one resource and cannot read it back", async () => {
    const result = await step("publish-cash-flow", DAY.cashFlow, () =>
      publishCashFlowStep(h.world()),
    );
    expect(result.months).toBe(12);
    expect(result.approval?.reserved).toEqual([cashFlowUrl(h.world())]);
    const record = await probe(() => holderCashFlow(h.world()));
    expect(record.months).toHaveLength(12);
    expect(record.bank).toBe(`${podUrl(h.world(), "bank", "profile/card")}#me`);
    // Write-only: the pod refuses Alder's read of what it wrote, and any other resource.
    expect(await probe(() => statusOf(h.host.fetchAs("bank"), cashFlowUrl(h.world())))).toBe(403);
    const elsewhere = await probe(
      async () =>
        (
          await h.host.fetchAs("bank")(url("finance/other"), {
            body: "",
            headers: { "content-type": "text/turtle" },
            method: "PUT",
          })
        ).status,
    );
    expect(elsewhere).toBe(403);
    // Pressing again updates the record; it does not grant twice.
    await probe(() => publishCashFlowStep(h.world()));
    expect(
      (await probe(() => grantRecords(h.world()))).filter((r) => r.code === "S1"),
    ).toHaveLength(1);
  }, 120_000);

  test("2. the Department of Revenue signs the tax compliance credential, once", async () => {
    const result = await step("tax-compliance", DAY.tax, () => taxComplianceStep(h.world()));
    expect(result.version).toBe(1);
    expect((await probe(() => taxComplianceStep(h.world()))).version).toBe(1);
    expect(await probe(() => taxVersions(h.world()))).toEqual([1]);
    const credential = await probe(() => readTaxCredential(h.world()));
    expect(credential?.credentialSubject.status).toBe("compliant");
    expect(credential?.credentialSubject.turnoverBand).toBe("500k-1m");
    const body = await probe(() =>
      readText(h.host.fetchAs("northwind"), taxCredentialUrl(h.world())),
    );
    const verified = await verifyCredential(body, {
      expectShape: "tax-compliance-credential",
      now: h.calendar.clock(DAY.tax, "12:00"),
      statusFetch: h.host.fetchAs("lender"),
      trustedIssuers: [`${podUrl(h.world(), "state", "profile/card")}#me`],
      webIdFetch: h.host.fetchAs("lender"),
    });
    expect(verified.errors).toEqual([]);
  }, 120_000);

  test("before S2, Brackenridge cannot read the cash flow or the tax credential", async () => {
    for (const path of [PATHS.cashFlow, PATHS.tax]) {
      expect(await probe(() => statusOf(h.host.fetchAs("business-lender"), url(path)))).toBe(403);
    }
  });

  test("the wallet refuses a request that asks for more than S2 names", async () => {
    await probe(async () => {
      h.day = DAY.apply;
      const forged = await requestLoanAccess(h.world(), "S2", "09:30");
      // Swap in a request for the officer credential (not part of S2) and check it is refused.
      const { buildAccessRequest } = await import("@mortgage/data-model");
      await putResource(
        h.host.fetchAs("northwind"),
        buildAccessRequest({
          assignee: `${podUrl(h.world(), "business-lender", "profile/card")}#me`,
          assigner: `${podUrl(h.world(), "northwind", "profile/card")}#me`,
          description: "x",
          grantCode: "S2",
          iri: forged,
          issued: h.calendar.clock(DAY.apply, "09:30"),
          name: "x",
          permissions: [
            {
              assignee: `${podUrl(h.world(), "business-lender", "profile/card")}#me`,
              modes: ["Read"],
              purpose: LOAN_GRANTS.S2.purpose,
              targets: [url("credentials/officer-authorisation")],
            },
          ],
        }),
      );
      await expect(approveLoanRequest(h.world(), forged)).rejects.toThrow(/never grants/);
      await h.host.fetchAs("northwind")(forged, { method: "DELETE" });
    });
    expect(await probe(() => pendingRequest(h.world(), "S2"))).toBeUndefined();
  }, 60_000);

  test("3. Northwind approves S2: four reads and three deliveries, 30 days, credit decision", async () => {
    h.day = DAY.apply;
    const request = await probe(() => ensureApplication(h.world()));
    expect(request).toBeDefined();
    const approval = await step("apply", DAY.apply, () => approveApplication(h.world()));
    expect(approval.reserved).toHaveLength(3);
    const record = await probe(() => loanGrant(h.world(), "S2"));
    expect(record?.state).toBe("active");
    const permission = record?.agreement.permissions[0];
    expect(permission?.purposeIri).toBe(LOAN_GRANTS.S2.purpose);
    expect(permission?.end).toEqual({ until: h.calendar.clock(DAY.apply + 30, "00:00") });
    // The officer credential was not shared.
    expect(
      await probe(() =>
        statusOf(h.host.fetchAs("business-lender"), url("credentials/officer-authorisation")),
      ),
    ).toBe(403);
  }, 120_000);

  test("4. Brackenridge reads the four resources at source and assesses", async () => {
    // The pending request is gone once the step was taken in the log of an earlier test.
    const result = await step("assessment", DAY.apply, () => assessment(h.world()));
    expect(result.checks.map((check) => [check.label, check.verified])).toEqual([
      ["Identity", true],
      ["Ownership", true],
      ["Tax compliance", true],
    ]);
    expect(result.beneficialOwners).toEqual(["Jordan Blake", "Priya Nandakumar"]);
    expect(result.cashFlow.months).toBe(12);
    expect(result.cashFlow.dscr).toBe(1.75);
    expect(result.cashFlow.annualisedInflowUsd).toBe(932_100);
    expect(result.covenants.every((c) => c.met)).toBe(true);
    expect(result.approve).toBe(true);
    const own = await probe(() => readAssessment(h.world()));
    expect(own?.sources).toHaveLength(4);
    expect(own?.debtServiceCoverageRatio).toBe(1.75);
  }, 120_000);

  test("5. the decision, terms and notice of action are written into Northwind's pod", async () => {
    await step("decision", DAY.decision, () => decision(h.world()));
    const delivered = await probe(() => readDelivered(h.world()));
    expect(delivered.terms?.principalUsd).toBe(LOAN.principalUsd);
    expect(delivered.terms?.monthlyPaymentUsd).toBe(LOAN_PAYMENT);
    expect(delivered.terms?.covenants.map((c) => c.metric)).toEqual(["dscr", "average-balance"]);
    expect(delivered.decision?.conditions.size).toBe(2);
    expect(delivered.notice?.name).toBe("Notice of action taken: approved");
    // S2 lets Brackenridge write only the three reserved documents.
    const other = await probe(
      async () =>
        (
          await h.host.fetchAs("business-lender")(url("loans/brackenridge/extra"), {
            body: "",
            headers: { "content-type": "text/turtle" },
            method: "PUT",
          })
        ).status,
    );
    expect(other).toBe(403);
  }, 120_000);

  test("6. Northwind approves S3: quarterly, until the loan is repaid", async () => {
    h.day = DAY.decision;
    expect(await probe(() => ensureMonitoringRequest(h.world()))).toBeDefined();
    await step("monitoring", DAY.decision, () => approveMonitoring(h.world()));
    const record = await probe(() => loanGrant(h.world(), "S3"));
    expect(record?.agreement.permissions[0]?.interval).toBe("P3M");
    expect(record?.agreement.permissions[0]?.end).toEqual({ event: LOAN_GRANTS.S3.endEvent });
  }, 60_000);

  test("7. one quarter on: S2 expires, Alder updates, Brackenridge tests under S3", async () => {
    const result = await step("quarter", DAY.quarter, () => quarterStep(h.world()));
    expect(result.expired).toEqual(["S2"]);
    expect(result.months).toBeGreaterThan(12);
    expect(result.test.covenants.every((c) => c.met)).toBe(true);
    expect((await probe(() => loanGrant(h.world(), "S2")))?.state).toBe("expired");
    // S2 has ended: the credentials are closed to Brackenridge, the cash flow open under S3.
    for (const path of [PATHS.identity, PATHS.tax]) {
      expect(await probe(() => statusOf(h.host.fetchAs("business-lender"), url(path)))).toBe(403);
    }
    expect(
      await probe(() => statusOf(h.host.fetchAs("business-lender"), cashFlowUrl(h.world()))),
    ).toBe(200);
    expect((await probe(() => readCovenantTest(h.world())))?.covenantsMet).toBe(true);
    // The last three months carry the loan's payment in their debt service.
    const record = await probe(() => holderCashFlow(h.world()));
    expect(record.months.at(-1)?.debtServiceUsd).toBeCloseTo(4200 + LOAN_PAYMENT, 2);
    expect(measure(record, 3).dscr).toBe(result.test.measures.dscr);
  }, 120_000);

  test("8. the loan is repaid; S3 is withdrawn and Brackenridge's next read is refused (403)", async () => {
    const result = await step("revoke", DAY.repaid, () => repaidStep(h.world()));
    expect(result.reread.status).toBe(403);
    expect(result.acls).toContain(`${cashFlowUrl(h.world())}.acl`);
    const denied = h.log.filter((e) => e.source === "pod" && e.kind === "denied");
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({
      actor: { org: "business-lender" },
      path: "/finance/cash-flow",
      status: 403,
    });
    // Alder still writes under S1; Northwind still reads its own record and the decision.
    expect((await probe(() => loanGrant(h.world(), "S1")))?.state).toBe("active");
    expect((await probe(() => readDelivered(h.world()))).decision).toBeDefined();
    // Brackenridge keeps its own credit file.
    expect(await probe(() => readAssessment(h.world()))).toBeDefined();
  }, 60_000);

  test("9. the ledger's totals, computed from the log: two issuers, one lender, one decision", async () => {
    slices.set("ledger", [h.log.length, h.log.length]);
    const totals = loanTotals(h.log);
    expect(totals.issuers).toBe(2);
    expect(totals.issuerOrgs).toEqual(["bank", "state"]);
    expect(totals.lenders).toBe(1);
    expect(totals.lenderOrgs).toEqual(["business-lender"]);
    expect(totals.decisions).toBe(1);
    expect(totals.denied).toBe(1);
    // Four reads at the assessment, one at the covenant test.
    expect(totals.reads).toBe(5);
    const rows = await probe(() => loanGrantRows(h.world()));
    expect(rows.map((row) => [row.code, row.record?.state])).toEqual([
      ["S1", "active"],
      ["S2", "expired"],
      ["S3", "revoked"],
    ]);
  });

  test("every examiner obligation is evidenced from the log", () => {
    const received = h.log.map((entry) => ({ entry }) as Parameters<typeof matchesEvidence>[0]);
    for (const item of LOAN_COMPLIANCE) {
      for (const pattern of item.evidence) {
        expect(
          received.some((rec) => matchesEvidence(rec, pattern as EvidencePattern)),
          `${item.id} ${JSON.stringify(pattern)}`,
        ).toBe(true);
      }
    }
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

describe("the cash flow figures", () => {
  test("twelve months end the month before the step's day; quarter months carry the payment", async () => {
    const world = h.world(DAY.cashFlow);
    const months = monthsUpTo(world, DAY.cashFlow, DAY.cashFlow);
    expect(months).toHaveLength(12);
    const record = buildRecord(world, months, "09:10");
    expect(measure(record, 12, LOAN_PAYMENT).dscr).toBe(1.75);
    expect(measure(record, 12).averageBalanceUsd).toBeGreaterThan(40_000);
    expect(LENDER_PATHS.covenantTest(2)).toBe("credit/northwind/covenant-test-q2");
  });
});
