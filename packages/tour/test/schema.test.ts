// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it } from "vitest";
import { TourValidationError, validateTour, wordCount } from "../src/schema.js";
import { TRAIL_TOUR } from "./fixtures/trail-tour.js";

const clone = () => structuredClone(TRAIL_TOUR) as unknown as Array<Record<string, unknown>>;

function issues(steps: unknown[], sources?: string[]): string[] {
  try {
    validateTour(steps, sources ? { sources } : {});
    return [];
  } catch (err) {
    if (err instanceof TourValidationError) return err.issues;
    throw err;
  }
}

describe("validateTour", () => {
  it("accepts the fixture tour", () => {
    expect(validateTour(TRAIL_TOUR, { sources: ["T-1"] })).toHaveLength(3);
  });

  it("counts words on whitespace", () => {
    expect(wordCount("  one two\tthree\nfour ")).toBe(4);
  });

  it("enforces the editorial limits", () => {
    const steps = clone();
    const [a, b] = steps;
    if (!a || !b) throw new Error("fixture");
    a.title = "one two three four five six seven eight nine";
    b.body = Array.from({ length: 46 }, (_, i) => `w${i}`).join(" ");
    const found = issues(steps);
    expect(found).toContain("step 1 (certify) title: title is longer than 8 words");
    expect(found).toContain("step 2 (permit) body: body is longer than 45 words");
  });

  it("accepts exactly 8 title words and 45 body words", () => {
    const steps = clone();
    const [a] = steps;
    if (!a) throw new Error("fixture");
    a.title = "one two three four five six seven eight";
    a.body = Array.from({ length: 45 }, (_, i) => `w${i}`).join(" ");
    expect(issues(steps)).toEqual([]);
  });

  it("rejects duplicates, unknown apps, bad target names and unknown sources", () => {
    const steps = clone();
    const [a, b, c] = steps;
    if (!a || !b || !c) throw new Error("fixture");
    c.id = "permit";
    c.app = "welcome";
    b.app = "nowhere";
    a.action = { target: "Send Certificate", label: "Send" };
    const found = issues(steps, ["T-2"]);
    expect(found).toContain("step 3 (permit): duplicate id");
    expect(found.some((i) => i.startsWith("step 2 (permit) app: unknown app slug"))).toBe(true);
    expect(found.some((i) => i.startsWith("step 1 (certify) action.target:"))).toBe(true);
    expect(found).not.toContain("step 1 (certify) realWorld.source: unknown source id T-1");
    const sourced = issues(clone(), ["T-2"]);
    expect(sourced).toEqual(["step 1 (certify) realWorld.source: unknown source id T-1"]);
  });

  it("requires a completion and an action on interactive steps", () => {
    const steps = clone();
    const [a] = steps;
    if (!a) throw new Error("fixture");
    a.done = {};
    delete a.action;
    const found = issues(steps);
    expect(found).toContain(
      "step 1 (certify) done: an interactive step needs a completion: event, note or target",
    );
    expect(found).toContain(
      "step 1 (certify) action: an interactive step needs an action for “Do it for me”",
    );
  });

  it("rejects an empty tour", () => {
    expect(issues([])).toEqual(["a tour needs at least one step"]);
  });
});
