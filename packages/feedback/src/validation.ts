// AUTHORED-BY Claude Opus 5.5
/**
 * Validation for everything the feedback page sends and the interviewer returns. Strict objects
 * everywhere (an unknown field fails), every string capped, every answer checked against its
 * question: ratings are integers in range, choices are option values, multi-selects are subsets.
 * Shared by the browser (to keep a draft valid) and the /api/feedback/* handlers (fail closed).
 */
import { z } from "zod";
import {
  type Answer,
  type Answers,
  MULTI_DELIMITER,
  QUESTIONS,
  questionById,
  SKIPPED,
} from "./guide.js";

/** The longest single answer or message, in characters. */
export const MAX_ANSWER = 4000;
/** The most characters of conversation one interviewer turn sends upstream. */
export const MAX_TURN_CHARACTERS = 24_000;
/** The most messages one interviewer turn carries (the opening plus the newest exchanges). */
export const MAX_TURN_MESSAGES = 40;
/** The most recordings one submission carries. */
export const MAX_RECORDINGS = 10;

const skipped = z.literal(SKIPPED);

const answerFields: Record<string, z.ZodType> = Object.fromEntries(
  QUESTIONS.map((q) => {
    const values = (q.options ?? []).map((o) => o.value);
    const field =
      q.type === "scale"
        ? z.union([
            z
              .number()
              .int()
              .min(1)
              .max(q.max ?? 7),
            skipped,
          ])
        : q.type === "multi"
          ? z.union([
              z.array(z.enum(values as [string, ...string[]])).max(q.max ?? values.length),
              skipped,
            ])
          : q.type === "choice"
            ? z.union([z.enum(values as [string, ...string[]]), skipped])
            : z.string().max(MAX_ANSWER);
    return [q.id, field.optional()];
  }),
);
answerFields.summary = z.string().max(MAX_ANSWER).optional();

export const answersSchema = z.object(answerFields).strict();

export function validateAnswers(input: unknown): Answers {
  return answersSchema.parse(input) as Answers;
}

const pathway = z.enum(["guided", "quick"]);

export const messageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(MAX_ANSWER),
  })
  .strict();
export type Message = z.infer<typeof messageSchema>;

/** Where the visitor came from: an app slug (lower-case letters, digits, `-`, `_`) or nothing. */
const fromSlug = z
  .string()
  .max(40)
  .regex(/^[a-z0-9_-]*$/);

export const turnSchema = z
  .object({
    pathway,
    messages: z.array(messageSchema).min(1).max(MAX_TURN_MESSAGES),
    answers: answersSchema,
    from: fromSlug.optional(),
  })
  .strict()
  .refine(
    (turn) =>
      turn.messages[turn.messages.length - 1]?.role === "user" &&
      turn.messages.every((m, i) => i === 0 || m.role !== turn.messages[i - 1]?.role),
    "The conversation must alternate and end with the participant's answer.",
  );

export interface Turn {
  pathway: "guided" | "quick";
  messages: Message[];
  answers: Answers;
  from: string;
}

/**
 * Validate one interviewer turn. When the conversation is longer than
 * {@link MAX_TURN_CHARACTERS}, the oldest exchanges after the opening are dropped (in pairs, so
 * it still alternates); a turn that is still too long fails.
 */
export function validateTurn(input: unknown): Turn {
  const turn = turnSchema.parse(input);
  const answers = validateAnswers(turn.answers);
  const bounded = turn.messages.map((m) => ({ role: m.role, content: m.content }));
  const contextSize = JSON.stringify(answers).length + 80;
  const total = () => contextSize + bounded.reduce((sum, m) => sum + m.content.length, 0);
  while (total() > MAX_TURN_CHARACTERS && bounded.length > 3) bounded.splice(1, 2);
  if (total() > MAX_TURN_CHARACTERS) {
    throw new z.ZodError([
      { code: "custom", message: "The conversation is too long.", path: ["messages"], input },
    ]);
  }
  return { pathway: turn.pathway, messages: bounded, answers, from: turn.from ?? "" };
}

/** An option's value from what the model wrote (the value or the label, any case). */
function optionValue(id: string, raw: string): string | undefined {
  const wanted = raw.trim().toLowerCase();
  return questionById(id)?.options?.find(
    (o) => o.value.toLowerCase() === wanted || o.label.toLowerCase() === wanted,
  )?.value;
}

/**
 * Convert the interviewer's string updates into typed answers, one field at a time. A value the
 * model got wrong (a fractional rating, an unknown option, an unknown id) is dropped, so the
 * interviewer asks again rather than the turn failing or an answer being invented.
 */
export function coerceUpdates(updates: readonly { id: string; value: string }[]): Answers {
  const answers: Answers = {};
  for (const { id, value } of updates) {
    const question = questionById(id);
    if (question === undefined && id !== "summary") continue;
    let candidate: Answer;
    if (value === SKIPPED) candidate = value;
    else if (question?.type === "scale") {
      const trimmed = value.trim();
      const number = Number(trimmed);
      if (trimmed === "" || !Number.isInteger(number)) continue;
      candidate = number;
    } else if (question?.type === "multi") {
      const picked = value
        .split(MULTI_DELIMITER)
        .map((v) => optionValue(id, v))
        .filter((v): v is string => v !== undefined);
      if (picked.length === 0) continue;
      candidate = [...new Set(picked)];
    } else if (question?.type === "choice") {
      const picked = optionValue(id, value);
      if (picked === undefined) continue;
      candidate = picked;
    } else candidate = value;
    if (answerFields[id]?.safeParse(candidate).success) answers[id] = candidate;
  }
  return validateAnswers(answers);
}

export const transcriptEntrySchema = messageSchema
  .extend({
    audio: z
      .array(
        z
          .number()
          .int()
          .min(0)
          .max(MAX_RECORDINGS - 1),
      )
      .max(MAX_RECORDINGS)
      .optional(),
  })
  .strict();
export type TranscriptEntry = z.infer<typeof transcriptEntrySchema>;

export const submissionSchema = z
  .object({
    pathway,
    /** `interview` when the LLM interviewer ran, `questionnaire` for the plain form. */
    mode: z.enum(["interview", "questionnaire"]),
    answers: answersSchema,
    transcript: z.array(transcriptEntrySchema).max(160),
    contact: z
      .object({
        name: z.string().max(120),
        email: z.union([z.literal(""), z.email().max(254)]),
      })
      .strict(),
    metadata: z
      .object({
        version: z.string().max(100),
        from: fromSlug,
        userAgent: z.string().max(1000),
      })
      .strict(),
  })
  .strict();

export interface Submission {
  pathway: "guided" | "quick";
  mode: "interview" | "questionnaire";
  answers: Answers;
  transcript: TranscriptEntry[];
  contact: { name: string; email: string };
  metadata: { version: string; from: string; userAgent: string };
}

/** Validate a submission and rebuild it field by field (nothing unvalidated is carried over). */
export function validateSubmission(input: unknown): Submission {
  const s = submissionSchema.parse(input);
  return {
    pathway: s.pathway,
    mode: s.mode,
    answers: validateAnswers(s.answers),
    transcript: s.transcript.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.audio === undefined ? {} : { audio: [...m.audio] }),
    })),
    contact: { name: s.contact.name, email: s.contact.email },
    metadata: {
      version: s.metadata.version,
      from: s.metadata.from,
      userAgent: s.metadata.userAgent,
    },
  };
}
