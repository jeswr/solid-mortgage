// AUTHORED-BY Claude Opus 5.5
import { ORGS } from "@mortgage/content/orgs";
import { isOrgSlug, ORG_SLUGS } from "@mortgage/demo-kit/registry";
import { describe, expect, it } from "vitest";
import { contrast, textOn } from "../src/colour.ts";
import { DEMOS, demoById } from "../src/demos.ts";
import { formatClock, formatDuration, isoDuration } from "../src/format.ts";

describe("the demo list", () => {
  it("starts with the mortgage, then the connected story (flows.md §9)", () => {
    expect(DEMOS.slice(0, 4).map((demo) => demo.id)).toEqual([
      "mortgage",
      "moving-house",
      "medication-handover",
      "motor-claim",
    ]);
  });

  it("has unique ids and media under /video/<id>/", () => {
    const ids = DEMOS.map((demo) => demo.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const demo of DEMOS) {
      expect(demo.id).toMatch(/^[a-z0-9-]+$/);
      for (const path of Object.values(demo.media)) {
        expect(path.startsWith(`/video/${demo.id}/`)).toBe(true);
      }
      expect(demo.durationSeconds).toBeGreaterThan(0);
      expect(demo.sectors.length).toBeGreaterThan(0);
      expect(demo.chapters.length).toBeGreaterThan(0);
      expect(demoById(demo.id)).toBe(demo);
    }
  });

  it("gives every live demo a tour and a full transcript, and no coming demo a tour", () => {
    for (const demo of DEMOS) {
      if (demo.status === "live") {
        expect(demo.tour).toBeDefined();
        expect(isOrgSlug(demo.tour?.app ?? "")).toBe(true);
        for (const chapter of demo.chapters) expect(chapter.transcript.length).toBeGreaterThan(0);
      } else {
        expect(demo.tour).toBeUndefined();
      }
    }
  });

  it("uses the mortgage step ids from video-scripts.md", () => {
    const mortgage = demoById("mortgage");
    expect(mortgage?.tour).toEqual({ demo: "mortgage", app: "wallet", path: "", step: "welcome" });
    expect(mortgage?.chapters.map((c) => c.id)).toEqual([
      "intro",
      "ready",
      "shop",
      "apply",
      "processing",
      "closing",
      "after",
      "ledger",
    ]);
  });
});

describe("launcher colours", () => {
  it("chooses text that meets WCAG AA on every registry colour", () => {
    for (const slug of ORG_SLUGS) {
      const background = ORGS[slug].themeColor;
      expect(contrast(background, textOn(background))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("computes known contrast ratios", () => {
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(textOn("#0B1F3A")).toBe("#FFFFFF");
    expect(textOn("#E9A100")).toBe("#000000");
  });
});

describe("formatting", () => {
  it("formats durations and clocks", () => {
    expect(formatDuration(290)).toBe("4 min 50 s");
    expect(formatDuration(180)).toBe("3 min");
    expect(isoDuration(290)).toBe("PT4M50S");
    expect(isoDuration(180)).toBe("PT3M");
    expect(formatClock(75.4)).toBe("1:15");
  });
});
