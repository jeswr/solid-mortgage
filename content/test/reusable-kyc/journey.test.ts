// AUTHORED-BY Claude Opus 5.5
/**
 * The reusable-KYC journey, headless, against the real pod runtime host and wasm: Alder Bank's
 * signed statement stored in Alex's pod, Pennant's Y1 request approved by Alex's wallet with the
 * runtime's one-time-grant service, one read verified against the scheme's trusted-issuer list,
 * the second read refused by the pod (403), the statement withdrawn at source and re-issued, and
 * the step-7 totals computed from the log. Nothing is mocked.
 */

import { AccessAgreement, DPV } from "@mortgage/data-model";
import { verifyWithTrustList } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { completesStep, matchesExpectation } from "../../../packages/tour/src/match.js";
import { readDataset, readText, statusOf, webid } from "../../mortgage/world.js";
import {
  ATTESTATION_PATH,
  attestationStatusIndex,
  attestationUrl,
  issuedVersions,
  readIssuance,
} from "../../reusable-kyc/attestation.js";
import { readCheck } from "../../reusable-kyc/card.js";
import { DAY } from "../../reusable-kyc/facts.js";
import {
  oneTimeState,
  pennantHasRule,
  policyUrl,
  readOneTimeRequest,
} from "../../reusable-kyc/grants.js";
import {
  applyWithVerifiedIdentity,
  approveOneTimeRead,
  askAgain,
  checkVerifiedIdentity,
  closeUsedGrant,
  getAttestation,
  readAttestation,
  reportDocumentLost,
} from "../../reusable-kyc/journey.js";
import { reusableKycTotals } from "../../reusable-kyc/ledger.js";
import { readTrustedListText, trustedListUrl } from "../../reusable-kyc/scheme.js";
import { TOUR } from "../../reusable-kyc/tour.js";
import { createHarness, type Harness } from "./harness.js";

let h: Harness;
let requestUrl = "";
let statementV1 = "";
/** The log entries each tour step produced: [first, end). */
const slices = new Map<string, [number, number]>();

const verifyAs = async (body: string, day: number) =>
  verifyWithTrustList(body, {
    expectShape: "kyc-attestation-credential",
    now: h.calendar.clock(day, "12:00"),
    statusFetch: h.host.fetchAs("card-issuer"),
    trustList: {
      document: await readTrustedListText(h.world()),
      iri: trustedListUrl(h.world()),
    },
    webIdFetch: h.host.fetchAs("card-issuer"),
  });

beforeAll(async () => {
  h = await createHarness();
}, 180_000);

afterAll(() => h?.stop());

describe("reusable KYC, step by step", () => {
  test("before anything: Pennant cannot read Alex's pod", async () => {
    // The statement does not exist yet, but Pennant is refused before the server says so.
    const status = await statusOf(h.host.fetchAs("card-issuer"), attestationUrl(h.world()));
    expect([401, 403]).toContain(status);
    // Discard the probe so the step totals start clean.
    h.log.length = 0;
  });

  test("1. Alder Bank signs the statement and Alex's wallet stores it", async () => {
    const start = h.log.length;
    const issued = await getAttestation(h.world());
    expect(issued?.version).toBe(1);
    expect(await issuedVersions(h.world())).toEqual([1]);
    const view = await readAttestation(h.world());
    expect(view.credential?.issuer).toBe(webid(h.world(), "bank"));
    const subject = view.credential?.credentialSubject;
    expect(subject?.name).toBe("Alex Rivera");
    expect(subject?.checks).toHaveLength(3);
    statementV1 = await readText(h.host.fetchAs("alex"), attestationUrl(h.world()));
    // No document image, no tax identifier, no evidence link.
    expect(statementV1).not.toMatch(/image|evidence|taxIdLast4 "|4417/);
    // The bank keeps a pointer, not a copy.
    const pointer = await readIssuance(h.world(), 1);
    expect(pointer.url).toBe(attestationUrl(h.world()));
    // A second press does not issue again.
    expect(await getAttestation(h.world())).toBeUndefined();
    slices.set("attestation", [start, h.log.length]);
    // Nobody else can read it (probes, dropped from the step's log).
    const probes = h.log.length;
    expect(await statusOf(h.host.fetchAs("card-issuer"), attestationUrl(h.world()))).toBe(403);
    expect(await statusOf(h.host.fetchAs("lender"), attestationUrl(h.world()))).toBe(403);
    h.log.length = probes;
  }, 60_000);

  test("2. Pennant asks for Y1 and Alex's wallet approves a one-time read", async () => {
    const start = h.log.length;
    requestUrl = await applyWithVerifiedIdentity(h.world());
    await h.runner.idle();
    expect(h.errors).toEqual([]);
    const { reason } = await readOneTimeRequest(h.world(), requestUrl);
    expect(reason).toBeUndefined();
    const result = await approveOneTimeRead(h.world(), requestUrl, h.grantOneTime);
    expect(result.code).toBe("Y1");
    expect(result.acls).toEqual([`${attestationUrl(h.world())}.acl`]);
    const agreement = new AccessAgreement(
      policyUrl(h.world()),
      await readDataset(h.host.fetchAs("alex"), policyUrl(h.world())),
      DataFactory,
    );
    const permission = agreement.permissions[0];
    expect(permission?.maxUses).toBe(1);
    expect(permission?.purposeIri).toBe(DPV.IdentityVerification);
    expect([...(permission?.targetIris ?? [])]).toEqual([attestationUrl(h.world())]);
    const end = permission?.end;
    expect(end !== undefined && "until" in end ? end.until.getTime() : 0).toBe(
      // An hour after Pennant asked: the agreement repeats the request exactly.
      h.calendar.clock(DAY.apply, "11:20").getTime(),
    );
    expect(await h.pendingOneTime()).toEqual([
      expect.objectContaining({
        agent: webid(h.world(), "card-issuer"),
        path: `/${ATTESTATION_PATH}`,
      }),
    ]);
    expect(await oneTimeState(h.world())).toBe("open");
    slices.set("card-consent", [start, h.log.length]);
  }, 60_000);

  test("the wallet refuses a request that asks for more than one read of the statement", async () => {
    const { requestVerifiedIdentity } = await import("../../reusable-kyc/grants.js");
    const { postResource, podUrl } = await import("../../mortgage/world.js");
    const { buildAccessRequest } = await import("@mortgage/data-model");
    const greedy = await postResource(
      h.host.fetchAs("card-issuer"),
      podUrl(h.world(), "alex", "inbox/"),
      "request-greedy",
      (iri) =>
        buildAccessRequest({
          assignee: webid(h.world(), "card-issuer"),
          assigner: webid(h.world(), "alex"),
          description: "Everything",
          grantCode: "Y1",
          iri,
          issued: h.calendar.clock(DAY.apply, "10:25"),
          name: "Use verified identity",
          permissions: [
            {
              assignee: webid(h.world(), "card-issuer"),
              modes: ["Read"],
              purpose: DPV.IdentityVerification,
              targets: [podUrl(h.world(), "alex", "credentials/")],
            },
          ],
        }),
    );
    await h.runner.idle();
    expect((await readOneTimeRequest(h.world(), greedy)).reason).toBe("not limited to one use");
    await expect(approveOneTimeRead(h.world(), greedy, h.grantOneTime)).rejects.toThrow(
      /will not approve/,
    );
    expect(typeof requestVerifiedIdentity).toBe("function");
    // Not part of any step: drop its entries.
    h.log.length = slices.get("card-consent")?.[1] ?? h.log.length;
  }, 60_000);

  test("3. Pennant reads once and verifies against the scheme's list; the runtime closes Y1", async () => {
    const start = h.log.length;
    const verified = await checkVerifiedIdentity(h.world());
    expect(verified.result.errors).toEqual([]);
    expect(verified.result.verified).toBe(true);
    expect(verified.result.gates).toEqual({
      content: true,
      list: true,
      listed: true,
      signature: true,
      status: true,
    });
    expect(verified.result.entry?.name).toBe("Alder Bank");
    expect(verified.claims?.name).toBe("Alex Rivera");
    expect(verified.claims?.address).toBe("14 Larch Lane, Marlow, OH 43004");
    // The runtime closed the grant: no rule for Pennant, nothing pending.
    expect(await pennantHasRule(h.world())).toBe(false);
    expect(await h.pendingOneTime()).toEqual([]);
    expect(await oneTimeState(h.world())).toBe("used");
    const check = await readCheck(h.world());
    expect(check?.signatureVerified).toBe(true);
    expect(check?.statusChecked).toBe(true);
    const used = h.log.filter((e) => e.source === "app" && e.kind === "grant-used");
    expect(used).toHaveLength(1);
    slices.set("card-verify", [start, h.log.length]);
    slices.set("not-shared", [h.log.length, h.log.length]);
  }, 60_000);

  test("5. asking again is refused by the pod: 403", async () => {
    const start = h.log.length;
    expect(await askAgain(h.world())).toBe(403);
    const denied = h.log.slice(start).filter((e) => e.source === "pod" && e.kind === "denied");
    expect(denied).toEqual([
      expect.objectContaining({
        actor: expect.objectContaining({ org: "card-issuer" }),
        path: `/${ATTESTATION_PATH}`,
        status: 403,
      }),
    ]);
    slices.set("used-up", [start, h.log.length]);
  }, 60_000);

  test("the wallet records the closed grant, and recomputing never reopens it", async () => {
    const before = h.log.length;
    const consent = await closeUsedGrant(h.world());
    expect(consent).toMatch(/consents\/y1-used$/);
    expect(await closeUsedGrant(h.world())).toBeUndefined();
    const { grantRecords, syncAcls } = await import("../../mortgage/grants.js");
    const records = await grantRecords(h.world());
    expect(records.find((r) => r.code === "Y1")?.state).toBe("expired");
    // A recomputation (as any later grant change does) leaves Pennant out.
    await syncAcls(h.world(), [], records);
    expect(await pennantHasRule(h.world())).toBe(false);
    expect(await askAgain(h.world())).toBe(403);
    // Not part of a step's expectations: keep the log to the steps.
    h.log.length = before;
  }, 60_000);

  test("6. the ID is lost: Alder re-issues and withdraws the old statement at source", async () => {
    h.day = DAY.lost;
    const start = h.log.length;
    const issued = await reportDocumentLost(h.world());
    expect(issued.version).toBe(2);
    expect(issued.revoked).toBe(1);
    expect(issued.previousBody).toBe(statementV1);
    expect(await issuedVersions(h.world())).toEqual([1, 2]);
    expect(await attestationStatusIndex(h.world(), 1)).not.toBe(
      await attestationStatusIndex(h.world(), 2),
    );
    const old = await verifyAs(statementV1, DAY.lost);
    expect(old.verified).toBe(false);
    expect(old.errors.map((e) => e.code)).toEqual(["STATUS_REVOKED"]);
    const current = await readText(h.host.fetchAs("alex"), attestationUrl(h.world()));
    const fresh = await verifyAs(current, DAY.lost);
    expect(fresh.errors).toEqual([]);
    expect(current).toContain("Replacement government photo ID");
    slices.set("reissue", [start, h.log.length]);
  }, 60_000);

  test("7. the totals come from the log: one set of checks, two institutions, one read", () => {
    const start = h.log.length;
    const totals = reusableKycTotals(h.log);
    expect(totals).toEqual({
      accessWithdrawn: 1,
      checks: 1,
      denied: 1,
      institutions: 2,
      reads: 1,
      statementsWithdrawn: 1,
      withdrawals: 2,
    });
    slices.set("ledger", [start, h.log.length]);
  });

  test("the tour's done and expect patterns match what each step really produced", () => {
    for (const step of TOUR) {
      const slice = slices.get(step.id);
      expect(slice, step.id).toBeDefined();
      const [first, end] = slice as [number, number];
      const own = h.log.slice(first, end);
      const sofar = h.log.slice(0, end);
      if (step.done.event !== undefined || step.done.note !== undefined) {
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
