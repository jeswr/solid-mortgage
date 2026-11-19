// AUTHORED-BY Claude Opus 5.5
/**
 * The motor claim, headless, against the real pod runtime host and wasm: the ten steps' pod
 * effects in order, Anvil's back office and Alex's wallet woken by the runtime's own agent runner,
 * both credentials checked at source, every slice of the claim file decided by the pod (the
 * repairer refused what C2 does not name), C2 expired by its end event, the refused read after
 * the job, C1 withdrawn while P1 stays, and the step-10 totals computed from the log, by this
 * demo's ledger and by the Lens's own model. Nothing is mocked.
 */

import { type AccessAgreement, CLAIM_SCHEMA, CredentialPointer } from "@mortgage/data-model";
import { verifyCredential } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { computeTotals } from "../../../packages/lens/src/ledger.js";
import { LensModel } from "../../../packages/lens/src/model.js";
import { completesStep, matchesExpectation } from "../../../packages/tour/src/match.js";
import { readAcl } from "../../mortgage/grants.js";
import { podUrl, readDataset, readText, statusOf } from "../../mortgage/world.js";
import { photoUrls, readClaimFile } from "../../motor-claim/claim.js";
import { DAY, ESTIMATE, MOTOR_POLICY, ORG_PATHS, PATHS } from "../../motor-claim/facts.js";
import { motorGrant, motorGrants, motorPolicyUrl } from "../../motor-claim/grants.js";
import {
  approveEstimate,
  approveRepairer,
  checkClaim,
  claimRequests,
  closeClaim,
  completeJob,
  openNewClaim,
  openPhotosAgain,
  readInsurerCase,
  readJob,
  reportClaim,
  sendEstimate,
  startClaimFile,
} from "../../motor-claim/journey.js";
import { motorClaimTotals } from "../../motor-claim/ledger.js";
import { MOTOR_CLAIM_HOLDER, motorClaimLens } from "../../motor-claim/mount.js";
import { TOUR } from "../../motor-claim/tour.js";
import { ORGS } from "../../orgs.js";
import { createHarness, type Harness } from "./harness.js";

let h: Harness;
/** The log entries each tour step produced: [first, end). */
const slices = new Map<string, [number, number]>();

const alex = (path: string) => podUrl(h.world(), "alex", path);
const webidOf = (owner: "insurer" | "repairer") => `${podUrl(h.world(), owner, "profile/card")}#me`;

/** A status the test probes for, kept out of the journey's log (and so out of the totals). */
async function probe(owner: "insurer" | "repairer" | "state", path: string): Promise<number> {
  const before = h.log.length;
  const status = await statusOf(h.host.fetchAs(owner), alex(path));
  h.log.splice(before);
  return status;
}

async function probePhoto(owner: "insurer" | "repairer"): Promise<number> {
  const before = h.log.length;
  const response = await h.host.fetchAs(owner)(photoUrls(h.world())[0] as string, {
    headers: { accept: "image/svg+xml" },
  });
  h.log.splice(before);
  return response.status;
}

const step = async (ids: string[], run: () => Promise<void>) => {
  const start = h.log.length;
  await run();
  await h.runner.idle();
  expect(h.errors).toEqual([]);
  for (const id of ids) slices.set(id, [start, h.log.length]);
};

beforeAll(async () => {
  h = await createHarness();
}, 180_000);

afterAll(() => h?.stop());

describe("motor claim, step by step", () => {
  test("the starting point: licence, motor policy credential and the standing grant P1", async () => {
    const before = h.log.length;
    const view = await openNewClaim(h.world());
    expect(view.members).toEqual([]);
    const policy = await readText(h.host.fetchAs("alex"), alex(PATHS.policy));
    const outcome = await verifyCredential(policy, {
      expectShape: "motor-policy-credential",
      now: h.calendar.clock(DAY.incident, "12:00"),
      statusFetch: h.host.fetchAs("lender"),
      trustedIssuers: [webidOf("insurer")],
      webIdFetch: h.host.fetchAs("lender"),
    });
    expect(outcome.errors).toEqual([]);
    expect(policy).toContain(MOTOR_POLICY.policyNumber);
    expect((await motorGrant(h.world(), "P1"))?.state).toBe("active");
    // Preparing again writes nothing.
    const writes = h.log.filter((e) => e.source === "pod" && e.kind === "write").length;
    await openNewClaim(h.world());
    expect(h.log.filter((e) => e.source === "pod" && e.kind === "write").length).toBe(writes);
    // P1 is the policy only: Wrenfield reads it, and nothing else of Alex's.
    expect(await probe("insurer", PATHS.policy)).toBe(200);
    expect(await probe("insurer", PATHS.licence)).toBe(403);
    // The set-up is not part of the journey's totals.
    h.log.splice(before);
  }, 120_000);

  test("1. the claim file starts in Alex's pod, and nobody else can read it", async () => {
    await step(["new-claim"], async () => {
      await startClaimFile(h.world());
    });
    const file = await readClaimFile(h.world());
    expect(file.incident?.photos).toEqual(photoUrls(h.world()).sort());
    expect(file.incident?.otherPartyIri).toBe(alex(PATHS.otherParty));
    expect(file.otherParty?.name).toBe("Lee Navarro");
    expect(file.members).toEqual(
      [alex(PATHS.incident), alex(PATHS.otherParty), alex(PATHS.photos)].sort(),
    );
    for (const owner of ["insurer", "repairer"] as const) {
      expect(await probe(owner, PATHS.incident)).toBe(403);
      expect(await probePhoto(owner)).toBe(403);
    }
    // Starting again changes nothing.
    const writes = h.log.length;
    await startClaimFile(h.world());
    expect(h.log.filter((e, i) => i >= writes && e.source === "pod" && e.kind === "write")).toEqual(
      [],
    );
  }, 60_000);

  test("2. reporting the claim: C1 requested and approved; Wrenfield opens its record", async () => {
    await step(["report"], async () => {
      await reportClaim(h.world());
    });
    const c1 = await motorGrant(h.world(), "C1");
    expect(c1?.state).toBe("active");
    expect(c1?.agreement.assigneeIri).toBe(webidOf("insurer"));
    const claim = await readInsurerCase(h.world());
    expect(claim?.status).toBe(CLAIM_SCHEMA.ActiveActionStatus);
    expect(claim?.policyIri).toBe(motorPolicyUrl(h.world(), "C1"));
    expect(claim?.claimFileIri).toBe(alex(PATHS.claim));
    const rules = await readAcl(h.host.fetchAs("alex"), `${alex(PATHS.claim)}.acl`);
    expect(rules.some((rule) => [...rule.agent].includes(webidOf("insurer")))).toBe(true);
    expect(await probe("insurer", PATHS.incident)).toBe(200);
    expect(await probe("insurer", PATHS.licence)).toBe(200);
    expect(await probe("repairer", PATHS.incident)).toBe(403);
    // Reporting again approves nothing twice.
    await reportClaim(h.world());
    expect((await motorGrants(h.world())).map((g) => g.code)).toEqual(["C1", "P1"]);
  }, 60_000);

  test("3. the desk checks licence and policy at source, writes the damage report, refers Anvil", async () => {
    let review: Awaited<ReturnType<typeof checkClaim>> | undefined;
    h.day = DAY.desk;
    await step(["claims-desk"], async () => {
      review = await checkClaim(h.world());
    });
    expect(review?.checks.map((c) => [c.label, c.verified])).toEqual([
      ["Driver licence", true],
      ["Motor policy", true],
    ]);
    expect(review?.photos).toHaveLength(2);
    expect(review?.otherParty?.policyNumber).toBe("PM-AU-30117");
    for (const path of [ORG_PATHS.insurerLicenceCheck, ORG_PATHS.insurerPolicyCheck]) {
      const url = podUrl(h.world(), "insurer", path);
      const pointer = new CredentialPointer(
        url,
        await readDataset(h.host.fetchAs("insurer"), url),
        DataFactory,
      );
      expect(pointer.signatureVerified).toBe(true);
    }
    const file = await readClaimFile(h.world());
    expect(file.damageReport?.damage).toHaveLength(2);
    expect(file.damageReport?.photos).toEqual(photoUrls(h.world()).sort());
    // Anvil's back office answered the referral with a request in Alex's inbox.
    const requests = await claimRequests(h.world());
    expect(requests.map((r) => [r.code, r.state])).toEqual([
      ["C1", "active"],
      ["C2", "pending"],
    ]);
    expect(review?.repairerRequest).toBe(requests[1]?.url);
    const verified = h.log.filter((e) => e.source === "app" && e.kind === "verified");
    expect(verified).toHaveLength(2);
  }, 60_000);

  test("4. Alex approves C2: Anvil reads the damage report and the photos, nothing else", async () => {
    let job: Awaited<ReturnType<typeof approveRepairer>> | undefined;
    await step(["repairer-consent"], async () => {
      job = await approveRepairer(h.world());
    });
    expect(job?.policyIri).toBe(motorPolicyUrl(h.world(), "C2"));
    expect((await motorGrant(h.world(), "C2"))?.state).toBe("active");
    const agreement = (await motorGrant(h.world(), "C2"))?.agreement as AccessAgreement;
    expect(agreement.assigneeIri).toBe(webidOf("repairer"));
    expect(await probe("repairer", PATHS.damageReport)).toBe(200);
    expect(await probePhoto("repairer")).toBe(200);
    for (const path of [
      PATHS.incident,
      PATHS.otherParty,
      PATHS.licence,
      PATHS.policy,
      PATHS.claim,
    ]) {
      expect(await probe("repairer", path), path).toBe(403);
    }
    // The photos are a folder of their own: Anvil may list it, not the claim folder around it.
    expect(await probe("repairer", PATHS.photos)).toBe(200);
    // Approving again changes nothing.
    await approveRepairer(h.world());
    expect((await motorGrants(h.world())).filter((g) => g.code === "C2")).toHaveLength(1);
  }, 60_000);

  test("5. the job card reads two things and writes the estimate it cannot read back", async () => {
    let result: Awaited<ReturnType<typeof sendEstimate>> | undefined;
    h.day = DAY.estimate;
    await step(["job-card"], async () => {
      result = await sendEstimate(h.world());
    });
    expect(result?.photos).toHaveLength(2);
    expect(result?.estimate.totalUsd).toBe(1415.5);
    const file = await readClaimFile(h.world());
    expect(file.estimate?.estimateNumber).toBe(ESTIMATE.estimateNumber);
    expect(file.estimate?.creatorIri).toBe(webidOf("repairer"));
    // Write, not read: C2 lets Anvil create its estimate, not open it.
    expect(await probe("repairer", PATHS.estimate)).toBe(403);
    expect(await probe("insurer", PATHS.estimate)).toBe(200);
  }, 60_000);

  test("6. from the log: the workshop read two things and never saw the rest", () => {
    const start = h.log.length;
    const totals = motorClaimTotals(h.log);
    expect(totals.repairerThings).toBe(2);
    expect(totals.notSeen).toEqual([
      "Driver licence",
      "Motor policy",
      "Incident report",
      "Other driver's details",
    ]);
    slices.set("not-shared", [start, h.log.length]);
  });

  test("7. the insurer reads the estimate where Anvil wrote it and approves it", async () => {
    await step(["approve-estimate"], async () => {
      await approveEstimate(h.world());
    });
    expect((await readInsurerCase(h.world()))?.acceptedEstimateIri).toBe(alex(PATHS.estimate));
    expect((await readJob(h.world()))?.acceptedEstimateIri).toBe(alex(PATHS.estimate));
  }, 60_000);

  test("8. the invoice ends the job, and Alex's wallet expires C2", async () => {
    let done: Awaited<ReturnType<typeof completeJob>> | undefined;
    h.day = DAY.complete;
    await step(["complete"], async () => {
      done = await completeJob(h.world());
    });
    expect(done?.expired).toEqual(["C2"]);
    expect(done?.invoice.totalUsd).toBe(1415.5);
    expect((await readJob(h.world()))?.status).toBe(CLAIM_SCHEMA.CompletedActionStatus);
    expect((await motorGrant(h.world(), "C2"))?.state).toBe("expired");
    expect((await motorGrant(h.world(), "C1"))?.state).toBe("active");
    // Wrenfield still reads the folder under C1.
    expect(await probePhoto("insurer")).toBe(200);
    // Completing again expires nothing more.
    expect((await completeJob(h.world())).expired).toEqual([]);
    await h.runner.idle();
  }, 60_000);

  test("9. opening the photos again: the pod refuses (403)", async () => {
    let outcome: { status: number } | undefined;
    await step(["refused"], async () => {
      outcome = await openPhotosAgain(h.world());
    });
    expect(outcome?.status).toBe(403);
    const denied = h.log.filter((e) => e.source === "pod" && e.kind === "denied");
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({
      actor: { org: "repairer" },
      path: "/claims/CLM-1/photos/rear-bumper.svg",
      status: 403,
    });
    expect(await probe("repairer", PATHS.damageReport)).toBe(403);
  }, 60_000);

  test("10. closing the claim withdraws C1; P1 stays", async () => {
    h.day = DAY.close;
    await step(["close"], async () => {
      await closeClaim(h.world());
    });
    const states = Object.fromEntries((await motorGrants(h.world())).map((g) => [g.code, g.state]));
    expect(states).toEqual({ C1: "revoked", C2: "expired", P1: "active" });
    expect(await probe("insurer", PATHS.policy)).toBe(200);
    expect(await probe("insurer", PATHS.incident)).toBe(403);
    expect(await probe("insurer", PATHS.licence)).toBe(403);
    expect(await probePhoto("insurer")).toBe(403);
    expect(await closeClaim(h.world())).toEqual([]);
  }, 60_000);

  test("the totals come from the log: three parties, two grants, one refusal", () => {
    const totals = motorClaimTotals(h.log);
    expect(totals).toMatchObject({ claimGrants: 2, denied: 1, parties: 3, repairerThings: 2 });
    expect(totals.readers["/claims/CLM-1/incident"]).toEqual(["alex", "insurer"]);
    expect(totals.readers["/claims/CLM-1/damage-report"]).toEqual(["alex", "repairer"]);
  });

  test("the Lens's own model counts two organisations holding grants, and one refusal", () => {
    const model = new LensModel({
      registry: ORGS,
      holder: { id: MOTOR_CLAIM_HOLDER.id, name: MOTOR_CLAIM_HOLDER.name },
      ...motorClaimLens(),
    });
    for (const entry of h.log) model.push(entry, { replayed: true });
    const totals = computeTotals(model);
    expect(totals.grants.active + totals.grants.expired + totals.grants.revoked).toBe(2);
    expect(totals.denied).toBe(1);
  });

  test("the tour's done and expect patterns match what each step really produced", () => {
    for (const s of TOUR) {
      const slice = slices.get(s.id);
      expect(slice, s.id).toBeDefined();
      const [first, end] = slice as [number, number];
      const own = h.log.slice(first, end);
      const sofar = h.log.slice(0, end);
      if (s.done.event !== undefined) {
        expect(
          own.some((entry) => completesStep(s, entry)),
          `${s.id} completes`,
        ).toBe(true);
      }
      for (const pattern of s.expect) {
        expect(
          sofar.some((entry) => matchesExpectation(entry, pattern)),
          `${s.id} expects ${JSON.stringify(pattern)}`,
        ).toBe(true);
      }
    }
  });
});
