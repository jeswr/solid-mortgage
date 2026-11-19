/**
 * Decision-0015 authenticated-caller boundary for the property issuer routes.
 * Route-level tests against REAL fixtures: real DPoP-bound Solid-OIDC tokens
 * from loopback dev issuers, real in-memory sparq pods, the real route handlers
 * — no mocked verification. Mirrors apps/lender-boa/test/pod-auth.test.ts.
 *
 * Acceptance:
 *   - anonymous callers are rejected (401 + WWW-Authenticate);
 *   - caller-supplied pod/webid parameters are rejected (400);
 *   - a caller cannot substitute another allowed-origin pod (403) nor bind an
 *     unclaimed pod;
 *   - runtime issuance stays fail-closed when disabled (503);
 *   - the authenticated happy path issues a shape-valid, subject-bound,
 *     disclosed-value (never ZK-anchored) credential into the TOKEN-derived pod.
 */

import { MORT, PERSONA_VALUES, personas, validate } from "@mortgage/data-model";
import {
  type DevOidcIssuer,
  type SolidTestServer,
  seedPod,
  startDevOidcIssuer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { DataFactory, Parser, Store } from "n3";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { PropertyConfig } from "../lib/server/config";
import { assertAllowedPodBase, PodAccessError } from "../lib/server/pod";
import { createPropertyRailService, type PropertyRailService } from "../lib/server/pod-rail";
import { baseConfig } from "./support";

const NOW = new Date();
const APP_ORIGIN = "http://127.0.0.1";
const PIM_STORAGE = "http://www.w3.org/ns/pim/space#storage";
const CRED = "https://www.w3.org/2018/credentials#";
const SCHEMA_VALUE = "https://schema.org/value";

const alex = PERSONA_VALUES[0];
if (alex === undefined) throw new Error("persona fixtures missing");

/** The pod-side owner acknowledgment: `<webid> pim:storage <pod>` (decision 0015 L2.3). */
function ackCard(webid: string, podBase: string): string {
  return `<${webid}> <${PIM_STORAGE}> <${podBase}> .\n`;
}

function apiUrl(path: string): string {
  return `${APP_ORIGIN}/property/api${path}`;
}

/** An authenticated Request: fresh single-use DPoP proof per call. */
async function authedRequest(
  issuer: DevOidcIssuer,
  method: string,
  path: string,
  options: { query?: string; body?: string } = {},
): Promise<Request> {
  // RFC 9449: `htu` binds scheme/authority/path only — never the query.
  const headers: Record<string, string> = await issuer.authHeaders(method, apiUrl(path));
  if (options.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${apiUrl(path)}${options.query ?? ""}`, {
    method,
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
}

let pods: SolidTestServer;
let podBase = "";
let borrower: DevOidcIssuer; // profile claims the borrower pod; pod acknowledges back
let attacker: DevOidcIssuer; // profile claims the borrower pod; pod does NOT acknowledge
let unbound: DevOidcIssuer; // profile claims no storage at all
let config: PropertyConfig;
let service: PropertyRailService;

beforeAll(async () => {
  pods = await startSolidServer({});
  podBase = `${pods.baseUrl}/`;
  borrower = await startDevOidcIssuer({ storage: podBase });
  attacker = await startDevOidcIssuer({ storage: podBase });
  unbound = await startDevOidcIssuer();

  const [persona] = await personas({
    now: NOW,
    podBases: { "alex-rivera": podBase },
    webIds: { "alex-rivera": borrower.webid },
  });
  if (persona === undefined) throw new Error("persona factory returned nothing");
  await seedPod(pods.baseUrl, [
    ...persona.resources.map((resource) => ({ path: resource.path, body: resource.turtle })),
    { path: "/profile/card", body: ackCard(borrower.webid, podBase) },
  ]);

  config = baseConfig({
    trustedOidcIssuers: [borrower.issuer, attacker.issuer, unbound.issuer],
    podAllowedOrigins: [pods.baseUrl],
    allowInsecureLoopback: true,
    enableRuntimeIssuance: true,
  });
  service = createPropertyRailService({ config, now: () => NOW });
}, 120_000);

afterAll(async () => {
  await pods?.stop();
  await borrower?.stop();
  await attacker?.stop();
  await unbound?.stop();
});

describe("anonymous callers (decision 0015 L1)", () => {
  test.each([
    [
      "appraisal",
      () => service.issueAppraisal(new Request(apiUrl("/appraisal/issue"), { method: "POST" })),
    ],
    ["title", () => service.issueTitle(new Request(apiUrl("/title/issue"), { method: "POST" }))],
  ])("the %s route rejects an anonymous caller with 401 + WWW-Authenticate", async (_id, run) => {
    const response = await run();
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).not.toBeNull();
  });

  test("an unconfigured issuer allowlist fails the rail closed (503)", async () => {
    const unconfigured = createPropertyRailService({
      config: baseConfig({ trustedOidcIssuers: [], podAllowedOrigins: [pods.baseUrl] }),
    });
    const response = await unconfigured.issueAppraisal(
      new Request(apiUrl("/appraisal/issue"), { method: "POST" }),
    );
    expect(response.status).toBe(503);
  });
});

describe("param overrides are rejected loudly (decision 0015 L2.4)", () => {
  test("an ANONYMOUS caller with override params is still 401 (identity before validation)", async () => {
    const response = await service.issueAppraisal(
      new Request(`${apiUrl("/appraisal/issue")}?pod=${encodeURIComponent(podBase)}`, {
        method: "POST",
      }),
    );
    expect(response.status).toBe(401);
  });

  test("a query pod= is rejected 400 even for an authenticated caller", async () => {
    const request = await authedRequest(borrower, "POST", "/appraisal/issue", {
      query: `?pod=${encodeURIComponent(podBase)}`,
    });
    const response = await service.issueAppraisal(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("param_rejected");
  });

  test("a body pod/webid is rejected 400 on title issue", async () => {
    const request = await authedRequest(borrower, "POST", "/title/issue", {
      body: JSON.stringify({ pod: podBase, webid: borrower.webid }),
    });
    const response = await service.issueTitle(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("param_rejected");
  });
});

describe("runtime issuance stays fail-closed when disabled (503)", () => {
  test("an authenticated appraisal issue is 503 when runtime issuance is off", async () => {
    const disabled = createPropertyRailService({
      config: baseConfig({
        trustedOidcIssuers: [borrower.issuer],
        podAllowedOrigins: [pods.baseUrl],
        allowInsecureLoopback: true,
        enableRuntimeIssuance: false,
      }),
      now: () => NOW,
    });
    const response = await disabled.issueAppraisal(
      await authedRequest(borrower, "POST", "/appraisal/issue"),
    );
    expect(response.status).toBe(503);
  }, 60_000);
});

describe("pod bases must be query/fragment-free (sm-h2p)", () => {
  /** The PodAccessError status `fn` throws, or undefined if it does not throw. */
  function thrownStatus(fn: () => unknown): number | undefined {
    try {
      fn();
      return undefined;
    } catch (error) {
      return error instanceof PodAccessError ? error.status : undefined;
    }
  }

  test.each([
    ["a query", "?x"],
    ["a bare trailing ?", "?"],
    ["a fragment", "#x"],
    ["a bare trailing #", "#"],
    ["a profile-card fragment confusion", "#y/profile/card"],
  ])("an allowlisted-origin pod carrying %s is rejected 400", (_label, suffix) => {
    // A bare `?`/`#` has EMPTY url.search/url.hash yet survives in href — the
    // guard must catch it all the same.
    expect(thrownStatus(() => assertAllowedPodBase(`${podBase}${suffix}`, config))).toBe(400);
  });

  test("a valid pod base composes the profile-card URL exactly", () => {
    const base = assertAllowedPodBase(pods.baseUrl, config);
    expect(base).toBe(podBase);
    // The decision-0015 backward-acknowledgment target (owner.ts composition):
    // for a validated base this MUST be the owner-only-writable card itself.
    expect(`${base}profile/card`).toBe(`${podBase}profile/card`);
    expect(new URL(`${base}profile/card`).href).toBe(`${podBase}profile/card`);
  });

  test("a forward pim:storage claim carrying a fragment on an allowlisted origin can never bind", async () => {
    // The sm-h2p bypass shape: the claim `<pod-origin>/x#y` survives origin
    // allowlisting, and the composed card URL `<...>/x#y/profile/card` is
    // fragment-STRIPPED on the wire to `<...>/x` — an attacker-writable
    // resource we seed with exactly the acknowledgment the backward check
    // looks for. The binding must STILL be refused.
    const evilClaim = `${pods.baseUrl}/x#y`;
    const evil = await startDevOidcIssuer({ storage: evilClaim });
    try {
      await seedPod(pods.baseUrl, [
        { path: "/x", body: `<${evil.webid}> <${PIM_STORAGE}> <${evilClaim}> .\n` },
      ]);
      // Non-vacuous: the fragment-stripped target exists and "acknowledges".
      const stripped = await fetch(`${pods.baseUrl}/x`, { headers: { accept: "text/turtle" } });
      expect(stripped.ok).toBe(true);
      expect(await stripped.text()).toContain(evil.webid);

      const scoped = createPropertyRailService({
        config: baseConfig({
          trustedOidcIssuers: [evil.issuer],
          podAllowedOrigins: [pods.baseUrl],
          allowInsecureLoopback: true,
          enableRuntimeIssuance: true,
        }),
        now: () => NOW,
      });
      const response = await scoped.issueAppraisal(
        await authedRequest(evil, "POST", "/appraisal/issue"),
      );
      expect(response.status).toBe(403);
      const body = (await response.json()) as { detail: string };
      expect(body.detail).toContain("allowlist");
    } finally {
      await evil.stop();
    }
  }, 60_000);
});

describe("cross-pod substitution is rejected (decision 0015 L2)", () => {
  test("a WebID whose profile claims SOMEONE ELSE'S pod is refused 403 (no acknowledgment)", async () => {
    const response = await service.issueAppraisal(
      await authedRequest(attacker, "POST", "/appraisal/issue"),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { detail: string };
    expect(body.detail).toContain("does not acknowledge");
  }, 60_000);

  test("a WebID claiming no pim:storage at all is refused 403", async () => {
    const response = await service.issueTitle(await authedRequest(unbound, "POST", "/title/issue"));
    expect(response.status).toBe(403);
    const body = (await response.json()) as { detail: string };
    expect(body.detail).toContain("no pim:storage");
  }, 60_000);
});

describe("the authenticated happy path derives everything from the token", () => {
  test("appraisal: 200, disclosed value, not ZK-anchored, written to the token pod", async () => {
    const response = await service.issueAppraisal(
      await authedRequest(borrower, "POST", "/appraisal/issue"),
    );
    expect(response.status).toBe(200);
    const result = (await response.json()) as {
      credentialIri: string;
      subject: string;
      appraisedValueUsd: number;
      appraisalCoversLoan: boolean;
    };
    expect(result.credentialIri).toBe(`${podBase}mortgage/credentials/appraisal`);
    expect(result.subject).toBe(borrower.webid);
    expect(result.appraisedValueUsd).toBe(alex.appraisedValueUsd);
    expect(result.appraisalCoversLoan).toBe(true);

    // Read the signed credential back out of the TOKEN-derived pod and prove
    // the load-bearing invariants on the real written document.
    const written = await fetch(result.credentialIri, { headers: { accept: "text/turtle" } });
    expect(written.ok).toBe(true);
    const turtle = await written.text();
    const store = new Store(new Parser({ format: "text/turtle" }).parse(turtle));

    const report = await validate(turtle, {
      expect: "appraisal-credential",
      focusNode: result.credentialIri,
    });
    expect(report.conforms).toBe(true);

    // credentialSubject == token WebID (decision 0015 L3).
    const subject = store.getQuads(
      DataFactory.namedNode(result.credentialIri),
      DataFactory.namedNode(`${CRED}credentialSubject`),
      null,
      null,
    );
    expect(subject[0]?.object.value).toBe(borrower.webid);

    // Disclosed value present; NO ZK operand anchor (decision 0005).
    expect(
      store.getQuads(null, DataFactory.namedNode(SCHEMA_VALUE), null, null).length,
    ).toBeGreaterThan(0);
    expect(store.getQuads(null, DataFactory.namedNode(MORT.operandEnc), null, null)).toHaveLength(
      0,
    );
    expect(store.getQuads(null, DataFactory.namedNode(MORT.field), null, null)).toHaveLength(0);
  }, 60_000);

  test("title: 200, clear status, written to the token pod", async () => {
    const response = await service.issueTitle(
      await authedRequest(borrower, "POST", "/title/issue"),
    );
    expect(response.status).toBe(200);
    const result = (await response.json()) as {
      credentialIri: string;
      subject: string;
      titleStatus: string;
    };
    expect(result.credentialIri).toBe(`${podBase}mortgage/credentials/title`);
    expect(result.subject).toBe(borrower.webid);
    expect(result.titleStatus).toBe("clear");

    const written = await fetch(result.credentialIri, { headers: { accept: "text/turtle" } });
    expect(written.ok).toBe(true);
    const report = await validate(await written.text(), {
      expect: "title-clear-credential",
      focusNode: result.credentialIri,
    });
    expect(report.conforms).toBe(true);
  }, 60_000);
});
