/**
 * The loan-officer pipeline over the intake registry (see `intake.ts`): each
 * file's application and decision are read LIVE from the borrower's pod, and
 * "clear to close" writes the final decision back into it — the lender's own
 * write under the borrower's grant (decision 0015 L4; the same pod-IO path
 * the application submit uses).
 */
import {
  buildUnderwritingDecision,
  MORT,
  PERSONA_VALUES,
  resourceToTurtle,
  UnderwritingDecision,
} from "@mortgage/data-model";
import { DataFactory } from "n3";
import type { LenderConfig } from "./config";
import { type IntakeFile, intakeFile, listIntake } from "./intake";
import { assertAllowedPodBase, readPodResource, writePodTurtle } from "./pod";

export interface PipelineFile {
  readonly id: string;
  readonly borrowerName: string;
  readonly webid: string;
  readonly channel: IntakeFile["channel"];
  readonly submittedAt: string;
  readonly stage: IntakeFile["stage"];
  readonly housing?: IntakeFile["housing"];
  readonly applicationIri: string;
  readonly applicationInPod: boolean;
  readonly decisionIri: string;
  /** The decision status read from the pod (local name, e.g. `ApprovedWithConditions`). */
  readonly decisionStatus?: string;
  /** The AUS recommendation recorded on the decision (local name, e.g. `Approve`). */
  readonly ausRecommendation?: string;
  readonly conditions: readonly string[];
}

const localName = (iri: string) =>
  iri.slice(Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("-")) + 1);

async function view(file: IntakeFile, config: LenderConfig): Promise<PipelineFile> {
  const base = assertAllowedPodBase(file.podBase, config);
  const application = await readPodResource(file.applicationIri, base);
  const decision = await readPodResource(file.decisionIri, base);
  let decisionStatus: string | undefined;
  let ausRecommendation: string | undefined;
  let conditions: string[] = [];
  if (decision !== undefined) {
    try {
      const wrapped = new UnderwritingDecision(file.decisionIri, decision.dataset, DataFactory);
      decisionStatus = localName(wrapped.decisionStatus);
      conditions = [...wrapped.conditions];
      const recommendation = wrapped.ausRecommendation;
      ausRecommendation = recommendation === undefined ? undefined : localName(recommendation);
    } catch {
      decisionStatus = undefined;
    }
  }
  return {
    id: file.id,
    borrowerName: file.borrowerName,
    webid: file.webid,
    channel: file.channel,
    submittedAt: file.submittedAt,
    stage: file.stage,
    ...(file.housing !== undefined ? { housing: file.housing } : {}),
    applicationIri: file.applicationIri,
    applicationInPod: application !== undefined,
    decisionIri: file.decisionIri,
    ...(decisionStatus !== undefined ? { decisionStatus } : {}),
    ...(ausRecommendation !== undefined ? { ausRecommendation } : {}),
    conditions,
  };
}

function existingAusRecommendation(
  iri: string,
  dataset: ConstructorParameters<typeof UnderwritingDecision>[1] | undefined,
): string | undefined {
  if (dataset === undefined) return undefined;
  try {
    return new UnderwritingDecision(iri, dataset, DataFactory).ausRecommendation;
  } catch {
    return undefined;
  }
}

export async function readPipeline(config: LenderConfig): Promise<readonly PipelineFile[]> {
  return Promise.all(listIntake().map((file) => view(file, config)));
}

/** Conditions satisfied (employment re-verified): write the final approval into the pod. */
export async function clearToClose(
  id: string,
  config: LenderConfig,
  now: Date = new Date(),
): Promise<PipelineFile | undefined> {
  const file = intakeFile(id);
  if (file === undefined) return undefined;
  const base = assertAllowedPodBase(file.podBase, config);
  const values = PERSONA_VALUES[0];
  if (values === undefined) throw new Error("persona values missing");
  const existing = await readPodResource(file.decisionIri, base);
  // Keep whatever the AUS recorded (or its absence): clear to close is the
  // underwriter's step and never invents an AUS recommendation.
  const ausRecommendation = existingAusRecommendation(file.decisionIri, existing?.dataset);
  const decision = buildUnderwritingDecision({
    iri: file.decisionIri,
    evaluates: file.applicationIri,
    decisionStatus: MORT.DecisionStatus_Approved,
    conditions: [],
    approvedAmountUsd: values.approvedLoanUsd,
    ...(ausRecommendation !== undefined ? { ausRecommendation } : {}),
    issued: now,
    creator: "https://lender.example/orgs/underwriting#id",
  });
  await writePodTurtle(file.decisionIri, await resourceToTurtle(decision), {
    etag: existing?.etag,
  });
  file.stage = "clear-to-close";
  file.clearedAt = now.toISOString();
  return view(file, config);
}
