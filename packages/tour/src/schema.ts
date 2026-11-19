// AUTHORED-BY Claude Opus 5.5
/**
 * Tour step validation (design.md §d.6). Steps are data; `validateTour` checks their shape,
 * the editorial limits (title ≤ 8 words, body ≤ 45 words) and the cross-step rules, and returns
 * them typed as the `TourStep` contract from demo-kit.
 */
import { TOUR_STEP_LIMITS, type TourStep } from "@mortgage/demo-kit/contracts";
import { isAppSlug, isOrgSlug } from "@mortgage/demo-kit/registry";
import { z } from "zod";

export const CHIP_KINDS = [
  "pod read",
  "pod write",
  "grant",
  "credential",
  "proof",
  "denied",
  "no Solid in this step",
] as const;

const POD_KINDS = ["read", "write", "delete", "grant", "revoke", "denied"] as const;
const NOTE_KINDS = ["verified", "proof-verified", "org-to-org", "no-solid", "clock"] as const;

/** `data-tour` names: lower-case words joined by hyphens. */
export const TARGET_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const owner = z.string().refine((v) => v === "alex" || isOrgSlug(v), "unknown organisation slug");
const target = z
  .string()
  .regex(TARGET_NAME, "data-tour names are lower-case words joined by hyphens");

const podPartial = z.looseObject({
  kind: z.enum(POD_KINDS).optional(),
  pod: owner.optional(),
  path: z.string().optional(),
  method: z.string().optional(),
  status: z.number().int().optional(),
  actor: z.looseObject({ org: owner.optional() }).optional(),
});

const notePartial = z.looseObject({
  kind: z.enum(NOTE_KINDS).optional(),
  org: z.string().refine(isOrgSlug, "unknown organisation slug").optional(),
  text: z.string().optional(),
});

const expectItem = z
  .looseObject({})
  .refine((v) => Object.keys(v).length > 0, "an expect item may not be empty");

export const tourStepSchema = z
  .object({
    id: target,
    chapter: z.string().min(1),
    app: z.string().refine(isAppSlug, "unknown app slug"),
    path: z.string(),
    title: z
      .string()
      .min(1)
      .refine(
        (t) => wordCount(t) <= TOUR_STEP_LIMITS.titleWords,
        `title is longer than ${TOUR_STEP_LIMITS.titleWords} words`,
      ),
    body: z
      .string()
      .min(1)
      .refine(
        (t) => wordCount(t) <= TOUR_STEP_LIMITS.bodyWords,
        `body is longer than ${TOUR_STEP_LIMITS.bodyWords} words`,
      ),
    action: z.object({ target, label: z.string().min(1) }).optional(),
    done: z.object({
      event: podPartial.optional(),
      note: notePartial.optional(),
      target: target.optional(),
    }),
    mode: z.enum(["interactive", "summary"]),
    lens: z.object({
      headline: z.string().min(1),
      chips: z.array(z.object({ kind: z.enum(CHIP_KINDS), label: z.string().optional() })),
      notShared: z.array(z.string()).optional(),
    }),
    realWorld: z.object({
      stage: z.string().min(1),
      rule: z.string().optional(),
      source: z.string().optional(),
    }),
    clock: z.object({ day: z.number().int().positive() }).optional(),
    expect: z.array(expectItem),
  })
  .superRefine((step, ctx) => {
    const { event, note, target: doneTarget } = step.done;
    if (step.mode === "interactive" && !event && !note && !doneTarget) {
      ctx.addIssue({
        code: "custom",
        path: ["done"],
        message: "an interactive step needs a completion: event, note or target",
      });
    }
    if (event && note) {
      ctx.addIssue({
        code: "custom",
        path: ["done"],
        message: "give either done.event or done.note, not both",
      });
    }
    if (step.mode === "interactive" && !step.action) {
      ctx.addIssue({
        code: "custom",
        path: ["action"],
        message: "an interactive step needs an action for “Do it for me”",
      });
    }
  });

export interface ValidateOptions {
  /** Known `realWorld.source` ids; when given, every source must be one of them. */
  sources?: Iterable<string>;
}

export class TourValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`invalid tour:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "TourValidationError";
    this.issues = issues;
  }
}

/** Validate a list of steps; throws `TourValidationError` listing every problem. */
export function validateTour(steps: unknown[], opts: ValidateOptions = {}): TourStep[] {
  const issues: string[] = [];
  const out: TourStep[] = [];
  const ids = new Set<string>();
  const sources = opts.sources ? new Set(opts.sources) : undefined;
  steps.forEach((raw, i) => {
    const rawId = typeof raw === "object" && raw && "id" in raw ? raw.id : undefined;
    if (typeof rawId === "string") {
      if (ids.has(rawId)) issues.push(`step ${i + 1} (${rawId}): duplicate id`);
      ids.add(rawId);
    }
    const parsed = tourStepSchema.safeParse(raw);
    const label =
      typeof raw === "object" && raw && "id" in raw
        ? `step ${i + 1} (${String(raw.id)})`
        : `step ${i + 1}`;
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        issues.push(`${label} ${issue.path.join(".") || "(step)"}: ${issue.message}`);
      return;
    }
    const step = parsed.data;
    if (sources && step.realWorld.source !== undefined && !sources.has(step.realWorld.source)) {
      issues.push(`${label} realWorld.source: unknown source id ${step.realWorld.source}`);
    }
    out.push(raw as TourStep);
  });
  if (steps.length === 0) issues.push("a tour needs at least one step");
  if (issues.length > 0) throw new TourValidationError(issues);
  return out;
}
