import { describe, expect, test } from "vitest";
import {
  chapterBySlug,
  chapters,
  countWords,
  MAX_LEAD_WORDS,
  MAX_SENTENCE_WORDS,
  MAX_STEP_WORDS,
  sentences,
  UNDERNEATH_REQUIRED_SCENES,
} from "../app/content/chapters";
import { demoApps } from "../app/content/services";

/**
 * Machine-enforced editorial limits (showcase-patterns §1): the chapter data cannot ship
 * bloated steps or sentences, a missing "How it works" panel on a VC/ZK scene, a dead
 * try-live link, or a term docs/glossary.md bans from visitor copy.
 */

test("exactly five scene chapters, scenes 1..5 in order, slugs unique", () => {
  expect(chapters).toHaveLength(5);
  expect(chapters.map((chapter) => chapter.scene)).toEqual([1, 2, 3, 4, 5]);
  expect(new Set(chapters.map((chapter) => chapter.slug)).size).toBe(5);
});

describe.each(chapters)("chapter $slug (scene $scene)", (chapter) => {
  test(`lead reads fast (≤ ${MAX_LEAD_WORDS} words)`, () => {
    expect(countWords(chapter.lead)).toBeLessThanOrEqual(MAX_LEAD_WORDS);
  });

  test("names its regulatory or industry anchor", () => {
    expect(chapter.anchor.length).toBeGreaterThan(10);
  });

  test("has at least two steps", () => {
    expect(chapter.steps.length).toBeGreaterThanOrEqual(2);
  });

  test(`every step is ≤ ${MAX_STEP_WORDS} words and carries a try-this-live deep link`, () => {
    for (const step of chapter.steps) {
      expect(countWords(step.body), `step "${step.title}"`).toBeLessThanOrEqual(MAX_STEP_WORDS);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.tryLive.label.length).toBeGreaterThan(0);
      // The deep link must target a registered demo app — the single service registry.
      expect(demoApps[step.tryLive.app]).toBeDefined();
      // An explicit route inside that app (M12), never a bare trailing slash.
      if (step.tryLive.path !== undefined) expect(step.tryLive.path).toMatch(/^\/[a-z-]+$/u);
    }
  });

  test(`no sentence runs past ${MAX_SENTENCE_WORDS} words`, () => {
    const copy = [chapter.lead, ...chapter.steps.map((step) => step.body)];
    for (const sentence of copy.flatMap(sentences)) {
      expect(countWords(sentence), sentence).toBeLessThanOrEqual(MAX_SENTENCE_WORDS);
    }
  });

  test("uses no term the glossary bans from visitor copy", () => {
    const copy = [
      chapter.title,
      chapter.lead,
      chapter.anchor,
      ...chapter.steps.flatMap((step) => [step.title, step.body, step.tryLive.label]),
      ...(chapter.underneath ?? []),
    ].join(" ");
    expect(copy).not.toMatch(
      /\b(?:rail|seat|surface|fail-closed|freshness|receipted|ledger|honestly|into the vault|stale|undressing|one-click|qualified|competing offers|operand anchor)\b/iu,
    );
  });

  test("scenes 1/2/4 carry the required 'How it works' panel", () => {
    if (UNDERNEATH_REQUIRED_SCENES.includes(chapter.scene)) {
      expect(chapter.underneath, `scene ${chapter.scene}`).toBeDefined();
      expect(chapter.underneath?.length).toBeGreaterThan(0);
      for (const point of chapter.underneath ?? []) {
        expect(point.length).toBeGreaterThan(20);
      }
    }
  });
});

test("sentences splits on terminal punctuation", () => {
  expect(sentences("One. Two? Three!  ")).toEqual(["One.", "Two?", "Three!"]);
});

test("chapterBySlug round-trips every chapter and rejects unknown slugs", () => {
  for (const chapter of chapters) {
    expect(chapterBySlug(chapter.slug)).toBe(chapter);
  }
  expect(chapterBySlug("no-such-chapter")).toBeUndefined();
});
