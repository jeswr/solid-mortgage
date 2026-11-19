// AUTHORED-BY Claude Opus 5.5
/**
 * The one handler set every /api/feedback/* function shares (one per function instance: the
 * rate limiter's counts live here). Files and folders under api/ that start with `_` are not
 * deployed as functions. Imports the feedback package's source, which Vercel's Node.js builder
 * compiles and traces, so the functions do not depend on the static build's output.
 */
import { createFeedbackHandlers } from "../../packages/feedback/src/server/handlers.js";

export const handlers = createFeedbackHandlers({ env: process.env });
