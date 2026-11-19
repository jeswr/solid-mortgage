// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, expect, test } from "vitest";
import { validateTour } from "../../../packages/tour/src/schema.js";
import { DAY } from "../../moving-house/facts.js";
import { HOLDER_CODES } from "../../moving-house/grants.js";
import { movingHouseTotals } from "../../moving-house/ledger.js";
import {
  isMovingHousePage,
  MOVING_HOUSE_REVOKE_CAVEAT,
  movingHouseLens,
  movingHouseTour,
} from "../../moving-house/mount.js";
import { ACTION_TARGETS, CHAPTERS, TOUR } from "../../moving-house/tour.js";

const here = dirname(fileURLToPath(import.meta.url));
const narration = readFileSync(join(here, "../../../video/moving-house/narration.md"), "utf8");

describe("the moving-house tour", () => {
  test("passes the tour engine's own validator (shape, editorial limits)", () => {
    expect(validateTour([...TOUR])).toHaveLength(10);
  });

  test("its step ids are the narration's, in the narration's order", () => {
    const declared = /^steps:\s*(.+)$/m
      .exec(narration)?.[1]
      ?.split(",")
      .map((s) => s.trim());
    expect(TOUR.map((step) => step.id)).toEqual(declared);
    const shown = [...narration.matchAll(/\[do: step ([a-z-]+)\]/g)].map((m) => m[1]);
    expect(shown).toEqual(declared);
  });

  test("the narration acts exactly on the steps that have an action", () => {
    const acted: string[] = [];
    let current = "";
    for (const line of narration.split("\n")) {
      const step = /\[do: step ([a-z-]+)\]/.exec(line)?.[1];
      if (step) current = step;
      if (/\[do: act\]/.test(line)) acted.push(current);
    }
    expect(acted).toEqual(TOUR.filter((s) => s.action).map((s) => s.id));
  });

  test("chapters run in order; days are the day after closing, then a week later", () => {
    const order = TOUR.map((step) => CHAPTERS.indexOf(step.chapter as (typeof CHAPTERS)[number]));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(TOUR.map((s) => s.clock?.day)).toEqual([
      ...Array(8).fill(DAY.moved),
      DAY.correction,
      DAY.correction,
    ]);
  });

  test("action targets are unique and never a POST in a done event", () => {
    expect(new Set(ACTION_TARGETS).size).toBe(ACTION_TARGETS.length);
    for (const step of TOUR) expect(step.done.event?.method).not.toBe("POST");
  });
});

describe("the mountDemo options", () => {
  test("one Lens handle per standing grant, until withdrawn", () => {
    const lens = movingHouseLens();
    expect(Object.keys(lens.grants)).toEqual(
      HOLDER_CODES.map((code) => `/policies/${code.toLowerCase()}`),
    );
    expect(Object.values(lens.grants).every((g) => g.until === "Until withdrawn")).toBe(true);
    expect(lens.revokeCaveat).toBe(MOVING_HOUSE_REVOKE_CAVEAT);
    expect(lens.grantsHref).toBe("/wallet/moving/sharing");
    expect(lens.ledgerHref).toBe("/wallet/moving/ledger");
    expect(movingHouseTour().demo).toBe("moving-house");
  });

  test("tells moving-house pages from mortgage pages", () => {
    expect(isMovingHousePage("/wallet/moving/who", "wallet")).toBe(true);
    expect(isMovingHousePage("/wallet/moving", "wallet")).toBe(true);
    expect(isMovingHousePage("/wallet/sharing", "wallet")).toBe(false);
    expect(isMovingHousePage("/wallet/movingly", "wallet")).toBe(false);
    expect(isMovingHousePage("/state/", "state")).toBe(true);
    expect(isMovingHousePage("/county/moving/treasurer", "county")).toBe(true);
    expect(isMovingHousePage("/county/", "county")).toBe(false);
    expect(isMovingHousePage("/lender/moving", "lender")).toBe(false);
    expect(isMovingHousePage("/wallet/", "wallet", "?tour=moving-house")).toBe(true);
    expect(isMovingHousePage("/wallet/moving", "wallet", "?tour=mortgage")).toBe(false);
  });
});

describe("the ledger totals", () => {
  let id = 0;
  const event = (org: string, path: string, kind = "read", status = 200): LensEntry =>
    ({
      actor: { org, viaAgent: true, webid: `https://pods.test/pods/${org}/profile/card#me` },
      at: "2026-08-13T10:00:00.000Z",
      id: ++id,
      kind,
      method: "GET",
      path,
      pod: "alex",
      source: "pod",
      status,
    }) as LensEntry;

  test("count organisation reads of the address, never Alex's own or other pods'", () => {
    const totals = movingHouseTotals([
      event("alex", "/profile/address"),
      event("bank", "/profile/address"),
      event("state", "/profile/address"),
      event("state", "/mortgage/closing/recording-receipt"),
      event("bank", "/profile/address", "denied", 403),
      event("lender", "/profile/address"),
    ]);
    expect(totals).toMatchObject({ denied: 1, organisations: 2, reads: 2, records: 1 });
    expect(totals.readers).toEqual({ bank: 1, state: 1 });
  });

  test("are zero for an empty log", () => {
    expect(movingHouseTotals([])).toMatchObject({ organisations: 0, reads: 0, records: 0 });
  });
});
