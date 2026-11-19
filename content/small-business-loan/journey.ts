// AUTHORED-BY Claude Opus 5.5
/**
 * What each of the nine steps of flows.md section 6 does to the pods, as plain functions over a
 * `World`. The pages call them: the bank as Alder, the state as the Department of Revenue, the
 * business-lender as Brackenridge, the wallet as Northwind. Where a step has another party's part
 * in line (Northwind's approval of Alder's request, Alder's quarterly update, Brackenridge's read
 * after the withdrawal) the page's world reaches that party with `world.fetchAs(owner)`, which the
 * Lens shows as that party's back office. The headless test runs the same functions in order
 * against the real wasm. Copy lives in `tour.ts`.
 */

import type { World } from "../mortgage/world.js";
import { monthsUpTo, publishCashFlow, readCashFlow } from "./cash-flow.js";
import { DAY, HOLDER } from "./facts.js";
import {
  approveLoanRequest,
  ensureLoanRequest,
  expireLoanGrants,
  grantRecords,
  LOAN_GRANT_CODES,
  LOAN_GRANTS,
  loanGrant,
  loanPolicyUrl,
  pendingRequest,
  withdrawLoanGrant,
} from "./grants.js";
import { assess, decide, readAgain, readDelivered, testQuarter } from "./lender.js";
import { prepareSmallBusinessLoan } from "./prepare.js";
import { issueTaxCompliance, taxVersions } from "./tax.js";

const on = (world: World, day: number): World => ({ ...world, day });

/**
 * Step 1. Alder Bank asks to keep Northwind's cash flow record up to date (S1); Jordan approves
 * it in Cairn in the same click; Alder writes twelve months into the one resource S1 covers.
 */
export async function publishCashFlowStep(world: World) {
  const day = on(world, DAY.cashFlow);
  await prepareSmallBusinessLoan(day);
  let approval: Awaited<ReturnType<typeof approveLoanRequest>> | undefined;
  if ((await loanGrant(day, "S1"))?.state !== "active") {
    const request = await ensureLoanRequest(day, "S1", "09:00");
    approval = await approveLoanRequest(day, request, "09:02");
  }
  const months = monthsUpTo(day, DAY.cashFlow, DAY.cashFlow);
  const url = await publishCashFlow(day, months, "09:10");
  return { approval, months: months.length, url };
}

/** Step 2. The Department of Revenue signs Northwind's tax compliance credential, once. */
export async function taxComplianceStep(world: World) {
  const day = on(world, DAY.tax);
  await prepareSmallBusinessLoan(day);
  const latest = (await taxVersions(day)).at(-1);
  if (latest !== undefined) return { version: latest };
  const issue = await issueTaxCompliance(day, "10:15");
  return { issue, version: issue.version };
}

/** Step 3, before the click: Brackenridge's application request is waiting in the inbox. */
export async function ensureApplication(world: World): Promise<string | undefined> {
  const day = on(world, DAY.apply);
  await prepareSmallBusinessLoan(day);
  if ((await loanGrant(day, "S2")) !== undefined) return undefined;
  return ensureLoanRequest(day, "S2", "10:00");
}

/** Step 3. Northwind approves S2: four reads, 30 days, "credit decision". */
export async function approveApplication(world: World) {
  const request = await ensureApplication(world);
  if (request === undefined) throw new Error("S2 is already on record");
  return approveLoanRequest(on(world, DAY.apply), request, "10:20");
}

/** Step 4. Brackenridge reads the four resources at source and assesses. */
export const assessment = (world: World) => assess(on(world, DAY.apply), "11:00");

/** Step 5. Brackenridge approves with covenants and writes three documents back. */
export const decision = (world: World) => decide(on(world, DAY.decision), "15:00");

/** Step 6, before the click: Brackenridge's monitoring request, sent with the decision. */
export async function ensureMonitoringRequest(world: World): Promise<string | undefined> {
  const day = on(world, DAY.decision);
  if ((await loanGrant(day, "S3")) !== undefined) return undefined;
  return ensureLoanRequest(day, "S3", "15:05");
}

/** Step 6. Northwind approves S3: a quarterly read of the cash flow while the loan is open. */
export async function approveMonitoring(world: World) {
  const request = await ensureMonitoringRequest(world);
  if (request === undefined) throw new Error("S3 is already on record");
  return approveLoanRequest(on(world, DAY.decision), request, "15:30");
}

/**
 * Step 7. One quarter on (the simulated calendar): Northwind's back office ends S2 (its 30 days
 * ran out), Alder's back office brings the cash flow record up to date, and Brackenridge reads it
 * under S3 for the covenant test.
 */
export async function quarterStep(world: World) {
  const day = on(world, DAY.quarter);
  const expired = await expireLoanGrants(day, "00:05");
  const months = monthsUpTo(day, DAY.cashFlow, DAY.quarter, DAY.decision);
  await publishCashFlow(day, months, "06:00");
  const test = await testQuarter(day, 1, "09:30");
  return { expired, months: months.length, test };
}

/** Step 8. The loan is repaid; Northwind withdraws S3, and Brackenridge's next read is refused. */
export async function repaidStep(world: World) {
  const day = on(world, DAY.repaid);
  await expireLoanGrants(day, "00:05");
  const acls = await withdrawLoanGrant(day, "S3", "16:00");
  const reread = await readAgain(day);
  return { acls, reread };
}

/** The loan grants as the wallet's sharing screen lists them. */
export async function loanGrantRows(world: World) {
  const records = await grantRecords(world);
  return LOAN_GRANT_CODES.map((code) => ({
    code,
    record: records.find((record) => record.policy === loanPolicyUrl(world, code)),
    spec: LOAN_GRANTS[code],
  }));
}

/** The cash flow record as Northwind sees it. */
export const holderCashFlow = (world: World) => readCashFlow(world, HOLDER);

export { pendingRequest, readDelivered };
