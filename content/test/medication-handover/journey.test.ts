// AUTHORED-BY Claude Opus 5.5
/**
 * The medication handover, headless, against the real pod runtime host and wasm: the ten steps'
 * pod effects in order, every grant and refusal enforced by the pod server, the pharmacy's back
 * office woken by the runtime's own agent runner, and the step-10 totals computed from the log.
 * Nothing is mocked. Every clinical detail is fictional.
 */

import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { completesStep, matchesExpectation } from "../../../packages/tour/src/match.js";
import { DAY, HOLDER, NOT_CLINICAL } from "../../medication-handover/facts.js";
import {
  medGrants,
  PATHS,
  pendingRequests,
  rosaUrl,
  withdrawMedGrant,
} from "../../medication-handover/grants.js";
import {
  allergyUrl,
  approveSharing,
  changePharmacy,
  dispense,
  dispenseUrl,
  encounterUrl,
  historyOf,
  openConsultation,
  openDischarge,
  openHealth,
  openQueue,
  openSharedWithMe,
  pharmacyReadsList,
  pharmacyRecordUrl,
  readMedicationList,
  readPharmacyRecords,
  readProvenance,
  refreshQueue,
  signDischarge,
  statementUrl,
  stopDuplicate,
  summaryUrl,
} from "../../medication-handover/journey.js";
import { medicationTotals } from "../../medication-handover/ledger.js";
import { isPrepared, prepareMedicationHandover } from "../../medication-handover/prepare.js";
import { TOUR } from "../../medication-handover/tour.js";
import { podUrl, statusOf } from "../../mortgage/world.js";
import { failingAcl } from "../failing-acl.js";
import { createHarness, type Harness } from "./harness.js";

let h: Harness;
/** The log entries each tour step produced: [first, end). */
const slices = new Map<string, [number, number]>();

const podEntries = (from = 0) =>
  h.log.slice(from).filter((e): e is Extract<LensEntry, { source: "pod" }> => e.source === "pod");

/** Run `probe`, then drop what it logged: test-only reads stay out of the journey's totals. */
async function probe<T>(fn: () => Promise<T>): Promise<T> {
  const before = h.log.length;
  try {
    return await fn();
  } finally {
    h.log.splice(before);
  }
}

beforeAll(async () => {
  h = await createHarness();
}, 180_000);

afterAll(() => h?.stop());

describe("medication handover, step by step", () => {
  test("0. the start state: Rosa's own list, her allergy, M1 and two requests (idempotent)", async () => {
    const before = h.log.length;
    expect(await prepareMedicationHandover(h.world(DAY.discharge))).toBe(true);
    expect(await isPrepared(h.world())).toBe(true);
    const writes = podEntries().filter((e) => e.kind === "write").length;
    expect(await prepareMedicationHandover(h.world(DAY.discharge))).toBe(false);
    expect(podEntries().filter((e) => e.kind === "write").length).toBe(writes);
    const grants = await medGrants(h.world());
    expect(grants.map((g) => [g.code, g.state])).toEqual([["M1", "active"]]);
    expect((await pendingRequests(h.world())).map((r) => r.grantCode)).toEqual(["M2", "M3"]);
    expect((await readPharmacyRecords(h.world())).map((r) => r.medicine.product)).toHaveLength(4);
    // Before any M2/M3/M4 grant the pod refuses the pharmacy, the practice and Alex; the
    // hospital may read under M1.
    await probe(async () => {
      for (const owner of ["pharmacy", "clinic", "alex"] as const) {
        expect(await statusOf(h.host.fetchAs(owner), statementUrl(h.world(), "lisinopril"))).toBe(
          403,
        );
      }
      expect(await statusOf(h.host.fetchAs(null), statementUrl(h.world(), "lisinopril"))).toBe(401);
      expect(await statusOf(h.host.fetchAs("hospital"), allergyUrl(h.world()))).toBe(200);
    });
    // The start state is not part of the journey's log.
    h.log.splice(before);
  }, 180_000);

  test("1. Rosa opens Health: four medicines and one allergy, read from her pod", async () => {
    const start = h.log.length;
    const view = await openHealth(h.world());
    expect(view.statements.map((s) => s.medicine.ingredient)).toEqual([
      "ibuprofen",
      "lisinopril",
      "metformin",
      "simvastatin",
    ]);
    expect(view.statements.every((s) => s.isActive)).toBe(true);
    expect(view.allergies.map((a) => a.substance.ingredient)).toEqual(["amoxicillin"]);
    slices.set("health", [start, h.log.length]);
  });

  test("2. the ward signs three changes, each with a provenance record, and the summary", async () => {
    const start = h.log.length;
    const view = await openDischarge(h.world());
    expect(view.statements).toHaveLength(4);
    const written = await signDischarge(h.world());
    expect(written.at(-1)).toBe(summaryUrl(h.world()));
    const list = await probe(() => readMedicationList(h.world(), "rosa"));
    const byKey = Object.fromEntries(list.map((s) => [s.medicine.ingredient, s]));
    expect(byKey.ibuprofen?.adherence).toBe("stopped-as-directed");
    expect(byKey.ibuprofen?.stopReason).toMatch(/Kidney function fell/);
    expect(byKey.lisinopril?.medicine.product).toBe("Lisinopril 20 mg tablet");
    expect(byKey.atorvastatin?.isActive).toBe(true);
    expect(byKey.simvastatin?.isActive).toBe(true);
    const provenance = await probe(() => readProvenance(h.world(), "rosa"));
    expect(provenance).toHaveLength(3);
    for (const record of provenance) {
      expect(record.author).toBe("Imani Brooks, ward pharmacist");
      expect(record.onBehalfOf.display).toBe("Riverbend General Hospital");
      expect(record.why.length).toBeGreaterThan(10);
    }
    expect(
      historyOf({ value: statementUrl(h.world(), "atorvastatin") }, provenance)[0]?.activity,
    ).toBe("CREATE");
    slices.set("discharge", [start, h.log.length]);
  });

  test("3. Rosa approves M2, M3 and M4; the wallet ends M1; three different scopes", async () => {
    const start = h.log.length;
    const approval = await approveSharing(h.world());
    await h.runner.idle();
    expect(h.errors).toEqual([]);
    expect(approval.expired).toEqual(["M1"]);
    expect(approval.given).toEqual(["M2", "M3", "M4"]);
    expect(approval.acls.at(-1)).toBe(`${rosaUrl(h.world(), PATHS.dispenses)}.acl`);
    const states = (await probe(() => medGrants(h.world()))).map((g) => [g.code, g.state]);
    expect(states).toEqual([
      ["M1", "expired"],
      ["M2", "active"],
      ["M3", "active"],
      ["M4", "active"],
    ]);
    const w = h.world();
    await probe(async () => {
      // M2: medicines and allergies, not the discharge summary.
      expect(await statusOf(h.host.fetchAs("pharmacy"), statementUrl(w, "lisinopril"))).toBe(200);
      expect(await statusOf(h.host.fetchAs("pharmacy"), allergyUrl(w))).toBe(200);
      expect(await statusOf(h.host.fetchAs("pharmacy"), summaryUrl(w))).toBe(403);
      // M3: the whole record.
      expect(await statusOf(h.host.fetchAs("clinic"), summaryUrl(w))).toBe(200);
      // M4: medicines only, read-only.
      expect(await statusOf(h.host.fetchAs("alex"), statementUrl(w, "lisinopril"))).toBe(200);
      expect(await statusOf(h.host.fetchAs("alex"), allergyUrl(w))).toBe(403);
      const write = await h.host.fetchAs("alex")(statementUrl(w, "lisinopril"), {
        body: "",
        headers: { "content-type": "text/turtle" },
        method: "PUT",
      });
      expect(write.status).toBe(403);
      // M1 has ended: the hospital no longer reads the list.
      expect(await statusOf(h.host.fetchAs("hospital"), statementUrl(w, "lisinopril"))).toBe(403);
    });
    slices.set("grants", [start, h.log.length]);
  });

  test("4. the pharmacy sees the change against its last supply, and dispenses", async () => {
    const start = h.log.length;
    const view = await openQueue(h.world());
    const status = Object.fromEntries(view.lines.map((line) => [line.key, line.status]));
    expect(status).toEqual({
      atorvastatin: "new",
      ibuprofen: "stopped",
      lisinopril: "changed",
      metformin: "unchanged",
      simvastatin: "unchanged",
    });
    const lisinopril = view.lines.find((line) => line.key === "lisinopril");
    expect(lisinopril?.lastSupplied?.product).toBe("Lisinopril 10 mg tablet");
    expect(lisinopril?.why?.author).toBe("Imani Brooks, ward pharmacist");
    expect(view.allergies[0]?.substance.ingredient).toBe("amoxicillin");
    const written = await dispense(h.world());
    expect(written).toEqual([
      dispenseUrl(h.world(), "lisinopril", DAY.discharge),
      dispenseUrl(h.world(), "atorvastatin", DAY.discharge),
      pharmacyRecordUrl(h.world(), "lisinopril", DAY.discharge),
      pharmacyRecordUrl(h.world(), "atorvastatin", DAY.discharge),
    ]);
    slices.set("dispense", [start, h.log.length]);
  });

  test("5. the pharmacy read medicines and allergies, never the discharge summary", () => {
    const start = h.log.length;
    const pharmacyPaths = podEntries()
      .filter((e) => e.pod === "rosa" && e.actor.org === "pharmacy" && e.kind === "read")
      .map((e) => e.path);
    expect(pharmacyPaths.some((path) => path.startsWith("/medications/"))).toBe(true);
    expect(pharmacyPaths.some((path) => path.startsWith("/allergies/"))).toBe(true);
    expect(pharmacyPaths.some((path) => path.startsWith("/discharge/"))).toBe(false);
    slices.set("not-shared", [start, h.log.length]);
  });

  test("6. a week later the practice stops the duplicate statin and keeps a pointer", async () => {
    h.day = DAY.consultation;
    const start = h.log.length;
    const view = await openConsultation(h.world());
    expect(view.summary.title).toBe("Discharge summary");
    expect(view.summary.notes).toContain(NOT_CLINICAL);
    expect(view.provenance).toHaveLength(3);
    const written = await stopDuplicate(h.world());
    expect(written.at(-1)).toBe(encounterUrl(h.world()));
    const list = await probe(() => readMedicationList(h.world(), "rosa"));
    const simvastatin = list.find((s) => s.medicine.ingredient === "simvastatin");
    expect(simvastatin?.adherence).toBe("stopped-as-directed");
    const history = await probe(() => readProvenance(h.world(), "rosa"));
    const last = historyOf({ value: statementUrl(h.world(), "simvastatin") }, history).at(-1);
    expect(last?.author).toBe("Dr Lena Marsh, family physician");
    expect(last?.onBehalfOf.display).toBe("Larch Lane Family Practice");
    // The practice's own record points at Rosa; it holds no copy of her list.
    const encounter = await probe(() =>
      h.host.fetchAs("clinic")(encounterUrl(h.world()), { headers: { accept: "text/turtle" } }),
    );
    const body = await encounter.text();
    expect(body).toContain(podUrl(h.world(), "rosa", "profile/card#me"));
    expect(body).not.toContain("Simvastatin");
    slices.set("consultation", [start, h.log.length]);
  });

  test("7. the pharmacy sees the practice's change on its next read", async () => {
    const start = h.log.length;
    const lines = await refreshQueue(h.world());
    const simvastatin = lines.find((line) => line.key === "simvastatin");
    expect(simvastatin?.status).toBe("stopped");
    expect(simvastatin?.why?.author).toBe("Dr Lena Marsh, family physician");
    expect(podEntries(start).at(-1)?.path).toBe("/medications/simvastatin");
    slices.set("pharmacy-refresh", [start, h.log.length]);
  });

  test("8. Alex sees the current list in his own wallet, from the notice in his inbox", async () => {
    const start = h.log.length;
    const view = await openSharedWithMe(h.world());
    expect(view.sharedBy).toEqual([podUrl(h.world(), "rosa", "profile/card#me")]);
    const active = view.statements.filter((s) => s.isActive).map((s) => s.medicine.ingredient);
    expect(active).toEqual(["atorvastatin", "lisinopril", "metformin"]);
    slices.set("carer", [start, h.log.length]);
  });

  test("a withdrawal whose ACL write fails leaves M2 active, to be withdrawn again", async () => {
    h.day = DAY.changePharmacy;
    const failing = failingAcl(h.world(), HOLDER, "PUT");
    await probe(() =>
      expect(withdrawMedGrant(failing.world, "M2", "10:15")).rejects.toThrow(/503/),
    );
    expect(failing.failed()).toBe(1);
    const m2 = (await probe(() => medGrants(h.world()))).find((g) => g.code === "M2");
    expect(m2?.state).toBe("active");
  }, 60_000);

  test("9. Rosa withdraws M2; the pharmacy's next read is refused (403), its records stay", async () => {
    h.day = DAY.changePharmacy;
    const start = h.log.length;
    const { acls } = await changePharmacy(h.world());
    expect(acls).toContain(`${rosaUrl(h.world(), PATHS.medications)}.acl`);
    await h.runner.idle();
    expect(h.errors).toEqual([]);
    const denied = podEntries(start).filter((e) => e.kind === "denied");
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({
      actor: { org: "pharmacy" },
      path: "/medications/",
      status: 403,
    });
    expect(podEntries(start).at(-1)?.kind).toBe("denied");
    slices.set("revoke", [start, h.log.length]);
    await probe(async () => {
      expect(await pharmacyReadsList(h.world())).toBe(403);
      // The pharmacy still reads its own dispensing records, in its own pod.
      expect(await readPharmacyRecords(h.world())).toHaveLength(6);
      // The practice and Alex keep their grants.
      expect(await statusOf(h.host.fetchAs("clinic"), statementUrl(h.world(), "lisinopril"))).toBe(
        200,
      );
      expect(await statusOf(h.host.fetchAs("alex"), statementUrl(h.world(), "lisinopril"))).toBe(
        200,
      );
    });
  }, 60_000);

  test("10. the totals come from the log: one list, three writers, every change attributed", () => {
    const start = h.log.length;
    const totals = medicationTotals(h.log);
    expect(totals).toMatchObject({
      attributed: 4,
      changes: 4,
      denied: 1,
      lists: 1,
      readers: 4,
      writers: 3,
    });
    expect(Object.keys(totals.writesBy).sort()).toEqual(["clinic", "hospital", "pharmacy"]);
    expect(Object.keys(totals.readsBy).sort()).toEqual(["alex", "clinic", "hospital", "pharmacy"]);
    slices.set("ledger", [start, h.log.length]);
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
        // The completing request is the step's last, so moving on aborts nothing in flight.
        const lastPod = own.filter((entry) => entry.source === "pod").at(-1);
        expect(lastPod && completesStep(step, lastPod), `${step.id} completes last`).toBe(true);
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
