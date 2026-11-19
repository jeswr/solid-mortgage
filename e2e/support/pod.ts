// AUTHORED-BY Claude Opus 5.5
/**
 * Talking to the in-browser pods from a test, the way the apps do.
 *
 * - `podRequest` sends an ordinary fetch from the page to `/pods/**`. The pod runtime's service
 *   worker answers it and the wasm Solid server evaluates WAC as the identity the request
 *   declares with `X-Demo-Agent` (path mode, design.md §d.2 and §d.5). No header is anonymous.
 *   Nothing is mocked: the access decision is the pod server's.
 * - `podLog` asks the service worker for its event log with the runtime's `{ type: "events" }`
 *   control message (the same call `onEvent({ replay: true })` makes). That log is what the
 *   Solid Lens and the journey ledger are fed from.
 */
import type { Page } from "@playwright/test";
import type { LensEntry, PodEvent } from "../../packages/demo-kit/src/contracts/index.ts";
import { type AppSlug, type PodOwner, siteOrigin } from "./site.ts";

export type { LensEntry, PodEvent };
export type PodEntry = { source: "pod" } & PodEvent;

export function isPodEntry(entry: LensEntry): entry is PodEntry {
  return entry.source === "pod";
}

export interface PodResponse {
  url: string;
  status: number;
  contentType: string | null;
  body: string;
}

/** The absolute URL of `path` in `owner`'s pod. */
export function podUrl(owner: PodOwner, path: string): string {
  return `${siteOrigin()}/pods/${owner}/${path.replace(/^\/+/, "")}`;
}

/**
 * Send one request to a pod from the page, as app `as` (its `X-Demo-Agent`), or anonymously
 * when `as` is null.
 */
export async function podRequest(
  page: Page,
  as: AppSlug | null,
  owner: PodOwner,
  path: string,
  init: { method?: string; accept?: string } = {},
): Promise<PodResponse> {
  const url = podUrl(owner, path);
  return page.evaluate(
    async ({ url, as, method, accept }) => {
      const headers: Record<string, string> = { Accept: accept };
      if (as !== null) headers["X-Demo-Agent"] = as;
      // A pod that never answers fails the request (and names it) instead of hanging the suite.
      const response = await fetch(url, {
        cache: "no-store",
        headers,
        method,
        signal: AbortSignal.timeout(30_000),
      });
      const body = method === "HEAD" ? "" : await response.text();
      return {
        body,
        contentType: response.headers.get("content-type"),
        status: response.status,
        url,
      };
    },
    { accept: init.accept ?? "text/turtle", as, method: init.method ?? "GET", url },
  );
}

/** The pod runtime's event log, oldest first (every pod event and app note). */
export async function podLog(page: Page): Promise<LensEntry[]> {
  const reply = await page.evaluate(
    () =>
      new Promise<{ ok: boolean; events?: unknown[]; error?: string } | null>((resolve, reject) => {
        const controller = navigator.serviceWorker?.controller;
        if (!controller) {
          resolve(null);
          return;
        }
        const channel = new MessageChannel();
        const timer = setTimeout(() => reject(new Error("the pod runtime did not answer")), 15_000);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          resolve(event.data);
        };
        controller.postMessage({ type: "events" }, [channel.port2]);
      }),
  );
  if (reply === null) throw new Error(`no pod runtime service worker controls ${page.url()}`);
  if (!reply.ok) throw new Error(`the pod runtime refused the events request: ${reply.error}`);
  return [...((reply.events ?? []) as LensEntry[])].sort((a, b) => a.id - b.id);
}

/** Retry `podLog` across navigations. */
export async function podLogSoon(page: Page, timeout = 15_000): Promise<LensEntry[]> {
  const until = Date.now() + timeout;
  let last: unknown;
  while (Date.now() < until) {
    try {
      return await podLog(page);
    } catch (error) {
      last = error;
      await page.waitForTimeout(250);
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/** Wait until no new log entry has arrived for `quietMs` (agents may still be reacting). */
export async function settledLog(
  page: Page,
  quietMs = 2_000,
  timeout = 30_000,
): Promise<LensEntry[]> {
  const until = Date.now() + timeout;
  let log = await podLogSoon(page);
  let since = Date.now();
  while (Date.now() < until) {
    await page.waitForTimeout(500);
    const next = await podLogSoon(page);
    if (next.length !== log.length) {
      log = next;
      since = Date.now();
    } else if (Date.now() - since >= quietMs) {
      return next;
    }
  }
  return log;
}

/** The pod-relative path of an event or URL path (`/pods/alex/x` and `/x` both give `/x`). */
export function podRelative(path: string, owner?: string): string {
  let rel = path;
  try {
    if (/^https?:/.test(rel)) rel = new URL(rel).pathname;
  } catch {
    // not a URL
  }
  const match = /^\/pods\/([^/]+)(\/.*)?$/.exec(rel);
  if (match !== null && (owner === undefined || match[1] === owner)) rel = match[2] ?? "/";
  return rel.startsWith("/") ? rel : `/${rel}`;
}

export const isAclPath = (path: string) => path.endsWith(".acl");
export const isOk = (status: number) => status >= 200 && status < 300;
