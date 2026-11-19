// AUTHORED-BY Claude Opus 5.5
/**
 * What the browser actually sent, observed by Playwright at the browser-context level: pages,
 * dedicated workers (the organisation agents) and the service worker itself. Requests a
 * service worker answers are reported with `fromServiceWorker`. This is the test's own record,
 * independent of anything the pod runtime or the Lens reports.
 */
import type { BrowserContext, Request } from "@playwright/test";
import { siteOrigin } from "./site.ts";

export interface ObservedRequest {
  seq: number;
  url: string;
  method: string;
  resourceType: string;
  /** Response status; undefined when the request failed or never completed. */
  status?: number;
  failure?: string;
  location?: string;
  /** `X-Demo-Agent`, `X-Demo-Via-Agent`, `X-Demo-Tour` as sent. */
  agent?: string;
  viaAgent: boolean;
  tour?: string;
  fromServiceWorker: boolean;
  /** Issued by the service worker itself (not by a page or a dedicated worker). */
  byServiceWorker: boolean;
}

export interface Recorder {
  requests: ObservedRequest[];
  /** Requests to another origin that the recorder aborted (they would have left the site). */
  foreign: string[];
  websockets: string[];
  /** Resolve once every request seen so far has its outcome recorded. */
  flush(): Promise<void>;
  /**
   * Every pod request (`/pods/**` on the site origin), in the order sent, answered or not: one
   * with no response has no `status`, so it can never stand for a logged response, but a report
   * can still say it was seen.
   */
  podRequests(): ObservedRequest[];
  /**
   * Resolve once no pod request has been in flight for `quietMs` (or after `timeoutMs`). A page
   * that is still working when the tour moves on loses its last requests from Playwright's view
   * as its document unloads, though the pod (and so the Lens) still answers them.
   */
  podIdle(quietMs?: number, timeoutMs?: number): Promise<boolean>;
}

const isPodUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.origin === siteOrigin() && /^\/pods(\/|$)/.test(parsed.pathname);
  } catch {
    return false;
  }
};

const isSiteUrl = (url: string): boolean => {
  if (!/^(https?|wss?):/i.test(url)) return true; // data:, blob:, about:, chrome-extension: …
  try {
    return new URL(url).origin === siteOrigin();
  } catch {
    return false;
  }
};

/** Start recording every request in `context`. Foreign requests are recorded, then aborted. */
export async function recordNetwork(context: BrowserContext): Promise<Recorder> {
  const requests: ObservedRequest[] = [];
  const byRequest = new Map<Request, ObservedRequest>();
  const pending = new Set<Promise<void>>();
  const foreign: string[] = [];
  const websockets: string[] = [];
  let seq = 0;
  const inFlight = new Set<Request>();
  let lastPodActivity = Date.now();
  const podDone = (request: Request) => {
    if (inFlight.delete(request)) lastPodActivity = Date.now();
  };

  await context.route(
    (url) => !isSiteUrl(url.href),
    async (route) => {
      foreign.push(`${route.request().method()} ${route.request().url()}`);
      await route.abort("blockedbyclient");
    },
  );

  context.on("request", (request) => {
    const headers = request.headers();
    const entry: ObservedRequest = {
      agent: headers["x-demo-agent"],
      byServiceWorker: request.serviceWorker() !== null,
      fromServiceWorker: false,
      method: request.method(),
      resourceType: request.resourceType(),
      seq: ++seq,
      tour: headers["x-demo-tour"],
      url: request.url(),
      viaAgent: headers["x-demo-via-agent"] === "1",
    };
    requests.push(entry);
    byRequest.set(request, entry);
    if (isPodUrl(entry.url)) {
      inFlight.add(request);
      lastPodActivity = Date.now();
    }
  });

  /**
   * Record the response the browser received. A request can also fail after its response headers
   * arrived (its body was cancelled or never read): the status it was answered with is still what
   * the browser saw, so it is kept, beside the failure.
   */
  const settle = (request: Request, failed: boolean) => {
    podDone(request);
    const entry = byRequest.get(request);
    if (entry === undefined) return;
    if (failed) entry.failure = request.failure()?.errorText ?? "failed";
    const job = (async () => {
      try {
        const response = await request.response();
        if (response !== null) {
          entry.status = response.status();
          entry.fromServiceWorker = response.fromServiceWorker();
          entry.location = response.headers().location;
        }
      } catch (error) {
        entry.failure ??= error instanceof Error ? error.message : String(error);
      }
    })();
    pending.add(job);
    void job.finally(() => pending.delete(job));
  };
  context.on("requestfinished", (request) => settle(request, false));
  context.on("requestfailed", (request) => settle(request, true));
  context.on("page", (page) => {
    page.on("websocket", (socket) => websockets.push(socket.url()));
  });
  for (const page of context.pages())
    page.on("websocket", (socket) => websockets.push(socket.url()));

  return {
    foreign,
    async flush() {
      await Promise.all([...pending]);
    },
    podRequests() {
      return requests.filter((r) => isPodUrl(r.url));
    },
    async podIdle(quietMs = 750, timeoutMs = 8_000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (inFlight.size === 0 && Date.now() - lastPodActivity >= quietMs) return true;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return false;
    },
    requests,
    websockets,
  };
}

export { isSiteUrl };
