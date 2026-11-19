// AUTHORED-BY Claude Opus 5.5
/** `GET /api/feedback/status` (Vercel Node.js runtime). See packages/feedback/src/server/handlers.ts. */
import { handlers } from "./_handlers.js";

export function GET(request: Request): Promise<Response> {
  return handlers.status(request);
}

export function OPTIONS(request: Request): Response {
  return handlers.options(request);
}
