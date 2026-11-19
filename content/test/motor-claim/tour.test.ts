// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, expect, test } from "vitest";
import { validateTour } from "../../../packages/tour/src/schema.js";
import { DAY } from "../../motor-claim/facts.js";
import { MOTOR_CODES, MOTOR_GRANTS } from "../../motor-claim/grants.js";
import { motorClaimTotals } from "../../motor-claim/ledger.js";
import {
  isMotorClaimPage,
  MOTOR_CLAIM_DRAWERS,
  MOTOR_CLAIM_REVOKE_CAVEAT,
  motorClaimLens,
  motorClaimTour,
} from "../../motor-claim/mount.js";
import { ACTION_TARGETS, CHAPTERS, TOUR } from "../../motor-claim/tour.js";

const here = dirname(fileURLToPath(import.meta.url));
const narration = readFileSync(join(here, "../../../video/motor-claim/narration.md"), "utf8");

describe("the motor-claim tour", () => {
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
    expect(acted).toHaveLength(9);
  });

  test("chapters run in order; the days follow the claim", () => {
    const order = TOUR.map((step) => CHAPTERS.indexOf(step.chapter as (typeof CHAPTERS)[number]));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(TOUR.map((s) => s.clock?.day)).toEqual([
      DAY.incident,
      DAY.incident,
      DAY.desk,
      DAY.desk,
      DAY.estimate,
      DAY.estimate,
      DAY.estimate,
      DAY.complete,
      DAY.complete,
      DAY.close,
    ]);
  });

  test("the steps happen in the apps flows.md names", () => {
    expect(TOUR.map((s) => s.app)).toEqual([
      "wallet",
      "insurer",
      "insurer",
      "wallet",
      "repairer",
      "wallet",
      "insurer",
      "repairer",
      "repairer",
      "wallet",
    ]);
  });

  test("action targets are unique and never a POST in a done event", () => {
    expect(new Set(ACTION_TARGETS).size).toBe(ACTION_TARGETS.length);
    for (const step of TOUR) expect(step.done.event?.method).not.toBe("POST");
  });
});

describe("the grants", () => {
  test("C2 names the damage report and the photos for reading, nothing else of Alex's", () => {
    const reads = MOTOR_GRANTS.C2.permissions
      .filter((p) => p.modes.includes("Read"))
      .flatMap((p) => p.paths);
    expect(reads).toEqual(["claims/CLM-1/damage-report", "claims/CLM-1/photos/"]);
    const writes = MOTOR_GRANTS.C2.permissions
      .filter((p) => p.modes.includes("Write"))
      .flatMap((p) => p.paths);
    expect(writes).toEqual(["claims/CLM-1/estimate", "claims/CLM-1/invoice"]);
    expect(MOTOR_GRANTS.C2.to).toBe("repairer");
  });

  test("C1 and P1 go to the insurer; only P1 touches the policy for writing", () => {
    expect(MOTOR_GRANTS.C1.to).toBe("insurer");
    expect(MOTOR_GRANTS.P1.to).toBe("insurer");
    expect(MOTOR_GRANTS.C1.permissions.flatMap((p) => p.paths)).toEqual([
      "identity/driver-licence",
      "insurance/motor-policy",
      "claims/CLM-1/",
    ]);
    expect(MOTOR_GRANTS.P1.permissions).toEqual([
      expect.objectContaining({ modes: ["Read", "Write"], paths: ["insurance/motor-policy"] }),
    ]);
  });
});

describe("the mountDemo options", () => {
  test("one Lens handle per grant, with its end", () => {
    const lens = motorClaimLens();
    expect(Object.keys(lens.grants)).toEqual(
      MOTOR_CODES.map((code) => `/policies/${code.toLowerCase()}`),
    );
    expect(lens.grants["/policies/c2"]?.until).toBe("Until the job is complete");
    expect(lens.revokeCaveat).toBe(MOTOR_CLAIM_REVOKE_CAVEAT);
    expect(lens.grantsHref).toBe("/wallet/claim/sharing");
    expect(lens.drawers.map((d) => d.path)).toEqual(MOTOR_CLAIM_DRAWERS.map((d) => d.path));
    expect(motorClaimTour().demo).toBe("motor-claim");
  });

  test("tells motor-claim pages from other pages", () => {
    expect(isMotorClaimPage("/wallet/claim", "wallet")).toBe(true);
    expect(isMotorClaimPage("/wallet/claim/sharing", "wallet")).toBe(true);
    expect(isMotorClaimPage("/wallet/claims", "wallet")).toBe(false);
    expect(isMotorClaimPage("/wallet/sharing", "wallet")).toBe(false);
    expect(isMotorClaimPage("/insurer/claims/desk", "insurer")).toBe(true);
    expect(isMotorClaimPage("/insurer/quote", "insurer")).toBe(false);
    expect(isMotorClaimPage("/repairer/", "repairer")).toBe(true);
    expect(isMotorClaimPage("/lender/claim", "lender")).toBe(false);
    expect(isMotorClaimPage("/wallet/", "wallet", "?tour=motor-claim")).toBe(true);
    expect(isMotorClaimPage("/wallet/claim", "wallet", "?tour=mortgage")).toBe(false);
  });
});

describe("the ledger totals", () => {
  let id = 0;
  const event = (
    org: string,
    path: string,
    kind = "read",
    status = 200,
    method = "GET",
  ): LensEntry =>
    ({
      actor: { org, viaAgent: false, webid: `https://pods.test/pods/${org}/profile/card#me` },
      at: "2026-09-21T10:00:00.000Z",
      id: ++id,
      kind,
      method,
      path,
      pod: "alex",
      source: "pod",
      status,
    }) as LensEntry;

  test("count parties, claim grants, the repairer's reads and refusals from the log", () => {
    const totals = motorClaimTotals([
      event("alex", "/claims/CLM-1/incident", "write", 201, "PUT"),
      event("alex", "/consents/c1-given", "write", 201, "PUT"),
      event("alex", "/consents/c2-given", "write", 201, "PUT"),
      event("alex", "/consents/p1-given", "write", 201, "PUT"),
      event("insurer", "/identity/driver-licence"),
      event("insurer", "/claims/CLM-1/incident"),
      event("repairer", "/claims/CLM-1/damage-report"),
      event("repairer", "/claims/CLM-1/photos/rear-bumper.svg"),
      event("repairer", "/claims/CLM-1/photos/tail-light.svg"),
      event("repairer", "/claims/CLM-1/photos/rear-bumper.svg", "denied", 403),
      event("repairer", "/claims/CLM-1/incident", "read", 403),
    ]);
    expect(totals).toMatchObject({ claimGrants: 2, denied: 1, parties: 3, repairerThings: 2 });
    expect(totals.notSeen).toEqual([
      "Driver licence",
      "Motor policy",
      "Incident report",
      "Other driver's details",
    ]);
    expect(totals.readers["/claims/CLM-1/incident"]).toEqual(["insurer"]);
  });

  test("a read by the repairer outside its slice shows in what it saw", () => {
    const totals = motorClaimTotals([event("repairer", "/identity/driver-licence")]);
    expect(totals.notSeen).not.toContain("Driver licence");
    expect(totals.parties).toBe(0);
  });

  test("are zero for an empty log", () => {
    expect(motorClaimTotals([])).toMatchObject({
      claimGrants: 0,
      denied: 0,
      parties: 0,
      repairerThings: 0,
    });
  });
});
