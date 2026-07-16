/**
 * The AUS run (scenes 3 + 4): read the granted loan file, run the
 * DETERMINISTIC rules, and deliver the decision + findings BOTH ways —
 * back to the requesting party as the response payload AND into the
 * borrower's pod as the shape-validated `/mortgage/decision` document
 * (conditional PUT through the service identity's granted WAC write).
 *
 * A scene-4 re-run is the same call: after the stale employment credential
 * is re-issued through the existing grant, the run re-reads the loan file,
 * the evidence gate greens again, and the replacement decision overwrites
 * the previous one under its ETag.
 */
import { buildUnderwritingDecision, resourceToTurtle } from "@mortgage/data-model";
import {
  PodAccessError,
  type PodIoFetch,
  readPodResource,
  writePodTurtle,
} from "../../../lender-boa/lib/server/pod";
import {
  type AusEvidence,
  type AusFinding,
  type AusOutcome,
  type AusQualifying,
  decisionStatusIriOf,
  recommendationIriOf,
  runAusRules,
  VOE_RULE,
} from "../aus/rules";
import type { AusConfig } from "./config";
import { readGrantedLoanFile, type VerifySeams } from "./loan-file";

export interface UnderwriteOptions {
  /** The service identity's authenticated pod fetch (decision 0015 L4). */
  readonly podFetch: PodIoFetch;
  /** The AUS service WebID — recorded as the decision's creator. */
  readonly serviceWebId: string;
  readonly now?: () => Date;
  readonly seams?: VerifySeams;
}

/** Display labels for the outcome (role-based vocabulary only). */
const OUTCOME_LABELS: Readonly<Record<AusOutcome, string>> = {
  approve: "Approve",
  caution: "Caution",
  refer: "Refer",
};

export interface AusRunReport {
  readonly simulated: true;
  readonly outcome: AusOutcome;
  /** Display label of the outcome ("Approve" / "Refer" / "Caution"). */
  readonly recommendation: string;
  readonly findings: readonly AusFinding[];
  readonly evidence: readonly AusEvidence[];
  readonly qualifying: AusQualifying;
  readonly conditions: readonly string[];
  readonly applicationIri: string;
  /** Where the decision + findings landed in the borrower's pod. */
  readonly decisionIri: string;
  readonly evaluatedAt: string;
  /** The regulatory anchor the scene-4 evidence gate demonstrates. */
  readonly rule: string;
}

/**
 * Run the AUS over the granted loan file and write the decision back.
 * `pod` and `webid` are DERIVED from the authenticated caller by the route
 * boundary (decision 0015) — never from request parameters.
 */
export async function runUnderwriting(
  pod: string,
  webid: string,
  config: AusConfig,
  options: UnderwriteOptions,
): Promise<AusRunReport> {
  const now = (options.now ?? (() => new Date()))();
  const loanFile = await readGrantedLoanFile(pod, webid, config, {
    now,
    podFetch: options.podFetch,
    ...(options.seams !== undefined ? { seams: options.seams } : {}),
  });

  // The deterministic rule set — pure, clock-free, and IO-free.
  const result = runAusRules(loanFile.file);

  const decision = buildUnderwritingDecision({
    ...(result.outcome === "approve"
      ? { approvedAmountUsd: loanFile.file.requestedAmountUsd }
      : {}),
    ausRecommendation: recommendationIriOf(result.outcome),
    conditions: result.conditions,
    creator: options.serviceWebId,
    decisionStatus: decisionStatusIriOf(result.outcome),
    evaluates: loanFile.applicationIri,
    iri: loanFile.decisionIri,
    issued: now,
  });
  // SHACL-validates before any byte leaves the process.
  const turtle = await resourceToTurtle(decision);

  // Conditional PUT through the granted service write: a lost update can
  // never clobber, and a revoked grant fails the delivery closed.
  const existing = await readPodResource(loanFile.decisionIri, pod, options.podFetch);
  await writePodTurtle(loanFile.decisionIri, turtle, {
    etag: existing?.etag,
    podFetch: options.podFetch,
  });

  const label = OUTCOME_LABELS[result.outcome];
  if (label === undefined) throw new PodAccessError(500, "unreachable: unlabelled outcome");
  return {
    applicationIri: loanFile.applicationIri,
    conditions: result.conditions,
    decisionIri: loanFile.decisionIri,
    evaluatedAt: now.toISOString(),
    evidence: loanFile.file.evidence,
    findings: result.findings,
    outcome: result.outcome,
    qualifying: result.qualifying,
    recommendation: label,
    rule: VOE_RULE,
    simulated: true,
  };
}
