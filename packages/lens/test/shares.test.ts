// AUTHORED-BY Claude Opus 5.5
/**
 * An organisation sharing a file in its own pod with another organisation is not a grant of the
 * holder's. Before this was pinned, such an ACL write extended the grantee's record of the
 * holder's grants, so a grant the holder withdrew stayed "active" (one demo's ledger read
 * 7 active, 0 withdrawn) and the other pod's containers appeared as drawers of the holder's
 * cabinet. A whole demo journey is checked in `content/test/<demo>/lens.test.ts`.
 */
import type { AccessRule, LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { expect, it, describe as suite } from "vitest";
import { describe, refusalReason } from "../src/describe.js";
import { computeTotals } from "../src/ledger.js";
import { LensMap } from "../src/map.js";
import { LensModel } from "../src/model.js";
import { CONFIG, webid } from "./fixtures/registry.js";

let nextId = 1;
const rule = (owner: PodOwner, resource: string): AccessRule => ({
  agent: webid(owner),
  inherited: resource.endsWith("/"),
  modes: ["Read"],
  resource,
});

function acl(
  actor: PodOwner,
  pod: PodOwner,
  path: string,
  change: NonNullable<PodEvent["acl"]>,
  viaAgent = false,
): LensEntry {
  return {
    source: "pod",
    id: nextId++,
    at: "2026-09-01T10:00:00Z",
    actor: { org: actor, webid: webid(actor), viaAgent },
    pod,
    path,
    method: "PUT",
    status: 201,
    kind: change.granted.length > 0 ? "grant" : "revoke",
    acl: change,
    resource: { label: "Hut orders", drawer: "Orders", types: [] },
  };
}

const read = (actor: PodOwner, pod: PodOwner, path: string, status = 200): LensEntry => ({
  source: "pod",
  id: nextId++,
  at: "2026-09-01T10:00:00Z",
  actor: { org: actor, webid: webid(actor), viaAgent: true },
  pod,
  path,
  method: "GET",
  status,
  kind: status === 200 ? "read" : "denied",
});

function story() {
  const m = new LensModel(CONFIG);
  const entries = [
    // Alex lets Sorrel (bank) read Certificates.
    acl("alex", "alex", "/certificates/.acl", {
      granted: [rule("bank", "/certificates/")],
      revoked: [],
    }),
    // Cobble Huts (bureau) shares its own orders folder with Sorrel and Kestrel (aus).
    acl("bureau", "bureau", "/orders/.acl", {
      granted: [rule("bank", "/orders/"), rule("aus", "/orders/")],
      revoked: [],
    }),
    read("bank", "bureau", "/orders/H-1"),
    // Alex withdraws Sorrel's grant; Sorrel's next read of Alex's pod is refused.
    acl("alex", "alex", "/certificates/.acl", {
      granted: [],
      revoked: [rule("bank", "/certificates/")],
    }),
    read("bank", "alex", "/certificates/first-aid", 403),
    // Cobble Huts stops sharing with Kestrel, through its back-office agent.
    acl(
      "bureau",
      "bureau",
      "/orders/.acl",
      { granted: [], revoked: [rule("aus", "/orders/")] },
      true,
    ),
  ];
  const recs = entries.map((e) => m.push(e, { replayed: true }));
  return { m, recs };
}

suite("organisations sharing their own files", () => {
  it("never become, extend or end a grant of the holder's", () => {
    const { m } = story();
    expect(m.grants().map((g) => [g.org, g.state])).toEqual([["bank", "revoked"]]);
    expect(m.grant("aus")).toBeUndefined();
    expect(computeTotals(m).grants).toEqual({ active: 0, expired: 0, revoked: 1 });
    // Both agents take part all the same.
    expect(m.orgs().map((o) => o.key)).toEqual(["bank", "bureau", "aus"]);
  });

  it("add no drawer to the holder's cabinet and no reader of the holder's data", () => {
    const { m } = story();
    expect(m.drawer("/orders/")).toBeUndefined();
    expect(m.whoCanRead("/orders/H-1")).toEqual([]);
  });

  it("leave a refusal after the withdrawal explained by the withdrawal", () => {
    const { m, recs } = story();
    const refused = recs[4];
    if (!refused) throw new Error("no refusal");
    expect(refusalReason(m, refused)).toBe("grant withdrawn");
  });

  it("are said as sharing between organisations, with no key drawn on the map", () => {
    const { m, recs } = story();
    const shared = recs[1];
    const stopped = recs[5];
    if (!shared || !stopped) throw new Error("no share");
    const s = describe(m, shared);
    expect(s.text).toBe("Cobble Huts shared Hut orders with Sorrel and Kestrel");
    expect(s.meta.slice(0, 2)).toEqual([
      "in its own pod, between organisations",
      "not one of Alex's grants",
    ]);
    const t = describe(m, stopped);
    expect(t.text).toBe("Cobble Huts stopped sharing Hut orders with Kestrel");
    // Not "access ended · expiry applied by Alex's wallet": that is said only of Alex's grants.
    expect(t.meta.join(" ")).not.toMatch(/expiry/);
    expect(LensMap.motionOf(shared, s, m.holder)).toBe("self");
    expect(LensMap.motionOf(stopped, t, m.holder)).toBe("self");
    // The holder's own grant still draws its key.
    const granted = recs[0];
    if (!granted) throw new Error("no grant");
    expect(LensMap.motionOf(granted, describe(m, granted), m.holder)).toBe("grant");
  });
});

/** A rule with its own modes and, optionally, the runtime's `acl:origin` limits. */
const ruleWith = (
  owner: PodOwner,
  resource: string,
  modes: AccessRule["modes"],
  origins?: string[],
): AccessRule => ({ ...rule(owner, resource), modes, ...(origins ? { origins } : {}) });

suite("an access change that takes away only part of a rule", () => {
  it("narrows a grant of the holder's without ending it, folded by the modes left", () => {
    const m = new LensModel(CONFIG);
    const recs = [
      acl("alex", "alex", "/certificates/.acl", {
        granted: [ruleWith("bank", "/certificates/", ["Read", "Write"])],
        revoked: [],
      }),
      // Alex takes Write away; the runtime's event lists only the mode it removed.
      acl("alex", "alex", "/certificates/.acl", {
        granted: [],
        revoked: [ruleWith("bank", "/certificates/", ["Write"])],
      }),
    ].map((e) => m.push(e, { replayed: true }));
    expect(m.grant("bank")?.state).toBe("active");
    expect(m.grant("bank")?.active.map((r) => r.modes)).toEqual([["Read"]]);
    expect(computeTotals(m).grants).toEqual({ active: 1, expired: 0, revoked: 0 });
    const narrowed = recs[1];
    if (!narrowed) throw new Error("no change");
    const s = describe(m, narrowed);
    expect(s.text).toBe("Alex narrowed Sorrel's access to Certificates");
    expect(s.kind).not.toBe("revoke");
    expect(LensMap.motionOf(narrowed, s, m.holder)).toBe("grant");
    // Taking the last mode away ends the grant, and says so.
    const ended = m.push(
      acl("alex", "alex", "/certificates/.acl", {
        granted: [],
        revoked: [ruleWith("bank", "/certificates/", ["Read"])],
      }),
      { replayed: true },
    );
    if (!ended) throw new Error("no change");
    expect(m.grant("bank")?.state).toBe("revoked");
    expect(describe(m, ended).text).toBe("Alex withdrew Sorrel's access");
  });

  it("keeps a grant whose origin-limited rule goes while its unlimited rule stays", () => {
    const m = new LensModel(CONFIG);
    const recs = [
      acl("alex", "alex", "/certificates/.acl", {
        granted: [
          ruleWith("bank", "/certificates/", ["Read"]),
          ruleWith("bank", "/certificates/", ["Read"], ["https://app.example"]),
        ],
        revoked: [],
      }),
      acl("alex", "alex", "/certificates/.acl", {
        granted: [],
        revoked: [ruleWith("bank", "/certificates/", ["Read"], ["https://app.example"])],
      }),
    ].map((e) => m.push(e, { replayed: true }));
    expect(m.grant("bank")?.state).toBe("active");
    expect(m.grant("bank")?.active).toHaveLength(1);
    const narrowed = recs[1];
    if (!narrowed) throw new Error("no change");
    expect(describe(m, narrowed).text).not.toMatch(/withdrew/);
  });

  it("between organisations, is said as narrowing, not as stopping sharing", () => {
    const m = new LensModel(CONFIG);
    const recs = [
      acl("bureau", "bureau", "/orders/.acl", {
        granted: [ruleWith("aus", "/orders/", ["Read", "Append"])],
        revoked: [],
      }),
      acl("bureau", "bureau", "/orders/.acl", {
        granted: [],
        revoked: [ruleWith("aus", "/orders/", ["Append"])],
      }),
      acl("bureau", "bureau", "/orders/.acl", {
        granted: [],
        revoked: [ruleWith("aus", "/orders/", ["Read"])],
      }),
    ].map((e) => m.push(e, { replayed: true }));
    const [, narrowed, stopped] = recs;
    if (!narrowed || !stopped) throw new Error("no change");
    expect(describe(m, narrowed).text).toBe(
      "Cobble Huts narrowed what Kestrel may do with Hut orders",
    );
    expect(describe(m, stopped).text).toBe("Cobble Huts stopped sharing Hut orders with Kestrel");
  });
});
