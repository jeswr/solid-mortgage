/**
 * The decision-0005 honesty panel content (sm-25 deliverable 4). These tests
 * pin the LOAD-BEARING phrases - the honesty posture is a security property
 * of the showcase, and silent copy drift (softening "audit pending", dropping
 * the enumeration caveat, un-pinning versions) must fail the suite.
 */

import { describe, expect, it } from "vitest";
import {
  PINNED_BB_JS_VERSION,
  PINNED_NOIR_JS_VERSION,
  TIER_B_LABEL,
  ZK_HONESTY,
  ZK_HONESTY_ITEMS,
  ZK_TOOLCHAIN,
} from "../src/index.js";

function item(id: string): string {
  const found = ZK_HONESTY_ITEMS.find((entry) => entry.id === id);
  expect(found, `honesty item "${id}" must exist`).toBeDefined();
  return `${found?.title} ${found?.body}`;
}

describe("ZK_HONESTY (decision 0005 - every ZK surface renders this)", () => {
  it("covers every mandated item exactly once", () => {
    expect(ZK_HONESTY_ITEMS.map((entry) => entry.id).sort()).toEqual(
      [
        "digit-budget-leak",
        "low-entropy-enumeration",
        "research-grade",
        "simple-entailment",
        "tier-a-binding",
        "tier-b-offline",
        "toolchain-pins",
      ].sort(),
    );
    expect(ZK_HONESTY.items).toBe(ZK_HONESTY_ITEMS);
  });

  it("states the research-grade / external-audit-pending posture (sq-qhy4)", () => {
    const text = item("research-grade");
    expect(text).toContain("sq-qhy4");
    expect(text.toLowerCase()).toContain("research-grade");
    expect(text.toLowerCase()).toContain("not a production cryptographic guarantee");
  });

  it("states Simple entailment only", () => {
    expect(item("simple-entailment")).toContain("Simple entailment");
  });

  it("discloses the digit-budget envelope leak", () => {
    expect(item("digit-budget-leak")).toContain("digit");
    expect(item("digit-budget-leak")).toContain("log10");
  });

  it("discloses low-entropy enumeration with the honest claim boundary", () => {
    const text = item("low-entropy-enumeration");
    expect(text).toContain("551");
    expect(text).toContain("not disclosed and not forgeable");
    expect(text).toContain("linkability");
  });

  it("pins the exact toolchain versions", () => {
    const text = item("toolchain-pins");
    expect(PINNED_NOIR_JS_VERSION).toBe("1.0.0-beta.21");
    expect(PINNED_BB_JS_VERSION).toBe("5.0.0-nightly.20260324");
    expect(text).toContain("@noir-lang/noir_js@1.0.0-beta.21");
    expect(text).toContain("@aztec/bb.js@5.0.0-nightly.20260324");
    expect(text).toContain("no-zk");
    expect(ZK_TOOLCHAIN.verifierTarget).toBe("evm");
  });

  it("explains the mandatory Tier A operand-anchor binding (decision 0012)", () => {
    const text = item("tier-a-binding");
    expect(text.toLowerCase()).toContain("forgeable");
    expect(text).toContain("operand-anchor");
    expect(text).toContain("WebID");
    expect(text).toContain("single-use challenge");
  });

  it("carries the verbatim Tier B label", () => {
    expect(TIER_B_LABEL).toBe("proved offline · verified live");
    expect(item("tier-b-offline")).toContain(TIER_B_LABEL);
    expect(ZK_HONESTY.tierBLabel).toBe(TIER_B_LABEL);
  });

  it("documents the COOP/COEP requirement for multithreaded proving", () => {
    expect(ZK_HONESTY.coopCoep).toContain("COOP");
    expect(ZK_HONESTY.coopCoep).toContain("COEP");
  });
});
