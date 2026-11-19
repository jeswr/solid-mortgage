// AUTHORED-BY Claude Opus 5.5
/**
 * The /api/feedback/* handlers, as Web-standard `Request -> Response` functions (the Vercel
 * Node.js runtime calls them from `api/feedback/*.ts`). Every request passes the origin check
 * and the rate limiter; every body is size-capped and validated; every error the visitor sees is
 * one of ours (never an upstream body); nothing about a request or a secret is logged.
 *
 * - `GET  /api/feedback/status`  `{ interviewer, sending }`: two booleans, nothing else; sending
 *   is on only after the repository answered as private (checked at most every few minutes)
 * - `POST /api/feedback/turn`    one interviewer turn (needs ANTHROPIC_API_KEY)
 * - `POST /api/feedback/audio?submission=<id>`  store a recording for that submission, answer a
 *   signed receipt (needs storage; the page uploads only when the visitor presses Send)
 * - `POST /api/feedback/submit`  store the record and open the issue (needs storage); idempotent
 *   on the submission's id
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { questionById } from "../guide.js";
import type { FeedbackStatus } from "../links.js";
import {
  coerceUpdates,
  MAX_ANSWER,
  SUBMISSION_ID,
  type Turn,
  validateAnswers,
  validateSubmission,
  validateTurn,
} from "../validation.js";
import { validateAudio } from "./audio.js";
import { buildModelRequest, type ModelRequest } from "./prompt.js";
import { MAX_AUDIO_BYTES, verifyReceipts } from "./receipts.js";
import {
  allowedOrigin,
  createLimiter,
  type FeedbackEnv,
  FeedbackError,
  json,
  type Limiter,
  type LimitKind,
  readBody,
  visitorOf,
} from "./security.js";
import { createGithubStore, type FeedbackStore, storageConfigured } from "./store.js";

/** The interviewer: one Messages API call that returns the reply's JSON text. */
export interface InterviewClient {
  complete(request: ModelRequest): Promise<string>;
}

export const MAX_TURN_BYTES = 240_000;
export const MAX_SUBMIT_BYTES = 1_000_000;

/** The Anthropic interviewer. No retries (the page falls back to the questionnaire), no logging. */
export function anthropicClient(apiKey: string): InterviewClient {
  return {
    async complete(request) {
      // No logs, no OpenTelemetry spans: interview content never reaches a log or a tracer.
      const client = new Anthropic({
        apiKey,
        maxRetries: 0,
        timeout: 60_000,
        logLevel: "off",
        openTelemetry: false,
      });
      const response = await client.messages.create(request);
      // A refusal, a cut-off reply or anything but a finished turn: the page carries on without it.
      if (response.stop_reason !== "end_turn") {
        throw new FeedbackError(
          502,
          "The interviewer couldn't finish that reply. Your feedback is still here.",
        );
      }
      return response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
    },
  };
}

/**
 * What the page may know about the configuration: whether each half is switched on. Sending
 * counts as on only when `storageReady` (the repository answered as private) says so.
 */
export function feedbackStatus(env: FeedbackEnv, storageReady = true): FeedbackStatus {
  return {
    interviewer: Boolean(env.ANTHROPIC_API_KEY?.trim()),
    sending: storageConfigured(env) && storageReady,
  };
}

/** How long a storage check stands: a success for ten minutes, a failure for one. */
export const READY_TTL = 600_000;
export const NOT_READY_TTL = 60_000;

const replySchema = z
  .object({
    reply: z.string().min(1).max(MAX_ANSWER),
    updates: z
      .array(z.object({ id: z.string().max(80), value: z.string().max(MAX_ANSWER) }).strict())
      .max(100),
    nextQuestionId: z.string().max(80),
    done: z.boolean(),
  })
  .strict();

const CONFIRMATION = /^(yes|yes[,.]? that'?s right|correct|that'?s right)[.!]?$/i;

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** The interviewer's read-back message: its reply when that shows the summary verbatim. */
function readBack(reply: string, summary: string): string {
  if (squash(reply).includes(squash(summary))) return reply;
  const composed = `${summary}\n\nDid I get that right?`;
  return composed.length <= MAX_ANSWER ? composed : summary;
}

/**
 * Whether this turn is the participant confirming the read-back they were shown: the previous
 * message is the interviewer's, it shows the summary the page holds word for word, and the
 * participant's answer is a plain yes. Nothing else (the model's say-so, a client's
 * `confirmed`) counts as a confirmation.
 */
function confirmsReadBack(turn: Turn): boolean {
  const summary = turn.answers.summary;
  const last = turn.messages[turn.messages.length - 1];
  const previous = turn.messages[turn.messages.length - 2];
  return (
    typeof summary === "string" &&
    squash(summary) !== "" &&
    previous?.role === "assistant" &&
    squash(previous.content).includes(squash(summary)) &&
    last?.role === "user" &&
    CONFIRMATION.test(last.content.trim())
  );
}

export interface HandlerOptions {
  env: FeedbackEnv;
  client?: InterviewClient;
  store?: FeedbackStore;
  limiter?: Limiter;
  now?: () => number;
}

export function createFeedbackHandlers(options: HandlerOptions) {
  const { env } = options;
  const limiter = options.limiter ?? createLimiter();
  // A fresh store per write re-checks the repository's privacy and the current credentials.
  const storage = () => options.store ?? createGithubStore(env);
  const now = options.now ?? Date.now;
  let readiness: { ready: Promise<boolean>; until: number } | undefined;
  /** Whether the repository answered as private recently (cached, so status stays cheap). */
  const storageReady = (): Promise<boolean> => {
    if (!storageConfigured(env)) return Promise.resolve(false);
    if (readiness === undefined || readiness.until <= now()) {
      const entry = {
        ready: storage()
          .ready()
          .catch(() => false),
        until: now() + NOT_READY_TTL,
      };
      void entry.ready.then((ok) => {
        entry.until = now() + (ok ? READY_TTL : NOT_READY_TTL);
      });
      readiness = entry;
    }
    return readiness.ready;
  };

  async function protect(
    request: Request,
    kind: LimitKind,
    action: () => Promise<Response>,
  ): Promise<Response> {
    const origin = allowedOrigin(request, env);
    if (origin === undefined) {
      return json({ error: "Feedback can be sent from the demo site's own pages only." }, 403);
    }
    const cors = { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
    try {
      const wait = limiter(visitorOf(request), kind);
      if (wait !== undefined) {
        return json(
          {
            error:
              "You've reached the feedback allowance for now. Please try again later, or download your feedback.",
          },
          429,
          { ...cors, "Retry-After": String(Math.ceil(wait / 1000)) },
        );
      }
      const response = await action();
      for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
      return response;
    } catch (error) {
      if (error instanceof FeedbackError) return json({ error: error.message }, error.status, cors);
      if (
        error instanceof z.ZodError ||
        error instanceof SyntaxError ||
        error instanceof TypeError
      ) {
        return json(
          { error: "The feedback request is not valid. Check the fields and try again." },
          400,
          cors,
        );
      }
      return json(
        {
          error:
            "We couldn't save or process that feedback. It is still on the page: you can download a copy.",
        },
        502,
        cors,
      );
    }
  }

  const requireJson = (request: Request) => {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      throw new FeedbackError(415, "Send JSON.");
    }
  };

  const parseJson = async (request: Request, max: number): Promise<unknown> =>
    JSON.parse(new TextDecoder().decode(await readBody(request, max)));

  return {
    /** `GET /api/feedback/status`. Same-origin pages need no Origin header for a GET. */
    async status(request: Request): Promise<Response> {
      const origin = allowedOrigin(request, env);
      const wait = limiter(visitorOf(request), "status");
      const headers: Record<string, string> =
        origin === undefined ? {} : { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
      if (wait !== undefined) {
        return json({ error: "Too many requests." }, 429, {
          ...headers,
          "Retry-After": String(Math.ceil(wait / 1000)),
        });
      }
      return json(feedbackStatus(env, await storageReady()), 200, headers);
    },

    options(request: Request): Response {
      const origin = allowedOrigin(request, env);
      if (origin === undefined) return json({ error: "Origin not allowed." }, 403);
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600",
          Vary: "Origin",
        },
      });
    },

    turn(request: Request): Promise<Response> {
      return protect(request, "turn", async () => {
        requireJson(request);
        const turn = validateTurn(await parseJson(request, MAX_TURN_BYTES));
        const key = env.ANTHROPIC_API_KEY?.trim();
        if (!key) {
          throw new FeedbackError(
            503,
            "The interviewer isn't switched on yet. You can use the questionnaire.",
          );
        }
        let raw: unknown;
        try {
          const text = await (options.client ?? anthropicClient(key)).complete(
            buildModelRequest(turn, env.FEEDBACK_MODEL?.trim() || undefined),
          );
          raw = JSON.parse(text);
        } catch {
          throw new FeedbackError(
            502,
            "The interviewer couldn't reply. Your answer is still here: try again or use the questionnaire.",
          );
        }
        const parsed = replySchema.safeParse(raw);
        if (!parsed.success) {
          throw new FeedbackError(
            502,
            "The interviewer's reply was not usable. Please use the questionnaire.",
          );
        }
        const reply = parsed.data;
        const merged = validateAnswers({ ...turn.answers, ...coerceUpdates(reply.updates) });
        const question =
          reply.nextQuestionId === "none" ? undefined : questionById(reply.nextQuestionId);
        if (reply.nextQuestionId !== "none" && question === undefined) {
          throw new FeedbackError(
            502,
            "The interviewer chose an unknown question. Please use the questionnaire.",
          );
        }
        // Only the participant confirms the read-back, and only the one they were shown: a
        // confirming turn keeps that summary (the model cannot swap it), every other turn
        // clears any "confirmed".
        const confirmed = confirmsReadBack(turn);
        if (confirmed) {
          merged.summary = turn.answers.summary as string;
          merged.confirmed = "yes";
        } else delete merged.confirmed;
        const done = reply.done && confirmed;
        if (!done && question === undefined) {
          throw new FeedbackError(
            502,
            "The interviewer couldn't choose a next question. Please use the questionnaire.",
          );
        }
        // A read-back shows the stored summary word for word, so a "yes" confirms exactly it.
        let text = reply.reply;
        if (!done && question?.id === "confirmed") {
          if (typeof merged.summary !== "string" || squash(merged.summary) === "") {
            throw new FeedbackError(
              502,
              "The interviewer couldn't read back your answers. Please use the questionnaire.",
            );
          }
          text = readBack(reply.reply, merged.summary);
        }
        return json({
          reply: text,
          answers: merged,
          ...(question ? { question } : {}),
          done,
        });
      });
    },

    audio(request: Request): Promise<Response> {
      return protect(request, "audio", async () => {
        if (!storageConfigured(env)) {
          throw new FeedbackError(503, "Sending feedback isn't switched on yet. Download a copy.");
        }
        const submission = new URL(request.url).searchParams.get("submission") ?? "";
        if (!SUBMISSION_ID.test(submission)) {
          throw new FeedbackError(400, "A recording must name the feedback it belongs to.");
        }
        const bytes = await readBody(request, MAX_AUDIO_BYTES);
        const audio = validateAudio(bytes, request.headers.get("content-type") ?? "");
        return json(await storage().upload(audio, submission));
      });
    },

    submit(request: Request): Promise<Response> {
      return protect(request, "submit", async () => {
        requireJson(request);
        if (!storageConfigured(env)) {
          throw new FeedbackError(503, "Sending feedback isn't switched on yet. Download a copy.");
        }
        const data = z
          .object({ record: z.unknown(), receipts: z.unknown() })
          .strict()
          .parse(await parseJson(request, MAX_SUBMIT_BYTES));
        const submission = validateSubmission(data.record);
        const receipts = verifyReceipts(data.receipts ?? [], submission.id, env);
        if (submission.transcript.some((m) => m.audio?.some((i) => i >= receipts.length))) {
          throw new FeedbackError(400, "A recording is missing from the feedback.");
        }
        return json(await storage().save(submission, receipts));
      });
    },
  };
}

export type FeedbackHandlers = ReturnType<typeof createFeedbackHandlers>;
