// AUTHORED-BY Claude Opus 5.5
/**
 * The Lens over the mortgage journey's real log: the 24 steps' beats run against the real pod
 * runtime host (`createNodePodHost`, the host and wasm the service worker runs) and the Lens
 * entries it emitted are folded by the Lens's own model, as the journey ledger page does.
 *
 * Each beat runs as the page of its tour step would: requests as the step's app go out as that
 * app, every other owner's request carries the back-office mark, which is what the browser
 * world's cross-owner fetch sets (`content/mortgage/browser.ts`). So the wallet's expiry pass,
 * run in line from an organisation's page, is "applied by Alex's wallet", and Alex's Revoke in
 * the wallet is a withdrawal.
 */

import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { isOrgSlug, type PodOwner, podOwners } from "@mortgage/demo-kit/registry";
import { beforeAll, describe, expect, test } from "vitest";
import { refusalReason, describe as sentenceOf } from "../../../packages/lens/src/describe.js";
import { computeTotals } from "../../../packages/lens/src/ledger.js";
import { type GrantState, LensModel } from "../../../packages/lens/src/model.js";
import { createNodePodHost } from "../../../packages/pod-runtime/dist/node.js";
import { keyRing, memoryKeyStore, mortgageSeed } from "../../mortgage/browser.js";
import { JOURNEY } from "../../mortgage/journey.js";
import { MORTGAGE_DRAWERS, MORTGAGE_HOLDER, mortgageLens } from "../../mortgage/mount.js";
import { TOUR } from "../../mortgage/tour.js";
import { DEMO_APPS, ORGS } from "../../orgs.js";

const ORIGIN = "https://pods.demo.test";
const DAY_ONE = "2026-08-03";
const log: LensEntry[] = [];
/** Beat name → log length when the beat finished. */
const ends = new Map<string, number>();
/** Beat name → the status an anonymous read of Alex's WebID profile got after it. */
const profileStatus = new Map<string, number>();

beforeAll(async () => {
  const calendar = createDemoCalendar(DAY_ONE);
  const keys = memoryKeyStore();
  const identities: Record<string, PodOwner> = {};
  for (const record of Object.values(ORGS)) identities[record.slug] = record.actsAs;
  const state = { day: 1 };
  const host = createNodePodHost({
    clock: () => calendar.time(state.day, "12:00"),
    identities,
    origin: ORIGIN,
    owners: podOwners(ORGS),
    seed: mortgageSeed({ dayOne: DAY_ONE, keys }),
  });
  await host.ready;
  host.subscribe((message) => {
    if (message.type === "event") log.push(message.entry);
  });
  const keyFor = keyRing(ORIGIN, keys);
  for (const beat of JOURNEY) {
    state.day = beat.day;
    const app = TOUR.find((step) => step.id === beat.step)?.app;
    // The welcome page is not an organisation's app; what it does, it does as Alex.
    const actsAs: PodOwner = app !== undefined && isOrgSlug(app) ? ORGS[app].actsAs : "alex";
    await beat.run({
      calendar,
      day: beat.day,
      fetchAs: (owner) => host.fetchAs(owner, { viaAgent: owner !== actsAs }),
      keyFor,
      note: (note) => {
        void host.note(note);
      },
      podOrigin: ORIGIN,
    });
    ends.set(beat.name, log.length);
    // Can anyone read Alex's WebID profile now? The runtime logs no anonymous request, so the
    // probe stays out of the journey's log.
    const anonymous = await host.fetchAs(null)(`${ORIGIN}/pods/alex/profile/card`, {
      headers: { accept: "text/turtle" },
    });
    profileStatus.set(beat.name, anonymous.status);
  }
}, 600_000);

const lens = (entries: readonly LensEntry[] = log): LensModel => {
  const model = new LensModel({ registry: ORGS, holder: MORTGAGE_HOLDER, ...mortgageLens() });
  for (const entry of entries) model.push(entry, { replayed: true });
  return model;
};

const states = (model: LensModel): Record<string, GrantState> =>
  Object.fromEntries(model.grants().map((grant) => [grant.org, grant.state]));

/**
 * How each organisation's grant changes over the journey (design.md section b.4): the beat after
 * which it is in that state. G4 makes Juniper (the lender), Castellan (onward: three credentials)
 * and Quillon (onward: the credit-report authorisation) grantees; Quillon's G3 ends after 7 days
 * but its G4 permission keeps it a grantee until Alex withdraws G4.
 */
const CHANGES: ReadonlyArray<readonly [beat: string, org: string, state: GrantState]> = [
  ["share-employment", "payroll", "active"],
  ["share-assets", "bank", "active"],
  ["share-credit-summary", "bureau", "active"],
  ["approve-application-access", "lender", "active"],
  ["approve-application-access", "aus", "active"],
  ["order-services", "appraisal", "active"],
  ["order-services", "title", "active"],
  // G2 ends 7 days after approval; G5 when the report is delivered.
  ["submit-appraisal", "bank", "expired"],
  ["submit-appraisal", "appraisal", "expired"],
  ["bind-insurance", "insurer", "active"],
  // G1 ends at closing; G6 when the owner's policy is issued.
  ["sign-at-closing", "payroll", "expired"],
  ["deliver-loan", "title", "expired"],
  ["connect-servicer", "servicer", "active"],
  // Alex withdraws G4: Juniper and both onward recipients lose what they had.
  ["revoke-juniper", "lender", "revoked"],
  ["revoke-juniper", "aus", "revoked"],
  ["revoke-juniper", "bureau", "revoked"],
];

describe("the Lens over the mortgage journey's log", () => {
  test("every beat ran and the log is the runtime's", () => {
    expect([...ends.keys()]).toEqual(JOURNEY.map((beat) => beat.name));
    expect(log.length).toBeGreaterThan(100);
  });

  test("each grant has the right state after every beat", () => {
    const expected: Record<string, GrantState> = {};
    const model = lens([]);
    let seen = 0;
    for (const beat of JOURNEY) {
      const end = ends.get(beat.name) as number;
      for (; seen < end; seen++) model.push(log[seen] as LensEntry, { replayed: true });
      for (const [at, org, state] of CHANGES) if (at === beat.name) expected[org] = state;
      expect(states(model), `after ${beat.name}`).toEqual(expected);
    }
  });

  test("expiries are applied by Alex's wallet, the withdrawal is Alex's own", () => {
    const model = lens();
    for (const grant of model.grants()) {
      if (grant.state === "active") continue;
      const ended = model.received[(grant.endedSeq as number) - 1]?.entry;
      expect(ended?.source === "pod" && ended.pod, grant.org).toBe("alex");
      expect(ended?.source === "pod" && ended.actor.viaAgent, grant.org).toBe(
        grant.state === "expired",
      );
    }
  });

  test("the ledger tile: nine grants, two active, four expired, three withdrawn", () => {
    const { grants } = computeTotals(lens());
    expect(grants).toEqual({ active: 2, expired: 4, revoked: 3 });
    // The video says "Nine grants." over this tile (video/mortgage/claims.json, grants.total).
    expect(grants.active + grants.expired + grants.revoked).toBe(9);
  });

  test("eleven organisations: the registry's twelve less Cairn, the wallet that acts as Alex", () => {
    const model = lens();
    const registry = DEMO_APPS.mortgage.map((slug) => ORGS[slug]);
    const organisations = new Set(registry.map((record) => record.organisation));
    // "Twelve organisations take part" (the narration) counts the registry.
    expect(organisations.size).toBe(12);
    const holderApps = new Set(
      registry.filter((r) => r.actsAs === "alex").map((r) => r.organisation),
    );
    expect([...holderApps]).toEqual(["Cairn"]);
    expect(computeTotals(model).organisations).toBe(11);
    expect(new Set(model.orgs().map((org) => org.name))).toEqual(
      new Set([...organisations].filter((name) => !holderApps.has(name))),
    );
  });

  test("organisations sharing their own files are said as such, never as Alex's grants", () => {
    const model = lens();
    const shares = model.received.filter(
      (rec) =>
        rec.entry.source === "pod" && rec.entry.acl !== undefined && rec.entry.pod !== "alex",
    );
    // Juniper shares orders and the loan file; Quillon, Castellan, Plumbline and Sextant share
    // what they return to Juniper.
    expect(new Set(shares.map((rec) => rec.entry.source === "pod" && rec.entry.pod))).toEqual(
      new Set(["lender", "bureau", "aus", "appraisal", "title"]),
    );
    for (const rec of shares) {
      const sentence = sentenceOf(model, rec);
      expect(sentence.text).toMatch(/ shared .+ with /);
      expect(sentence.meta).toContain("in its own pod, between organisations");
      expect(sentence.meta).toContain("not one of Alex's grants");
    }
    const application = shares.find(
      (rec) => rec.entry.source === "pod" && rec.entry.path === "/loans/JHL-1001/application.acl",
    );
    expect(application && sentenceOf(model, application).text).toMatch(
      /^Juniper shared .+ with Castellan$/,
    );
  });

  test("the cabinet holds only Alex's drawers", () => {
    const configured = new Set(MORTGAGE_DRAWERS.map((drawer) => drawer.path));
    const drawers = lens()
      .drawers()
      .map((drawer) => drawer.path);
    expect(drawers.filter((path) => !configured.has(path))).toEqual([]);
  });

  test("no grant opens Alex's profile card to anyone, G6 included", () => {
    // The seed takes the runtime's public read off Alex's card (content/mortgage/seed.ts): it is
    // read only under a grant. G6 (order-services) writes profile/card.acl; whatever the wallet
    // keeps there, an anonymous read stays refused at every beat.
    expect(Object.fromEntries(profileStatus)).toEqual(
      Object.fromEntries(JOURNEY.map((beat) => [beat.name, 401])),
    );
  });

  test("step 23's refusal says Juniper's grant was withdrawn", () => {
    const model = lens();
    const refused = model.received.filter(
      (rec) => rec.entry.source === "pod" && rec.entry.kind === "denied",
    );
    expect(refused).toHaveLength(1);
    expect(refusalReason(model, refused[0] as (typeof refused)[number])).toBe("grant withdrawn");
  });
});
