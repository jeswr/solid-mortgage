// AUTHORED-BY Claude Opus 5.5
/** `POST /api/feedback/submit` (Vercel Node.js runtime). See packages/feedback/src/server/handlers.ts. */
import { handlers } from "./_handlers.js";

export function POST(request: Request): Promise<Response> {
  return handlers.submit(request);
}

export function OPTIONS(request: Request): Response {
  return handlers.options(request);
}
