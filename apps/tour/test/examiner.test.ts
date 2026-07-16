import { expect, test } from "vitest";
import { chapterBySlug } from "../app/content/chapters";
import { EXAMINER_NON_AFFILIATION, examinerChecks } from "../app/content/examiner";

test("non-affiliation statement names the CFPB and negates affiliation and endorsement", () => {
  expect(EXAMINER_NON_AFFILIATION).toContain("Consumer Financial Protection Bureau");
  expect(EXAMINER_NON_AFFILIATION).toContain("not affiliated with");
  expect(EXAMINER_NON_AFFILIATION).toContain("endorsed by");
});

test("every check cites a public, dereferenceable rule and a real chapter", () => {
  expect(examinerChecks.length).toBeGreaterThanOrEqual(4);
  expect(new Set(examinerChecks.map((check) => check.id)).size).toBe(examinerChecks.length);
  for (const check of examinerChecks) {
    expect(check.citationUrl, check.id).toMatch(/^https:\/\//u);
    expect(check.citation.length, check.id).toBeGreaterThan(5);
    const chapter = chapterBySlug(check.chapterSlug);
    expect(chapter, `${check.id} → ${check.chapterSlug}`).toBeDefined();
    expect(chapter?.scene, check.id).toBe(check.scene);
  }
});

test("timing beats state each regulation's formulation, never an overstatement", () => {
  // Reg Z §1026.19(e)(1)(iii): delivered OR placed in the mail by the third business
  // day — not "received by" then. The demo's direct-to-pod delivery is described as
  // the demo's mechanism, distinct from (and stronger than) the legal minimum.
  const le = examinerChecks.find((check) => check.id === "trid-loan-estimate");
  expect(le?.rule).toContain("delivered or placed in the mail");
  expect(le?.rule).toContain("third business day");
  expect(le?.citation).toContain("1026.19(e)(1)(iii)");
  expect(le?.observe).toContain("beyond the rule's delivered-or-mailed minimum");

  // Reg Z §1026.19(f)(1)(ii): the consumer must RECEIVE the CD three business days
  // before consummation — "receives" is the correct verb here.
  const cd = examinerChecks.find((check) => check.id === "trid-closing-disclosure");
  expect(cd?.rule).toContain("receives");
  expect(cd?.rule).toContain("three business days before consummation");

  // Reg X §1024.33(b)(3): transferor ≥15 days before the effective date,
  // transferee ≤15 days after.
  const transfer = examinerChecks.find((check) => check.id === "respa-servicing-transfer");
  expect(transfer?.rule).toContain("not less than 15 days before");
  expect(transfer?.rule).toContain("not more than 15 days after");
});

test("the TRID and RESPA beats from SPEC §2 are all present", () => {
  const ids = examinerChecks.map((check) => check.id);
  expect(ids).toContain("trid-loan-estimate");
  expect(ids).toContain("trid-closing-disclosure");
  expect(ids).toContain("respa-servicing-transfer");
  expect(ids).toContain("voe-freshness");
});
