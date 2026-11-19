// AUTHORED-BY Claude Opus 5.5
import { MORT } from "@mortgage/data-model";
import { describe, expect, it } from "vitest";
import {
  canSubmit,
  messageKindLabel,
  type StageInput,
  shortDate,
  stageOf,
  usd,
} from "../src/view.ts";

const none: StageInput = {
  delivered: false,
  inspected: false,
  orderReadable: false,
  orderReceived: false,
  reported: false,
};

describe("stageOf", () => {
  it("puts nothing on the board before an order arrives", () => {
    expect(stageOf(none)).toBeUndefined();
  });

  it("shows a message whose order cannot be read as New", () => {
    expect(stageOf({ ...none, orderReceived: true })).toBe("New");
  });

  it("assigns a readable order at once, and moves it on as the appraiser works", () => {
    const assigned = { ...none, orderReadable: true, orderReceived: true };
    expect(stageOf(assigned)).toBe("Assigned");
    expect(stageOf({ ...assigned, inspected: true })).toBe("Inspected");
    expect(stageOf({ ...assigned, inspected: true, reported: true })).toBe("In review");
    expect(stageOf({ ...assigned, delivered: true, reported: true })).toBe("Delivered");
  });

  it("follows the report even when the order is no longer readable", () => {
    expect(stageOf({ ...none, reported: true })).toBe("In review");
  });
});

describe("canSubmit", () => {
  const ready = { ...none, factsReadable: true, orderReadable: true, orderReceived: true };

  it("offers Submit once the order and the property facts can be read", () => {
    expect(canSubmit(ready)).toBe(true);
  });

  it("does not offer it without the facts G5 lets the appraiser read", () => {
    expect(canSubmit({ ...ready, factsReadable: false })).toBe(false);
  });

  it("does not offer it without a readable order, or twice", () => {
    expect(canSubmit({ ...ready, orderReadable: false })).toBe(false);
    expect(canSubmit({ ...ready, reported: true })).toBe(false);
  });
});

describe("formats", () => {
  it("writes dollars and dates the American way, in UTC", () => {
    expect(usd(428000)).toBe("$428,000");
    expect(usd(undefined)).toBe("—");
    expect(shortDate(new Date("2026-03-16T23:30:00Z"))).toBe("Mar 16, 2026");
  });

  it("names message kinds in plain words", () => {
    expect(messageKindLabel(MORT.MessageKind_ServiceOrder)).toBe("Service order");
  });
});
