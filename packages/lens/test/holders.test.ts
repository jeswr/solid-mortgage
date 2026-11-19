// AUTHORED-BY Claude Opus 5.5
/**
 * The Lens centres on the holder its demo names (lane E3), not on a constant. The same log read
 * by a Lens for Maya and by a Lens for Alex attributes each pod and each actor to the right one.
 */
import type { AccessRule, LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { expect, it, describe as suite } from "vitest";
import { describe } from "../src/describe.js";
import { computeLedger, computeTotals } from "../src/ledger.js";
import { LensModel } from "../src/model.js";
import { nodeOf, ownerOfWebid } from "../src/paths.js";
import { CONFIG, REGISTRY } from "./fixtures/registry.js";

const ORIGIN = "https://site.test";
const webid = (owner: string) => `${ORIGIN}/pods/${owner}/profile/card#me`;

let nextId = 1;
function pod(
  actor: PodOwner,
  podOwner: PodOwner,
  path: string,
  extra: Partial<PodEvent> = {},
): LensEntry {
  const method = extra.method ?? "GET";
  return {
    source: "pod",
    id: nextId++,
    at: "2026-09-01T10:00:00Z",
    actor: { org: actor, webid: webid(actor), viaAgent: false },
    pod: podOwner,
    path: `/pods/${podOwner}${path}`,
    method,
    status: 200,
    kind: method === "GET" ? "read" : "write",
    ...extra,
  };
}

const rule = (agent: string, resource: string): AccessRule => ({
  agent,
  inherited: true,
  modes: ["Read"],
  resource,
});

/** Maya grants Alder Bank read on her credentials; the bank reads; Maya revokes; refused. */
function mayaLog(): LensEntry[] {
  return [
    pod("maya", "maya", "/credentials/income", { method: "PUT", kind: "write" }),
    pod("maya", "maya", "/credentials/.acl", {
      method: "PUT",
      kind: "grant",
      acl: { granted: [rule(webid("bank"), "/credentials/")], revoked: [] },
    }),
    pod("bank", "maya", "/credentials/income"),
    pod("alex", "alex", "/profile/card"),
    pod("maya", "maya", "/credentials/.acl", {
      method: "PUT",
      kind: "revoke",
      acl: { granted: [], revoked: [rule(webid("bank"), "/credentials/")] },
    }),
    pod("bank", "maya", "/credentials/income", { status: 403, kind: "denied" }),
  ];
}

function lens(holder: { id?: string; name?: string } | undefined, log = mayaLog()): LensModel {
  const { holder: _alex, ...rest } = CONFIG;
  const m = new LensModel({ ...rest, ...(holder ? { holder } : {}) });
  for (const entry of log) m.push(entry, { replayed: true });
  return m;
}

suite("holders as data", () => {
  it("defaults to Alex, named from the holder registry", () => {
    const m = lens(undefined, []);
    expect(m.holder).toBe("alex");
    expect(m.holderName).toBe("Alex");
  });

  it("takes the holder and its name from the config, and refuses an unregistered one", () => {
    expect(lens({ id: "northwind" }, []).holderName).toBe("Northwind");
    expect(lens({ id: "rosa", name: "Rosa R." }, []).holderName).toBe("Rosa R.");
    expect(() => lens({ id: "bank" }, [])).toThrow(/not a registered holder/);
    expect(() => lens({ id: "constructor" }, [])).toThrow(/not a registered holder/);
  });

  it("knows every registered holder's WebID and node", () => {
    expect(ownerOfWebid(REGISTRY, webid("maya"))).toBe("maya");
    expect(ownerOfWebid(REGISTRY, webid("northwind"))).toBe("northwind");
    expect(nodeOf(REGISTRY, "rosa")).toBe("rosa");
    expect(nodeOf(REGISTRY, "wallet")).toBe("alex");
  });

  it("a Lens for Maya puts Maya's pod in the middle and Alex on the map as someone else", () => {
    const m = lens({ id: "maya" });
    expect(m.drawers().map((d) => d.path)).toContain("/credentials/");
    expect(m.drawer("/credentials/")?.resources.has("/credentials/income")).toBe(true);
    // Alex is met like an organisation, by name; Maya, the holder, is never an organisation.
    expect(m.orgs().map((o) => o.key)).toEqual(["bank", "alex"]);
    expect(m.node("alex")?.name).toBe("Alex Rivera");
    expect(m.nameOf("maya")).toBe("Maya");
    // The grant is Maya's to the bank, and her revoke ended it.
    expect(m.grant("bank")?.state).toBe("revoked");
    const sentences = m.received.map((r) => describe(m, r));
    expect(sentences[0]?.parts.map((p) => (typeof p === "string" ? p : p.b)).join("")).toMatch(
      /^Maya /,
    );
    const denied = sentences[5];
    expect(denied?.kind).toBe("denied");
    // The bank read Maya's credentials once, and only from Maya's pod.
    const shared = m.notShared().find((row) => row.org.key === "bank");
    expect(shared?.read.map((d) => d.path)).toEqual(["/credentials/"]);
    const totals = computeTotals(m);
    expect(totals.uploads).toBe(1);
    expect(totals.denied).toBe(1);
    expect(computeLedger(m).rows.map((r) => r.path)).toEqual(["/credentials/income"]);
  });

  it("the same log in a Lens for Alex keeps Maya's pod out of Alex's cabinet", () => {
    const m = lens({ id: "alex" });
    expect(m.drawer("/credentials/")).toBeUndefined();
    expect(m.orgs().map((o) => o.key)).toEqual(["maya", "bank"]);
    expect(m.node("maya")?.label).toBe("Maya");
    expect(m.grant("bank")).toBeUndefined();
    expect(computeTotals(m).uploads).toBe(0);
    expect(computeLedger(m).rows.map((r) => r.path)).toEqual(["/profile/card"]);
  });
});
