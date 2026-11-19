// AUTHORED-BY Claude Opus 5.5
/**
 * Test-side access to the REAL pods in the page's service worker, for setting up the steps
 * before the ones this app owns and for reading results back as their owners.
 *
 * Each request runs as a plain `fetch` inside a helper page of the same browser context, so the
 * pod service worker answers it and the wasm server checks it against the ACLs in force. The
 * caller's identity is the path-mode `X-Demo-Agent` app slug (design.md §d.5), the same
 * self-declared identity every app page uses. Nothing is mocked: a 403 here is the pod's.
 *
 * Beats that sign (an issuer's credential, a refresh) run inside the page instead, through the
 * injected harness (harness.ts), so they use the keys the seed published. The world here never
 * signs: its `keyFor` throws.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { World } from "@mortgage/content/mortgage/world";
import { createDemoCalendar, type DemoCalendar } from "@mortgage/demo-kit/calendar";
import type { AppNote } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import type { Page } from "@playwright/test";
import { HARNESS_DIR } from "./build-harness.ts";

interface Wire {
  status: number;
  headers: [string, string][];
  body: string;
}

/** The app slug whose `actsAs` is `owner`. */
const appOf = (owner: PodOwner): string => (owner === "alex" ? "wallet" : owner);

export function fetchAs(page: Page, owner: PodOwner): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, name) => {
      headers[name] = value;
    });
    headers["x-demo-agent"] = appOf(owner);
    const body = init?.body === undefined || init.body === null ? undefined : String(init.body);
    const wire = await page.evaluate(
      async (request): Promise<Wire> => {
        const response = await fetch(request.url, {
          body: request.body,
          headers: request.headers,
          method: request.method,
        });
        return {
          body: await response.text(),
          headers: [...response.headers],
          status: response.status,
        };
      },
      { body, headers, method, url },
    );
    const empty = wire.status === 204 || wire.status === 304 || method === "HEAD";
    return new Response(empty ? null : wire.body, { headers: wire.headers, status: wire.status });
  };
}

export interface TestWorld extends World {
  day: number;
  readonly notes: AppNote[];
}

/** A journey world over the page's pods, for setup and read-back. */
export function testWorld(page: Page): TestWorld {
  const podOrigin = new URL(page.url()).origin;
  // Day 1 is fixed by today's date (demoDayOne), the same rule the pod runtime uses.
  const calendar: DemoCalendar = createDemoCalendar();
  const notes: AppNote[] = [];
  return {
    calendar,
    day: 1,
    fetchAs: (owner) => fetchAs(page, owner),
    keyFor(owner) {
      return Promise.reject(new Error(`the test world does not sign (asked for ${owner}'s key)`));
    },
    note: (note) => {
      notes.push(note);
    },
    notes,
    podOrigin,
  };
}

/** Run a journey function on a given demo day. */
export async function on<T>(
  world: TestWorld,
  day: number,
  step: (world: World) => Promise<T>,
): Promise<T> {
  world.day = day;
  return step(world);
}

/** The status `owner` gets for a GET of `url`. */
export async function statusAs(page: Page, owner: PodOwner, url: string): Promise<number> {
  return (await fetchAs(page, owner)(url, { headers: { accept: "text/turtle" } })).status;
}

/** Put the harness in the page; it acts on the page's service worker with the shared keys. */
export async function injectHarness(page: Page): Promise<void> {
  const content = readFileSync(join(HARNESS_DIR, "harness.js"), "utf8");
  await page.addScriptTag({ content, type: "module" });
  await page.waitForFunction(() => window.__harness !== undefined);
}

/** Run journey beats (by name) inside the page, as their owners' apps would. */
export async function runBeats(page: Page, names: readonly string[]): Promise<void> {
  await page.evaluate((list) => window.__harness?.run(list), names);
}

/** Alex approves an access request, as the wallet's Approve button does. */
export async function approveAs(page: Page, request: string, day: number): Promise<string> {
  return page.evaluate(
    ([url, on]) => window.__harness?.approve(url as string, on as number) ?? "",
    [request, day] as const,
  );
}
