// AUTHORED-BY Claude Opus 5.5
// @vitest-environment jsdom
/**
 * The Lens re-renders its step zone whenever a request arrives. A keyboard user who has tabbed
 * to Next (or Do it for me, or Back) must keep focus on that button across the re-render, or
 * their Enter lands on the page body and does nothing.
 */
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import type { LensStep, SolidLens } from "../src/index.js";
import events from "./fixtures/events.json" with { type: "json" };
import { CONFIG } from "./fixtures/registry.js";

const STEP: LensStep = {
  actionLabel: "Send",
  canGoBack: true,
  chapter: "Permits",
  chips: [{ kind: "pod read" }],
  day: 3,
  done: true,
  headline: "Fernhollow reads only what the permit needs.",
  id: "permit",
  index: 3,
  title: "Apply for a permit",
  total: 7,
};

beforeAll(async () => {
  window.matchMedia = ((query: string) => ({
    addEventListener: () => {},
    matches: false,
    media: query,
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  // jsdom has no Web Animations; the Lens map animates its lines.
  Element.prototype.animate = (() => ({
    cancel: () => {},
    finished: Promise.resolve(),
  })) as unknown as typeof Element.prototype.animate;
  await import("../src/index.js");
});

function mount(): SolidLens {
  const lens = document.createElement("solid-lens") as SolidLens;
  document.body.append(lens);
  lens.configure({ ...CONFIG, app: "county" });
  lens.setStep(STEP);
  lens.flush();
  return lens;
}

describe("the Lens step zone under live requests", () => {
  for (const which of ["next", "act", "back"]) {
    it(`keeps keyboard focus on ${which} when a request arrives`, () => {
      const lens = mount();
      const root = lens.shadowRoot as ShadowRoot;
      const button = root.querySelector<HTMLElement>(`[data-lens="${which}"]`);
      expect(button).not.toBeNull();
      button?.focus();
      expect((root.activeElement as HTMLElement | null)?.dataset.lens).toBe(which);

      lens.push((events as LensEntry[])[0] as LensEntry);
      lens.flush();

      expect((root.activeElement as HTMLElement | null)?.dataset.lens).toBe(which);
      lens.remove();
    });
  }

  it("does not pull focus into the Lens when it was elsewhere", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    const lens = mount();
    outside.focus();
    lens.push((events as LensEntry[])[0] as LensEntry);
    lens.flush();
    expect(document.activeElement).toBe(outside);
    expect(lens.shadowRoot?.activeElement ?? null).toBeNull();
    lens.remove();
    outside.remove();
  });
});
