// AUTHORED-BY Claude Opus 5.5
// @vitest-environment jsdom
/**
 * The Lens on entries the real pod host emitted (`fixtures/runtime-services.json`, recorded and
 * drift-checked by pod-runtime's `test/host/lens-fixture.test.ts` against the real wasm): change
 * notices, a one-time grant closed by the holder's wallet, provenance history, the examiner view.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { expect, it, describe as suite } from "vitest";
import { describe, NOTIFIED_LABEL } from "../src/describe.js";
import { type ComplianceItem, examine, registerCsv } from "../src/examiner.js";
import { resourceHistory } from "../src/history.js";
import { renderLedger } from "../src/ledger-view.js";
import { LensModel } from "../src/model.js";
import { CONFIG } from "./fixtures/registry.js";

const ENTRIES: LensEntry[] = JSON.parse(
  readFileSync(join(import.meta.dirname, "fixtures", "runtime-services.json"), "utf8"),
);

function loaded(): LensModel {
  const m = new LensModel(CONFIG);
  for (const e of ENTRIES) m.push(e, { replayed: true });
  return m;
}

const rec = (m: LensModel, id: number) => {
  const r = m.received.find((x) => x.entry.id === id);
  if (!r) throw new Error(`no entry ${id}`);
  return r;
};

const COMPLIANCE: ComplianceItem[] = [
  {
    evidence: [
      { kind: "notified", org: "payroll" },
      { actor: { org: "payroll" }, kind: "read", path: "/profile/address", status: 200 },
    ],
    id: "kept-current",
    obligation: "Keep the record of where the holder lives current",
    rule: "Illustrative rule 1",
  },
  {
    evidence: [{ actor: { org: "bank" }, kind: "denied", path: "/profile/address" }],
    id: "access-ends",
    obligation: "Stop reading once access is withdrawn",
    rule: "Illustrative rule 2",
    source: "https://example.org/rule-2",
  },
  {
    evidence: [{ actor: { org: "county" }, kind: "read" }],
    id: "never",
    obligation: "Something nobody did",
    rule: "Illustrative rule 3",
  },
];

suite("change notices", () => {
  it("say who was told what changed, and that the runtime (not the pod) told them", () => {
    const m = loaded();
    const s = describe(m, rec(m, 12));
    expect(s.source).toBe("app");
    expect(s.kind).toBe("notified");
    expect(s.text).toBe(
      `${m.nameOf("bank")} was told that ${m.labelOf("/profile/address")} changed`,
    );
    expect(s.meta).toContain(NOTIFIED_LABEL);
    expect(s.meta).toContain("the notice carries no data");
    // The refusal that followed the withdrawal is still a pod entry.
    expect(describe(m, rec(m, 22)).kind).toBe("denied");
  });
});

suite("one-time grants", () => {
  it("label the closing revoke as a one-time grant closed by the holder's wallet", () => {
    const m = loaded();
    const used = describe(m, rec(m, 32));
    expect(used.kind).toBe("grant-used");
    expect(used.text).toBe(
      `${m.nameOf("bank")} used its one-time grant to read ${m.labelOf("/certificates/badge")}`,
    );
    expect(used.meta).toEqual(["one-time grant, closed by Alex's wallet"]);
    const closed = describe(m, rec(m, 35));
    expect(closed.kind).toBe("expire");
    expect(closed.meta[0]).toBe("one-time grant, closed by Alex's wallet");
    expect(m.closedOneTime(rec(m, 35).seq)).toBe("bank");
    // The holder's own withdrawal earlier is a revoke, not an expiry.
    expect(describe(m, rec(m, 18)).kind).toBe("revoke");
    expect(m.closedOneTime(rec(m, 18).seq)).toBeUndefined();
  });
});

suite("provenance history", () => {
  it("lists who wrote each version, from the writes the pod accepted", () => {
    const m = loaded();
    const versions = resourceHistory(m, "alex", "/profile/address");
    expect(versions.map((v) => [v.id, v.writer, v.change, v.step])).toEqual([
      [11, "alex", "changed", "change"],
      [19, "alex", "changed", "correct"],
    ]);
    expect(resourceHistory(m, "alex", "/profile/address.acl")).toEqual([]);
    expect(resourceHistory(m, "alex", "/certificates/badge")).toEqual([]);
  });
});

suite("examiner view", () => {
  it("registers every organisation request with the grant it was made under", () => {
    const m = loaded();
    const x = examine(m, COMPLIANCE);
    expect(x.register.map((r) => [r.rec.entry.id, r.org, r.action])).toEqual([
      [14, "bank", "read"],
      [15, "payroll", "read"],
      [22, "bank", "refused"],
      [23, "payroll", "read"],
      [31, "bank", "read"],
      [36, "bank", "refused"],
    ]);
    const refused = x.register.find((r) => r.rec.entry.id === 22);
    expect(refused?.under).toMatch(/^none: refused, /);
    expect(x.register.find((r) => r.rec.entry.id === 14)?.grant).toMatch(/address\.acl#grant-1$/);
    expect(x.changes.map((c) => c.rec.entry.id)).toEqual([7, 10, 18, 30, 35]);
    const csv = registerCsv(m, x.register);
    expect(csv.split("\n")[0]).toBe(
      "When,Organisation,Back office,Action,Pod,Resource,Path,Status,Under",
    );
    expect(csv.trim().split("\n")).toHaveLength(7);
  });

  it("evidences an obligation only when every pattern has a matching entry", () => {
    const m = loaded();
    const x = examine(m, COMPLIANCE);
    expect(x.obligations.map((o) => [o.item.id, o.met])).toEqual([
      ["kept-current", true],
      ["access-ends", true],
      ["never", false],
    ]);
    expect(x.obligations[0]?.evidence[0]?.matches.map((r) => r.entry.id)).toEqual([13, 21]);
    expect(x.obligations[1]?.evidence[0]?.matches.map((r) => r.entry.id)).toEqual([22]);
  });

  it("renders as a ledger tab, opening on it when asked", () => {
    const m = loaded();
    const { el } = renderLedger(m, { compliance: COMPLIANCE, view: "examiner" });
    const tab = (id: string) =>
      el.querySelector<HTMLButtonElement>(`[role="tab"][data-tab="${id}"]`);
    expect(tab("examiner")?.getAttribute("aria-selected")).toBe("true");
    expect(el.querySelector<HTMLElement>("#ledger-panel-journey")?.hidden).toBe(true);
    const panel = el.querySelector<HTMLElement>("#ledger-panel-examiner");
    expect(panel?.hidden).toBe(false);
    const verdicts = [...(panel?.querySelectorAll<HTMLElement>("[data-obligation]") ?? [])].map(
      (o) => [o.dataset.obligation, o.dataset.met],
    );
    expect(verdicts).toEqual([
      ["kept-current", "true"],
      ["access-ends", "true"],
      ["never", "false"],
    ]);
    expect(panel?.querySelectorAll("table.register tbody tr")).toHaveLength(6);
    tab("journey")?.click();
    expect(panel?.hidden).toBe(true);
    // The journey tab is the default.
    const plain = renderLedger(m).el;
    expect(plain.querySelector<HTMLElement>("#ledger-panel-examiner")?.hidden).toBe(true);
  });
});
