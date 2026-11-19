// AUTHORED-BY Claude Opus 5.5
import { describe, expect, test } from "vitest";
import { GRANT_CODES } from "../../mortgage/grants.js";
import { MORTGAGE_DRAWERS, mortgageLens, mortgageTour } from "../../mortgage/mount.js";
import { ALEX_DRAWERS } from "../../mortgage/seed.js";
import { TOUR } from "../../mortgage/tour.js";

describe("the mountDemo options every mortgage app shares", () => {
  test("the cabinet lists every top-level drawer of Alex's pod, in seed order", () => {
    const topLevel = ALEX_DRAWERS.filter((drawer) => drawer.split("/").length === 2);
    expect(MORTGAGE_DRAWERS.map((drawer) => drawer.path)).toEqual(topLevel.map((d) => `/${d}`));
  });

  test("every grant has a Lens handle keyed by its policy path", () => {
    const lens = mortgageLens();
    expect(Object.keys(lens.grants)).toEqual(
      GRANT_CODES.map((c) => `/policies/${c.toLowerCase()}`),
    );
    expect(lens.recordDrawers).toEqual(["/inbox/", "/policies/", "/consents/", "/banking/"]);
    expect(lens.revokeCaveat).toBe(
      "Juniper still holds the loan file it is required to keep. What has ended is its access to Alex's data at source.",
    );
  });

  test("the tour is the mortgage tour", () => {
    const tour = mortgageTour();
    expect(tour.demo).toBe("mortgage");
    expect(tour.steps).toHaveLength(TOUR.length);
  });
});
