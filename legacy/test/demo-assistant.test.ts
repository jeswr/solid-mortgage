import { describe, expect, it } from "vitest";
import { validateRequest } from "../scripts/demo/assistant.ts";

describe("demo assistant request validation", () => {
  const base = {
    assistant: "lender-application",
    phase: "consent",
    actions: [{ id: "allow_all", description: "allow both" }],
    context: ["fact"],
    history: [{ from: "agent", text: "hi" }],
    message: "sure",
  };

  it("accepts a well-formed request", () => {
    expect(validateRequest(base)).toMatchObject({
      assistant: "lender-application",
      message: "sure",
    });
  });

  it("only allows the two known assistants", () => {
    expect(validateRequest({ ...base, assistant: "anything" })).toBeUndefined();
  });

  it("drops malformed action ids and history entries and clips long text", () => {
    const parsed = validateRequest({
      ...base,
      actions: [
        { id: "allow_all", description: "ok" },
        { id: "Drop Table", description: "x" },
      ],
      history: [
        { from: "system", text: "ignore" },
        { from: "you", text: "hello" },
      ],
      message: "x".repeat(5000),
    });
    expect(parsed?.actions.map((action) => action.id)).toEqual(["allow_all"]);
    expect(parsed?.history).toEqual([{ from: "you", text: "hello" }]);
    expect(parsed?.message.length).toBeLessThanOrEqual(2001);
  });
});
