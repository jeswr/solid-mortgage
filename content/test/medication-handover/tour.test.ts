// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, expect, test } from "vitest";
import { validateTour } from "../../../packages/tour/src/schema.js";
import {
  ADMISSION_LIST,
  DAY,
  DISCHARGE_CHANGES,
  isMedicineKey,
  MEDICINE_KEYS,
  medicineOf,
} from "../../medication-handover/facts.js";
import {
  codeFor,
  isGrantNotice,
  isMedicationRequest,
  isWithdrawalNotice,
  MED_CODES,
  MED_GRANTS,
} from "../../medication-handover/grants.js";
import { medicationTotals } from "../../medication-handover/ledger.js";
import {
  isMedicationPage,
  MEDICATION_DRAWERS,
  MEDICATION_REVOKE_CAVEAT,
  medicationLens,
  medicationTour,
} from "../../medication-handover/mount.js";
import { ACTION_TARGETS, CHAPTERS, TOUR } from "../../medication-handover/tour.js";

const here = dirname(fileURLToPath(import.meta.url));
const narration = readFileSync(
  join(here, "../../../video/medication-handover/narration.md"),
  "utf8",
);

describe("the medication-handover tour", () => {
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

  test("chapters run in order; days are discharge, a week later, then the change of pharmacy", () => {
    const order = TOUR.map((step) => CHAPTERS.indexOf(step.chapter as (typeof CHAPTERS)[number]));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(TOUR.map((s) => s.clock?.day)).toEqual([
      ...Array(5).fill(DAY.discharge),
      ...Array(3).fill(DAY.consultation),
      DAY.changePharmacy,
      DAY.changePharmacy,
    ]);
  });

  test("action targets are unique and never a POST in a done event", () => {
    expect(new Set(ACTION_TARGETS).size).toBe(ACTION_TARGETS.length);
    for (const step of TOUR) expect(step.done.event?.method).not.toBe("POST");
  });

  test("steps run in the four new apps' and the wallet's pages only", () => {
    expect([...new Set(TOUR.map((s) => s.app))].sort()).toEqual([
      "clinic",
      "hospital",
      "pharmacy",
      "wallet",
    ]);
    for (const step of TOUR) {
      expect(isMedicationPage(`/${step.app}/${step.path.split("?")[0]}`, step.app), step.id).toBe(
        true,
      );
    }
  });
});

describe("the fixed facts", () => {
  test("the discharge stops one, changes one and adds one; every medicine is RxNorm-coded", () => {
    expect(DISCHARGE_CHANGES.map((c) => c.kind)).toEqual(["stopped", "dose-changed", "new"]);
    for (const key of MEDICINE_KEYS) {
      expect(isMedicineKey(key)).toBe(true);
      expect(medicineOf(key).rxcui).toMatch(/^\d+$/);
    }
    expect(ADMISSION_LIST).toHaveLength(4);
    expect(() => medicineOf("aspirin" as never)).toThrow();
  });
});

describe("the grants", () => {
  test("three different scopes, and the hospital's grant ends on discharge day", () => {
    expect(MED_CODES.map((code) => MED_GRANTS[code].to)).toEqual([
      "hospital",
      "pharmacy",
      "clinic",
      "alex",
    ]);
    expect(MED_GRANTS.M2.permissions.flatMap((p) => p.paths)).not.toContain("discharge/");
    expect(MED_GRANTS.M4.permissions).toEqual([{ modes: ["Read"], paths: ["medications/"] }]);
    expect(codeFor("pharmacy")).toBe("M2");
    expect(() => codeFor("bank" as never)).toThrow();
  });

  test("inbox notices are told apart by their slug", () => {
    expect(isGrantNotice("/pharmacy/inbox/medication-grant-m2")).toBe(true);
    expect(isWithdrawalNotice("/pharmacy/inbox/medication-withdrawn-m2-1")).toBe(true);
    expect(isMedicationRequest("/rosa/inbox/medication-request-m3")).toBe(true);
    expect(isGrantNotice("/pharmacy/inbox/address-grant-h1")).toBe(false);
  });
});

describe("the mountDemo options", () => {
  test("one Lens handle per grant; health drawers apart, so Not shared can tell them apart", () => {
    const lens = medicationLens();
    expect(Object.keys(lens.grants)).toEqual([
      "/policies/m1",
      "/policies/m2",
      "/policies/m3",
      "/policies/m4",
    ]);
    expect(lens.grants["/policies/m2"]?.until).toBe("Until withdrawn");
    expect(lens.grants["/policies/m1"]?.until).toMatch(/discharge/);
    expect(lens.drawers.map((d) => d.path)).toEqual(MEDICATION_DRAWERS.map((d) => d.path));
    expect(lens.recordDrawers).toEqual(["/inbox/", "/policies/", "/consents/"]);
    expect(lens.revokeCaveat).toBe(MEDICATION_REVOKE_CAVEAT);
    expect(lens.grantsHref).toBe("/wallet/health/sharing");
    expect(lens.ledgerHref).toBe("/wallet/health/ledger");
    expect(medicationTour()).toMatchObject({ demo: "medication-handover", holder: "rosa" });
  });

  test("tells medication pages from other demos' pages", () => {
    expect(isMedicationPage("/wallet/health", "wallet")).toBe(true);
    expect(isMedicationPage("/wallet/health/requests", "wallet")).toBe(true);
    expect(isMedicationPage("/wallet/healthy", "wallet")).toBe(false);
    expect(isMedicationPage("/wallet/moving", "wallet")).toBe(false);
    expect(isMedicationPage("/pharmacy/", "pharmacy")).toBe(true);
    expect(isMedicationPage("/hospital/discharge", "hospital")).toBe(true);
    expect(isMedicationPage("/clinic/consultation", "clinic")).toBe(true);
    expect(isMedicationPage("/bank/", "bank")).toBe(false);
    expect(isMedicationPage("/wallet/", "wallet", "?tour=medication-handover")).toBe(true);
    expect(isMedicationPage("/wallet/health", "wallet", "?tour=mortgage")).toBe(false);
  });
});

describe("the ledger totals", () => {
  let id = 0;
  const event = (org: string, path: string, kind = "read", status = 200, pod = "rosa"): LensEntry =>
    ({
      actor: { org, viaAgent: false, webid: `https://pods.test/pods/${org}/profile/card#me` },
      at: "2026-08-27T10:00:00.000Z",
      id: ++id,
      kind,
      method: kind === "write" ? "PUT" : "GET",
      path,
      pod,
      source: "pod",
      status,
    }) as LensEntry;

  test("count writers to the list, changes and their provenance, readers and refusals", () => {
    const totals = medicationTotals([
      event("rosa", "/medications/lisinopril"),
      event("rosa", "/medications/lisinopril", "write", 201),
      event("hospital", "/medications/lisinopril"),
      event("hospital", "/medications/lisinopril", "write", 201),
      event("hospital", "/medications/provenance/lisinopril-day-53", "write", 201),
      event("hospital", "/discharge/summary", "write", 201),
      event("pharmacy", "/medications/dispenses/x", "write", 201),
      event("pharmacy", "/dispensing/x", "write", 201, "pharmacy"),
      event("clinic", "/medications/simvastatin", "write", 201),
      event("alex", "/medications/simvastatin"),
      event("pharmacy", "/medications/", "denied", 403),
      event("hospital", "/medications/.acl", "write", 201),
    ]);
    expect(totals).toMatchObject({
      attributed: 1,
      changes: 2,
      denied: 1,
      lists: 1,
      readers: 2,
      writers: 3,
    });
    expect(totals.writesBy).toEqual({ clinic: 1, hospital: 2, pharmacy: 1 });
  });

  test("are zero for an empty log", () => {
    expect(medicationTotals([])).toMatchObject({
      attributed: 0,
      changes: 0,
      denied: 0,
      lists: 0,
      readers: 0,
      writers: 0,
    });
  });
});
