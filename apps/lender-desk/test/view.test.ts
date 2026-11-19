// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it } from "vitest";
import {
  canDeliverLoan,
  canOrderServices,
  canPullCredit,
  canReadAgain,
  canRefreshAndClear,
  EMPTY_FILE,
  employmentFreshness,
  type FileState,
  lastSegment,
  milestones,
  personaFor,
  pipelineStatus,
  podPath,
  shortDigest,
  TABS,
  tabById,
} from "../src/view.ts";

const file = (patch: Partial<FileState>): FileState => ({ ...EMPTY_FILE, ...patch });

describe("loan file gates", () => {
  it("lets credit be pulled only once an application is on file, and only once", () => {
    expect(canPullCredit(EMPTY_FILE).allowed).toBe(false);
    expect(canPullCredit(file({ application: "ok" })).allowed).toBe(true);
    expect(canPullCredit(file({ application: "ok", creditOrder: "delivered" }))).toEqual({
      allowed: false,
      reason: "Credit pulled and underwriting run.",
    });
  });

  it("orders services after credit, and clears to close after the orders", () => {
    const afterCredit = file({ application: "ok", creditOrder: "delivered" });
    expect(canOrderServices(file({ application: "ok" })).allowed).toBe(false);
    expect(canOrderServices(afterCredit).allowed).toBe(true);
    expect(canRefreshAndClear(afterCredit).allowed).toBe(false);
    const ordered = { ...afterCredit, appraisalOrder: "processing" as const };
    expect(canOrderServices(ordered).allowed).toBe(false);
    expect(canRefreshAndClear(ordered).allowed).toBe(true);
    expect(canRefreshAndClear({ ...ordered, decision: "ok" }).allowed).toBe(false);
  });

  it("delivers the loan only when cleared, recorded and not yet delivered", () => {
    const cleared = file({ application: "ok", decision: "ok" });
    expect(canDeliverLoan(cleared).reason).toMatch(/county/);
    expect(canDeliverLoan({ ...cleared, mortgageRecorded: "ok" }).allowed).toBe(true);
    expect(
      canDeliverLoan({ ...cleared, closingRecord: "ok", mortgageRecorded: "ok" }).allowed,
    ).toBe(false);
  });

  it("allows the read-again test whenever there is a loan file, whatever the grant", () => {
    expect(canReadAgain(EMPTY_FILE).allowed).toBe(false);
    expect(canReadAgain(file({ application: "ok" })).allowed).toBe(true);
  });
});

describe("milestones", () => {
  it("marks the first unfinished milestone current", () => {
    const steps = milestones(file({ application: "ok", creditOrder: "delivered" }));
    expect(steps.map((step) => step.stage)).toEqual([
      "done",
      "done",
      "current",
      "todo",
      "todo",
      "todo",
    ]);
    expect(pipelineStatus(file({ application: "ok" }))).toBe("Credit and AUS");
  });

  it("reads Sold when everything is done", () => {
    const all = file({
      application: "ok",
      appraisalOrder: "delivered",
      closingRecord: "ok",
      creditOrder: "delivered",
      decision: "ok",
      mortgageRecorded: "ok",
    });
    expect(pipelineStatus(all)).toBe("Sold");
  });
});

describe("employment freshness (10 business days before the note date)", () => {
  it("counts general business days and flags a stale verification", () => {
    // Monday 2026-08-03 to Monday 2026-08-17: ten business days.
    expect(employmentFreshness("2026-08-03", "2026-08-17")).toMatchObject({
      businessDays: 10,
      withinLimit: true,
    });
    expect(employmentFreshness("2026-08-03", "2026-08-18").withinLimit).toBe(false);
  });

  it("does not count a federal holiday", () => {
    // Labor Day 2026 is Monday 7 September.
    expect(employmentFreshness("2026-09-04", "2026-09-08").businessDays).toBe(1);
  });
});

describe("tabs and roles", () => {
  it("has the twelve loan file tabs of the design, each with an owner role", () => {
    expect(TABS.map((tab) => tab.label)).toEqual([
      "Summary",
      "1003",
      "Credit",
      "AUS",
      "Verifications",
      "Appraisal",
      "Title",
      "Insurance",
      "Conditions",
      "Disclosures",
      "Closing",
      "Post-closing",
    ]);
    expect(tabById("conditions")?.role).toBe("underwriter");
    expect(tabById("nope")).toBeUndefined();
  });

  it("finds the staff member for a role", () => {
    const persona = { name: "Priya Nair", role: "processor" };
    const alternates = [{ name: "Elena Sato", role: "underwriter" }];
    expect(personaFor("underwriter", persona, alternates)?.name).toBe("Elena Sato");
    expect(personaFor("closer", persona, alternates)).toBeUndefined();
  });
});

describe("formatting", () => {
  it("shortens digests and paths", () => {
    expect(shortDigest("0123456789abcdef")).toBe("0123456789ab…");
    expect(podPath("https://x.test/pods/alex/credentials/assets")).toBe("/credentials/assets");
    expect(lastSegment("https://x.test/pods/lender/loans/JHL-1001/pointers/")).toBe("pointers");
  });
});
