// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, expect, test } from "vitest";
import { validateTour } from "../../../packages/tour/src/schema.js";
import { DAY } from "../../reusable-kyc/facts.js";
import { reusableKycTotals } from "../../reusable-kyc/ledger.js";
import {
  dayOfStep,
  isReusableKycPage,
  REUSABLE_KYC_REVOKE_CAVEAT,
  reusableKycLens,
  reusableKycTour,
} from "../../reusable-kyc/mount.js";
import { ACTION_TARGETS, CHAPTERS, TOUR } from "../../reusable-kyc/tour.js";

const here = dirname(fileURLToPath(import.meta.url));
const narration = readFileSync(join(here, "../../../video/reusable-kyc/narration.md"), "utf8");

describe("the reusable-KYC tour", () => {
  test("passes the tour engine's own validator (shape, editorial limits)", () => {
    expect(validateTour([...TOUR])).toHaveLength(7);
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

  test("the not-shared step lists what Pennant did not see, for the Lens", () => {
    const step = TOUR.find((s) => s.id === "not-shared");
    expect(step?.lens.notShared?.length).toBeGreaterThanOrEqual(3);
    expect(step?.lens.notShared?.join(" ")).toMatch(/identity document/);
  });

  test("chapters run in order; the loss is reported the day after the application", () => {
    const order = TOUR.map((step) => CHAPTERS.indexOf(step.chapter as (typeof CHAPTERS)[number]));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(TOUR.map((s) => s.clock?.day)).toEqual([
      ...Array(5).fill(DAY.apply),
      DAY.lost,
      DAY.lost,
    ]);
    // Day 75 is the latest demo day that is always in the past (day 1 is >= 75 days ago).
    expect(DAY.lost).toBeLessThanOrEqual(75);
    expect(dayOfStep("reissue")).toBe(DAY.lost);
  });

  test("action targets are unique and never a POST in a done event", () => {
    expect(new Set(ACTION_TARGETS).size).toBe(ACTION_TARGETS.length);
    for (const step of TOUR) expect(step.done.event?.method).not.toBe("POST");
  });
});

describe("the mountDemo options", () => {
  test("one Lens handle, for the one-time grant", () => {
    const lens = reusableKycLens();
    expect(Object.keys(lens.grants)).toEqual(["/policies/y1"]);
    expect(lens.grants["/policies/y1"]?.until).toMatch(/^Once/);
    expect(lens.revokeCaveat).toBe(REUSABLE_KYC_REVOKE_CAVEAT);
    expect(lens.ledgerHref).toBe("/wallet/kyc/ledger");
    expect(reusableKycTour().demo).toBe("reusable-kyc");
  });

  test("tells reusable-KYC pages from other demos' pages", () => {
    expect(isReusableKycPage("/card-issuer/", "card-issuer")).toBe(true);
    expect(isReusableKycPage("/card-issuer/apply", "card-issuer")).toBe(true);
    expect(isReusableKycPage("/bank/kyc", "bank")).toBe(true);
    expect(isReusableKycPage("/bank/kycx", "bank")).toBe(false);
    expect(isReusableKycPage("/bank/moving", "bank")).toBe(false);
    expect(isReusableKycPage("/bank/", "bank")).toBe(false);
    expect(isReusableKycPage("/wallet/kyc/ledger", "wallet")).toBe(true);
    expect(isReusableKycPage("/wallet/sharing", "wallet")).toBe(false);
    expect(isReusableKycPage("/lender/kyc", "lender")).toBe(false);
    expect(isReusableKycPage("/wallet/", "wallet", "?tour=reusable-kyc")).toBe(true);
    expect(isReusableKycPage("/wallet/kyc", "wallet", "?tour=moving-house")).toBe(false);
  });
});

describe("the ledger totals", () => {
  let id = 0;
  const pod = (
    org: string,
    pod: string,
    path: string,
    kind = "read",
    status = 200,
    extra: object = {},
  ): LensEntry =>
    ({
      actor: { org, viaAgent: false, webid: `https://pods.test/pods/${org}/profile/card#me` },
      at: "2026-09-17T10:00:00.000Z",
      id: ++id,
      kind,
      method: kind === "read" || kind === "denied" ? "GET" : "PUT",
      path,
      pod,
      source: "pod",
      status,
      ...extra,
    }) as LensEntry;
  const issuedBy = (org: string) => ({
    resource: {
      credential: {
        issuer: `https://pods.test/pods/${org}/profile/card#me`,
        type: "x",
        validFrom: "2026-09-17T10:00:00.000Z",
      },
      drawer: "/credentials/",
      label: "KYC attestation",
      types: [],
    },
  });

  test("count from the log, never Alex's own reads or other resources", () => {
    const totals = reusableKycTotals([
      // A status-list write before anything was issued is not a withdrawal.
      pod("bank", "bank", "/status/list", "write"),
      pod("alex", "alex", "/credentials/kyc-attestation", "write", 201, issuedBy("bank")),
      pod("alex", "alex", "/credentials/kyc-attestation"),
      pod("card-issuer", "alex", "/credentials/kyc-attestation"),
      pod("card-issuer", "alex", "/credentials/assets", "denied", 403),
      pod("alex", "alex", "/credentials/kyc-attestation.acl", "revoke"),
      pod("card-issuer", "alex", "/credentials/kyc-attestation", "denied", 403),
      pod("alex", "alex", "/credentials/kyc-attestation", "write", 204, issuedBy("bank")),
      pod("bank", "bank", "/status/list", "write"),
      pod("lender", "lender", "/status/list", "write"),
    ]);
    expect(totals).toEqual({
      accessWithdrawn: 1,
      checks: 1,
      denied: 1,
      institutions: 2,
      reads: 1,
      statementsWithdrawn: 1,
      withdrawals: 2,
    });
  });

  test("are zero for an empty log", () => {
    expect(reusableKycTotals([])).toMatchObject({ checks: 0, institutions: 0, reads: 0 });
  });
});
