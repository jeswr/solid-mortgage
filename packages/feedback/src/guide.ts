// AUTHORED-BY Claude Opus 5.5
/**
 * The feedback interview guide for EDMA members (adapted from the Solid Suite's pilot feedback
 * interview: user-centred and value-sensitive design practice). One guide drives three things:
 * the LLM interviewer's prompt (server), the plain questionnaire shown when the interviewer is
 * not switched on, and the validation of every stored answer.
 *
 * Stages follow a semi-structured interview: context, a walk back through what they saw (one
 * Single Ease Question per demo debriefed), Solid's role and the moments that clicked or did not
 * (critical incidents), credibility for their organisation, values (privacy, control, trust,
 * indirect stakeholders, with laddering), then UMUX-Lite, likelihood, one change and the EDMA
 * Solid Community of Practice, and a read-back the participant confirms.
 */
import { FEEDBACK_DEMOS } from "./demos.js";

export type Pathway = "guided" | "quick";
export type Answer = string | number | string[];
export type Answers = Record<string, Answer>;

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  /** Zero-based index into {@link STAGES}. */
  stage: number;
  text: string;
  type: "text" | "scale" | "choice" | "multi";
  options?: QuestionOption[];
  /** Scale maximum (scales start at 1), or the most options a multi-select takes. */
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  optional?: boolean;
  /** The demo a per-demo debrief question is about. */
  demo?: string;
}

export const STAGES = [
  "Opening",
  "About you",
  "The demos you saw",
  "Solid's role",
  "For your organisation",
  "Values",
  "Overall and what next",
  "Read-back and close",
] as const;

/** The value that records a skipped question. */
export const SKIPPED = "(skipped)";

/** Joins and splits multi-select values on the model's wire format. */
export const MULTI_DELIMITER = "|";

export const OPENING =
  "Thank you for looking at the Solid demos. This takes about ten minutes. Honest criticism helps us most: we want to know what did not convince you as much as what did. You can type or speak, and skip any question. Nothing is sent until you press Send at the end, and you can download a copy of your answers at any time.";

export const QUICK_OPENING =
  "Tell us anything, in your own words: something that worked, something that did not, or a question the demos left you with.";

const text = (id: string, stage: number, content: string, optional = false): Question => ({
  id,
  stage,
  text: content,
  type: "text",
  ...(optional ? { optional } : {}),
});

const scale = (
  id: string,
  stage: number,
  content: string,
  max = 7,
  minLabel = "Strongly disagree",
  maxLabel = "Strongly agree",
): Question => ({ id, stage, text: content, type: "scale", max, minLabel, maxLabel });

const choice = (id: string, stage: number, content: string, labels: string[]): Question => ({
  id,
  stage,
  text: content,
  type: "choice",
  options: labels.map((label) => ({ value: label, label })),
});

const demoOptions = (): QuestionOption[] =>
  FEEDBACK_DEMOS.map((demo) => ({ value: demo.id, label: demo.title }));

/** How many demos the guided interview debriefs one by one. */
export const MAX_DEBRIEFS = 3;

export const COMMUNITY_OPTIONS = [
  "Yes, the forum",
  "Yes, the weekly meeting",
  "Both",
  "Maybe later",
  "No, thank you",
] as const;

export const QUESTIONS: readonly Question[] = Object.freeze([
  text(
    "context_role",
    1,
    "What is your role, and what does your work with data involve day to day?",
  ),
  choice("context_org", 1, "Which best describes your organisation?", [
    "Bank or lender",
    "Insurer",
    "Asset manager or market infrastructure",
    "Government or regulator",
    "Healthcare",
    "Technology or data vendor",
    "Consultancy",
    "Other",
  ]),
  choice("context_solid", 1, "Before today, how familiar were you with Solid?", [
    "Not at all",
    "I had heard of it",
    "I had read about it",
    "I have built with it",
  ]),
  {
    id: "demos",
    stage: 2,
    text: "Which demos did you watch or try?",
    type: "multi",
    options: demoOptions(),
  },
  choice("demo_mode", 2, "Did you mostly watch the videos, try the guided tours, or both?", [
    "Watched the videos",
    "Tried the guided tours",
    "Both",
    "Looked around on my own",
  ]),
  {
    id: "debrief_demos",
    stage: 2,
    text: `You saw more than ${MAX_DEBRIEFS} demos. Which ${MAX_DEBRIEFS} would you like to talk about?`,
    type: "multi",
    max: MAX_DEBRIEFS,
    options: demoOptions(),
  },
  ...FEEDBACK_DEMOS.flatMap((demo): Question[] => [
    {
      ...text(
        `recall_${demo.id}`,
        2,
        `Thinking back to ${demo.title}, what stood out first, and then what?`,
      ),
      demo: demo.id,
    },
    {
      ...scale(
        `seq_${demo.id}`,
        2,
        `Overall, how easy or difficult was ${demo.title} to follow?`,
        7,
        "Very difficult",
        "Very easy",
      ),
      demo: demo.id,
    },
    { ...text(`seq_reason_${demo.id}`, 2, "Why that number?"), demo: demo.id },
  ]),
  scale("lens_clear", 3, "The Solid Lens made it clear what Solid was doing at each step."),
  text("lens_unclear", 3, "What, if anything, about Solid's role was still unclear?"),
  text(
    "incident_best",
    3,
    "Tell me about one moment that clicked. What did you expect, what happened, and what did you think next?",
  ),
  text(
    "incident_stuck",
    3,
    "Tell me about one moment you were confused, unconvinced or surprised. What did you expect, what happened, and what did you think next?",
  ),
  scale("credibility", 4, "This is credible as something my organisation could run."),
  text("org_fit", 4, "Which process in your organisation would this fit first, if any?"),
  text("org_needs", 4, "What would your organisation need to see before trying it?"),
  text("org_blockers", 4, "What would stop your organisation adopting it?"),
  text(
    "values_control",
    5,
    "In these demos the customer holds the data in their own pod. What, if anything, does that change for you or for your customers?",
  ),
  text("values_privacy", 5, "Did the demos handle privacy the way you would expect? Where not?"),
  text(
    "values_trust",
    5,
    "Who would need to trust this for it to work, such as customers, staff, regulators or partners, and would they?",
  ),
  text("values_tradeoff", 5, "Was anything a trade-off between convenience and control?"),
  text(
    "values_ladders",
    5,
    "Thinking of something you said you care about, why does that matter to you?",
    true,
  ),
  scale("umux_capabilities", 6, "The demos showed me what I needed to understand about Solid."),
  scale("umux_ease", 6, "The demos were easy to follow."),
  scale(
    "likelihood",
    6,
    "How likely are you to explore Solid further with your organisation?",
    5,
    "Very unlikely",
    "Very likely",
  ),
  text("one_change", 6, "What is the one thing you would change in the demos first?"),
  choice("community", 6, "Would you like to take part in the EDMA Solid Community of Practice?", [
    ...COMMUNITY_OPTIONS,
  ]),
  text("comments", 6, "Anything else?", true),
  text(
    "general",
    0,
    "Tell us about something that worked, something that did not, or a question the demos left you with.",
  ),
  {
    id: "confirmed",
    stage: 7,
    text: "Did I get that right? You can type corrections, or confirm the read-back.",
    type: "choice",
    options: [{ value: "yes", label: "Yes, that's right" }],
  },
]);

export const QUESTION_IDS: readonly string[] = Object.freeze(QUESTIONS.map((q) => q.id));

export function questionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

/** The demos chosen for one-by-one debriefs: the chosen subset, else the first few seen. */
export function debriefDemos(answers: Answers): string[] {
  const seen = Array.isArray(answers.demos) ? answers.demos : [];
  const picked = Array.isArray(answers.debrief_demos)
    ? answers.debrief_demos.filter((id) => seen.includes(id))
    : [];
  return (picked.length > 0 ? picked : seen).slice(0, MAX_DEBRIEFS);
}

/**
 * The guided interview's questions for these answers, in order: the per-demo debriefs only for
 * the demos being debriefed, the "which demos" narrowing only when more were seen than are
 * debriefed, and never the quick pathway's open question.
 */
export function interviewPlan(answers: Answers): Question[] {
  const seen = Array.isArray(answers.demos) ? answers.demos : [];
  const debriefed = debriefDemos(answers);
  return QUESTIONS.filter(
    (q) =>
      q.id !== "general" &&
      (q.id !== "debrief_demos" || seen.length > MAX_DEBRIEFS) &&
      (q.demo === undefined || debriefed.includes(q.demo)),
  );
}

/** The questions grouped by stage, for the plain questionnaire (opening and close left out). */
export function questionnaireSections(
  answers: Answers,
): { stage: string; questions: Question[] }[] {
  const plan = interviewPlan(answers).filter((q) => q.id !== "confirmed");
  return STAGES.map((stage, index) => ({
    stage,
    questions: plan.filter((q) => q.stage === index),
  })).filter((section) => section.questions.length > 0);
}

/** A display string for an answer: option labels for choices, "3 of 7" for ratings. */
export function displayAnswer(question: Question | undefined, value: Answer | undefined): string {
  if (value === undefined) return "";
  if (value === SKIPPED) return "Skipped";
  if (question?.type === "scale" && typeof value === "number") {
    return `${value} of ${question.max ?? 7}`;
  }
  const label = (raw: string) => question?.options?.find((o) => o.value === raw)?.label ?? raw;
  return Array.isArray(value) ? value.map(label).join(", ") : label(String(value));
}

/** A short local read-back (no interviewer): up to five of the participant's own answers. */
export function localSummary(answers: Answers): string {
  const picks = [
    "general",
    "incident_best",
    "incident_stuck",
    "lens_unclear",
    "org_needs",
    "values_control",
    "one_change",
    "comments",
  ]
    .map((id) => answers[id])
    .filter((v): v is string => typeof v === "string" && v.trim() !== "" && v !== SKIPPED);
  return (
    picks
      .slice(0, 5)
      .map((v) => `• ${v.slice(0, 600)}`)
      .join("\n") || "• You shared the answers recorded above."
  );
}
