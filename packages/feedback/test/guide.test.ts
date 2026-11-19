// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it } from "vitest";
import {
  debriefDemos,
  displayAnswer,
  FEEDBACK_DEMOS,
  interviewPlan,
  localSummary,
  MAX_DEBRIEFS,
  QUESTIONS,
  questionById,
  questionnaireSections,
  STAGES,
} from "../src/index.js";

describe("the guide", () => {
  it("has eight stages and every question sits in one", () => {
    expect(STAGES).toHaveLength(8);
    for (const q of QUESTIONS) {
      expect(q.stage).toBeGreaterThanOrEqual(0);
      expect(q.stage).toBeLessThan(STAGES.length);
    }
  });

  it("has unique ids, and options for every choice and multi-select", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTIONS) {
      if (q.type === "choice" || q.type === "multi") expect(q.options?.length).toBeGreaterThan(0);
      if (q.type === "scale") expect([5, 7]).toContain(q.max);
    }
  });

  it("debriefs every demo with recall, an ease rating and its reason", () => {
    for (const demo of FEEDBACK_DEMOS) {
      expect(questionById(`recall_${demo.id}`)?.demo).toBe(demo.id);
      expect(questionById(`seq_${demo.id}`)).toMatchObject({ type: "scale", max: 7 });
      expect(questionById(`seq_reason_${demo.id}`)?.type).toBe("text");
    }
  });

  it("covers the EDMA themes: the Lens, credibility, values and the community", () => {
    for (const id of [
      "lens_clear",
      "credibility",
      "values_control",
      "values_privacy",
      "values_trust",
      "values_tradeoff",
      "umux_capabilities",
      "umux_ease",
      "likelihood",
      "community",
      "confirmed",
    ]) {
      expect(questionById(id), id).toBeDefined();
    }
    expect(questionById("community")?.options?.map((o) => o.value)).toContain("Yes, the forum");
  });

  it("asks no personal data: no name, email or employer question", () => {
    for (const q of QUESTIONS) expect(q.text).not.toMatch(/\b(name|e-?mail|employer)\b/i);
  });
});

describe("interviewPlan", () => {
  it("leaves out per-demo debriefs until demos are chosen, and the quick question always", () => {
    const plan = interviewPlan({});
    expect(plan.some((q) => q.demo !== undefined)).toBe(false);
    expect(plan.some((q) => q.id === "general")).toBe(false);
    expect(plan.some((q) => q.id === "debrief_demos")).toBe(false);
    expect(plan.at(-1)?.id).toBe("confirmed");
  });

  it("debriefs only the chosen demos, at most three, and asks which when more were seen", () => {
    const two = interviewPlan({ demos: ["mortgage", "motor-claim"] });
    expect(two.filter((q) => q.demo).map((q) => q.id)).toEqual([
      "recall_mortgage",
      "seq_mortgage",
      "seq_reason_mortgage",
      "recall_motor-claim",
      "seq_motor-claim",
      "seq_reason_motor-claim",
    ]);
    const all = FEEDBACK_DEMOS.map((d) => d.id);
    const many = interviewPlan({ demos: all });
    expect(many.some((q) => q.id === "debrief_demos")).toBe(true);
    expect(new Set(many.filter((q) => q.demo).map((q) => q.demo)).size).toBe(MAX_DEBRIEFS);
    expect(debriefDemos({ demos: all, debrief_demos: ["reusable-kyc", "nope"] })).toEqual([
      "reusable-kyc",
    ]);
  });

  it("groups the questionnaire by stage without the opening and the read-back", () => {
    const sections = questionnaireSections({ demos: ["mortgage"] });
    expect(sections.map((s) => s.stage)).toEqual([
      "About you",
      "The demos you saw",
      "Solid's role",
      "For your organisation",
      "Values",
      "Overall and what next",
    ]);
  });
});

describe("display and the local read-back", () => {
  it("shows labels, ratings and skips", () => {
    expect(displayAnswer(questionById("likelihood"), 4)).toBe("4 of 5");
    expect(displayAnswer(questionById("demos"), ["mortgage", "motor-claim"])).toBe(
      "Buying a home, Motor claim",
    );
    expect(displayAnswer(questionById("comments"), "(skipped)")).toBe("Skipped");
  });

  it("reads back up to five of the participant's own words", () => {
    expect(localSummary({ one_change: "Shorter videos", comments: "(skipped)" })).toBe(
      "• Shorter videos",
    );
    expect(localSummary({})).toContain("answers recorded above");
  });
});
