// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it } from "vitest";
import {
  coerceUpdates,
  MAX_TURN_CHARACTERS,
  validateAnswers,
  validateSubmission,
  validateTurn,
} from "../src/index.js";
import { SUBMISSION } from "./fixtures.js";

describe("answers", () => {
  it("accepts typed answers and skips", () => {
    expect(
      validateAnswers({
        context_org: "Insurer",
        demos: ["mortgage", "motor-claim"],
        likelihood: 5,
        umux_ease: "(skipped)",
        summary: "• ok",
      }),
    ).toMatchObject({ likelihood: 5 });
  });

  it.each([
    ["an unknown field", { favourite_colour: "blue" }],
    ["a rating out of range", { likelihood: 6 }],
    ["a fractional rating", { umux_ease: 3.5 }],
    ["an unknown option", { context_org: "A real bank" }],
    ["an unknown demo", { demos: ["not-a-demo"] }],
    [
      "too many debriefs",
      { debrief_demos: ["mortgage", "moving-house", "motor-claim", "business-kyb"] },
    ],
    ["an over-long answer", { comments: "x".repeat(4001) }],
    ["a non-string text answer", { comments: 7 }],
  ])("rejects %s", (_label, answers) => {
    expect(() => validateAnswers(answers)).toThrow();
  });
});

describe("coerceUpdates", () => {
  it("converts the wire format and drops what the model got wrong", () => {
    expect(
      coerceUpdates([
        { id: "likelihood", value: "4" },
        { id: "umux_ease", value: "8" },
        { id: "credibility", value: "5.5" },
        { id: "demos", value: "mortgage|Motor claim|nope" },
        { id: "context_org", value: "insurer" },
        { id: "community", value: "maybe" },
        { id: "made_up", value: "x" },
        { id: "summary", value: "• fine" },
        { id: "comments", value: "(skipped)" },
      ]),
    ).toEqual({
      likelihood: 4,
      demos: ["mortgage", "motor-claim"],
      context_org: "Insurer",
      summary: "• fine",
      comments: "(skipped)",
    });
  });
});

describe("validateTurn", () => {
  const opening = { role: "assistant" as const, content: "Hello" };

  it("requires alternation ending with the participant", () => {
    expect(() => validateTurn({ pathway: "quick", answers: {}, messages: [opening] })).toThrow();
    expect(() =>
      validateTurn({
        pathway: "quick",
        answers: {},
        messages: [opening, { role: "user", content: "a" }, { role: "user", content: "b" }],
      }),
    ).toThrow();
    expect(
      validateTurn({
        pathway: "quick",
        answers: {},
        messages: [opening, { role: "user", content: "a" }],
      }).from,
    ).toBe("");
  });

  it("rejects unknown fields and bad 'from' values", () => {
    const messages = [opening, { role: "user", content: "a" }];
    expect(() => validateTurn({ pathway: "quick", answers: {}, messages, extra: 1 })).toThrow();
    expect(() =>
      validateTurn({ pathway: "quick", answers: {}, messages, from: "<script>" }),
    ).toThrow();
  });

  it("drops the oldest exchanges after the opening when the conversation is too long", () => {
    const long = "x".repeat(3900);
    const messages = [opening];
    for (let i = 0; i < 9; i++) {
      messages.push({ role: "user", content: `${i}${long}` } as never, {
        role: "assistant",
        content: `${i}${long}`,
      });
    }
    messages.push({ role: "user", content: "last" } as never);
    const turn = validateTurn({ pathway: "guided", answers: {}, messages });
    expect(turn.messages[0]).toEqual(opening);
    expect(turn.messages.at(-1)?.content).toBe("last");
    expect(turn.messages.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(
      MAX_TURN_CHARACTERS,
    );
    expect(turn.messages.every((m, i) => i === 0 || m.role !== turn.messages[i - 1]?.role)).toBe(
      true,
    );
  });
});

describe("validateSubmission", () => {
  it("accepts a well-formed record and rebuilds it", () => {
    expect(validateSubmission(SUBMISSION)).toEqual(SUBMISSION);
  });

  it.each([
    ["a bad email", { contact: { name: "", email: "not-an-email" } }],
    ["an extra field", { secret: "x" }],
    ["a bad mode", { mode: "chat" }],
    ["audio index out of range", { transcript: [{ role: "user", content: "a", audio: [10] }] }],
  ])("rejects %s", (_label, patch) => {
    expect(() => validateSubmission({ ...SUBMISSION, ...patch })).toThrow();
  });
});
