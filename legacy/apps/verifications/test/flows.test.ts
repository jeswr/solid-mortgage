/**
 * Drift guards over the scene-1 flow table: pinned demo claims, decision-0005
 * ZK budgets, CAPTURED operand encodings, pod paths and the org-theme
 * bindings must all stay mutually consistent — a silent mismatch here would
 * surface as a runtime 500 (or, worse, a fabricated encoding).
 */
import { fitsZkBudget, MORT, RESOURCE_POD_PATHS, zkBudgetFor } from "@mortgage/data-model";
import { orgThemes } from "@mortgage/ui";
// The node-only canonical demo module — safe here (Vitest, node env), banned
// from app bundles, which is exactly why flows.ts carries verbatim copies.
import {
  demoAssetClaims as canonicalAssetClaims,
  demoCreditScoreClaims as canonicalCreditScoreClaims,
  demoEmploymentClaims as canonicalEmploymentClaims,
} from "@mortgage/vc-kit/seed-tooling";
import { describe, expect, test } from "vitest";
import { ISSUER_FLOW_IDS } from "../lib/server/config";
import { anchoredClaimValue, CAPTURED_OPERAND_ENC, ISSUER_FLOWS } from "../lib/server/flows";

describe("the issuer flow table", () => {
  test("every flow signs claims of its own kind at the sm-20 pod path", () => {
    for (const id of ISSUER_FLOW_IDS) {
      const flow = ISSUER_FLOWS[id];
      expect(flow.claims().kind, id).toBe(flow.kind);
      expect(flow.credentialPath, id).toBe(
        RESOURCE_POD_PATHS[flow.kind as keyof typeof RESOURCE_POD_PATHS],
      );
      expect(flow.validFromDays, id).toBeLessThan(flow.validUntilDays);
      expect(flow.reissueDays, id).toBeGreaterThan(0);
    }
  });

  test("the employment window is the decision-0012 near-expiry beat (−30d/+14d)", () => {
    expect(ISSUER_FLOWS.employment.validFromDays).toBe(-30);
    expect(ISSUER_FLOWS.employment.validUntilDays).toBe(14);
  });

  test("the copied claim factories are byte-identical to the vc-kit canonical demo inputs", () => {
    expect(ISSUER_FLOWS.employment.claims()).toEqual(canonicalEmploymentClaims());
    expect(ISSUER_FLOWS.assets.claims()).toEqual(canonicalAssetClaims());
    expect(ISSUER_FLOWS.credit.claims()).toEqual(canonicalCreditScoreClaims());
  });

  test("every anchor field has a ZK budget, and its pinned value has a CAPTURED encoding", () => {
    const anchored = ISSUER_FLOW_IDS.filter((id) => ISSUER_FLOWS[id].anchor !== undefined);
    expect(anchored.sort()).toEqual(["credit", "employment"]);
    for (const id of anchored) {
      const flow = ISSUER_FLOWS[id];
      const anchor = flow.anchor;
      if (anchor === undefined) throw new Error("unreachable");
      expect(zkBudgetFor(anchor.field), id).toBeDefined();
      const value = anchoredClaimValue(flow);
      expect(fitsZkBudget(anchor.field, value), `${id} budget`).toBe(true);
      expect(CAPTURED_OPERAND_ENC[value], `${id} captured encoding`).toMatch(/^0x[0-9a-f]{64}$/);
    }
    expect(ISSUER_FLOWS.employment.anchor?.field).toBe(MORT.monthlyGrossIncomeUsd);
    expect(ISSUER_FLOWS.credit.anchor?.field).toBe(MORT.creditScoreValue);
    // Decision 0005: no ZK statements over balances — the asset flow anchors nothing.
    expect(ISSUER_FLOWS.assets.anchor).toBeUndefined();
  });

  test("theme bindings are role-first and match the @mortgage/ui org themes", () => {
    for (const id of ISSUER_FLOW_IDS) {
      const flow = ISSUER_FLOWS[id];
      const theme = orgThemes[flow.themeId];
      expect(theme.modelledOn, id).toBe(flow.modelledOn);
      expect(theme.role, id).toBe(flow.role);
      expect(flow.label, id).toContain("modelled on");
    }
  });
});
