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

test("the TRID and RESPA beats from SPEC §2 are all present", () => {
  const ids = examinerChecks.map((check) => check.id);
  expect(ids).toContain("trid-loan-estimate");
  expect(ids).toContain("trid-closing-disclosure");
  expect(ids).toContain("respa-servicing-transfer");
  expect(ids).toContain("voe-freshness");
});
