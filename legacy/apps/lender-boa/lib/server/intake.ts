/**
 * The lender's application INTAKE for the local demo's loan-officer view
 * (`/pipeline`). When the borrower submits through the authenticated rail
 * (decision 0015), the lender records where that borrower's file lives — the
 * pod and documents derived from the VERIFIED caller, never from a request —
 * exactly as a real lender keeps its own record of applications received.
 *
 * Demo-only and fail-closed: the staff view is enabled ONLY when the operator
 * sets `MORTGAGE_DEMO_STAFF_VIEW=1` (the local `pnpm demo` does; deployments
 * do not), because the demo has no loan-officer login. In-memory: one entry
 * per borrower, gone on restart.
 */

export type IntakeChannel = "form" | "assistant";
export type IntakeStage = "submitted" | "clear-to-close";

export interface IntakeHousing {
  readonly monthlyRentUsd: number;
  /** Where the agent found it: the borrower's (simulated) inbox, or typed by hand. */
  readonly source: "email" | "manual";
}

export interface IntakeFile {
  readonly id: string;
  readonly webid: string;
  readonly podBase: string;
  readonly borrowerName: string;
  readonly applicationIri: string;
  readonly decisionIri: string;
  readonly submittedAt: string;
  readonly channel: IntakeChannel;
  readonly housing?: IntakeHousing;
  stage: IntakeStage;
  clearedAt?: string;
}

const REGISTRY = Symbol.for("mortgage.lender-boa.intake");
type Registry = Map<string, IntakeFile>;

function registry(): Registry {
  const scope = globalThis as { [REGISTRY]?: Registry };
  scope[REGISTRY] ??= new Map();
  return scope[REGISTRY];
}

export function staffViewEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env.MORTGAGE_DEMO_STAFF_VIEW === "1";
}

/** Record (or replace) the borrower's file. One file per borrower WebID. */
export function recordIntake(file: Omit<IntakeFile, "id" | "stage">): IntakeFile {
  const id = `file-${Buffer.from(file.webid).toString("base64url").slice(-12)}`;
  const entry: IntakeFile = { ...file, id, stage: "submitted" };
  registry().set(id, entry);
  return entry;
}

export function listIntake(): readonly IntakeFile[] {
  return [...registry().values()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function intakeFile(id: string): IntakeFile | undefined {
  return registry().get(id);
}

/** Parse the optional, display-only housing note an assistant submission carries. */
export function parseHousing(value: unknown): IntakeHousing | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { monthlyRentUsd, source } = value as Record<string, unknown>;
  if (typeof monthlyRentUsd !== "number" || !Number.isFinite(monthlyRentUsd)) return undefined;
  if (monthlyRentUsd < 0 || monthlyRentUsd > 100_000) return undefined;
  if (source !== "email" && source !== "manual") return undefined;
  return { monthlyRentUsd: Math.round(monthlyRentUsd), source };
}
