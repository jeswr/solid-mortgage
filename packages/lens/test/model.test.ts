// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import type { LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import { expect, it, describe as suite } from "vitest";
import { describe, refusalReason } from "../src/describe.js";
import { computeLedger, computeTotals, ledgerCsv } from "../src/ledger.js";
import { LensModel } from "../src/model.js";
import { drawerPathOf, labelFromPath, podRelative } from "../src/paths.js";
import { CONFIG } from "./fixtures/registry.js";

const EVENTS: LensEntry[] = JSON.parse(
  readFileSync(new URL("./fixtures/events.json", import.meta.url), "utf8"),
);

function loaded(replayed = true): LensModel {
  const m = new LensModel(CONFIG);
  for (const e of EVENTS) m.push(e, { replayed });
  return m;
}

const byId = (m: LensModel, id: number) => {
  const r = m.received.find((x) => x.entry.id === id);
  if (!r) throw new Error(`no entry ${id}`);
  return r;
};

suite("paths", () => {
  it("normalises pod paths", () => {
    expect(podRelative("/pods/alex/certificates/a")).toBe("/certificates/a");
    expect(podRelative("https://x.test/pods/alex/b?x=1")).toBe("/b");
    expect(podRelative("/certificates/")).toBe("/certificates/");
    expect(drawerPathOf("/pods/alex/itinerary/route-plan")).toBe("/itinerary/");
    expect(labelFromPath("/itinerary/route-plan-draft")).toBe("Route plan draft");
  });
});

suite("LensModel", () => {
  it("meets organisations in order and never counts the holder", () => {
    const m = loaded();
    expect(m.orgs().map((o) => o.key)).toEqual(["payroll", "county", "aus", "insurer", "bureau"]);
    expect(m.orgs()[1]?.label).toBe("Fernhollow");
  });

  it("ignores a duplicate entry", () => {
    const m = loaded();
    const first = EVENTS[0];
    if (!first) throw new Error("fixture empty");
    expect(m.push(first)).toBeUndefined();
    expect(m.received).toHaveLength(EVENTS.length);
  });

  it("keeps configured drawers in order and counts resources", () => {
    const m = loaded();
    expect(m.drawers().map((d) => d.label)).toEqual([
      "Profile",
      "Certificates",
      "Itinerary",
      "Permits",
      "Health",
      "Inbox",
    ]);
    expect(m.drawer("/certificates/")?.credentials.size).toBe(1);
    expect(m.drawer("/itinerary/")?.resources.has("/itinerary/route-plan")).toBe(true);
  });

  it("folds grants: active, expired by the agent, withdrawn by the holder", () => {
    const m = loaded();
    expect(m.grant("payroll")?.state).toBe("active");
    expect(m.grant("insurer")?.state).toBe("expired");
    expect(m.grant("county")?.state).toBe("revoked");
    expect([...m.activeDrawers("payroll")]).toEqual(["/certificates/"]);
    expect(m.drawerState("county", "/itinerary/")).toBe("revoked");
    expect(m.drawerState("insurer", "/health/")).toBe("expired");
    expect(m.drawerState("insurer", "/profile/")).toBe("never");
  });

  it("folds only the holder's ACL writes into grants; organisations' own sharing is not one", () => {
    const m = loaded();
    const before = m.grant("county");
    const orgShare: PodEvent = {
      acl: {
        granted: [
          {
            agent: "https://trail.example/pods/county/profile/card#me",
            inherited: true,
            modes: ["Read"],
            resource: "/orders/",
          },
          {
            agent: "https://trail.example/pods/bank/profile/card#me",
            inherited: true,
            modes: ["Read"],
            resource: "/orders/",
          },
        ],
        revoked: [],
      },
      actor: {
        org: "bureau",
        viaAgent: true,
        webid: "https://trail.example/pods/bureau/profile/card#me",
      },
      at: "2026-09-30T09:00:00.000Z",
      id: 9001,
      kind: "grant",
      method: "PUT",
      path: "/orders/.acl",
      pod: "bureau",
      status: 201,
    };
    m.push({ source: "pod", ...orgShare });
    // County's grant from the holder stays withdrawn; nobody gains a holder grant.
    expect(m.grant("county")?.state).toBe(before?.state);
    expect(m.grant("county")?.state).toBe("revoked");
    expect(m.grant("bank")).toBeUndefined();
    // The organisation the bureau shared with still takes part.
    expect(m.orgs().map((o) => o.key)).toContain("bank");
  });

  it("knows who can read a resource now", () => {
    const m = new LensModel(CONFIG);
    for (const e of EVENTS.slice(0, 7)) m.push(e);
    expect(m.whoCanRead("/certificates/first-aid")).toEqual(["county"]);
    expect(m.whoCanRead("/profile/card")).toEqual(["county"]);
    expect(m.whoCanRead("/profile/other")).toEqual([]);
    const all = loaded();
    expect(all.whoCanRead("/certificates/first-aid")).toEqual([]);
  });

  it("attributes untagged entries to the current step when live, to the last tagged step on replay", () => {
    const live = new LensModel(CONFIG);
    for (const e of EVENTS.slice(0, 18)) live.push(e);
    live.setCurrentStep("hut");
    const note = EVENTS[18];
    if (!note) throw new Error("fixture short");
    expect(live.push(note)?.step).toBe("hut");
    expect(byId(loaded(), 19).step).toBe("cover");
  });

  it("computes what each organisation did not see", () => {
    const m = loaded();
    const county = m.notShared().find((r) => r.org.key === "county");
    expect(county?.read.map((d) => d.label)).toEqual(["Profile", "Certificates", "Itinerary"]);
    expect(county?.wrote.map((d) => d.label)).toEqual(["Permits"]);
    expect(county?.notSeen.map((d) => d.label)).toEqual(["Permits", "Health"]);
    const insurer = m.notShared().find((r) => r.org.key === "insurer");
    expect(insurer?.read.map((d) => d.label)).toEqual(["Health"]);
    expect(insurer?.proofs).toBe(1);
  });

  it("finds the earlier allowed request for a refusal", () => {
    const m = loaded();
    expect(m.previousSuccess(byId(m, 21))?.entry.id).toBe(9);
    expect(m.previousSuccess(byId(m, 17))).toBeUndefined();
  });
});

suite("sentences", () => {
  it("say who read what, under which grant", () => {
    const m = loaded();
    const s = describe(m, byId(m, 7));
    expect(s.text).toBe("Fernhollow read Wilderness first-aid certificate");
    expect(s.meta).toEqual([
      "Certificates",
      "allowed by T2",
      "backcountry permit",
      "the trip ends",
    ]);
    expect(s.source).toBe("pod");
  });

  it("describe a credential delivery with its issuer and dates", () => {
    const m = loaded();
    const s = describe(m, byId(m, 2));
    expect(s.kind).toBe("credential");
    expect(s.text).toBe("Tamarack delivered a signed credential: Wilderness first-aid certificate");
    expect(s.meta).toContain("issued by Tamarack");
    expect(s.meta).toContain("as of 2026-08-28");
  });

  it("describe grants, withdrawals and expiry from the ACL rules written", () => {
    const m = loaded();
    const g = describe(m, byId(m, 5));
    expect(g.kind).toBe("grant");
    expect(g.text).toBe("Alex gave Fernhollow access");
    expect(g.meta[0]).toBe(
      "Fernhollow may read Profile card, Certificates and Itinerary; add to Permits; change Permits",
    );
    const r = describe(m, byId(m, 20));
    expect(r.kind).toBe("revoke");
    expect(r.text).toBe("Alex withdrew Fernhollow's access");
    expect(r.meta[0]).toMatch(/^Removed: Fernhollow may read/);
    const x = describe(m, byId(m, 18));
    expect(x.kind).toBe("expire");
    expect(x.text).toBe("Ridgeline's access ended");
    expect(x.meta[0]).toBe("expiry applied automatically by Waymark");
  });

  it("explain a refusal from the grant history", () => {
    const m = loaded();
    const d = describe(m, byId(m, 21));
    expect(d.kind).toBe("denied");
    expect(d.text).toBe("Fernhollow tried to read Route plan · refused (403)");
    expect(d.meta).toContain("grant withdrawn");
    expect(refusalReason(m, byId(m, 17))).toBe("no rule in force covers it");
    const early = new LensModel(CONFIG);
    const insurerRead = EVENTS.find((e) => e.id === 17);
    if (!insurerRead) throw new Error("fixture short");
    const rec = early.push(insurerRead);
    if (!rec) throw new Error("not pushed");
    expect(refusalReason(early, rec)).toBe("no grant covers it");
  });

  it("time a refusal after a live withdrawal", () => {
    const m = new LensModel(CONFIG);
    const t0 = 1_000_000;
    for (const e of EVENTS.slice(0, 19)) m.push(e, { replayed: true });
    const [revoke, retry] = [EVENTS[19], EVENTS[20]];
    if (!revoke || !retry) throw new Error("fixture short");
    m.push(revoke, { receivedAt: t0 });
    const rec = m.push(retry, { receivedAt: t0 + 20_000 });
    if (!rec) throw new Error("not pushed");
    expect(refusalReason(m, rec)).toBe("grant withdrawn 20 seconds ago");
  });

  it("keep app notes as the app wrote them", () => {
    const m = loaded();
    const n = describe(m, byId(m, 11));
    expect(n.source).toBe("app");
    expect(n.text).toBe(
      "Fernhollow sent the trip dates to Kestrel Weather Desk (not through the pod).",
    );
    expect(n.meta).toEqual(["Fernhollow to Kestrel", "not through the pod"]);
    expect(describe(m, byId(m, 12)).text).toBe(
      "Kestrel sent Mountain forecast to Fernhollow's inbox",
    );
  });
});

suite("ledger", () => {
  it("totals equal counts computed independently from the raw log", () => {
    const pods = EVENTS.filter((e): e is { source: "pod" } & PodEvent => e.source === "pod");
    const ok = (e: PodEvent) => e.status >= 200 && e.status < 300 && e.kind !== "denied";
    const holderWrites = pods.filter(
      (e) => e.pod === "alex" && e.kind === "write" && ok(e) && !e.path.endsWith(".acl"),
    );
    const credentialPaths = new Set(
      holderWrites.filter((e) => e.resource?.credential).map((e) => e.path),
    );
    const notInbox = (e: PodEvent) => !e.path.includes("/inbox/");
    const expected = {
      organisations: new Set(
        EVENTS.flatMap((e) =>
          e.source === "pod"
            ? [e.actor.org, e.pod]
            : [
                e.org,
                ...(e.refs ?? [])
                  .filter((r) => r.endsWith("/profile/card#me"))
                  .map((r) => r.split("/")[4] ?? ""),
              ],
        ).values(),
      ),
      denied: pods.filter((e) => e.kind === "denied" || e.status === 403 || e.status === 401)
        .length,
      uploads: new Set(
        holderWrites
          .filter((e) => e.actor.org === "alex" && !e.resource?.credential && notInbox(e))
          .map((e) => e.path),
      ).size,
      documents: new Set(
        holderWrites
          .filter((e) => e.actor.org !== "alex" && !e.resource?.credential && notInbox(e))
          .map((e) => e.path),
      ).size,
      reuses: pods.filter(
        (e) =>
          e.kind === "read" &&
          ok(e) &&
          credentialPaths.has(e.path) &&
          e.actor.org !== "payroll" &&
          e.actor.org !== "alex",
      ).length,
    };
    expected.organisations.delete("alex");
    expected.organisations.delete("wallet");

    const t = computeTotals(loaded());
    expect(t.organisations).toBe(expected.organisations.size);
    expect(t.denied).toBe(expected.denied);
    expect(t.uploads).toBe(expected.uploads);
    expect(t.documentsDelivered).toBe(expected.documents);
    expect(t.credentialsIssued).toBe(credentialPaths.size);
    expect(t.credentials[0]?.reuses).toBe(expected.reuses);
    expect(t.grants).toEqual({ active: 1, expired: 1, revoked: 1 });
    expect(t).toMatchObject({
      organisations: 5,
      denied: 2,
      uploads: 1,
      documentsDelivered: 1,
      credentialsIssued: 1,
    });
  });

  it("builds a matrix of resources by organisation with grant shading", () => {
    const ledger = computeLedger(loaded(), [
      { id: "certify", chapter: "Get ready", title: "Get certified", day: 1 },
      { id: "permit", chapter: "Permits", title: "Apply for a permit", day: 3 },
    ]);
    expect(ledger.columns.map((c) => c.key)).toEqual([
      "payroll",
      "county",
      "aus",
      "insurer",
      "bureau",
    ]);
    const route = ledger.rows.find((r) => r.path === "/itinerary/route-plan");
    const county = route?.cells[1];
    expect(county).toMatchObject({ reads: 1, writes: 0, denied: 1, state: "revoked" });
    const cert = ledger.rows.find((r) => r.path === "/certificates/first-aid");
    expect(cert?.cells[0]).toMatchObject({ writes: 1, state: "active" });
    expect(cert?.cells[3]).toMatchObject({ denied: 1, state: "never" });
    expect(ledger.rows.map((r) => r.drawer)[0]).toBe("Profile");
    const permit = ledger.timeline.find((g) => g.chapter === "Permits")?.steps[0];
    expect(permit?.clocks).toEqual(["The permit is valid for 5 days from Day 3."]);
    expect(ledger.timeline.at(-1)?.chapter).toBe("Outside the guided steps");
    const csv = ledgerCsv(ledger);
    expect(csv.split("\n")[0]).toBe(
      "Drawer,Resource,Path,Tamarack Guides,Fernhollow Parks Service,Kestrel Weather Desk,Ridgeline Rescue Cover,Cobble Hut Network",
    );
    expect(csv).toContain("reads 1; writes 0; refused 1; access revoked");
  });
});
