import { describe, expect, it } from "vitest";
import { parseAmount, scriptedAction } from "../lib/assistant-intent";

describe("application assistant scripted intent", () => {
  it("never submits from text, including refusals", () => {
    for (const text of ["Don't submit", "Do not send", "Yes, submit it", "send", "ok go"]) {
      expect(scriptedAction("review", text).action).not.toBe("submit");
    }
    expect(scriptedAction("review", "Don’t submit").action).toBe("answer_only");
  });

  it("recognises rent receipts when choosing sources", () => {
    expect(scriptedAction("consent", "Allow pod, not rent receipts")).toEqual({
      action: "allow_pod_only",
    });
    expect(scriptedAction("consent", "Use my pod but skip the receipts").action).toBe(
      "allow_pod_only",
    );
    expect(scriptedAction("consent", "pod only").action).toBe("allow_pod_only");
    expect(scriptedAction("consent", "no email").action).toBe("allow_pod_only");
    expect(scriptedAction("consent", "Yes, allow both").action).toBe("allow_all");
    expect(scriptedAction("consent", "Don't read my pod").action).toBe("decline_manual");
    expect(scriptedAction("consent", "No thanks").action).toBe("decline_manual");
    expect(scriptedAction("consent", "What is a pod?").action).toBe("answer_only");
  });

  it("reads rent figures and manual requests", () => {
    expect(scriptedAction("ask-rent", "$2,150 a month")).toEqual({
      action: "provide_rent",
      rent: 2150,
    });
    expect(scriptedAction("ask-rent", "I'd rather do it myself").action).toBe("decline_manual");
    expect(scriptedAction("ask-rent", "hmm").action).toBe("answer_only");
    expect(scriptedAction("review", "My rent is 2,000")).toEqual({
      action: "change_rent",
      rent: 2000,
    });
    expect(scriptedAction("review", "Let me edit the form").action).toBe("open_form");
    expect(scriptedAction("done", "yes").action).toBe("answer_only");
    expect(parseAmount("none")).toBeUndefined();
    expect(parseAmount("200000")).toBeUndefined();
  });
});
