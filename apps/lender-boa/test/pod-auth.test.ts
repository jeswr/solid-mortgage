/**
 * Decision-0015 authenticated-caller boundary for the scene-3/4 pod routes
 * (sm-7s8; closes the sm-30 roborev High). Route-level tests against REAL
 * fixtures: real DPoP-bound Solid-OIDC tokens from loopback dev issuers, real
 * in-memory sparq pods, and the real route handlers — no mocked verification.
 *
 * The roborev acceptance criteria, verbatim:
 *   - anonymous callers are rejected;
 *   - a caller CANNOT substitute another allowed-origin pod (cross-pod
 *     substitution) nor another subject;
 *   - caller-supplied pod/webid parameters are rejected;
 *   - anonymous writes are refused against an OIDC/WAC-enabled harness pod
 *     (the lender rail fails closed without a grant-authenticated fetch).
 */

import { PERSONA_VALUES, personas } from "@mortgage/data-model";
import {
  type DevOidcIssuer,
  type SolidTestServer,
  seedPod,
  startDevOidcIssuer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { LenderConfig } from "../lib/server/config";
import { createPodRailService, type PodRailService } from "../lib/server/pod-rail";
import type { UrlaPrefill } from "../lib/server/prefill";
import { type AnchorRig, anchorRig } from "./support";

const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const APP_ORIGIN = "http://127.0.0.1";
const PIM_STORAGE = "http://www.w3.org/ns/pim/space#storage";

const alex = PERSONA_VALUES[0];
if (alex === undefined) throw new Error("persona fixtures missing");

/** The pod-side owner acknowledgment: `<webid> pim:storage <pod>` (decision 0015 L2.3). */
function ackCard(webid: string, podBase: string): string {
  return `<${webid}> <${PIM_STORAGE}> <${podBase}> .\n`;
}

/** Freshness seams that reach neither a WebID doc nor a status list (network-free). */
const offlineFreshnessSeams = {
  resolveKey: async () => undefined,
  statusFetch: async () => new Response(null, { status: 404 }),
  webIdFetch: async () => new Response(null, { status: 404 }),
};

function apiUrl(path: string): string {
  return `${APP_ORIGIN}/lender-boa/api${path}`;
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
let config: LenderConfig;
let service: PodRailService;
let rig: AnchorRig;

function configWith(extra: {
  issuers?: readonly string[];
  origins?: readonly string[];
}): LenderConfig {
  return {
    ...config,
    trustedOidcIssuers: [...config.trustedOidcIssuers, ...(extra.issuers ?? [])],
    podAllowedOrigins: [...config.podAllowedOrigins, ...(extra.origins ?? [])],
  };
}

beforeAll(async () => {
  pods = await startSolidServer({});
  podBase = `${pods.baseUrl}/`;
  borrower = await startDevOidcIssuer({ storage: podBase });
  attacker = await startDevOidcIssuer({ storage: podBase });
  unbound = await startDevOidcIssuer();

  // The borrower persona, subject-bound to the ISSUER-hosted WebID (decision
  // 0015 L3), plus the pod-side acknowledgment card (L2.3).
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

  config = {
    trustedOidcIssuers: [borrower.issuer, attacker.issuer, unbound.issuer],
    trustedAnchorIssuers: [],
    trustedCredentialIssuers: ["https://verifications.example/orgs/employment-verifier#id"],
    podAllowedOrigins: [pods.baseUrl],
    allowInsecureLoopback: true,
    trustForwardedHeaders: false,
  };
  service = createPodRailService({
    config,
    now: () => NOW,
    freshnessSeams: offlineFreshnessSeams,
  });
  rig = await anchorRig(NOW);
}, 120_000);

afterAll(async () => {
  await pods?.stop();
  await borrower?.stop();
  await attacker?.stop();
  await unbound?.stop();
});

describe("anonymous callers (decision 0015 L1)", () => {
  test.each([
    ["prefill", () => service.prefill(new Request(apiUrl("/application/prefill")))],
    [
      "submit",
      () => service.submit(new Request(apiUrl("/application/submit"), { method: "POST" })),
    ],
    ["freshness", () => service.freshness(new Request(apiUrl("/freshness")))],
    [
      "reissue-request",
      () =>
        service.reissueRequest(
          new Request(apiUrl("/freshness/reissue-request"), { method: "POST" }),
        ),
    ],
  ])("the %s route rejects an anonymous caller with 401 + WWW-Authenticate", async (_id, run) => {
    const response = await run();
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).not.toBeNull();
  });

  test("an unconfigured issuer allowlist fails the rail closed (503)", async () => {
    const unconfigured = createPodRailService({
      config: { ...config, trustedOidcIssuers: [] },
    });
    const response = await unconfigured.prefill(new Request(apiUrl("/application/prefill")));
    expect(response.status).toBe(503);
  });
});

describe("param overrides are rejected loudly (decision 0015 L2.4)", () => {
  test("a query pod= is rejected 400 even for an authenticated caller", async () => {
    const request = await authedRequest(borrower, "GET", "/application/prefill", {
      query: `?pod=${encodeURIComponent(podBase)}`,
    });
    const response = await service.prefill(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("param_rejected");
  });

  test("a query webid= is rejected 400 on the freshness route", async () => {
    const request = await authedRequest(borrower, "GET", "/freshness", {
      query: `?webid=${encodeURIComponent(borrower.webid)}`,
    });
    const response = await service.freshness(request);
    expect(response.status).toBe(400);
  });

  test("a body pod/webid is rejected 400 on submit", async () => {
    const request = await authedRequest(borrower, "POST", "/application/submit", {
      body: JSON.stringify({ pod: podBase, webid: borrower.webid }),
    });
    const response = await service.submit(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("param_rejected");
  });
});

describe("cross-pod substitution is rejected (decision 0015 L2)", () => {
  test("a WebID whose profile claims SOMEONE ELSE'S pod is refused 403 (no pod acknowledgment)", async () => {
    // The attacker's own profile claims the borrower's pod (the forward claim
    // is attacker-authored), and the pod origin IS allowlisted — only the
    // pod-side acknowledgment stops this.
    const response = await service.freshness(await authedRequest(attacker, "GET", "/freshness"));
    expect(response.status).toBe(403);
    const body = (await response.json()) as { detail: string };
    expect(body.detail).toContain("does not acknowledge");
  });

  test("the same substitution is refused on prefill and submit", async () => {
    const prefill = await service.prefill(
      await authedRequest(attacker, "GET", "/application/prefill"),
    );
    expect(prefill.status).toBe(403);
    const submit = await service.submit(
      await authedRequest(attacker, "POST", "/application/submit"),
    );
    expect(submit.status).toBe(403);
  });

  test("a WebID claiming no pim:storage at all is refused 403", async () => {
    const response = await service.prefill(
      await authedRequest(unbound, "GET", "/application/prefill"),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { detail: string };
    expect(body.detail).toContain("no pim:storage");
  });

  test("a claimed pod whose profile card is missing is refused 403", async () => {
    const bare = await pods.provisionAccount();
    const bareBase = `${bare.baseUrl}/`;
    const bareIssuer = await startDevOidcIssuer({ storage: bareBase });
    try {
      const scoped = createPodRailService({
        config: configWith({ issuers: [bareIssuer.issuer], origins: [bare.baseUrl] }),
      });
      const response = await scoped.prefill(
        await authedRequest(bareIssuer, "GET", "/application/prefill"),
      );
      expect(response.status).toBe(403);
      const body = (await response.json()) as { detail: string };
      expect(body.detail).toContain("no profile card");
    } finally {
      await bareIssuer.stop();
    }
  }, 60_000);
});

describe("the authenticated happy path derives everything from the token", () => {
  test("prefill: 200, URLA values from the TOKEN-bound pod, webId = token WebID", async () => {
    const response = await service.prefill(
      await authedRequest(borrower, "GET", "/application/prefill"),
    );
    expect(response.status).toBe(200);
    const prefill = (await response.json()) as UrlaPrefill;
    expect(prefill.source).toBe("pod");
    expect(prefill.borrower.webId).toBe(borrower.webid);
    expect(prefill.borrower.name).toBe(alex.name);
    expect(prefill.employment.monthlyGrossIncomeUsd).toBe(alex.monthlyGrossIncomeUsd);
  }, 60_000);

  test("submit: 200, the application lands in the TOKEN-derived pod", async () => {
    const response = await service.submit(
      await authedRequest(borrower, "POST", "/application/submit"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { applicationIri: string };
    expect(body.applicationIri).toBe(`${podBase}mortgage/application`);
    const written = await fetch(body.applicationIri, { headers: { accept: "text/turtle" } });
    expect(written.ok).toBe(true);
  }, 60_000);

  test("freshness: 200, pod + subject bound to the token (unsigned seed VC never greens)", async () => {
    const response = await service.freshness(await authedRequest(borrower, "GET", "/freshness"));
    expect(response.status).toBe(200);
    const report = (await response.json()) as {
      fresh: boolean;
      verified: boolean;
      greenTick: boolean;
    };
    expect(report.fresh).toBe(true); // seeded validFrom −30d / validUntil +14d
    expect(report.verified).toBe(false); // unsigned until sm-26 — SHACL alone never greens
    expect(report.greenTick).toBe(false);
  }, 60_000);
});

describe("subject substitution is rejected at the data layer (decision 0015 L3)", () => {
  test("a bound pod holding a credential about SOMEONE ELSE fails prefill 403", async () => {
    const account = await pods.provisionAccount();
    const base = `${account.baseUrl}/`;
    const issuer = await startDevOidcIssuer({ storage: base });
    try {
      const [persona] = await personas({
        now: NOW,
        podBases: { "alex-rivera": base },
        webIds: { "alex-rivera": issuer.webid },
      });
      if (persona === undefined) throw new Error("persona factory returned nothing");
      await seedPod(account.baseUrl, [
        ...persona.resources.map((resource) => ({ path: resource.path, body: resource.turtle })),
        { path: "/profile/card", body: ackCard(issuer.webid, base) },
      ]);
      // Replace the employment VC with a fully valid one about a DIFFERENT subject.
      const foreign = await rig.issueEmployment({
        subject: "https://victim.example/profile/card#me",
        credentialId: `${base}mortgage/credentials/income`,
        validFrom: new Date(NOW.getTime() - 1 * DAY_MS),
        validUntil: new Date(NOW.getTime() + 14 * DAY_MS),
        index: 93,
      });
      const replaced = await fetch(`${base}mortgage/credentials/income`, {
        method: "PUT",
        headers: { "content-type": "text/turtle" },
        body: foreign.body,
      });
      expect(replaced.ok).toBe(true);

      const scoped = createPodRailService({
        config: configWith({ issuers: [issuer.issuer], origins: [account.baseUrl] }),
      });
      const response = await scoped.prefill(
        await authedRequest(issuer, "GET", "/application/prefill"),
      );
      expect(response.status).toBe(403);
      const body = (await response.json()) as { detail: string };
      expect(body.detail).toContain("different subject");
    } finally {
      await issuer.stop();
    }
  }, 120_000);
});

describe("WAC/OIDC pods refuse anonymous IO (decision 0015 L4 — the sm-28 grant seam)", () => {
  let oidcPods: SolidTestServer;

  afterAll(async () => {
    await oidcPods?.stop();
  });

  test("anonymous writes and reads are refused by the pod; the lender rail fails closed", async () => {
    oidcPods = await startSolidServer({ oidc: true });
    const owner = oidcPods.accounts[0];
    if (owner === undefined) throw new Error("oidc harness has no primary account");
    const base = `${owner.baseUrl}/`;

    // The pod itself refuses anonymous IO — the boundary can never grant more
    // than the pod would.
    const anonWrite = await fetch(`${base}mortgage/application`, {
      method: "PUT",
      headers: { "content-type": "text/turtle" },
      body: "<#it> a <https://schema.org/Thing> .",
    });
    expect(anonWrite.ok).toBe(false);
    expect([401, 403]).toContain(anonWrite.status);

    // Bind a caller to this pod (public profile card, private everything else).
    const issuer = await startDevOidcIssuer({ storage: base });
    try {
      await seedPod(
        owner.baseUrl,
        [{ path: "/profile/card", body: ackCard(issuer.webid, base), publicRead: true }],
        { fetch: owner.authFetch, ownerWebid: owner.webid },
      );
      const [persona] = await personas({
        now: NOW,
        podBases: { "alex-rivera": base },
        webIds: { "alex-rivera": issuer.webid },
      });
      if (persona === undefined) throw new Error("persona factory returned nothing");
      await seedPod(
        owner.baseUrl,
        persona.resources.map((resource) => ({ path: resource.path, body: resource.turtle })),
        { fetch: owner.authFetch, ownerWebid: owner.webid },
      );

      const anonRead = await fetch(`${base}mortgage/profile`, {
        headers: { accept: "text/turtle" },
      });
      expect(anonRead.ok).toBe(false);

      // The lender's default pod IO is ANONYMOUS (the sm-28 grant-authenticated
      // fetch is not wired yet), so even the pod's own bound borrower gets a
      // fail-closed error — never someone's private data over an open side door.
      const scoped = createPodRailService({
        config: configWith({ issuers: [issuer.issuer], origins: [owner.baseUrl] }),
      });
      const response = await scoped.prefill(
        await authedRequest(issuer, "GET", "/application/prefill"),
      );
      expect(response.ok).toBe(false);
      expect([403, 502]).toContain(response.status);
    } finally {
      await issuer.stop();
    }
  }, 120_000);
});
