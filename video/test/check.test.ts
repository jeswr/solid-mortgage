// AUTHORED-BY Claude Opus 5.5
/**
 * `record.ts --check --strict` as a test: every demo's narration resolves (scene ids, cards, tour
 * steps, Lens views and parts, organisations), the mortgage's spoken totals equal the journey
 * ledger in content/, and the words equal docs/rebuild/video-scripts.md. No browser, no voice.
 * Needs the built content package (`pnpm run build`), as the gate provides.
 *
 *   pnpm exec vitest run --root video
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { checkDemo, failures, firstNumber } from "../lib/check.ts";
import { DEMO_IDS, isBuilt, loadDemoTotals, readDemo, VIDEO } from "../lib/demo.ts";
import { parseNarration } from "../lib/narration.ts";
import { liveMetric } from "../scenes.ts";

const mortgage = readFileSync(path.join(VIDEO, "mortgage", "narration.md"), "utf8");
const errorsOf = async (source: string, claims?: Parameters<typeof checkDemo>[1]["claims"]) =>
  failures(
    await checkDemo("mortgage", {
      narration: parseNarration(source),
      ...(claims ? { claims } : {}),
    }),
    true,
  ).map((i) => `${i.where}: ${i.message}`);

describe("every demo's script checks", () => {
  for (const id of DEMO_IDS)
    test(id, async () => {
      const r = await checkDemo(id);
      expect(failures(r, isBuilt(id)).map((i) => `${i.where}: ${i.message}`)).toEqual([]);
      expect(r.paragraphs).toBeGreaterThan(0);
    });
});

describe("the checker catches", () => {
  test("a tour step that does not exist", async () => {
    const errors = await errorsOf(
      mortgage.replace("[do: step bank-share]", "[do: step bank-sharing]"),
    );
    expect(errors.join("\n")).toMatch(/no tour step "bank-sharing"/);
    expect(errors.join("\n")).toMatch(/tour step "bank-share" is never shown/);
  });

  test("an act on a step with no action", async () => {
    const source = mortgage.replace(
      "[do: step lender-b-received]\n",
      "[do: step lender-b-received]\n[do: act]\n",
    );
    expect((await errorsOf(source)).join("\n")).toMatch(/"lender-b-received" has no action/);
  });

  test("a missing card, an unknown action, Lens view and organisation", async () => {
    const source = mortgage
      .replace("[do: card copies]", "[do: card nothing-here]")
      .replace("[do: ring-lens map]", "[do: ring-lens edge:nobody]")
      .replace("[do: lens not-shared]", "[do: lens everything]")
      .replace("[do: lens totals]", "[do: lens totals]\n[do: zoom 2]");
    const errors = (await errorsOf(source)).join("\n");
    expect(errors).toMatch(/no slide "nothing-here"/);
    expect(errors).toMatch(/no organisation "nobody"/);
    expect(errors).toMatch(/unknown Lens view/);
    expect(errors).toMatch(/unknown action/);
  });

  test("steps out of tour order", async () => {
    const source = mortgage
      .replace("[do: step bank-share]", "[do: step TMP]")
      .replace("[do: step bureau-share]", "[do: step bank-share]")
      .replace("[do: step TMP]", "[do: step bureau-share]");
    expect((await errorsOf(source)).join("\n")).toMatch(/shown before an earlier tour step/);
  });

  test("a spoken total that differs from the ledger", async () => {
    const errors = await errorsOf(mortgage, [
      { says: "Thirteen applications.", metric: "registry.apps", value: 13 },
      { says: "Eight grants.", metric: "grants.total", value: 9 },
      { says: "No documents uploaded.", metric: "uploads", value: 0 },
    ]);
    expect(errors.join("\n")).toMatch(/says 8, claims 9/);
    expect(errors.join("\n")).toMatch(/grants.total is 8 in content\//);
  });

  test("a claim on a field the demo's own ledger does not count", async () => {
    const r = await checkDemo("moving-house", {
      claims: [
        { says: "One record.", metric: "moving-house.records", value: 1 },
        { says: "Six organisations.", metric: "moving-house.visits", value: 6 },
      ],
    });
    const errors = failures(r, true).map((i) => `${i.where}: ${i.message}`);
    expect(errors.join("\n")).toMatch(/content\/moving-house\/ledger.ts counts no "visits"/);
    expect(errors.join("\n")).not.toMatch(/records/);
  });

  test("a number spoken over the totals with no claim behind it", async () => {
    const errors = await errorsOf(mortgage, [
      { says: "Thirteen applications.", metric: "registry.apps", value: 13 },
    ]);
    expect(errors.join("\n")).toMatch(/"Eight grants\." states a total with no entry/);
  });

  test("words that drift from the script of record", async () => {
    const source = mortgage.replace("The bank does the same for savings.", "The bank does too.");
    expect((await errorsOf(source)).join("\n")).toMatch(/mortgage#ready: spoken words differ/);
  });
});

test("number words", () => {
  expect(firstNumber("Thirteen applications.")).toBe(13);
  expect(firstNumber("No documents uploaded.")).toBe(0);
  expect(firstNumber("at least six hundred and twenty?")).toBe(620);
  expect(firstNumber("seven thousand dollars")).toBe(7000);
  expect(firstNumber("Eleven reads.")).toBe(11);
  expect(firstNumber("every organisation")).toBeUndefined();
});

describe("the live totals", () => {
  const ledger = {
    organisations: 9,
    grants: { active: 2, expired: 5, revoked: 2 },
    uploads: 0,
    denied: 1,
    documentsDelivered: 4,
    credentialsIssued: 3,
  };

  test("read a demo's own claims from its ledger totals over the pods' log", async () => {
    const totals = await loadDemoTotals("moving-house");
    expect(totals).toBeTypeOf("function");
    // An empty log counts nothing: a claim of one record must not pass on an empty run.
    const own = totals?.([]);
    const c = { demo: readDemo("moving-house"), metrics: {} };
    expect(liveMetric(c, ledger, "moving-house.records", own)).toBe(0);
    expect(liveMetric(c, ledger, "moving-house.records", { records: 1 })).toBe(1);
    // No demo totals on the page: the run cannot tell, which the recorder reports as a failure.
    expect(liveMetric(c, ledger, "moving-house.records")).toBeUndefined();
  });

  test("read the shared ledger's quantities from the Lens totals", () => {
    const c = { demo: readDemo("mortgage"), metrics: { "registry.apps": 13 } };
    expect(liveMetric(c, ledger, "grants.total")).toBe(9);
    expect(liveMetric(c, ledger, "organisations.involved")).toBe(9);
    expect(liveMetric(c, ledger, "registry.apps")).toBe(13);
    // Another demo's field is not this demo's.
    expect(liveMetric(c, ledger, "moving-house.records", { records: 1 })).toBeUndefined();
  });
});
