// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance tests 1, 4, 5, 6, 9, 11, 12 and 13 (build-plan.md §4), judged on one guided run of
 * the whole mortgage journey from fresh demo data ("Do it for me" on every step). The run is
 * recorded once per suite run (support/journey.ts); each test asserts its own part of it.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { Parser, Store } from "n3";
import {
  earliestConsummationAfterClosingDisclosure,
  earliestConsummationAfterLoanEstimate,
  isoDate,
  withinBusinessDays,
} from "../packages/demo-kit/src/calendar.ts";
import { countBusinessDays, dateOf } from "./support/business-days.ts";
import { checkHonesty } from "./support/honesty.ts";
import {
  entriesAt,
  type JourneyRecord,
  journey,
  requireStep,
  walkCompleted,
  windowOf,
} from "./support/journey.ts";
import { computeTotals } from "./support/ledger.ts";
import { describeEntry } from "./support/match.ts";
import { isSiteUrl } from "./support/network.ts";
import { isAclPath, isOk, isPodEntry, type PodEntry, podRelative } from "./support/pod.ts";
import { type AppSlug, actsAs, REPO_ROOT, siteOrigin, webidOf } from "./support/site.ts";
import { DESIGN_STEP_COUNT } from "./support/tour-content.ts";

// One worker runs these in order; a worker restarted after a failure reads the record back.
test.describe.configure({ mode: "default", timeout: 60 * 60_000 });

let record: JourneyRecord;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60 * 60_000);
  record = await journey(browser);
  await test.info().attach("journey-walk.json", {
    body: JSON.stringify({ error: record.walk.error, windows: record.walk.windows }, null, 2),
    contentType: "application/json",
  });
});

function requireWholeRun(): void {
  if (record.loadError !== undefined) throw new Error(record.loadError);
  if (!walkCompleted(record)) {
    throw new Error(`the guided run did not reach the end: ${record.walk.error ?? "unknown"}`);
  }
}

test("1 Guided path: all 24 steps complete in order with every expect item in the Lens log", () => {
  if (record.loadError !== undefined) throw new Error(record.loadError);
  const tour = record.tour;
  expect(tour, "tour content").toBeDefined();
  expect(tour?.steps.length, "design.md §b.5 fixes 24 steps").toBe(DESIGN_STEP_COUNT);
  const missing = record.walk.windows
    .filter((w) => w.missing.length > 0)
    .map((w) => `step ${w.index + 1} "${w.id}": ${w.missing.join(", ")}`);
  expect(record.walk.error, "the guided run stopped").toBeUndefined();
  expect(record.walk.windows.map((w) => w.id)).toEqual(tour?.steps.map((s) => s.id));
  expect(record.walk.windows.every((w) => w.completed)).toBe(true);
  expect(missing, "expect items absent from the Lens log during their step").toEqual([]);
});

/**
 * Build-plan §4 names "step 9" for the earlier success. In the tour as written, Juniper's read of
 * the asset credential is part of submitting the application (step 8, "apply-submit"); step 9
 * runs on the same application day, and step 23's copy asks for "the same read as on application
 * day". So the earlier 200 is looked for across application day: steps 8 and 9.
 */
const APPLICATION_DAY = [8, 9] as const;

test("4 Revoke: step 23 is refused for the same request that succeeded at step 9", () => {
  for (const step of APPLICATION_DAY) requireStep(record, step);
  requireStep(record, 23);
  const lender = webidOf("lender");
  const refused = entriesAt(record, 23)
    .filter(isPodEntry)
    .find(
      (e) =>
        e.pod === "alex" && e.actor.webid === lender && (e.status === 403 || e.kind === "denied"),
    );
  expect(
    refused,
    `no refused Juniper request on Alex's pod during step 23; entries:\n${entriesAt(record, 23).map(describeEntry).join("\n")}`,
  ).toBeDefined();
  if (refused === undefined) return;
  expect(refused.status, "the pod's answer at step 23").toBe(403);
  const path = podRelative(refused.path, "alex");
  const earlier = APPLICATION_DAY.flatMap((step) => entriesAt(record, step))
    .filter(isPodEntry)
    .find(
      (e) =>
        e.pod === "alex" &&
        e.actor.webid === lender &&
        e.method === refused.method &&
        podRelative(e.path, "alex") === path,
    );
  expect(earlier, `application day has no Juniper ${refused.method} of ${path}`).toBeDefined();
  expect(earlier?.status, `application day ${refused.method} ${path}`).toBe(200);

  // The browser really sent both, and the pod answered 200 then 403.
  const observed = record.podRequests.filter(
    (r) =>
      r.method === refused.method &&
      new URL(r.url).pathname === `/pods/alex${path}` &&
      actsAs((r.agent ?? "") as AppSlug) === "lender",
  );
  expect(observed.map((r) => r.status)).toContain(200);
  expect(observed.map((r) => r.status)).toContain(403);

  expect(record.revokeRecheck, "the test's own repeat of the request").toEqual({
    method: refused.method,
    path,
    status: 403,
  });
  expect(record.caveat?.visible, `caveat on screen at step 23: "${record.caveat?.text}"`).toBe(
    true,
  );
});

test("5 Expiry: G5 and G6 leave the ACL after their end events and later reads are refused", () => {
  requireWholeRun();
  const pods = record.log.filter(isPodEntry);
  const ends: Record<string, number> = { appraisal: 13, title: 18 };
  for (const org of ["appraisal", "title"] as const) {
    const webid = webidOf(org);
    const granted = pods.filter(
      (e) => e.pod === "alex" && isOk(e.status) && e.acl?.granted.some((r) => r.agent === webid),
    );
    expect(granted.length, `a grant to ${org} was written to Alex's pod`).toBeGreaterThan(0);
    const removed = pods.filter(
      (e) => e.pod === "alex" && isOk(e.status) && e.acl?.revoked.some((r) => r.agent === webid),
    );
    expect(removed.length, `${org}'s access rules were removed from an ACL`).toBeGreaterThan(0);
    const expiry = removed.at(-1) as PodEntry;
    expect(
      expiry.actor.viaAgent,
      `${org}'s rules were removed by Alex's wallet applying expiry (actor.viaAgent), not by a visitor revoke`,
    ).toBe(true);
    const endStep = windowOf(record, ends[org] as number);
    expect(
      expiry.id,
      `${org}'s grant ended after its end event (step ${ends[org]})`,
    ).toBeGreaterThan(endStep?.from ?? Number.POSITIVE_INFINITY);
    const lastRead = pods.filter(
      (e) => e.pod === "alex" && e.actor.webid === webid && e.kind === "read" && isOk(e.status),
    );
    expect(lastRead.length, `${org} read something under its grant`).toBeGreaterThan(0);
    expect(expiry.id).toBeGreaterThan((lastRead.at(-1) as PodEntry).id);

    const after = record.expiry?.find((x) => x.org === org);
    expect(after, record.liveError ?? "post-walk expiry checks").toBeDefined();
    for (const acl of after?.acls ?? []) {
      expect(
        acl.status === 404 || acl.mentionsAgent === false,
        `${acl.path} (HTTP ${acl.status}) no longer names ${webid}`,
      ).toBe(true);
    }
    expect(after?.rereads.length).toBeGreaterThan(0);
    for (const read of after?.rereads ?? []) {
      expect(read.status, `${org} reading ${read.path} after its grant ended`).toBe(403);
    }
  }
});

test("6 Hermetic: no request leaves the site's origin during the whole path", () => {
  if (record.loadError !== undefined) throw new Error(record.loadError);
  const foreign = record.requests.map((r) => r.url).filter((url) => !isSiteUrl(url));
  expect(foreign, "requests to another origin").toEqual([]);
  expect(record.foreign, "requests the test had to block").toEqual([]);
  expect(
    record.websockets.filter((url) => !isSiteUrl(url)),
    "web sockets",
  ).toEqual([]);
  expect(record.requests.length, "requests observed").toBeGreaterThan(0);
  requireWholeRun();
});

test("9 Lens honesty: every 'pod saw' entry matches a request the test observed", () => {
  if (record.loadError !== undefined) throw new Error(record.loadError);
  const report = checkHonesty(record.log, record.podRequests);
  expect(report.checked, "pod entries in the log").toBeGreaterThan(0);
  expect(
    report.unmatched,
    `Lens entries with no matching request (pod requests observed: ${report.observed})`,
  ).toEqual([]);
  expect(report.notInBrowser, "pod requests not answered in the browser").toEqual([]);
  requireWholeRun();
});

/**
 * What may be stored as something other than RDF, and nothing else: an issuer's Bitstring Status
 * List credential (a JSON-LD VC) and a pre-qualification proof presentation delivered to an
 * inbox (JSON). These are the only exceptions the headless journey allows.
 */
function documentedNonRdf(resource: { path: string; contentType?: string | null }): boolean {
  const type = (resource.contentType ?? "").split(";")[0]?.trim();
  return (
    (type === "application/vc+ld+json" && resource.path.endsWith("/status/list")) ||
    (type === "application/json" && /\/inbox\/prequalification-/.test(resource.path))
  );
}

test("11 Data: every resource in every pod validates against its SHACL shape", async () => {
  requireWholeRun();
  if (record.resources === undefined) throw new Error(record.liveError ?? "pods were not crawled");
  const { validate, RESOURCE_TARGET_CLASSES } = await import("@mortgage/data-model");
  const kindsByClass = new Map<string, string>(
    Object.entries(RESOURCE_TARGET_CLASSES).map(([kind, iri]) => [iri as string, kind]),
  );
  const problems: string[] = [];
  const unshaped: string[] = [];
  const nonRdf: string[] = [];
  let validated = 0;
  for (const resource of record.resources) {
    const where = `${resource.owner}:${resource.path}`;
    if (resource.path.endsWith("/") || isAclPath(resource.path)) continue;
    if (!isOk(resource.status)) {
      problems.push(`${where}: listed in its container but answered ${resource.status}`);
      continue;
    }
    if (documentedNonRdf(resource)) {
      // Same exceptions, same shape, as the headless journey (content/test/mortgage/journey.test.ts).
      try {
        JSON.parse(resource.body);
        nonRdf.push(`${where} (${resource.contentType})`);
      } catch {
        problems.push(`${where}: served as ${resource.contentType} but is not JSON`);
      }
      continue;
    }
    if (!/turtle|n-triples|n3/.test(resource.contentType ?? "")) {
      problems.push(
        `${where}: served as ${resource.contentType}, not Turtle, so it cannot be validated`,
      );
      continue;
    }
    const baseIRI = `${siteOrigin()}/pods/${resource.owner}${resource.path}`;
    let types: string[];
    try {
      const store = new Store(new Parser({ baseIRI, format: "text/turtle" }).parse(resource.body));
      types = store
        .getQuads(null, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", null, null)
        .map((q) => q.object.value);
    } catch (error) {
      problems.push(`${where}: unparsable Turtle (${String(error)})`);
      continue;
    }
    const kinds = [
      ...new Set(types.map((t) => kindsByClass.get(t)).filter((k) => k !== undefined)),
    ];
    const report = await validate(resource.body, { baseIRI });
    if (!report.conforms) {
      problems.push(`${where}: ${report.violations.map((v) => v.message).join("; ")}`);
    }
    for (const kind of kinds) {
      const typed = await validate(resource.body, {
        baseIRI,
        expect: kind as keyof typeof RESOURCE_TARGET_CLASSES,
      });
      if (!typed.conforms) {
        problems.push(`${where} as ${kind}: ${typed.violations.map((v) => v.message).join("; ")}`);
      }
    }
    if (kinds.length === 0) {
      unshaped.push(`${where} (types: ${types.join(", ") || "none"})`);
      if (resource.owner === "alex" && resource.path !== "/profile/card") {
        problems.push(
          `${where}: no SHACL shape targets this resource (types: ${types.join(", ") || "none"})`,
        );
      }
    } else validated++;
  }
  await test
    .info()
    .attach("unshaped-resources.txt", { body: unshaped.join("\n"), contentType: "text/plain" });
  await test
    .info()
    .attach("non-rdf-resources.txt", { body: nonRdf.join("\n"), contentType: "text/plain" });
  expect(problems, "resources that do not validate").toEqual([]);
  expect(validated, "resources validated against a target shape").toBeGreaterThan(0);
});

/** First successful write on Alex's pod in a step whose label or path matches `pattern`. */
function writeIn(n: number, pattern?: RegExp): PodEntry | undefined {
  return entriesAt(record, n)
    .filter(isPodEntry)
    .filter((e) => e.kind === "write" && isOk(e.status))
    .find(
      (e) =>
        pattern === undefined ||
        pattern.test(e.resource?.label ?? "") ||
        pattern.test(e.path) ||
        (e.resource?.types ?? []).some((t) => pattern.test(t)),
    );
}

test("12 Clocks: Loan Estimate, Closing Disclosure and employment re-verification dates", async () => {
  for (const n of [8, 11, 16, 17, 18]) requireStep(record, n);
  const application = writeIn(8);
  const estimate = writeIn(11, /loan[-_ ]?estimate/i);
  const disclosure = writeIn(17, /closing[-_ ]?disclosure/i);
  const closing = writeIn(18);
  const employment = entriesAt(record, 16)
    .filter(isPodEntry)
    .find(
      (e) =>
        e.kind === "write" && isOk(e.status) && /employ/i.test(e.resource?.credential?.type ?? ""),
    );
  expect(application, "the application write at step 8").toBeDefined();
  expect(estimate, "the Loan Estimate written to the pod at step 11").toBeDefined();
  expect(disclosure, "the Closing Disclosure written to the pod at step 17").toBeDefined();
  expect(closing, "the signed copies written at closing (step 18)").toBeDefined();
  expect(employment, "the refreshed employment credential at step 16").toBeDefined();
  const app = isoDate(application?.at as string);
  const le = isoDate(estimate?.at as string);
  const cd = isoDate(disclosure?.at as string);
  const note = isoDate(closing?.at as string);
  const credential = employment?.resource?.credential;
  const asOf = isoDate((credential?.asOf ?? credential?.validFrom) as string);
  await test.info().attach("clock-dates.json", {
    body: JSON.stringify(
      { application: app, asOf, closingDisclosure: cd, loanEstimate: le, note },
      null,
      2,
    ),
    contentType: "application/json",
  });

  // Loan Estimate within 3 (general) business days of application: 12 CFR 1026.19(e)(1)(iii).
  expect(
    withinBusinessDays(app, le, 3, "general"),
    `LE ${le} vs application ${app} (demo-kit)`,
  ).toBe(true);
  const leGap = countBusinessDays(app, le, "general");
  expect(leGap >= 0 && leGap <= 3, `LE ${le} is ${leGap} business days after ${app} (oracle)`).toBe(
    true,
  );

  // Consummation at least 7 (specific) business days after the LE: 1026.19(e)(1)(iii)(B).
  expect(note >= earliestConsummationAfterLoanEstimate(le), `closing ${note} vs LE ${le}`).toBe(
    true,
  );
  expect(countBusinessDays(le, note, "specific"), "oracle: LE to closing").toBeGreaterThanOrEqual(
    7,
  );

  // Closing at least 3 specific business days after the CD: 1026.19(f)(1)(ii).
  expect(
    note >= earliestConsummationAfterClosingDisclosure(cd),
    `closing ${note} vs CD ${cd}`,
  ).toBe(true);
  expect(countBusinessDays(cd, note, "specific"), "oracle: CD to closing").toBeGreaterThanOrEqual(
    3,
  );

  // Employment "as of" within 10 business days before the note date (Fannie B3-3.1-04).
  expect(withinBusinessDays(asOf, note, 10, "general"), `as-of ${asOf} vs note ${note}`).toBe(true);
  const voeGap = countBusinessDays(asOf, note, "general");
  expect(
    voeGap >= 0 && voeGap <= 10,
    `as-of is ${voeGap} business days before the note (oracle)`,
  ).toBe(true);

  // Every demo date is a real past date (design.md §d.7).
  expect(note < dateOf(new Date().toISOString()), `closing ${note} is a past date`).toBe(true);
});

test("13 Ledger: journey ledger totals equal counts computed from the event log", () => {
  requireWholeRun();
  const shown = record.totals as
    | {
        organisations: number;
        grants: { active: number; expired: number; revoked: number };
        credentialsIssued: number;
        credentials: Array<{ path: string; reuses: number }>;
        documentsDelivered: number;
        denied: number;
        uploads: number;
      }
    | undefined;
  expect(shown, record.liveError ?? "window.__demo.totals() on the last step").toBeDefined();
  const log = record.totalsLog ?? [];
  expect(log.length).toBeGreaterThan(0);
  const computed = computeTotals(log);
  expect({
    credentialsIssued: shown?.credentialsIssued,
    denied: shown?.denied,
    documentsDelivered: shown?.documentsDelivered,
    grants: shown?.grants,
    organisations: shown?.organisations,
    uploads: shown?.uploads,
  }).toEqual({
    credentialsIssued: computed.credentialsIssued,
    denied: computed.denied,
    documentsDelivered: computed.documentsDelivered,
    grants: computed.grants,
    organisations: computed.organisations,
    uploads: computed.uploads,
  });
  const reuses = Object.fromEntries((shown?.credentials ?? []).map((c) => [c.path, c.reuses]));
  expect(reuses).toEqual(computed.reuses);
});

test("13 Ledger: the journey ledger page at the end agrees with the log, the Lens and content", async () => {
  requireWholeRun();
  const end = record.end;
  expect(end, record.liveError ?? "the journey ledger page at the end of the walk").toBeDefined();
  if (end === undefined) return;
  expect(new URL(end.url).pathname, "the tour ends on the journey ledger").toBe("/welcome/journey");
  expect(end.lens, "the Solid Lens is on the journey ledger page").toBe(true);

  // The tiles the visitor sees equal the totals counted independently from the event log, and
  // the Lens's own totals.
  const computed = computeTotals(end.log);
  const lens = end.lensTotals as {
    organisations: number;
    grants: { active: number; expired: number; revoked: number };
    credentialsIssued: number;
    documentsDelivered: number;
    denied: number;
    uploads: number;
  };
  const fromLog = {
    credentials: computed.credentialsIssued,
    denied: computed.denied,
    documents: computed.documentsDelivered,
    grants: computed.grants.active + computed.grants.expired + computed.grants.revoked,
    organisations: computed.organisations,
    uploads: computed.uploads,
  };
  expect(end.tiles, "journey ledger tiles vs the event log").toEqual(fromLog);
  expect(
    {
      credentials: lens.credentialsIssued,
      denied: lens.denied,
      documents: lens.documentsDelivered,
      grants: lens.grants.active + lens.grants.expired + lens.grants.revoked,
      organisations: lens.organisations,
      uploads: lens.uploads,
    },
    "the Lens totals vs the journey ledger tiles",
  ).toEqual(end.tiles);

  // Content. The ledger counts grants the Lens way: one per grantee organisation, by its final
  // state (packages/lens/README.md). Content's eight agreements name nine organisations, since
  // G4 passes three credentials on to Castellan and the credit-report authorisation to Quillon.
  const { GRANT_CODES, GRANTS } = (await import(
    pathToFileURL(join(REPO_ROOT, "content", "dist", "mortgage", "grants.js")).href
  )) as {
    GRANT_CODES: readonly string[];
    GRANTS: Record<string, { to: string; permissions: ReadonlyArray<{ to?: string }> }>;
  };
  const granteesOf = (code: string) => {
    const spec = GRANTS[code];
    if (spec === undefined) throw new Error(`content has no grant ${code}`);
    return new Set([spec.to, ...spec.permissions.map((p) => p.to ?? spec.to)]);
  };
  expect(end.tiles.uploads, "documents uploaded by Alex").toBe(0);

  // The grants on record in Alex's pod (policies/ and consents/, read by the page): all eight,
  // and only Juniper's G4 withdrawn; the servicer's and the insurer's still active.
  expect(end.grantsOnRecord.map((g) => g.code).sort()).toEqual([...GRANT_CODES].sort());
  const stateOf = new Map(end.grantsOnRecord.map((g) => [g.code, g.state]));
  expect(
    GRANT_CODES.filter((code) => stateOf.get(code) === "revoked"),
    "grants withdrawn",
  ).toEqual(["G4"]);
  expect(
    GRANT_CODES.filter((code) => stateOf.get(code) === "active"),
    "grants still active",
  ).toEqual(["G7", "G8"]);

  // Per organisation, the state the ledger should show follows from those records: active while
  // any of its grants is, otherwise the state of the later grant naming it (Quillon: G3, then
  // G4's onward authorisation).
  const orgState = new Map<string, string>();
  for (const code of GRANT_CODES) {
    for (const org of granteesOf(code)) {
      if (orgState.get(org) !== "active") orgState.set(org, stateOf.get(code) as string);
    }
  }
  const expected = { active: 0, expired: 0, revoked: 0 } as Record<string, number>;
  for (const state of orgState.values()) expected[state] = (expected[state] ?? 0) + 1;
  expect(end.tiles.grants, "grantee organisations on the ledger vs content").toBe(orgState.size);
  expect(computed.grants, "grant states on the ledger vs the grants on record").toEqual(expected);
});
