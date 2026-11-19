// AUTHORED-BY Claude Opus 5.5
/**
 * The feedback API's request guards: allowed origins, the visitor key for rate limiting, the
 * per-instance rate limiter and a size-capped body reader. Every guard fails closed.
 */
import { isIP } from "node:net";

export type FeedbackEnv = Readonly<Record<string, string | undefined>>;

/** An error whose message is safe to show the visitor (never upstream text, never a secret). */
export class FeedbackError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const json = (value: unknown, status = 200, extra: Record<string, string> = {}): Response =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
  });

/** The site's production origin; preview deployments are served same-origin. */
export const PRODUCTION_ORIGIN = "https://solid-mortgage.vercel.app";

/**
 * The request's `Origin` when it may use the feedback API, else undefined. Allowed: the API's own
 * origin, the production site, `VERCEL_PROJECT_PRODUCTION_URL`, and loopback for local runs; or,
 * when `FEEDBACK_ALLOWED_ORIGINS` is set, exactly that comma-separated list. A request with no
 * Origin header is refused (browsers send one on every cross-site and same-site POST).
 */
export function allowedOrigin(request: Request, env: FeedbackEnv): string | undefined {
  const origin = request.headers.get("origin");
  if (!origin) return undefined;
  const list = env.FEEDBACK_ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const defaults = [
    new URL(request.url).origin,
    PRODUCTION_ORIGIN,
    env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "",
  ];
  const matches = (list ?? defaults).some((value) => {
    try {
      return new URL(value).origin === origin;
    } catch {
      return false;
    }
  });
  if (matches) return origin;
  if (list === undefined) {
    try {
      const url = new URL(origin);
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
        url.origin === origin
      ) {
        return origin;
      }
    } catch {
      // A malformed origin is refused.
    }
  }
  return undefined;
}

/** The rate-limit key for an address: the IPv4 address, or the IPv6 /64, or "unknown". */
export function visitorKey(address: string): string {
  const bare = address.toLowerCase().split("%")[0] ?? "";
  if (isIP(bare) === 4) return bare;
  if (isIP(bare) !== 6) return "unknown";
  if (bare.startsWith("::ffff:") && bare.includes(".")) return bare.slice("::ffff:".length);
  const [head = "", tail = ""] = bare.split("::");
  const front = head ? head.split(":") : [];
  const back = tail ? tail.split(":") : [];
  const full = [
    ...front,
    ...Array<string>(Math.max(0, 8 - front.length - back.length)).fill("0"),
    ...back,
  ];
  return `${full
    .slice(0, 4)
    .map((s) => s.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

/**
 * The visitor's address as Vercel's edge reports it. Vercel overwrites `x-real-ip` and
 * `x-forwarded-for` on every request, so a client cannot choose its own key there.
 */
export function visitorOf(request: Request): string {
  return visitorKey(
    request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown",
  );
}

export type LimitKind = "turn" | "submit" | "audio" | "status";

const DAY = 86_400_000;

/** Per-visitor windows: [span in ms, most requests in that span]. */
export const VISITOR_WINDOWS: Readonly<
  Record<LimitKind, ReadonlyArray<readonly [number, number]>>
> = {
  turn: [
    [600_000, 30],
    [DAY, 120],
  ],
  submit: [[3_600_000, 5]],
  audio: [[3_600_000, 20]],
  status: [[60_000, 30]],
};

export const INSTANCE_CAPS: Readonly<Record<LimitKind, number>> = {
  turn: 2000,
  submit: 200,
  audio: 2000,
  status: 20_000,
};

/** The most visitors one instance tracks; past it, new visitors wait rather than evict others. */
export const MAX_VISITORS = 20_000;

/**
 * A per-instance rate limiter (each serverless instance keeps its own counts: a backstop against
 * one visitor running up the interviewer bill, not a global quota). Returns undefined when the
 * request may proceed, else the milliseconds to wait. Daily instance caps bound the total spend
 * of one instance; at capacity it refuses rather than evicting active visitors.
 */
export function createLimiter(
  now: () => number = Date.now,
  caps: Readonly<Record<LimitKind, number>> = INSTANCE_CAPS,
  maxVisitors = MAX_VISITORS,
) {
  const visitors = new Map<string, Record<LimitKind, number[]>>();
  let day = -1;
  let used: Record<LimitKind, number> = { turn: 0, submit: 0, audio: 0, status: 0 };
  return (key: string, kind: LimitKind): number | undefined => {
    const t = now();
    if (Math.floor(t / DAY) !== day) {
      day = Math.floor(t / DAY);
      used = { turn: 0, submit: 0, audio: 0, status: 0 };
    }
    if (used[kind] >= caps[kind]) return (day + 1) * DAY - t;
    for (const [id, v] of visitors) {
      if (![...v.turn, ...v.submit, ...v.audio, ...v.status].some((at) => t - at < DAY)) {
        visitors.delete(id);
      }
    }
    if (!visitors.has(key) && visitors.size >= maxVisitors) return 60_000;
    const v = visitors.get(key) ?? { turn: [], submit: [], audio: [], status: [] };
    v[kind] = v[kind].filter((at) => t - at < DAY);
    for (const [span, limit] of VISITOR_WINDOWS[kind]) {
      const recent = v[kind].filter((at) => t - at < span);
      if (recent.length >= limit) return span - (t - (recent[0] ?? t));
    }
    v[kind].push(t);
    visitors.set(key, v);
    used[kind]++;
    return undefined;
  };
}

export type Limiter = ReturnType<typeof createLimiter>;

const TOO_LARGE = "This feedback is too large to send. Download it to keep a copy.";

/** Read a request body, refusing it (413) as soon as it passes `max` bytes. */
export async function readBody(request: Request, max: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) throw new FeedbackError(413, TOO_LARGE);
  const reader = request.body?.getReader();
  if (reader === undefined) throw new FeedbackError(400, "Send a request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new FeedbackError(413, TOO_LARGE);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
