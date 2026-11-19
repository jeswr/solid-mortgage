// AUTHORED-BY Claude Opus 5.5
// @vitest-environment jsdom
/**
 * The second completion signal (design.md §d.6): a click on the step's `data-tour` target, and,
 * for a step with no action (a "Look" step), keyboard focus moving into the target.
 */
import type { TourStep } from "@mortgage/demo-kit/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { TourEngine } from "../src/engine.js";
import { memoryStore } from "../src/store.js";

const BASE = "https://trail.example";

const LOOK: TourStep = {
  app: "payroll",
  body: "Look at what arrived.",
  chapter: "One",
  done: { target: "received" },
  expect: [],
  id: "look",
  lens: { chips: [], headline: "What arrived" },
  mode: "summary",
  path: "/received",
  realWorld: { stage: "Looking" },
  title: "Look",
};
const PRESS: TourStep = {
  ...LOOK,
  action: { label: "Finish", target: "finish" },
  done: { target: "finish" },
  id: "press",
  mode: "interactive",
  title: "Press",
};

async function engineOn(step: TourStep): Promise<TourEngine> {
  const engine = await TourEngine.create({
    app: "payroll",
    demo: "trail",
    doc: document,
    href: () => `${BASE}/payroll/received`,
    urlFor: (s) => `${BASE}/${s.app}${s.path}`,
    navigate: () => undefined,
    steps: [step],
    store: memoryStore(),
  });
  engine.watchTargets();
  return engine;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("target completion", () => {
  it("completes a Look step when the visitor clicks its region", async () => {
    document.body.innerHTML = `<section data-tour="received"><p id="inside">Two answers</p></section>`;
    const engine = await engineOn(LOOK);
    document.getElementById("inside")?.click();
    await expect.poll(() => engine.isDone("look")).toBe(true);
    engine.dispose();
  });

  it("completes a Look step when keyboard focus moves into its region", async () => {
    document.body.innerHTML = `<section data-tour="received" tabindex="0"><p>Two answers</p></section><button id="elsewhere">Other</button>`;
    const engine = await engineOn(LOOK);
    (document.getElementById("elsewhere") as HTMLButtonElement).focus();
    expect(engine.isDone("look")).toBe(false);
    (document.querySelector('[data-tour="received"]') as HTMLElement).focus();
    await expect.poll(() => engine.isDone("look")).toBe(true);
    engine.dispose();
  });

  it("does not complete a step with an action when its button only receives focus", async () => {
    document.body.innerHTML = `<button data-tour="finish">Finish</button>`;
    const engine = await engineOn(PRESS);
    const button = document.querySelector('[data-tour="finish"]') as HTMLButtonElement;
    button.focus();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(engine.isDone("press")).toBe(false);
    button.click();
    await expect.poll(() => engine.isDone("press")).toBe(true);
    engine.dispose();
  });
});
