// AUTHORED-BY Claude Opus 5.5
/**
 * One full guided run from fresh demo data, recorded for the tests that judge it (1, 4, 5, 6,
 * 9, 11, 12, 13). The run happens once per suite run: the record is written to
 * `test-results/` so a worker that restarts after a failed assertion reads it back instead of
 * walking again. Live checks that need the pods after the walk (re-reads, ACL documents,
 * resources, ledger totals) are done here, before the browser closes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser, Page } from "@playwright/test";
import { Parser, Store } from "n3";
import { type ObservedRequest, recordNetwork } from "./network.ts";
import {
  isOk,
  isPodEntry,
  type LensEntry,
  type PodEntry,
  podRelative,
  podRequest,
  podUrl,
  settledLog,
} from "./pod.ts";
import {
  APP_LANE,
  type AppSlug,
  HOLDER_FIRST_NAME,
  ORGS,
  type PodOwner,
  REPO_ROOT,
  siteJson,
  siteOrigin,
  webidOf,
} from "./site.ts";
import { loadMortgageTour, type MortgageTour } from "./tour-content.ts";
import { entriesOf, type StepWindow, type WalkResult, walkTour } from "./walk.ts";

const LDP_CONTAINS = "http://www.w3.org/ns/ldp#contains";
const ACL_AGENT = "http://www.w3.org/ns/auth/acl#agent";

export interface FetchedResource {
  owner: PodOwner;
  path: string;
  status: number;
  contentType: string | null;
  body: string;
}

export interface JourneyRecord {
  tour?: MortgageTour;
  loadError?: string;
  walk: WalkResult;
  log: LensEntry[];
  podRequests: ObservedRequest[];
  requests: Array<Pick<ObservedRequest, "url" | "method" | "resourceType" | "byServiceWorker">>;
  foreign: string[];
  websockets: string[];
  /** The revoke caveat (design.md §c.4) and whether it was visible at step 23. */
  caveat?: { text: string; visible: boolean };
  /** The test's own repeat of step 23's refused request, after the walk. */
  revokeRecheck?: { path: string; method: string; status: number };
  /** For G5 (appraisal) and G6 (title): ACL documents and re-reads after the walk. */
  expiry?: Array<{
    org: AppSlug;
    rereads: Array<{ path: string; status: number }>;
    acls: Array<{ path: string; status: number; mentionsAgent: boolean | null }>;
  }>;
  resources?: FetchedResource[];
  totals?: unknown;
  totalsLog?: LensEntry[];
  liveError?: string;
}

/** design.md §c.4: asserted verbatim (organisation and holder names from the registry). */
export function revokeCaveat(): string {
  return `${ORGS.lender.short} still holds the loan file it is required to keep. What has ended is its access to ${HOLDER_FIRST_NAME}'s data at source.`;
}

/** Owner → the app that acts as it (for owner reads). */
export function appActingAs(owner: PodOwner): AppSlug {
  if (owner === "alex") return "wallet";
  return owner as AppSlug;
}

export function podOwners(): PodOwner[] {
  return [...new Set<PodOwner>(["alex", ...Object.values(ORGS).map((org) => org.actsAs)])];
}

function recordFile(): string {
  return join(REPO_ROOT, "test-results", `.journey-${process.env.SITE_E2E_PORT}.json`);
}

export function windowOf(record: JourneyRecord, n: number): StepWindow | undefined {
  return record.walk.windows.find((w) => w.index === n - 1);
}

export function entriesAt(record: JourneyRecord, n: number): LensEntry[] {
  const span = windowOf(record, n);
  return span === undefined ? [] : entriesOf(record.log, span);
}

/** Throw unless the walk reached and completed design step `n`. */
export function requireStep(record: JourneyRecord, n: number): StepWindow {
  if (record.loadError !== undefined) throw new Error(record.loadError);
  const span = windowOf(record, n);
  if (span?.completed !== true) {
    throw new Error(
      `the guided run did not complete step ${n}: ${record.walk.error ?? "it stopped before that step"}`,
    );
  }
  return span;
}

export function walkCompleted(record: JourneyRecord): boolean {
  return (
    record.loadError === undefined &&
    record.walk.error === undefined &&
    record.tour !== undefined &&
    record.walk.windows.length === record.tour.steps.length
  );
}

/** Add which apps are missing from dist/ to a walk error, so a failure names its lane. */
function explain(error: string | undefined, tour: MortgageTour | undefined): string | undefined {
  if (error === undefined || tour === undefined) return error;
  const built = new Set(siteJson().apps ?? []);
  const missing = [...new Set(tour.steps.map((s) => s.app))].filter((app) => !built.has(app));
  if (!siteJson().podServiceWorker) return `${error}\n(dist/ has no pods-sw.js: lane L1)`;
  if (missing.length === 0) return error;
  const named = missing.map((app) => `apps/${app} (lane ${APP_LANE[app]})`).join(", ");
  return `${error}\n(apps on the path not yet built into dist/: ${named})`;
}

/** Every resource in a pod, walking `ldp:contains` from the root as the owner. */
async function crawlPod(page: Page, owner: PodOwner, limit = 400): Promise<FetchedResource[]> {
  const out: FetchedResource[] = [];
  const queue = ["/"];
  const seen = new Set(queue);
  while (queue.length > 0 && out.length < limit) {
    const path = queue.shift() as string;
    const response = await podRequest(page, appActingAs(owner), owner, path);
    out.push({
      body: response.body,
      contentType: response.contentType,
      owner,
      path,
      status: response.status,
    });
    if (!path.endsWith("/") || !isOk(response.status)) continue;
    const base = podUrl(owner, path);
    let store: Store;
    try {
      store = new Store(new Parser({ baseIRI: base, format: "text/turtle" }).parse(response.body));
    } catch {
      continue;
    }
    for (const quad of store.getQuads(null, LDP_CONTAINS, null, null)) {
      const child = podRelative(new URL(quad.object.value, base).pathname, owner);
      if (!seen.has(child)) {
        seen.add(child);
        queue.push(child);
      }
    }
  }
  return out;
}

async function liveChecks(page: Page, record: JourneyRecord): Promise<void> {
  const log = record.log;
  const pods = log.filter(isPodEntry);

  // Test 4: repeat step 23's refused request ourselves.
  const step23 = windowOf(record, 23);
  if (step23?.completed) {
    const refused = entriesOf(log, step23)
      .filter(isPodEntry)
      .find(
        (e) =>
          e.pod === "alex" &&
          (e.status === 403 || e.kind === "denied") &&
          e.actor.webid === webidOf("lender"),
      );
    if (refused !== undefined) {
      const path = podRelative(refused.path, "alex");
      const again = await podRequest(page, "lender-desk", "alex", path, { method: refused.method });
      record.revokeRecheck = { method: refused.method, path, status: again.status };
    }
  }

  // Test 5: G5 (appraisal) and G6 (title) after their end events.
  record.expiry = [];
  for (const org of ["appraisal", "title"] as const) {
    const webid = webidOf(ORGS[org].actsAs);
    const readPaths = [
      ...new Set(
        pods
          .filter(
            (e) =>
              e.pod === "alex" && e.actor.webid === webid && e.kind === "read" && isOk(e.status),
          )
          .map((e) => podRelative(e.path, "alex")),
      ),
    ];
    const aclPaths = [
      ...new Set(
        pods
          .filter(
            (e) =>
              e.pod === "alex" && isOk(e.status) && e.acl?.granted.some((r) => r.agent === webid),
          )
          .map((e) => podRelative(e.path, "alex")),
      ),
    ];
    const rereads = [];
    for (const path of readPaths) {
      rereads.push({ path, status: (await podRequest(page, org, "alex", path)).status });
    }
    const acls = [];
    for (const path of aclPaths) {
      const response = await podRequest(page, "wallet", "alex", path);
      let mentionsAgent: boolean | null = null;
      if (isOk(response.status)) {
        const store = new Store(
          new Parser({ baseIRI: podUrl("alex", path), format: "text/turtle" }).parse(response.body),
        );
        mentionsAgent = store.getQuads(null, ACL_AGENT, webid, null).length > 0;
      }
      acls.push({ mentionsAgent, path, status: response.status });
    }
    record.expiry.push({ acls, org, rereads });
  }

  // Test 11: every resource in every pod, read as its owner.
  record.resources = [];
  for (const owner of podOwners()) record.resources.push(...(await crawlPod(page, owner)));

  // Test 13: the ledger totals the visitor sees, and the log they were computed from.
  record.totalsLog = await settledLog(page);
  record.totals = await page.evaluate(() => window.__demo?.totals());
}

/** Run (or read back) the recorded guided journey for this suite run. */
export async function journey(browser: Browser): Promise<JourneyRecord> {
  const file = recordFile();
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as JourneyRecord;

  const record: JourneyRecord = {
    foreign: [],
    log: [],
    podRequests: [],
    requests: [],
    walk: { windows: [] },
    websockets: [],
  };
  const context = await browser.newContext({
    baseURL: `${siteOrigin()}/`,
    viewport: { height: 900, width: 1440 },
  });
  const recorder = await recordNetwork(context);
  const page = await context.newPage();
  try {
    let tour: MortgageTour;
    try {
      tour = await loadMortgageTour();
      record.tour = tour;
    } catch (error) {
      record.loadError = error instanceof Error ? error.message : String(error);
      return record;
    }
    record.walk = await walkTour(page, tour, {
      onDone: async (_step, index) => {
        if (index === 22) {
          const text = revokeCaveat();
          const locator = page.getByText(text, { exact: false }).first();
          const visible = await locator
            .waitFor({ state: "visible", timeout: 10_000 })
            .then(() => true)
            .catch(() => false);
          record.caveat = { text, visible };
        }
      },
    });
    record.walk.error = explain(record.walk.error, tour);
    try {
      record.log = await settledLog(page);
    } catch (error) {
      record.liveError = `could not read the pod log: ${error instanceof Error ? error.message : String(error)}`;
    }
    if (record.log.length > 0) {
      try {
        await liveChecks(page, record);
      } catch (error) {
        record.liveError = `post-walk checks failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  } finally {
    await recorder.flush();
    record.podRequests = recorder.podRequests();
    record.requests = recorder.requests.map(({ byServiceWorker, method, resourceType, url }) => ({
      byServiceWorker,
      method,
      resourceType,
      url,
    }));
    record.foreign = recorder.foreign;
    record.websockets = recorder.websockets;
    await context.close();
    mkdirSync(join(REPO_ROOT, "test-results"), { recursive: true });
    writeFileSync(file, JSON.stringify(record));
  }
  return record;
}

export type { PodEntry };
