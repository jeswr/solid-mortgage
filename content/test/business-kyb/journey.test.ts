// AUTHORED-BY Claude Opus 5.5
/**
 * The business KYB journey, headless, against the real pod runtime host and wasm: the twelve
 * steps' pod effects in order. Credentials signed by the register into Northwind's pod; grants
 * K1 and K2 written as real ACLs the pod enforces; Alder Bank's due diligence checking each
 * credential at source and keeping its own record; a real Tier B completeness proof and Tier A
 * share proofs, verified by Brackenridge; the re-issue revoking the old credential at source;
 * Alder refused after the withdrawal. Nothing is mocked.
 */

import { verifyCredential } from "@mortgage/vc-kit";
import { beforeAll, describe, expect, test } from "vitest";
import { type EvidencePattern, matchesEvidence } from "../../../packages/lens/src/examiner.js";
import { completesStep, matchesExpectation } from "../../../packages/tour/src/match.js";
import { cddUrl, readCddRecord } from "../../business-kyb/banks.js";
import { DAY, ENTITY, HOLDER, PATHS, shareAnchorPath } from "../../business-kyb/facts.js";
import {
  KYB_GRANTS,
  kybGrantRecords,
  pendingRequest,
  withdrawKybGrant,
} from "../../business-kyb/grants.js";
import {
  approveCredit,
  approveOnboarding,
  closeAccount,
  dealPage,
  dueDiligence,
  ensureChallenge,
  ensureRequest,
  issueIdentity,
  issueOfficers,
  issueOwnership,
  openVault,
  proveOwnership,
  readHeld,
  recordSale,
} from "../../business-kyb/journey.js";
import { KYB_COMPLIANCE } from "../../business-kyb/mount.js";
import { challengeIsLive, resultUrl } from "../../business-kyb/proof.js";
import { credentialUrl, holderUrl, issuedVersions } from "../../business-kyb/register.js";
import { TOUR } from "../../business-kyb/tour.js";
import { podUrl, readText, statusOf } from "../../mortgage/world.js";
import { failingAcl } from "../failing-acl.js";
import { createHarness, type Harness } from "./harness.js";

let h: Harness;
let ownershipV1 = "";
/** The log entries each tour step produced: [first, end). */
const slices = new Map<string, [number, number]>();
const credentials = ["org-identity", "officer-authorisation", "beneficial-ownership"] as const;

const verifyOptions = (day: number) => ({
  expectShape: "beneficial-ownership-credential" as const,
  now: h.calendar.clock(day, "12:00"),
  statusFetch: h.host.fetchAs("lender"),
  trustedIssuers: [`${podUrl(h.world(), "registry", "profile/card")}#me`],
  webIdFetch: h.host.fetchAs("lender"),
});

/** A probe the test makes, kept out of the journey's log. */
async function probe<T>(run: () => Promise<T>): Promise<T> {
  const before = h.log.length;
  const result = await run();
  h.log.splice(before);
  return result;
}

beforeAll(async () => {
  h = await createHarness();
}, 180_000);

describe("business KYB, step by step", () => {
  test("1. Northwind's pod starts with an empty credentials drawer", async () => {
    const start = h.log.length;
    const held = await openVault(h.world());
    expect(held).toEqual({});
    // Opening again writes nothing.
    const writes = h.log.filter((e) => e.source === "pod" && e.kind === "write").length;
    await openVault(h.world());
    expect(h.log.filter((e) => e.source === "pod" && e.kind === "write").length).toBe(writes);
    slices.set("vault", [start, h.log.length]);
  }, 120_000);

  test("before any grant, neither bank can read the drawer (the pod refuses)", async () => {
    for (const bank of ["bank", "business-lender"] as const) {
      expect(
        await probe(() => statusOf(h.host.fetchAs(bank), holderUrl(h.world(), PATHS.credentials))),
      ).toBe(403);
    }
    expect(
      await probe(() => statusOf(h.host.fetchAs(null), holderUrl(h.world(), PATHS.credentials))),
    ).toBe(401);
  });

  test("2. the register issues the organisational identity, with an illustrative LEI", async () => {
    const start = h.log.length;
    const issued = await issueIdentity(h.world());
    expect(issued.version).toBe(1);
    expect(issued.issue).toBeDefined();
    const held = await readHeld(h.world());
    expect(held.identity?.credentialSubject.legalName).toBe(ENTITY.legalName);
    expect(held.identity?.credentialSubject.lei.text).toBe(ENTITY.lei);
    expect(held.identity?.credentialSubject.lei.illustrative).toBe(true);
    expect(ENTITY.lei.startsWith("9999")).toBe(true);
    // Pressing again issues nothing new.
    const again = await issueIdentity(h.world());
    expect(again).toEqual({ version: 1 });
    slices.set("org-identity", [start, h.log.length]);
  });

  test("3. the officer authorisation names the managing member", async () => {
    const start = h.log.length;
    await issueOfficers(h.world());
    const held = await readHeld(h.world());
    expect(held.officers?.credentialSubject.officers.map((o) => o.personName)).toEqual([
      "Jordan Blake",
    ]);
    slices.set("officer", [start, h.log.length]);
  });

  test("4. the ownership credential and its anchors (array, and the two owners at 25%+)", async () => {
    const start = h.log.length;
    const issued = await issueOwnership(h.world());
    expect(issued.version).toBe(1);
    expect(issued.issue?.unanchored).toEqual([]);
    expect(issued.issue?.anchors).toEqual([
      holderUrl(h.world(), PATHS.arrayAnchor),
      holderUrl(h.world(), shareAnchorPath(1)),
      holderUrl(h.world(), shareAnchorPath(2)),
    ]);
    const held = await readHeld(h.world());
    expect(
      held.ownership?.credentialSubject.ownerships.map((o) => [o.owner.personName, o.bps]),
    ).toEqual([
      ["Jordan Blake", 4200],
      ["Priya Nandakumar", 2800],
      ["Marcus Webb", 1800],
      ["Dana Reyes", 1200],
    ]);
    ownershipV1 = await readText(
      h.host.fetchAs("northwind"),
      credentialUrl(h.world(), "beneficial-ownership"),
    );
    expect((await verifyCredential(ownershipV1, verifyOptions(DAY.register))).verified).toBe(true);
    expect(
      await probe(() =>
        statusOf(h.host.fetchAs("northwind"), holderUrl(h.world(), shareAnchorPath(3))),
      ),
    ).toBe(404);
    slices.set("ownership", [start, h.log.length]);
  }, 60_000);

  test("5. Alder Bank's request arrives; Northwind approves K1 (three ACLs)", async () => {
    const start = h.log.length;
    h.day = DAY.onboarding;
    const request = await ensureRequest(h.world(), "K1");
    expect(await ensureRequest(h.world(), "K1")).toBe(request);
    const approval = await approveOnboarding(h.world());
    expect(approval.code).toBe("K1");
    expect(await pendingRequest(h.world(), "K1")).toBeUndefined();
    const k1 = (await kybGrantRecords(h.world())).find((g) => g.code === "K1");
    expect(k1?.state).toBe("active");
    // The grant is scoped: the three credentials, not the anchors or the rest of the pod.
    for (const name of credentials) {
      expect(
        await probe(() => statusOf(h.host.fetchAs("bank"), credentialUrl(h.world(), name))),
      ).toBe(200);
    }
    expect(
      await probe(() => statusOf(h.host.fetchAs("bank"), holderUrl(h.world(), PATHS.arrayAnchor))),
    ).toBe(403);
    expect(
      await probe(() =>
        statusOf(h.host.fetchAs("business-lender"), credentialUrl(h.world(), "org-identity")),
      ),
    ).toBe(403);
    slices.set("onboarding-consent", [start, h.log.length]);
  });

  test("6. due diligence checks at source and keeps Alder's own record", async () => {
    const start = h.log.length;
    const result = await dueDiligence(h.world());
    expect(result.checks.map((c) => [c.name, c.verified, c.errors])).toEqual(
      credentials.map((name) => [name, true, []]),
    );
    expect(result.decision).toBe("opened");
    expect(result.beneficialOwners).toEqual(["Jordan Blake", "Priya Nandakumar"]);
    expect(result.controlPerson).toBe("Jordan Blake");
    expect(result.record).toBe(cddUrl(h.world()));
    const record = await readCddRecord(h.world());
    expect(record?.decision).toBeDefined();
    slices.set("due-diligence", [start, h.log.length]);
  }, 60_000);

  test("7. a live Tier B and Tier A proof; Brackenridge verifies and learns only two names", async () => {
    const start = h.log.length;
    h.day = DAY.credit;
    const challenge = await ensureChallenge(h.world());
    expect(challenge?.threshold).toBe(2500);
    expect(await challengeIsLive(h.world())).toBe(true);
    const stages: string[] = [];
    const { decision, presentation, request } = await proveOwnership(h.world(), (s) =>
      stages.push(s),
    );
    expect(request).toBeDefined();
    expect(await pendingRequest(h.world(), "K2")).toBe(request);
    expect(decision.errors).toEqual([]);
    expect(decision.passed).toBe(true);
    expect(decision.disclosed).toEqual(["Jordan Blake", "Priya Nandakumar"]);
    expect(stages).toEqual(["completeness", "share:Jordan Blake", "share:Priya Nandakumar"]);
    expect(presentation.provedMs).toBeGreaterThan(0);
    // The presentation carries no share: neither 4200 nor 2800 nor the other owners' names.
    const sent = JSON.stringify(presentation);
    for (const secret of ["Marcus Webb", "Dana Reyes", 'ownershipPercentageBps":']) {
      expect(sent).not.toContain(secret);
    }
    // The challenge was burned: it is gone at Brackenridge.
    expect(await challengeIsLive(h.world())).toBe(false);
    const result = await readText(h.host.fetchAs("business-lender"), resultUrl(h.world()));
    expect(result).toContain("Pre-decision: proceed");
    // Brackenridge still cannot read the credentials themselves.
    expect(
      await probe(() =>
        statusOf(
          h.host.fetchAs("business-lender"),
          credentialUrl(h.world(), "beneficial-ownership"),
        ),
      ),
    ).toBe(403);
    slices.set("proof", [start, h.log.length]);
  }, 180_000);

  test("8. K2 approved; Brackenridge's deal sheet reads and checks the credentials", async () => {
    const start = h.log.length;
    const { approval, sheet } = await approveCredit(h.world());
    expect(approval.code).toBe("K2");
    expect(sheet.verified).toBe(true);
    expect(sheet.legalName).toBe(ENTITY.legalName);
    expect(sheet.ownership.beneficialOwners).toEqual(["Jordan Blake", "Priya Nandakumar"]);
    slices.set("disclosed-grant", [start, h.log.length]);
  }, 60_000);

  test("9. the sale: version 2 issued, version 1 fails its status check", async () => {
    const start = h.log.length;
    h.day = DAY.sale;
    const issued = await recordSale(h.world());
    expect(issued.version).toBe(2);
    expect(issued.issue?.revoked).toBe(1);
    // Jordan's 60% has no captured encoding: his share anchor is withdrawn, never guessed.
    expect(issued.issue?.unanchored).toEqual(["Jordan Blake"]);
    expect(await recordSale(h.world())).toEqual({ version: 2 });
    expect(await issuedVersions(h.world(), "beneficial-ownership")).toEqual([1, 2]);
    expect((await verifyCredential(ownershipV1, verifyOptions(DAY.sale))).verified).toBe(false);
    const v2 = await readText(
      h.host.fetchAs("northwind"),
      credentialUrl(h.world(), "beneficial-ownership"),
    );
    expect((await verifyCredential(v2, verifyOptions(DAY.sale))).verified).toBe(true);
    slices.set("ownership-change", [start, h.log.length]);
  }, 60_000);

  test("10. the deal page: Brackenridge and Alder's monitoring read the new record", async () => {
    const start = h.log.length;
    const desk = await dealPage(h.world());
    expect(desk.changed).toBe(true);
    expect(desk.sheet.verified).toBe(true);
    expect(desk.sheet.ownership.owners.find((o) => o.name === "Jordan Blake")?.bps).toBe(6000);
    expect(desk.alder?.status).toBe(200);
    expect(desk.alder?.verified).toBe(true);
    expect(desk.alder?.ownership?.beneficialOwners).toEqual(["Jordan Blake", "Priya Nandakumar"]);
    // Opening the page again reads, but finds nothing new: no second monitoring read.
    const again = await dealPage(h.world());
    expect(again.changed).toBe(false);
    expect(again.alder).toBeUndefined();
    slices.set("both-banks", [start, h.log.length]);
  }, 60_000);

  test("a withdrawal whose ACL write fails leaves K1 active, to be withdrawn again", async () => {
    const failing = failingAcl(h.world(), HOLDER, "PUT");
    await probe(() =>
      expect(withdrawKybGrant(failing.world, "K1", "16:00")).rejects.toThrow(/503/),
    );
    expect(failing.failed()).toBe(1);
    const k1 = (await probe(() => kybGrantRecords(h.world()))).find((g) => g.code === "K1");
    expect(k1?.state).toBe("active");
  }, 60_000);

  test("11. withdrawing K1 ends Alder's access at source; its record stays", async () => {
    const start = h.log.length;
    const { acls, reread } = await closeAccount(h.world());
    expect(acls).toHaveLength(3);
    expect(reread.status).toBe(403);
    const k1 = (await kybGrantRecords(h.world())).find((g) => g.code === "K1");
    expect(k1?.state).toBe("revoked");
    // Brackenridge's K2 still works; Alder keeps its own CDD record (in its own pod).
    expect(
      await probe(() =>
        statusOf(
          h.host.fetchAs("business-lender"),
          credentialUrl(h.world(), "beneficial-ownership"),
        ),
      ),
    ).toBe(200);
    expect(await readCddRecord(h.world())).toBeDefined();
    const denied = h.log.filter((e) => e.source === "pod" && e.kind === "denied");
    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({ actor: { org: "bank" }, status: 403 });
    slices.set("revoke", [start, h.log.length]);
  }, 60_000);

  test("12. the examiner view: every obligation is evidenced from the log", () => {
    slices.set("examiner", [h.log.length, h.log.length]);
    const received = h.log.map((entry) => ({ entry }) as Parameters<typeof matchesEvidence>[0]);
    for (const item of KYB_COMPLIANCE) {
      for (const pattern of item.evidence) {
        expect(
          received.some((rec) => matchesEvidence(rec, pattern as EvidencePattern)),
          `${item.id} ${JSON.stringify(pattern)}`,
        ).toBe(true);
      }
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

  test("the grants as written: K1 for a year, K2 for 90 days", () => {
    expect(KYB_GRANTS.K1.validDays).toBe(365);
    expect(KYB_GRANTS.K2.validDays).toBe(90);
  });
});
