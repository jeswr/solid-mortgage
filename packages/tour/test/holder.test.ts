// AUTHORED-BY Claude Opus 5.5
import { describe, expect, test } from "vitest";
import { demoHolder } from "../src/holder.js";
import { validateTour } from "../src/schema.js";
import { TRAIL_TOUR } from "./fixtures/trail-tour.js";

describe("each demo carries its holder", () => {
  test("the tour's holder wins; the name comes from the holder registry", () => {
    expect(demoHolder({})).toEqual({ id: "alex", name: "Alex" });
    expect(demoHolder({ tour: { holder: "northwind" } })).toEqual({
      id: "northwind",
      name: "Northwind",
    });
    expect(demoHolder({ holder: { id: "maya" } })).toEqual({ id: "maya", name: "Maya" });
    expect(demoHolder({ holder: { name: "Alex R." } })).toEqual({ id: "alex", name: "Alex R." });
  });

  test("a tour and a holder option that disagree, or an unregistered holder, are refused", () => {
    expect(() => demoHolder({ holder: { id: "alex" }, tour: { holder: "rosa" } })).toThrow(
      /tour's holder is rosa/,
    );
    expect(() => demoHolder({ holder: { id: "bank" as never } })).toThrow(/not a holder/);
  });

  test("a step may complete on an event on and by any registered holder's pod", () => {
    const step = TRAIL_TOUR[0];
    if (step === undefined) throw new Error("fixture empty");
    const withHolder = [{ ...step, done: { event: { actor: { org: "maya" }, pod: "maya" } } }];
    expect(() => validateTour(withHolder as typeof TRAIL_TOUR)).not.toThrow();
    const unknown = [{ ...step, done: { event: { pod: "nobody" } } }];
    expect(() => validateTour(unknown as typeof TRAIL_TOUR)).toThrow();
  });
});
