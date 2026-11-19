// AUTHORED-BY Claude Opus 5.5
/**
 * Two quotes, nothing handed over (tour step 6), ported from the mortgage's pre-qualification by
 * proof (`../mortgage/prequalification.ts`) to two lenders with different models:
 *
 * - Finchly (fintech-lender) asks for three statements: monthly income of at least $2,200, a
 *   cash-flow score of at least 660, and no returned payments in 90 days (`eq 0`, proved on the
 *   one-digit circuit member).
 * - Alder Bank asks for two: the income threshold and no returned payments. Its model also checks
 *   the credit file, which it may only do with Maya's authorisation (grant A1, `journey.ts`).
 *
 * Each lender publishes a challenge (a fresh nonce and its statements) in its own pod. Maya's
 * wallet reads her credentials and the issuers' operand anchors, proves each statement bound to
 * the nonce, and appends the presentation to the lender's inbox: proofs and anchors, no income,
 * no score, no transactions, not even her name. The lender checks each proof against the anchor
 * and the anchor against the issuer it trusts for that field, deletes the challenge (one use),
 * and keeps its quote in its own pod.
 */

import {
  buildDeliveredDocument,
  CashFlowCredential,
  DeliveredDocument,
  EmploymentIncomeCredential,
  MORT,
  ZkOperandAnchor,
} from "@mortgage/data-model";
import type { OrgSlug, PodOwner } from "@mortgage/demo-kit/registry";
import type { TierAProofJson, TierAStatement } from "@mortgage/vc-kit";
import { DataFactory } from "n3";
import { vcKit } from "../mortgage/vc.js";
import {
  at,
  PodRequestError,
  podUrl,
  put,
  putResource,
  readDataset,
  readText,
  remove,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { LOAN, MAYA, POLICY, usd } from "./facts.js";
import { CREDENTIAL_PATHS, mayaUrl } from "./grants.js";

export const PREQUALIFYING_LENDERS = ["fintech-lender", "bank"] as const;
export type PrequalifyingLender = (typeof PREQUALIFYING_LENDERS)[number];

const INCOME: TierAStatement = {
  bound: POLICY.minimumMonthlyIncomeUsd,
  field: MORT.monthlyGrossIncomeUsd,
  op: "ge",
};
const CASH_FLOW_SCORE: TierAStatement = {
  bound: POLICY.minimumCashFlowScore,
  field: MORT.cashFlowScoreValue,
  op: "ge",
};
const NO_RETURNED_PAYMENTS: TierAStatement = {
  bound: POLICY.maximumReturnedPayments,
  field: MORT.nsf90Count,
  op: "eq",
};

/** What each lender asks Maya to prove. */
export const LENDER_STATEMENTS: Readonly<Record<PrequalifyingLender, readonly TierAStatement[]>> =
  Object.freeze({
    bank: Object.freeze([INCOME, NO_RETURNED_PAYMENTS]),
    "fintech-lender": Object.freeze([INCOME, CASH_FLOW_SCORE, NO_RETURNED_PAYMENTS]),
  });

/** Where each provable value lives in Maya's pod, and whose anchor vouches for it. */
export const STATEMENT_SOURCES: Readonly<
  Record<string, { credential: string; anchor: string; issuer: PodOwner }>
> = Object.freeze({
  [MORT.cashFlowScoreValue]: {
    anchor: CREDENTIAL_PATHS.cashFlowAnchor,
    credential: CREDENTIAL_PATHS.cashFlow,
    issuer: "bank",
  },
  [MORT.monthlyGrossIncomeUsd]: {
    anchor: CREDENTIAL_PATHS.incomeAnchor,
    credential: CREDENTIAL_PATHS.income,
    issuer: "payroll",
  },
  [MORT.nsf90Count]: {
    anchor: CREDENTIAL_PATHS.returnedPaymentsAnchor,
    credential: CREDENTIAL_PATHS.cashFlow,
    issuer: "bank",
  },
});

/** The words a statement is shown with. */
export function statementLabel(statement: TierAStatement): string {
  if (statement.field === MORT.monthlyGrossIncomeUsd) {
    return `Monthly income of at least ${usd(statement.bound)}`;
  }
  if (statement.field === MORT.cashFlowScoreValue) {
    return `Cash-flow score of at least ${statement.bound}`;
  }
  if (statement.field === MORT.nsf90Count) return "No returned payments in 90 days";
  return `${statement.field} ${statement.op} ${statement.bound}`;
}

export interface LendingChallenge {
  readonly type: "PrequalificationChallenge";
  readonly lender: string;
  readonly nonce: string;
  readonly statements: readonly TierAStatement[];
}

export interface LendingPresentation {
  readonly type: "ThresholdPresentation";
  readonly holder: string;
  readonly challenge: string;
  readonly nonce: string;
  readonly statements: readonly {
    readonly statement: TierAStatement;
    readonly proof: TierAProofJson;
    /** The issuer-signed operand anchor, as stored in Maya's pod (Turtle). */
    readonly anchor: string;
  }[];
}

export function challengeUrl(world: Pick<World, "podOrigin">, lender: PrequalifyingLender): string {
  return podUrl(world, lender, "prequalification/maya");
}

export function quoteUrl(world: Pick<World, "podOrigin">, lender: PrequalifyingLender): string {
  return podUrl(world, lender, "quotes/maya");
}

/** The lender opens a pre-qualification: a fresh single-use nonce, readable by anyone. */
export async function openChallenge(
  world: World,
  lender: PrequalifyingLender,
): Promise<LendingChallenge> {
  const challenge: LendingChallenge = {
    lender: webid(world, lender),
    nonce: globalThis.crypto.randomUUID(),
    statements: LENDER_STATEMENTS[lender],
    type: "PrequalificationChallenge",
  };
  await put(
    world.fetchAs(lender),
    challengeUrl(world, lender),
    JSON.stringify(challenge),
    "application/json",
  );
  return challenge;
}

async function hiddenValue(world: World, field: string): Promise<number> {
  const source = STATEMENT_SOURCES[field];
  if (source === undefined) throw new Error(`no credential holds ${field}`);
  const url = mayaUrl(world, source.credential);
  const dataset = await readDataset(world.fetchAs(MAYA), url);
  if (field === MORT.monthlyGrossIncomeUsd) {
    return new EmploymentIncomeCredential(url, dataset, DataFactory).credentialSubject
      .monthlyGrossIncomeUsd;
  }
  const subject = new CashFlowCredential(url, dataset, DataFactory).credentialSubject;
  return field === MORT.cashFlowScoreValue ? subject.cashFlowScoreValue : subject.nsf90Count;
}

/**
 * Maya's wallet answers a lender's challenge from her own pod. The hidden values go into the
 * prover as private inputs and are in nothing this writes. Returns the presentation's URL in the
 * lender's inbox.
 */
export async function presentProofs(world: World, lender: PrequalifyingLender): Promise<string> {
  const maya = world.fetchAs(MAYA);
  const challenge = JSON.parse(
    await readText(maya, challengeUrl(world, lender), "application/json"),
  ) as LendingChallenge;
  const { proveTierA, tierAProofToJson } = await vcKit();
  const statements: LendingPresentation["statements"][number][] = [];
  for (const statement of challenge.statements) {
    const source = STATEMENT_SOURCES[statement.field];
    if (source === undefined) throw new Error(`cannot prove ${statement.field}`);
    const anchorUrl = mayaUrl(world, source.anchor);
    const anchor = await readText(maya, anchorUrl);
    const operandEnc = new ZkOperandAnchor(
      anchorUrl,
      await readDataset(maya, anchorUrl),
      DataFactory,
    ).credentialSubject.operandEnc;
    const proof = await proveTierA({
      nonce: challenge.nonce,
      operandEnc,
      statement,
      value: await hiddenValue(world, statement.field),
    });
    statements.push({ anchor, proof: tierAProofToJson(proof), statement });
  }
  const presentation: LendingPresentation = {
    challenge: challengeUrl(world, lender),
    holder: webid(world, MAYA),
    nonce: challenge.nonce,
    statements,
    type: "ThresholdPresentation",
  };
  const inbox = podUrl(world, lender, "inbox/");
  const response = await maya(inbox, {
    body: JSON.stringify(presentation),
    headers: { "content-type": "application/json", slug: "prequalification" },
    method: "POST",
  });
  const location = response.headers.get("location");
  if (!response.ok || location === null) throw new PodRequestError("POST", inbox, response.status);
  return new URL(location, inbox).href;
}

export interface LendingQuote {
  readonly lender: PrequalifyingLender;
  readonly qualified: boolean;
  readonly errors: readonly string[];
  /** The lender's own record of the outcome, in its pod. */
  readonly record: string;
  /** What the lender learned: one line per statement, true or false. */
  readonly proved: readonly { label: string; proved: boolean }[];
}

/** The quote each lender gives when every statement is proved. */
export function quoteText(lender: PrequalifyingLender): string {
  return lender === "fintech-lender"
    ? `Pre-qualified: ${usd(LOAN.amountFinancedUsd)} over 28 days, two payments of ${usd(LOAN.paymentAmountUsd, true)}, ${LOAN.annualPercentageRate}% APR. Not a commitment to lend.`
    : `Pre-qualified on income and returned payments: a ${usd(LOAN.amountFinancedUsd)} personal loan, subject to a credit check. Not a commitment to lend.`;
}

/**
 * The lender checks a presentation from its inbox: every statement it asked for, proved against
 * an anchor signed by the issuer it trusts for that field, for its own live nonce. The challenge
 * is deleted afterwards, pass or fail.
 */
export async function verifyQuote(
  world: World,
  lender: PrequalifyingLender,
  presentationUrl: string,
  time: string,
): Promise<LendingQuote> {
  const fetcher = world.fetchAs(lender);
  const presentation = JSON.parse(
    await readText(fetcher, presentationUrl, "application/json"),
  ) as LendingPresentation;
  const errors: string[] = [];
  const proved: { label: string; proved: boolean }[] = [];
  let live: LendingChallenge | undefined;
  try {
    live = JSON.parse(
      await readText(fetcher, challengeUrl(world, lender), "application/json"),
    ) as LendingChallenge;
  } catch {
    errors.push("no live challenge: it was already used or never opened");
  }
  if (live !== undefined) {
    const challenge = live;
    const { tierAProofFromJson, verifyTierA } = await vcKit();
    for (const asked of challenge.statements) {
      const offered = presentation.statements.find(
        (entry) =>
          entry.statement.field === asked.field &&
          entry.statement.op === asked.op &&
          entry.statement.bound === asked.bound,
      );
      const source = STATEMENT_SOURCES[asked.field];
      if (offered === undefined || source === undefined) {
        errors.push(`no proof for ${statementLabel(asked)}`);
        proved.push({ label: statementLabel(asked), proved: false });
        continue;
      }
      let used = false;
      const outcome = await verifyTierA(tierAProofFromJson(offered.proof), {
        anchorVc: offered.anchor,
        nonce: presentation.nonce,
        nonces: {
          consume: (_session, nonce) => {
            if (used || nonce !== challenge.nonce) return false;
            used = true;
            return true;
          },
        },
        now: at(world, time),
        sessionKey: challengeUrl(world, lender),
        statement: asked,
        statusFetch: fetcher,
        trustedIssuers: [webid(world, source.issuer)],
        webIdFetch: fetcher,
        webid: presentation.holder,
      });
      for (const error of outcome.errors) errors.push(`${statementLabel(asked)}: ${error.code}`);
      proved.push({ label: statementLabel(asked), proved: outcome.errors.length === 0 });
    }
    await remove(fetcher, challengeUrl(world, lender));
  }
  const qualified = errors.length === 0;
  const received = `Received: ${proved.length} proofs and ${proved.length} issuer anchors. Not received: a name, the income, the score, any transaction.`;
  const record = await putResource(
    fetcher,
    buildDeliveredDocument({
      about: presentationUrl,
      creator: webid(world, lender),
      description: qualified
        ? `${quoteText(lender)} ${received}`
        : `Not pre-qualified: ${errors.join("; ")}`,
      iri: quoteUrl(world, lender),
      issued: at(world, time),
      name: "Pre-qualification quote",
    }),
  );
  world.note({
    kind: "proof-verified",
    org: lender as OrgSlug,
    refs: [presentationUrl, record],
    text: qualified
      ? `${proved.length} threshold proofs verified against the issuers' anchors. The lender learned yes or no, and who vouches for it.`
      : "The presentation did not verify.",
  });
  return { errors, lender, proved, qualified, record };
}

/** The lender's quote, as it keeps it (undefined before step 6). */
export async function readQuote(
  world: World,
  lender: PrequalifyingLender,
): Promise<string | undefined> {
  const fetcher = world.fetchAs(lender);
  if ((await statusOf(fetcher, quoteUrl(world, lender))) !== 200) return undefined;
  return new DeliveredDocument(
    quoteUrl(world, lender),
    await readDataset(fetcher, quoteUrl(world, lender)),
    DataFactory,
  ).description;
}
