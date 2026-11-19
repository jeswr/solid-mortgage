// AUTHORED-BY Claude Fable 5.2
/**
 * The whole mortgage journey, headless: the 24 steps' pod effects run as plain functions over
 * fetch, each organisation under its own WebID, against the real `@sparq-org/solid-server` wasm.
 * No app, no mocked pod, no mocked access check: every 200, 401 and 403 below is the server's.
 */

import { RecordedInstrument } from "@mortgage/data-model";
import type { AppNote, PodEvent } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import { verifyCredential } from "@mortgage/vc-kit";
import { Authorization } from "@solid/object";
import { DataFactory, Parser, Store } from "n3";
import { beforeAll, describe, expect, test } from "vitest";
import { ACL } from "../../mortgage/acl.js";
import { DAY } from "../../mortgage/facts.js";
import { checkAtSource } from "../../mortgage/issuers.js";
import { CREDENTIALS, JOURNEY, readLedger } from "../../mortgage/journey.js";
import { applySeed, firstRun, seedRequests } from "../../mortgage/seed.js";
import { TOUR } from "../../mortgage/tour.js";
import { at, podUrl, readDataset, readText, webid } from "../../mortgage/world.js";
import { type Crawled, crawl, problemsIn } from "./crawl.js";
import { POD_ORIGIN, TestHost } from "./host.js";

let host: TestHost;
/** Access checks made between beats, while the journey is in the state the beat left. */
const probes = new Map<string, number>();
let firstEmploymentCredential = "";
const pods: Crawled[] = [];

const alex = (path: string) => podUrl(host.world, "alex", path);

async function probe(
  label: string,
  who: PodOwner | null,
  url: string,
  init?: RequestInit,
): Promise<void> {
  const step = host.step;
  host.step = "probe";
  probes.set(label, (await host.fetchAs(who)(url, init)).status);
  host.step = step;
}

const TURTLE = { body: "", headers: { "content-type": "text/turtle" }, method: "PUT" } as const;

/** What is checked straight after a beat, keyed by the beat's name. */
const AFTER: Record<string, () => Promise<void>> = {
  "share-employment": async () => {
    firstEmploymentCredential = await readText(
      host.fetchAs("alex"),
      alex("credentials/employment-income"),
    );
    // The issuer's slot is write-only: it cannot read back, list, or write beside it.
    await probe(
      "payroll reads its own credential",
      "payroll",
      alex("credentials/employment-income"),
    );
    await probe("payroll lists credentials", "payroll", alex("credentials/"));
    await probe("payroll writes another slot", "payroll", alex("credentials/assets"), TURTLE);
    await probe("payroll reads the profile", "payroll", alex("profile/card"));
    await probe(
      "lender reads income before any grant",
      "lender",
      alex("credentials/employment-income"),
    );
    await probe("anonymous reads income", null, alex("credentials/employment-income"));
  },
  "prove-to-lenders": async () => {
    await probe(
      "anonymous reads Copperfield's result",
      null,
      podUrl(host.world, "lender-b", "quotes/prequalification"),
    );
    await probe(
      "lender reads Copperfield's result",
      "lender",
      podUrl(host.world, "lender-b", "quotes/prequalification"),
    );
    await probe(
      "lender-b reads income after the proof",
      "lender-b",
      alex("credentials/employment-income"),
    );
    await probe(
      "lender reads income after the proof",
      "lender",
      alex("credentials/employment-income"),
    );
    await probe(
      "lender-b reads the anchor",
      "lender-b",
      alex("credentials/employment-income-anchor"),
    );
  },
  "submit-application": async () => {
    await probe("lender reads assets under G4", "lender", alex("credentials/assets"));
    await probe("aus reads assets under G4", "aus", alex("credentials/assets"));
    await probe("aus reads the property", "aus", alex("property/subject-property"));
    await probe("aus reads identity", "aus", alex("identity/identity-credential"));
    await probe("lender reads policies", "lender", alex("policies/g4"));
    await probe("lender writes a credential", "lender", alex("credentials/assets"), TURTLE);
    await probe("lender-b reads assets", "lender-b", alex("credentials/assets"));
    await probe(
      "bureau reads the authorisation",
      "bureau",
      alex("consents/g4-credit-report-authorisation"),
    );
    await probe("bureau reads another consent record", "bureau", alex("consents/g4-given"));
    await probe("bureau reads assets", "bureau", alex("credentials/assets"));
  },
  "pull-credit-and-run-aus": async () => {
    await probe(
      "alex reads the bureau's report",
      "alex",
      podUrl(host.world, "bureau", "orders/JHL-1001/report"),
    );
    await probe(
      "aus reads the bureau's report",
      "aus",
      podUrl(host.world, "bureau", "orders/JHL-1001/report"),
    );
    await probe(
      "lender-b reads Juniper's application",
      "lender-b",
      podUrl(host.world, "lender", "loans/JHL-1001/application"),
    );
  },
  "order-services": async () => {
    await probe(
      "appraisal reads the property under G5",
      "appraisal",
      alex("property/subject-property"),
    );
    await probe("appraisal reads income", "appraisal", alex("credentials/employment-income"));
    await probe("appraisal reads the profile", "appraisal", alex("profile/card"));
    await probe("title reads the profile under G6", "title", alex("profile/card"));
    await probe("title reads contact details", "title", alex("profile/contact"));
    await probe("title reads the property record", "title", alex("property/subject-property"));
    await probe("title reads assets", "title", alex("credentials/assets"));
  },
  "submit-appraisal": async () => {
    await probe(
      "appraisal reads the property after delivery",
      "appraisal",
      alex("property/subject-property"),
    );
    await probe(
      "bank rewrites assets after G2 expired",
      "bank",
      alex("credentials/assets"),
      TURTLE,
    );
    await probe(
      "bureau rewrites the summary after G3 expired",
      "bureau",
      alex("credentials/credit-summary"),
      TURTLE,
    );
    await probe("lender still reads the property", "lender", alex("property/subject-property"));
  },
  "bind-insurance": async () => {
    await probe(
      "insurer reads the property under G7",
      "insurer",
      alex("property/subject-property"),
    );
    await probe("insurer reads income", "insurer", alex("credentials/employment-income"));
    await probe(
      "insurer reads the Loan Estimate",
      "insurer",
      alex("mortgage/juniper/loan-estimate"),
    );
  },
  "sign-at-closing": async () => {
    await probe(
      "payroll rewrites income after closing",
      "payroll",
      alex("credentials/employment-income"),
      TURTLE,
    );
    await probe("title writes outside its drawer", "title", alex("mortgage/juniper/note"), TURTLE);
  },
  "record-with-county": async () => {
    await probe(
      "anonymous reads the public record",
      null,
      podUrl(host.world, "county", "records/2026-0048113"),
    );
    await probe(
      "anonymous writes the public record",
      null,
      podUrl(host.world, "county", "records/2026-0048113"),
      TURTLE,
    );
    await probe("county reads Alex's profile", "county", alex("profile/card"));
  },
  "deliver-loan": async () => {
    await probe("title reads the profile after the policy", "title", alex("profile/card"));
    await probe(
      "title writes to closing after the policy",
      "title",
      alex("mortgage/closing/extra"),
      TURTLE,
    );
  },
  "connect-servicer": async () => {
    await probe("servicer reads contact details under G8", "servicer", alex("profile/contact"));
    await probe(
      "servicer reads its own transfer notice",
      "servicer",
      alex("mortgage/servicing/transfer-notice"),
    );
    await probe("servicer lists its drawer", "servicer", alex("mortgage/servicing/"));
    await probe("servicer reads income", "servicer", alex("credentials/employment-income"));
    await probe("servicer reads the property", "servicer", alex("property/subject-property"));
    await probe(
      "servicer reads Juniper's drawer",
      "servicer",
      alex("mortgage/juniper/loan-estimate"),
    );
    await probe(
      "lender still reads assets before the revoke",
      "lender",
      alex("credentials/assets"),
    );
    await probe(
      "lender reads back its own Loan Estimate",
      "lender",
      alex("mortgage/juniper/loan-estimate"),
    );
    await probe("lender lists its drawer", "lender", alex("mortgage/juniper/"));
  },
  "revoke-juniper": async () => {
    for (const path of [
      "profile/card",
      "profile/contact",
      "identity/identity-credential",
      "credentials/employment-income",
      "credentials/assets",
      "credentials/credit-summary",
      "property/subject-property",
      "insurance/evidence-of-insurance",
      "mortgage/juniper/loan-estimate",
    ]) {
      await probe(`lender reads ${path} after the revoke`, "lender", alex(path));
    }
    await probe(
      "lender writes its drawer after the revoke",
      "lender",
      alex("mortgage/juniper/late"),
      TURTLE,
    );
    await probe("aus reads assets after the revoke", "aus", alex("credentials/assets"));
    await probe(
      "bureau reads the authorisation after the revoke",
      "bureau",
      alex("consents/g4-credit-report-authorisation"),
    );
    await probe("insurer still reads the property", "insurer", alex("property/subject-property"));
    await probe("servicer still reads contact details", "servicer", alex("profile/contact"));
  },
};

const failures: string[] = [];

beforeAll(async () => {
  host = await TestHost.create();
  await applySeed(
    host.world,
    await seedRequests({ calendar: host.calendar, podOrigin: POD_ORIGIN }),
  );
  await firstRun(host.world);
  for (const beat of JOURNEY) {
    host.step = beat.step;
    host.day = beat.day;
    try {
      await beat.run(host.world);
      await AFTER[beat.name]?.();
    } catch (error) {
      failures.push(`${beat.name}: ${(error as Error).stack}`);
      break;
    }
  }
  host.step = "crawl";
  for (const owner of host.owners) pods.push(...(await crawl(host.world, owner)));
}, 600_000);

/**
 * A pattern matches when every key it names is equal. The host records the actor as the acting
 * pod owner, so a pattern's `actor: { org }` compares with that.
 */
const matches = (event: object, expected: object): boolean =>
  Object.entries(expected).every(([key, value]) =>
    key === "actor" && typeof value === "object" && value !== null
      ? (event as Record<string, unknown>).actor === (value as { org?: unknown }).org
      : (event as Record<string, unknown>)[key] === value,
  );

describe("the journey runs on real pods", () => {
  test("every beat completes", () => {
    expect(failures).toEqual([]);
  });

  test("seeding succeeded as each pod's owner", () => {
    expect(host.events.filter((event) => event.step === "seed" && event.status >= 400)).toEqual([]);
  });

  test("the only refusal in the journey itself is the denied read of step 23", () => {
    const refused = host.events.filter(
      (event) =>
        !["seed", "probe", "crawl"].includes(event.step) &&
        event.status >= 400 &&
        event.status !== 404,
    );
    expect(
      refused.map(
        (event) =>
          `${event.step} ${event.actor} ${event.method} ${event.pod}${event.path} ${event.status}`,
      ),
    ).toEqual(["denied-read lender GET alex/credentials/assets 403"]);
    // A 404 is the wallet asking whether the document that ends a grant exists yet.
    const missing = host.events.filter(
      (event) => event.status === 404 && !["probe", "crawl"].includes(event.step),
    );
    expect(missing.every((event) => event.actor === "alex" && event.method === "HEAD")).toBe(true);
  });

  test.each(TOUR.map((step) => [step.id, step] as const))(
    "%s produces what the tour expects",
    (_, step) => {
      const events = host.events.filter((event) => event.step === step.id);
      const notes = host.notes.filter((entry) => entry.step === step.id);
      const missing = [
        ...step.expect,
        ...(step.done.event ? [step.done.event] : []),
        ...(step.done.note ? [step.done.note] : []),
      ].filter((expected: Partial<PodEvent> | Partial<AppNote>) =>
        "pod" in expected
          ? !events.some((event) => matches(event, expected))
          : !notes.some((entry) => matches(entry, expected)),
      );
      expect(missing).toEqual([]);
      expect(events.every((event) => event.day >= (step.clock?.day ?? 0))).toBe(true);
    },
  );
});

describe("every resource in every pod validates", () => {
  const isTurtle = (resource: Crawled) => resource.contentType === "text/turtle";

  test("each Turtle resource conforms to the closed shape of every type it claims", async () => {
    const documents = pods.filter(isTurtle);
    expect(documents.length).toBeGreaterThan(100);
    const problems: string[] = [];
    for (const document of documents) problems.push(...(await problemsIn(document)));
    expect(problems).toEqual([]);
  });

  test("what is not RDF is a status list or a proof presentation, and nothing else", () => {
    const other = pods.filter(
      (resource) => !isTurtle(resource) && resource.contentType !== "container",
    );
    const unexplained = other.filter(
      (resource) =>
        !(
          resource.contentType === "application/vc+ld+json" && resource.url.endsWith("/status/list")
        ) &&
        !(
          resource.contentType === "application/json" &&
          /\/inbox\/prequalification-/.test(resource.url)
        ),
    );
    expect(unexplained.map((resource) => resource.url)).toEqual([]);
    expect(other).toHaveLength(8);
  });

  test("every access-control document keeps the owner in control and names real agents", () => {
    const known = new Set<string>([
      ...host.owners.map((owner) => webid(host.world, owner)),
      "http://xmlns.com/foaf/0.1/Agent",
      `${ACL}AuthenticatedAgent`,
    ]);
    const withAcl = pods.filter((resource) => resource.acl !== undefined);
    expect(withAcl.length).toBeGreaterThan(40);
    for (const resource of withAcl) {
      const aclUrl = `${resource.url}.acl`;
      const store = new Store(
        new Parser({ baseIRI: aclUrl, format: "text/turtle" }).parse(resource.acl as string),
      );
      const rules = store
        .getSubjects(null, null, null)
        .map((subject) => new Authorization(subject, store, DataFactory));
      const owner = webid(host.world, resource.owner);
      expect(
        rules.some(
          (rule) => [...rule.agent].includes(owner) && [...rule.mode].includes(`${ACL}Control`),
        ),
        aclUrl,
      ).toBe(true);
      for (const rule of rules) {
        for (const agent of [...rule.agent, ...rule.agentClass])
          expect(known.has(agent), `${aclUrl} ${agent}`).toBe(true);
        expect(rule.accessTo, aclUrl).toBe(resource.url);
        expect(rule.default === undefined || rule.default === resource.url, aclUrl).toBe(true);
      }
    }
  });

  test("Alex's pod ends with no rule for an organisation whose grant has ended", () => {
    const ended = ["payroll", "bank", "bureau", "lender", "aus", "appraisal", "title"] as const;
    const named = pods
      .filter((resource) => resource.owner === "alex" && resource.acl !== undefined)
      .filter((resource) =>
        ended.some((owner) => (resource.acl as string).includes(webid(host.world, owner))),
      );
    expect(named.map((resource) => resource.url)).toEqual([]);
  });
});

describe("grants are enforced by the pod", () => {
  const EXPECTED: Record<string, number> = {
    "payroll reads its own credential": 403,
    "payroll lists credentials": 403,
    "payroll writes another slot": 403,
    "payroll reads the profile": 403,
    "lender reads income before any grant": 403,
    "anonymous reads income": 401,
    "anonymous reads Copperfield's result": 401,
    "lender reads Copperfield's result": 403,
    "lender-b reads income after the proof": 403,
    "lender reads income after the proof": 403,
    "lender-b reads the anchor": 403,
    "lender reads assets under G4": 200,
    "aus reads assets under G4": 200,
    "aus reads the property": 403,
    "aus reads identity": 403,
    "lender reads policies": 403,
    "lender writes a credential": 403,
    "lender-b reads assets": 403,
    "bureau reads the authorisation": 200,
    "bureau reads another consent record": 403,
    "bureau reads assets": 403,
    "alex reads the bureau's report": 403,
    "aus reads the bureau's report": 403,
    "lender-b reads Juniper's application": 403,
    "appraisal reads the property under G5": 200,
    "appraisal reads income": 403,
    "appraisal reads the profile": 403,
    "title reads the profile under G6": 200,
    "title reads contact details": 403,
    "title reads the property record": 403,
    "title reads assets": 403,
    "appraisal reads the property after delivery": 403,
    "bank rewrites assets after G2 expired": 403,
    "bureau rewrites the summary after G3 expired": 403,
    "lender still reads the property": 200,
    "insurer reads the property under G7": 200,
    "insurer reads income": 403,
    "insurer reads the Loan Estimate": 403,
    "payroll rewrites income after closing": 403,
    "title writes outside its drawer": 403,
    "anonymous reads the public record": 200,
    "anonymous writes the public record": 401,
    "county reads Alex's profile": 403,
    "title reads the profile after the policy": 403,
    "title writes to closing after the policy": 403,
    "servicer reads contact details under G8": 200,
    "servicer reads its own transfer notice": 200,
    "servicer lists its drawer": 200,
    "servicer reads income": 403,
    "servicer reads the property": 403,
    "servicer reads Juniper's drawer": 403,
    "lender still reads assets before the revoke": 200,
    "lender reads back its own Loan Estimate": 200,
    "lender lists its drawer": 200,
    "lender reads profile/card after the revoke": 403,
    "lender reads profile/contact after the revoke": 403,
    "lender reads identity/identity-credential after the revoke": 403,
    "lender reads credentials/employment-income after the revoke": 403,
    "lender reads credentials/assets after the revoke": 403,
    "lender reads credentials/credit-summary after the revoke": 403,
    "lender reads property/subject-property after the revoke": 403,
    "lender reads insurance/evidence-of-insurance after the revoke": 403,
    "lender reads mortgage/juniper/loan-estimate after the revoke": 403,
    "lender writes its drawer after the revoke": 403,
    "aus reads assets after the revoke": 403,
    "bureau reads the authorisation after the revoke": 403,
    "insurer still reads the property": 200,
    "servicer still reads contact details": 200,
  };

  test("every probe got the status the grants imply", () => {
    expect(Object.fromEntries(probes)).toEqual(EXPECTED);
  });

  test("step 23: the read is refused and Juniper's own file is intact", () => {
    const step = host.events.filter((event) => event.step === "denied-read");
    expect(step.map((event) => `${event.pod}${event.path} ${event.status} ${event.kind}`)).toEqual([
      "alex/credentials/assets 403 denied",
      "lender/loans/JHL-1001/application 200 read",
    ]);
  });

  test("the ledger shows each grant's final state", async () => {
    host.step = "probe";
    expect(await readLedger(host.world)).toEqual([
      { code: "G1", state: "expired" },
      { code: "G2", state: "expired" },
      { code: "G3", state: "expired" },
      { code: "G4", state: "revoked" },
      { code: "G5", state: "expired" },
      { code: "G6", state: "expired" },
      { code: "G7", state: "active" },
      { code: "G8", state: "active" },
    ]);
  });

  test("no organisation ever read a resource of Alex's it was not granted", () => {
    // Everything an organisation read in Alex's pod during the journey, from the server's own answers.
    const reads = new Map<string, Set<string>>();
    for (const event of host.events) {
      if (event.pod !== "alex" || event.actor === "alex" || event.kind !== "read") continue;
      if (["seed", "probe", "crawl"].includes(event.step)) continue;
      const paths = reads.get(event.actor) ?? new Set<string>();
      paths.add(event.path);
      reads.set(event.actor, paths);
    }
    expect(
      Object.fromEntries([...reads].map(([actor, paths]) => [actor, [...paths].sort()])),
    ).toEqual({
      appraisal: ["/property/purchase-agreement", "/property/subject-property"],
      aus: ["/credentials/assets", "/credentials/credit-summary", "/credentials/employment-income"],
      bureau: ["/consents/g4-credit-report-authorisation"],
      insurer: ["/mortgage/juniper/appraisal", "/property/subject-property"],
      lender: [
        "/credentials/assets",
        "/credentials/credit-summary",
        "/credentials/employment-income",
        "/identity/identity-credential",
        "/insurance/evidence-of-insurance",
        "/profile/card",
        "/profile/contact",
        "/property/purchase-agreement",
        "/property/subject-property",
      ],
      servicer: [
        "/banking/payment-mandate",
        "/insurance/evidence-of-insurance",
        "/profile/contact",
      ],
      title: ["/profile/card", "/property/purchase-agreement"],
    });
  });
});

describe("credentials", () => {
  test("the refreshed employment credential verifies and the first one is revoked", async () => {
    host.step = "probe";
    host.day = DAY.revoke;
    const entry = CREDENTIALS["employment-income"];
    const current = await checkAtSource(host.world, "alex", alex(entry.path), entry.kind, [
      "payroll",
    ]);
    expect(current.result.errors).toEqual([]);
    expect(current.result.verified).toBe(true);
    expect(current.body).not.toBe(firstEmploymentCredential);
    const fetcher = host.fetchAs("alex");
    const old = await verifyCredential(firstEmploymentCredential, {
      expectShape: entry.kind,
      now: at(host.world, "12:00"),
      statusFetch: fetcher,
      trustedIssuers: [webid(host.world, "payroll")],
      webIdFetch: fetcher,
    });
    expect(old.verified).toBe(false);
    expect(old.errors.map((error) => error.code).join(" ")).toMatch(/REVOKED/);
  });

  test("a credential signed by an issuer the reader does not trust is rejected", async () => {
    host.step = "probe";
    host.day = DAY.application;
    const entry = CREDENTIALS.assets;
    const check = await checkAtSource(host.world, "alex", alex(entry.path), entry.kind, [
      "payroll",
    ]);
    expect(check.result.verified).toBe(false);
  });

  test("the recording receipt in the pod links the county's public records", async () => {
    host.step = "probe";
    const url = podUrl(host.world, "county", "records/2026-0048114");
    const record = new RecordedInstrument(
      url,
      await readDataset(host.fetchAs(null), url),
      DataFactory,
    );
    expect(record.recordingReference).toBe("2026-0048114");
    const receipt = pods.find(
      (resource) => resource.url === alex("mortgage/closing/recording-receipt"),
    );
    expect(receipt?.body).toContain("records/2026-0048114");
  });
});
