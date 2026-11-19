// AUTHORED-BY Claude Opus 5.5
/**
 * The moving-house journey, headless, against the real pod runtime host and wasm: the ten steps'
 * pod effects in order, the six holders' back offices woken by the runtime's own agent runner and
 * change notification, the licence re-issued and the old one revoked at source, the bank refused
 * after the revoke, and the step-10 totals computed from the log. Nothing is mocked.
 */

import { verifyCredential } from "@mortgage/vc-kit";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { completesStep, matchesExpectation } from "../../../packages/tour/src/match.js";
import { podUrl, readText, statusOf } from "../../mortgage/world.js";
import { AddressRecord } from "../../moving-house/address.js";
import { DAY, NEW_ADDRESS, NEW_ADDRESS_AS_SAVED, OLD_ADDRESS } from "../../moving-house/facts.js";
import { addressUrl, HOLDERS, holderGrants } from "../../moving-house/grants.js";
import { COPY_PATHS, readCopy } from "../../moving-house/holders.js";
import { issuedVersions, licenceUrl } from "../../moving-house/issuer.js";
import {
  approveWhoShouldKnow,
  correctUnit,
  holderLooks,
  openAddress,
  revokeBank,
  saveNewAddress,
  stateLooks,
  stateUpdatesLicence,
} from "../../moving-house/journey.js";
import { movingHouseTotals } from "../../moving-house/ledger.js";
import { TOUR } from "../../moving-house/tour.js";
import { createHarness, type Harness } from "./harness.js";

let h: Harness;
/** The licence body as Alex held it before the move. */
let licenceV1 = "";
let licenceV2 = "";
/** The log entries each tour step produced: [first, end). */
const slices = new Map<string, [number, number]>();

const addressReadsBy = (org: string) =>
  h.log.filter(
    (e) =>
      e.source === "pod" &&
      e.pod === "alex" &&
      e.path === "/profile/address" &&
      e.method === "GET" &&
      e.status === 200 &&
      e.actor.org === org,
  );

beforeAll(async () => {
  h = await createHarness();
}, 180_000);

afterAll(() => h?.stop());

describe("moving house, step by step", () => {
  test("1. the address record and its data product description exist once prepared", async () => {
    const start = h.log.length;
    const view = await openAddress(h.world());
    expect(view.record.address).toEqual(OLD_ADDRESS);
    expect(view.product.endpoint).toBe(addressUrl(h.world()));
    expect(view.product.owner).toBe(`${podUrl(h.world(), "alex", "profile/card")}#me`);
    expect([...view.product.policies]).toEqual([]);
    expect(await issuedVersions(h.world())).toEqual([1]);
    licenceV1 = await readText(h.host.fetchAs("alex"), licenceUrl(h.world()));
    // Opening again changes nothing.
    const writes = h.log.filter((e) => e.source === "pod" && e.kind === "write").length;
    await openAddress(h.world());
    expect(h.log.filter((e) => e.source === "pod" && e.kind === "write").length).toBe(writes);
    for (const id of ["address"]) slices.set(id, [start, h.log.length]);
  }, 120_000);

  test("before any grant, no organisation can read the address (the pod refuses)", async () => {
    const before = h.log.length;
    for (const holder of HOLDERS) {
      expect(await statusOf(h.host.fetchAs(holder), addressUrl(h.world()))).toBe(403);
    }
    expect(await statusOf(h.host.fetchAs(null), addressUrl(h.world()))).toBe(401);
    // These probes are the test's, not the journey's: keep them out of the totals.
    h.log.splice(before);
  });

  test("2. one write, with the recorded deed as evidence", async () => {
    const start = h.log.length;
    await saveNewAddress(h.world());
    const view = await openAddress(h.world());
    expect(view.record.address).toEqual(NEW_ADDRESS_AS_SAVED);
    expect(view.record.validFrom).toBe(h.calendar.date(DAY.moved));
    expect([...view.record.derivedFrom]).toEqual([
      podUrl(h.world(), "alex", "mortgage/closing/recording-receipt"),
    ]);
    for (const id of ["change"]) slices.set(id, [start, h.log.length]);
  });

  test("3. six standing grants; bank, payroll and servicer read at once and keep a copy", async () => {
    const start = h.log.length;
    const codes = await approveWhoShouldKnow(h.world());
    expect(codes).toEqual(["H1", "H2", "H3", "H4", "H5", "H6"]);
    await h.runner.idle();
    expect(h.errors).toEqual([]);
    const grants = await holderGrants(h.world());
    expect(grants.map((g) => [g.code, g.state])).toEqual(
      ["H1", "H2", "H3", "H4", "H5", "H6"].map((code) => [code, "active"]),
    );
    expect(
      h.host
        .subscriptions()
        .map((s) => s.app)
        .sort(),
    ).toEqual([...HOLDERS].sort());
    for (const holder of ["bank", "payroll", "servicer"] as const) {
      const copy = await readCopy(h.world(), holder);
      expect(copy?.address).toEqual(NEW_ADDRESS_AS_SAVED);
      expect([...(copy?.derivedFrom ?? [])]).toEqual([addressUrl(h.world())]);
      const code = { bank: "h3", payroll: "h5", servicer: "h6" }[holder];
      expect(copy?.policy).toBe(podUrl(h.world(), "alex", `policies/${code}`));
    }
    for (const holder of ["state", "county", "insurer"] as const) {
      expect(await readCopy(h.world(), holder)).toBeUndefined();
    }
    const view = await openAddress(h.world());
    expect(view.product.policies.size).toBe(6);
    // The grant is scoped: the address, not the rest of the profile.
    const before = h.log.length;
    expect(
      await statusOf(h.host.fetchAs("county"), podUrl(h.world(), "alex", "profile/contact")),
    ).toBe(403);
    h.log.splice(before);
    for (const id of ["who"]) slices.set(id, [start, h.log.length]);
  });

  test("4. Driver Services reads the address and its evidence, then re-issues the licence", async () => {
    const start = h.log.length;
    const copy = await stateLooks(h.world());
    expect(copy?.address).toEqual(NEW_ADDRESS_AS_SAVED);
    const receiptReads = h.log.filter(
      (e) =>
        e.source === "pod" &&
        e.actor.org === "state" &&
        e.path === "/mortgage/closing/recording-receipt" &&
        e.status === 200,
    );
    expect(receiptReads).toHaveLength(1);
    // A second visit reads nothing again.
    await stateLooks(h.world());
    expect(addressReadsBy("state")).toHaveLength(1);

    expect(await stateUpdatesLicence(h.world())).toBe(2);
    expect(await stateUpdatesLicence(h.world())).toBeUndefined();
    licenceV2 = await readText(h.host.fetchAs("alex"), licenceUrl(h.world()));
    const now = h.calendar.clock(DAY.moved, "12:00");
    const options = {
      expectShape: "identity-credential" as const,
      now,
      statusFetch: h.host.fetchAs("lender"),
      trustedIssuers: [`${podUrl(h.world(), "state", "profile/card")}#me`],
      webIdFetch: h.host.fetchAs("lender"),
    };
    const fresh = await verifyCredential(licenceV2, options);
    expect(fresh.verified).toBe(true);
    expect(licenceV2).toContain("14 Larch Lane");
    const old = await verifyCredential(licenceV1, options);
    expect(old.verified).toBe(false);
    for (const id of ["driver-services"]) slices.set(id, [start, h.log.length]);
  }, 60_000);

  test("5 and 6. the county and the insurer read it when their pages open", async () => {
    const start = h.log.length;
    expect((await holderLooks(h.world(), "county"))?.address).toEqual(NEW_ADDRESS_AS_SAVED);
    expect((await holderLooks(h.world(), "insurer"))?.address).toEqual(NEW_ADDRESS_AS_SAVED);
    await holderLooks(h.world(), "county");
    expect(addressReadsBy("county")).toHaveLength(1);
    for (const id of ["treasurer", "insurer"]) slices.set(id, [start, h.log.length]);
  });

  test("7. six readers of one record", () => {
    const start = h.log.length;
    const totals = movingHouseTotals(h.log);
    expect(totals.organisations).toBe(6);
    expect(totals.reads).toBe(6);
    expect(totals.records).toBe(1);
    for (const id of ["readers"]) slices.set(id, [start, h.log.length]);
  });

  test("8. withdrawing Alder Bank's grant removes its rule", async () => {
    const start = h.log.length;
    const acls = await revokeBank(h.world());
    expect(acls).toEqual([`${addressUrl(h.world())}.acl`]);
    const bank = (await holderGrants(h.world())).find((g) => g.code === "H3");
    expect(bank?.state).toBe("revoked");
    const before = h.log.length;
    expect(await statusOf(h.host.fetchAs("bank"), addressUrl(h.world()))).toBe(403);
    expect(await statusOf(h.host.fetchAs("payroll"), addressUrl(h.world()))).toBe(200);
    h.log.splice(before);
    for (const id of ["revoke-bank"]) slices.set(id, [start, h.log.length]);
  });

  test("9. the correction: five read it, the bank is refused and marks its copy stale", async () => {
    const start = h.log.length;
    h.day = DAY.correction;
    await correctUnit(h.world());
    await h.runner.idle();
    expect(h.errors).toEqual([]);
    for (const holder of ["state", "county", "insurer", "payroll", "servicer"] as const) {
      const copy = await readCopy(h.world(), holder);
      expect(copy?.address).toEqual(NEW_ADDRESS);
      expect(copy?.invalidatedAt).toBeUndefined();
    }
    const bank = await readCopy(h.world(), "bank");
    expect(bank?.address).toEqual(NEW_ADDRESS_AS_SAVED);
    expect(bank?.invalidatedAt?.toISOString()).toBe(h.calendar.time(DAY.correction, "11:05"));
    const denied = h.log.filter((e) => e.source === "pod" && e.kind === "denied");
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({
      actor: { org: "bank" },
      path: "/profile/address",
      status: 403,
    });
    const notified = h.log.filter((e) => e.source === "app" && e.kind === "notified");
    expect(notified.map((n) => n.org).sort()).toEqual([...HOLDERS].sort());
    // The state re-issued the licence for the corrected address (v3) and revoked v2.
    expect(await issuedVersions(h.world())).toEqual([1, 2, 3]);
    const options = {
      expectShape: "identity-credential" as const,
      now: h.calendar.clock(DAY.correction, "12:00"),
      statusFetch: h.host.fetchAs("lender"),
      trustedIssuers: [`${podUrl(h.world(), "state", "profile/card")}#me`],
      webIdFetch: h.host.fetchAs("lender"),
    };
    expect((await verifyCredential(licenceV2, options)).verified).toBe(false);
    const v3 = await readText(h.host.fetchAs("alex"), licenceUrl(h.world()));
    expect((await verifyCredential(v3, options)).verified).toBe(true);
    expect(v3).not.toContain("Apt 3");
    for (const id of ["correction"]) slices.set(id, [start, h.log.length]);
  }, 60_000);

  test("10. the totals come from the log: one record, six organisations, eleven reads", () => {
    const start = h.log.length;
    const totals = movingHouseTotals(h.log);
    expect(totals).toMatchObject({ denied: 1, organisations: 6, reads: 11, records: 1 });
    expect(totals.readers).toEqual({
      bank: 1,
      county: 2,
      insurer: 2,
      payroll: 2,
      servicer: 2,
      state: 2,
    });
    for (const id of ["ledger"]) slices.set(id, [start, h.log.length]);
  });

  test("every organisation's copy is a shape-valid address record in its own pod", async () => {
    for (const holder of HOLDERS) {
      const copy = await readCopy(h.world(), holder);
      expect(copy).toBeInstanceOf(AddressRecord);
      expect(copy?.value).toBe(podUrl(h.world(), holder, COPY_PATHS[holder]));
    }
  });

  test("the tour's done and expect patterns match what each step really produced", () => {
    for (const step of TOUR) {
      const slice = slices.get(step.id);
      expect(slice, step.id).toBeDefined();
      const [first, end] = slice as [number, number];
      const own = h.log.slice(first, end);
      const sofar = h.log.slice(0, end);
      if (step.done.event !== undefined) {
        expect(
          own.some((entry) => completesStep(step, entry)),
          `${step.id} completes`,
        ).toBe(true);
      }
      for (const pattern of step.expect) {
        expect(
          sofar.some((entry) => matchesExpectation(entry, pattern)),
          `${step.id} expects ${JSON.stringify(pattern)}`,
        ).toBe(true);
      }
    }
  });
});
