import { describe, expect, test } from "vitest";
import {
  chapterBySlug,
  chapters,
  countWords,
  MAX_LEAD_WORDS,
  MAX_STEP_WORDS,
  UNDERNEATH_REQUIRED_SCENES,
} from "../app/content/chapters";
import { demoApps } from "../app/content/services";

/**
 * Machine-enforced editorial limits (showcase-patterns §1): the chapter data cannot ship
 * bloated steps, a missing "underneath" panel on a VC/ZK scene, or a dead try-live link.
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
    }
  });

  test("scenes 1/2/4 carry the required 'what just happened underneath' panel", () => {
    if (UNDERNEATH_REQUIRED_SCENES.includes(chapter.scene)) {
      expect(chapter.underneath, `scene ${chapter.scene}`).toBeDefined();
      expect(chapter.underneath?.length).toBeGreaterThan(0);
      for (const point of chapter.underneath ?? []) {
        expect(point.length).toBeGreaterThan(20);
      }
    }
  });
});

test("chapterBySlug round-trips every chapter and rejects unknown slugs", () => {
  for (const chapter of chapters) {
    expect(chapterBySlug(chapter.slug)).toBe(chapter);
  }
  expect(chapterBySlug("no-such-chapter")).toBeUndefined();
});
