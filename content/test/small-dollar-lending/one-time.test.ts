// AUTHORED-BY Claude Opus 5.5
/**
 * The one-time payout grant (L2) against the real pod runtime host and wasm, in the window between
 * the runtime closing it (after Swiftline's first read) and Maya's wallet recording it as used.
 * In that window the grant records still say "active"; a recompute of the ACL documents must not
 * put Swiftline's rule back. And a one-time grant ended unused takes its rule with it.
 */

import { buildPayoutInstruction, DPV } from "@mortgage/data-model";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { at, putResource, readText, statusOf, webid } from "../../mortgage/world.js";
import { LOAN, MAYA, PAYOUT } from "../../small-dollar-lending/facts.js";
import {
  askAndApprove,
  DOCUMENT_PATHS,
  endLendingGrant,
  lendingGrantRecords,
  mayaUrl,
  syncLendingAcls,
} from "../../small-dollar-lending/grants.js";
import { openVault } from "../../small-dollar-lending/journey.js";
import { createHarness, type Harness } from "./harness.js";

let h: Harness;
const instruction = () => mayaUrl(h.world(), DOCUMENT_PATHS.payoutInstruction);
const swiftlineReads = () => statusOf(h.world().fetchAs("payout"), instruction());
const swiftlineRule = async () =>
  (await readText(h.world().fetchAs(MAYA), `${instruction()}.acl`)).includes(
    webid(h.world(), "payout"),
  );
const l2State = async () =>
  (await lendingGrantRecords(h.world())).find((record) => record.code === "L2")?.state;

beforeAll(async () => {
  h = await createHarness();
  const world = h.world();
  await openVault(world);
  await putResource(
    world.fetchAs(MAYA),
    buildPayoutInstruction({
      accountLast4: PAYOUT.accountLast4,
      amountUsd: LOAN.amountFinancedUsd,
      cardIssuer: PAYOUT.cardIssuer,
      creator: webid(world, MAYA),
      iri: instruction(),
      issued: at(world, "11:40"),
      loanNumber: LOAN.loanNumber,
      name: "Pay my loan to my debit card",
    }),
  );
}, 120_000);

afterAll(() => h?.stop());

describe("the one-time payout grant", () => {
  test("a recompute after the runtime closed it does not reopen it", async () => {
    await askAndApprove(h.world(), "L2", ["11:41", "11:42"]);
    expect(await swiftlineRule()).toBe(true);
    expect(await swiftlineReads()).toBe(200);
    // The runtime closed the grant after that read; the wallet has not yet recorded it as used.
    expect(await swiftlineRule()).toBe(false);
    expect(await l2State()).toBe("active");
    expect(await swiftlineReads()).toBe(403);

    // A recompute of every ACL document from the grant records (nothing assumed written yet).
    const written = await syncLendingAcls(h.world(), [], await lendingGrantRecords(h.world()));
    expect(written).toContain(`${instruction()}.acl`);
    expect(await swiftlineRule()).toBe(false);
    expect(await swiftlineReads()).toBe(403);

    // The wallet records the grant as used; still refused.
    await endLendingGrant(h.world(), "L2", DPV.ConsentExpired, "used", "11:47", false);
    expect(await l2State()).toBe("expired");
    expect(await swiftlineReads()).toBe(403);
  }, 120_000);

  test("a one-time grant withdrawn before its read loses its rule", async () => {
    // A second, unused one-time grant (Swiftline asks again; Maya approves, then withdraws).
    await askAndApprove(h.world(), "L2", ["12:01", "12:02"]);
    expect(await swiftlineRule()).toBe(true);
    const acls = await endLendingGrant(h.world(), "L2", DPV.ConsentWithdrawn, "withdrawn", "12:05");
    expect(acls).toContain(`${instruction()}.acl`);
    expect(await swiftlineRule()).toBe(false);
    expect(await swiftlineReads()).toBe(403);
  }, 120_000);
});
