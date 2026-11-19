// AUTHORED-BY Claude Opus 5.5
import { describe, expect, it } from "vitest";
import { matches, recordedOn, type Searchable } from "../src/view.ts";

const deed: Searchable = {
  grantees: ["Alex Rivera"],
  grantors: ["Morgan Hale"],
  name: "Warranty deed",
  parcel: "27-104-0091",
  reference: "2026-0048113",
};

describe("matches", () => {
  it("matches everything on an empty or blank query", () => {
    expect(matches(deed, "")).toBe(true);
    expect(matches(deed, "   ", "parcel")).toBe(true);
  });

  it("searches any field, ignoring case and surrounding space", () => {
    expect(matches(deed, " warranty ")).toBe(true);
    expect(matches(deed, "RIVERA")).toBe(true);
    expect(matches(deed, "0048113")).toBe(true);
    expect(matches(deed, "mortgage")).toBe(false);
  });

  it("keeps to the chosen field", () => {
    expect(matches(deed, "hale", "name")).toBe(true);
    expect(matches(deed, "27-104", "name")).toBe(false);
    expect(matches(deed, "27-104", "parcel")).toBe(true);
    expect(matches(deed, "2026-0048113", "instrument")).toBe(true);
    expect(matches(deed, "Rivera", "instrument")).toBe(false);
  });
});

describe("recordedOn", () => {
  it("shows the recording time in UTC", () => {
    expect(recordedOn(new Date("2026-04-30T15:40:00Z"))).toBe("04/30/2026, 03:40 PM");
  });
});
