// AUTHORED-BY Claude Opus 5.5

import { TOUR as BUSINESS_KYB_TOUR } from "@mortgage/content/business-kyb/tour";
import { TOUR as MEDICATION_TOUR } from "@mortgage/content/medication-handover/tour";
import { TOUR } from "@mortgage/content/mortgage/tour";
import { TOUR as MOVING_HOUSE_TOUR } from "@mortgage/content/moving-house/tour";
import { ORGS } from "@mortgage/content/orgs";
import { TOUR as REUSABLE_KYC_TOUR } from "@mortgage/content/reusable-kyc/tour";
import { TOUR as SMALL_DOLLAR_TOUR } from "@mortgage/content/small-dollar-lending/tour";
import { isAppSlug, ORG_SLUGS } from "@mortgage/demo-kit/registry";
import { appUrl } from "@mortgage/demo-kit/urls";
import { describe, expect, it } from "vitest";
import { contrast, textOn } from "../src/colour.ts";
import { DEMOS, demoById } from "../src/demos.ts";
import { guidedDemo, tourUrl } from "../src/demos-links.ts";
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
        expect(isAppSlug(demo.tour?.app ?? "")).toBe(true);
        for (const chapter of demo.chapters) expect(chapter.transcript.length).toBeGreaterThan(0);
      } else {
        expect(demo.tour).toBeUndefined();
      }
    }
  });

  it("starts the mortgage tour at its first step, on this page", () => {
    const tour = demoById("mortgage")?.tour;
    const first = TOUR[0];
    expect(tour?.app).toBe(first?.app);
    expect(tour?.step).toBe(first?.id);
    expect(tour === undefined ? "" : tourUrl(tour)).toBe(
      `${appUrl(first?.app ?? "welcome", first?.path ?? "")}?tour=mortgage&step=welcome`,
    );
  });

  it("starts the moving-house tour at its first step, in Alex's wallet", () => {
    const tour = demoById("moving-house")?.tour;
    const first = MOVING_HOUSE_TOUR[0];
    expect(demoById("moving-house")?.status).toBe("live");
    expect(tour).toEqual({
      demo: "moving-house",
      app: first?.app,
      path: first?.path,
      step: first?.id,
    });
    expect(tour === undefined ? "" : tourUrl(tour)).toBe(
      "/wallet/moving?tour=moving-house&step=address",
    );
  });

  it("starts the small-dollar lending tour at its first step, in Maya's wallet", () => {
    const tour = demoById("small-dollar-lending")?.tour;
    const first = SMALL_DOLLAR_TOUR[0];
    expect(demoById("small-dollar-lending")?.status).toBe("live");
    expect(tour).toEqual({
      demo: "small-dollar-lending",
      app: first?.app,
      path: first?.path,
      step: first?.id,
    });
    expect(tour === undefined ? "" : tourUrl(tour)).toBe(
      "/wallet/lending?tour=small-dollar-lending&step=vault",
    );
  });

  it("starts the business KYB tour at its first step, in Northwind's wallet", () => {
    const tour = demoById("business-kyb")?.tour;
    const first = BUSINESS_KYB_TOUR[0];
    expect(demoById("business-kyb")?.status).toBe("live");
    expect(tour).toEqual({
      demo: "business-kyb",
      app: first?.app,
      path: first?.path,
      step: first?.id,
    });
    expect(tour === undefined ? "" : tourUrl(tour)).toBe(
      "/wallet/kyb?tour=business-kyb&step=vault",
    );
  });

  it("starts the reusable-KYC tour at its first step, on Alder Bank's identity page", () => {
    const tour = demoById("reusable-kyc")?.tour;
    const first = REUSABLE_KYC_TOUR[0];
    expect(demoById("reusable-kyc")?.status).toBe("live");
    expect(tour).toEqual({
      demo: "reusable-kyc",
      app: first?.app,
      path: first?.path,
      step: first?.id,
    });
    expect(tour === undefined ? "" : tourUrl(tour)).toBe(
      "/bank/kyc?tour=reusable-kyc&step=attestation",
    );
  });

  it("starts the medication-handover tour at its first step, in Rosa's wallet", () => {
    const tour = demoById("medication-handover")?.tour;
    const first = MEDICATION_TOUR[0];
    expect(demoById("medication-handover")?.status).toBe("live");
    expect(tour).toEqual({
      demo: "medication-handover",
      app: first?.app,
      path: first?.path,
      step: first?.id,
    });
    expect(tour === undefined ? "" : tourUrl(tour)).toBe(
      "/wallet/health?tour=medication-handover&step=health",
    );
  });

  it("knows when a page is opened by the tour", () => {
    expect(guidedDemo("?tour=mortgage&step=welcome")).toBe("mortgage");
    expect(guidedDemo("?tour=off")).toBeUndefined();
    expect(guidedDemo("?tour=")).toBeUndefined();
    expect(guidedDemo("")).toBeUndefined();
  });

  it("uses the mortgage step ids from video-scripts.md", () => {
    const mortgage = demoById("mortgage");
    expect(mortgage?.tour).toEqual({ demo: "mortgage", app: "welcome", path: "", step: "welcome" });
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
