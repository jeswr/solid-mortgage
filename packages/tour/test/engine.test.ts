// AUTHORED-BY Claude Opus 5.5
import "fake-indexeddb/auto";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, expect, it } from "vitest";
import { parseTourParams, TourEngine, type TourOptions } from "../src/engine.js";
import { idbStore, memoryStore } from "../src/store.js";
import { TRAIL_TOUR } from "./fixtures/trail-tour.js";

const BASE = "https://trail.example";

function options(overrides: Partial<TourOptions> = {}): TourOptions & { visits: string[] } {
  const visits: string[] = [];
  let here = `${BASE}/payroll/`;
  return {
    demo: "trail",
    steps: TRAIL_TOUR,
    app: "payroll",
    store: memoryStore(),
    navigate: (url) => {
      visits.push(url);
      here = new URL(url, here).href;
    },
    href: () => here,
    doc: {} as Document,
    visits,
    ...overrides,
  };
}

const write: LensEntry = {
  source: "pod",
  id: 1,
  at: "2026-08-31T09:00:00.000Z",
  tour: { demo: "trail", step: "certify" },
  actor: { org: "payroll", webid: `${BASE}/pods/payroll/profile/card#me`, viaAgent: false },
  pod: "alex",
  path: "/pods/alex/certificates/first-aid",
  method: "PUT",
  status: 201,
  kind: "write",
};

describe("parseTourParams", () => {
  it("reads the deep-link parameters", () => {
    expect(parseTourParams("?tour=trail&step=permit&present=1&act=1")).toEqual({
      demo: "trail",
      step: "permit",
      present: true,
      act: true,
    });
    expect(parseTourParams("?tour=off")).toEqual({ free: true });
  });
});

describe("TourEngine", () => {
  it("starts at the first step and completes it from a live entry", async () => {
    const t = await TourEngine.create(options());
    expect(t.current?.id).toBe("certify");
    expect(t.ingest({ ...write, status: 403, kind: "denied" })).toBe(false);
    expect(t.ingest(write)).toBe(true);
    await new Promise((r) => setTimeout(r));
    expect(t.isDone("certify")).toBe(true);
  });

  it("only lets a replayed entry complete the step it is tagged with", async () => {
    const t = await TourEngine.create(options());
    const untagged = { ...write, tour: undefined };
    expect(t.ingest(untagged, { replayed: true })).toBe(false);
    expect(
      t.ingest({ ...write, tour: { demo: "trail", step: "permit" } }, { replayed: true }),
    ).toBe(false);
    expect(t.ingest(write, { replayed: true })).toBe(true);
  });

  it("navigates to a step on another page with the deep-link parameters", async () => {
    const o = options();
    const t = await TourEngine.create(o);
    await t.next();
    expect(t.current?.id).toBe("permit");
    expect(o.visits).toEqual(["/county/permit?tour=trail&step=permit"]);
    await t.back();
    expect(o.visits.at(-1)).toBe("/payroll/?tour=trail&step=certify");
  });

  it("follows a deep link and switches to present mode", async () => {
    const t = await TourEngine.create(options(), { demo: "trail", step: "finish", present: true });
    expect(t.current?.id).toBe("finish");
    expect(t.mode).toBe("present");
  });

  it("ignores a deep link to another demo or an unknown step", async () => {
    const a = await TourEngine.create(options(), { demo: "other", step: "finish" });
    expect(a.current?.id).toBe("certify");
    const b = await TourEngine.create(options(), { demo: "trail", step: "nope" });
    expect(b.current?.id).toBe("certify");
  });

  it("persists state in IndexedDB and resumes it", async () => {
    const store = idbStore();
    const first = await TourEngine.create(options({ store }));
    first.ingest(write);
    await new Promise((r) => setTimeout(r, 20));
    await first.goto("permit");
    const again = await TourEngine.create(options({ store }));
    expect(again.current?.id).toBe("permit");
    expect(again.isDone("certify")).toBe(true);
    await again.restart();
    const fresh = await TourEngine.create(options({ store }));
    expect(fresh.current?.id).toBe("certify");
    expect(fresh.snapshot().done).toEqual([]);
  });

  it("adopts state from another window without echoing it", async () => {
    const t = await TourEngine.create(options());
    let changes = 0;
    t.addEventListener("change", () => changes++);
    const s = t.snapshot();
    t.adopt(s);
    expect(changes).toBe(0);
    t.adopt({ ...s, stepId: "permit", done: ["certify"] });
    expect(changes).toBe(1);
    expect(t.current?.id).toBe("permit");
  });

  it("asks to navigate when acting on a step from another page", async () => {
    const o = options();
    const t = await TourEngine.create(o, { demo: "trail", step: "permit" });
    expect(await t.act()).toBe("navigating");
    expect(o.visits).toEqual(["/county/permit?tour=trail&step=permit&act=1"]);
  });

  it("free mode never completes a step", async () => {
    const t = await TourEngine.create(options(), { free: true });
    expect(t.ingest(write)).toBe(false);
  });
});
