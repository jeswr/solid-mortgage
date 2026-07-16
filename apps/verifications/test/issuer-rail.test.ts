/**
 * SECURITY-CRITICAL suite: the verifications ISSUER rail (sm-29, scenes 1+4),
 * driven end-to-end with REAL fixtures — real DPoP-bound Solid-OIDC tokens
 * from loopback dev issuers, a real WAC-enforcing sparq pod for the
 * borrower's vault, the app's REAL client-credentials service identity for
 * pod IO, a second real sparq pod hosting the issuer org WebID documents and
 * the HTTP-hosted Bitstring status lists, and vc-kit's REAL fail-closed
 * verifier for every read-back. No mocked auth, issuance, verification or
 * status resolution anywhere (wallet/closing pod-auth pattern).
 *
 * Acceptance (the sm-29 security bar):
 *   - scene 1: POST /api/issue signs the flow's VC (+ operand anchor) into a
 *     real pod through the REAL service identity; the stored document
 *     verifies with the real WebID-key + Bitstring-status resolvers; WAC
 *     genuinely protects it (anonymous read is refused);
 *   - a tampered document fails the signature; a second issue is 409;
 *   - scene 4: an EXPIRED employment VC fails verification, one-click
 *     re-issue revokes the old status index (the old document then fails
 *     with STATUS_REVOKED against the real hosted list) and the replacement
 *     verifies cleanly — validity restored;
 *   - a REVOKED credential fails verification and is refused one-click
 *     re-issue (revocation is an explicit issuer decision, decision 0007);
 *   - decision-0015 boundary: anonymous 401, pod/webid overrides 400,
 *     unbound caller 403, unconfigured service identity / issuer flow 503.
 */
import type { MortgageResourceKind } from "@mortgage/data-model";
import type { DevOidcIssuer, SolidTestAccount, SolidTestServer } from "@mortgage/solid-kit/testing";
import {
  containerGrantAcl,
  profileCardFixture,
  seedPod,
  startDevOidcIssuer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import type { KeyPair, VerifyCredentialResult } from "@mortgage/vc-kit";
import {
  exportPrivateJwk,
  generateKeyPairForSuite,
  isFresh,
  publishVerificationMethod,
  StatusListClient,
  verifyCredential,
} from "@mortgage/vc-kit";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { configFromEnv, type IssuerFlowId, type VerificationsConfig } from "../lib/server/config";
import { ANCHOR_POD_PATHS, CAPTURED_OPERAND_ENC } from "../lib/server/flows";
import { createIssuerService, type IssuerService } from "../lib/server/issuer-rail";

const APP_ORIGIN = "http://127.0.0.1";
const SERVICE_CLIENT = { clientId: "verifications-service", clientSecret: "test-service-secret" };
const DAY_MS = 24 * 60 * 60 * 1000;

function apiUrl(route: string): string {
  return `${APP_ORIGIN}/verifications/api/${route}`;
}

/** An authenticated Request: fresh single-use DPoP proof per call. */
async function authedRequest(
  issuer: DevOidcIssuer,
  method: string,
  route: string,
  options: { query?: string; body?: string } = {},
): Promise<Request> {
  // RFC 9449: `htu` binds scheme/authority/path only — never the query.
  const headers: Record<string, string> = await issuer.authHeaders(method, apiUrl(route));
  if (options.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`${apiUrl(route)}${options.query ?? ""}`, {
    method,
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
}

let pods: SolidTestServer; // the borrower's WAC-enforcing vault pod (OIDC mode)
let issuerHost: SolidTestServer; // hosts issuer org WebID docs + status lists
let owner: SolidTestAccount;
let borrower: DevOidcIssuer; // the API caller; profile claims the pod, pod acks back
let unbound: DevOidcIssuer; // trusted issuer, but its profile claims no storage
let serviceIssuer: DevOidcIssuer; // the app's own service identity (client_credentials)
let podBase = "";
let config: VerificationsConfig;
let service: IssuerService;
/** The rail's explicit clock — advanced +15d for the scene-4 staleness beat. */
let clock = new Date();

const issuerKeys = {} as Record<IssuerFlowId, KeyPair>;
const issuerWebIds = {} as Record<IssuerFlowId, string>;
const statusListUrls = {} as Record<IssuerFlowId, string>;

/** PUT a document into the fixed-owner issuer pod, strict-create. */
async function putResource(url: string, body: string, contentType: string): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "content-type": contentType, "if-none-match": "*" },
    body,
  });
  if (!response.ok) throw new Error(`PUT ${url} failed: ${response.status}`);
}

/** Read a pod resource as Turtle through the OWNER's authenticated fetch. */
async function readVault(path: string): Promise<string> {
  const response = await owner.authFetch(`${podBase}${path.slice(1)}`, {
    headers: { accept: "text/turtle" },
  });
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return response.text();
}

/** The REAL verifier over a stored document: WebID-key + status resolution ride plain fetch. */
function verifyStored(
  body: string,
  flow: IssuerFlowId,
  expectShape: MortgageResourceKind,
  at: Date,
): Promise<VerifyCredentialResult> {
  return verifyCredential(body, {
    expectShape,
    now: at,
    statusFetch: fetch,
    trustedIssuers: [issuerWebIds[flow]],
    webIdFetch: fetch,
  });
}

beforeAll(async () => {
  [pods, issuerHost] = await Promise.all([startSolidServer({ oidc: true }), startSolidServer()]);
  const primary = pods.accounts[0];
  if (primary === undefined) throw new Error("OIDC harness did not provision an owner");
  owner = primary;
  podBase = `${pods.baseUrl}/`;
  [borrower, unbound, serviceIssuer] = await Promise.all([
    startDevOidcIssuer({ storage: podBase }),
    startDevOidcIssuer(),
    // http-schemed WebID: the POD's verifier dereferences it with a plain fetch.
    startDevOidcIssuer({ clientCredentials: SERVICE_CLIENT, webidScheme: "http" }),
  ]);

  // Backward acknowledgment (decision 0015 L2.3): the pod's owner-only-writable
  // profile card names the borrower — publicly readable, as WebID docs are.
  await seedPod(
    pods.baseUrl,
    [profileCardFixture({ webid: borrower.webid, name: "Alex Rivera", storage: podBase })],
    { fetch: owner.authFetch, ownerWebid: owner.webid },
  );
  // The scene-1 grant the borrower's wallet materialises: the vault's
  // /mortgage/ container names THIS app's service identity (Read+Write).
  const container = await owner.authFetch(`${podBase}mortgage/`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: "",
  });
  if (!container.ok) throw new Error(`container seed failed (${container.status})`);
  const acl = await owner.authFetch(`${podBase}mortgage/.acl`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: containerGrantAcl({
      containerPath: "/mortgage/",
      ownerWebid: owner.webid,
      agents: [{ webid: serviceIssuer.webid }],
    }),
  });
  if (!acl.ok) throw new Error(`issuer grant seed failed (${acl.status})`);

  // The three issuer org identities: WebID document (with the published
  // verification method) and status-list slot, HOSTED ON A REAL SOLID POD.
  for (const flow of ["employment", "assets", "credit"] as const) {
    const docUrl = `${issuerHost.baseUrl}/orgs/${flow}`;
    issuerWebIds[flow] = `${docUrl}#id`;
    statusListUrls[flow] = `${issuerHost.baseUrl}/status/${flow}`;
    issuerKeys[flow] = await generateKeyPairForSuite(`${docUrl}#vc-key`, "Ed25519");
    const published = await publishVerificationMethod({
      controller: issuerWebIds[flow],
      key: issuerKeys[flow],
    });
    await putResource(
      docUrl,
      `@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n<${issuerWebIds[flow]}> a foaf:Organization .\n\n${published.turtle}`,
      "text/turtle",
    );
  }

  config = {
    ...configFromEnv({} as NodeJS.ProcessEnv),
    allowInsecureLoopback: true,
    issuers: {
      // The assets flow exercises the ENV private-JWK key path end-to-end;
      // the other two inject their KeyPair through the test seam.
      assets: {
        keyJwk: JSON.stringify(await exportPrivateJwk(issuerKeys.assets)),
        keyVerificationMethod: issuerKeys.assets.verificationMethod,
        statusListUrl: statusListUrls.assets,
        webid: issuerWebIds.assets,
      },
      credit: {
        keyJwk: undefined,
        keyVerificationMethod: undefined,
        statusListUrl: statusListUrls.credit,
        webid: issuerWebIds.credit,
      },
      employment: {
        keyJwk: undefined,
        keyVerificationMethod: undefined,
        statusListUrl: statusListUrls.employment,
        webid: issuerWebIds.employment,
      },
    },
    podAllowedOrigins: [pods.baseUrl],
    podServiceClientId: SERVICE_CLIENT.clientId,
    podServiceClientSecret: SERVICE_CLIENT.clientSecret,
    podServiceIssuer: serviceIssuer.issuer,
    serviceWebId: serviceIssuer.webid,
    trustForwardedHeaders: false,
    trustedOidcIssuers: [borrower.issuer, unbound.issuer],
  };
  service = createIssuerService({
    config,
    keys: { credit: issuerKeys.credit, employment: issuerKeys.employment },
    now: () => clock,
    statusHostFetch: fetch,
  });
}, 240_000);

afterAll(async () => {
  await pods?.stop();
  await issuerHost?.stop();
  await borrower?.stop();
  await unbound?.stop();
  await serviceIssuer?.stop();
});

describe("boundary rejections (decision 0015 L1–L2)", () => {
  test("anonymous callers get 401 + WWW-Authenticate on every route", async () => {
    for (const [route, method, handler] of [
      ["flows", "GET", () => service.flows(new Request(apiUrl("flows")))],
      ["issue", "POST", () => service.issue(new Request(apiUrl("issue"), { method: "POST" }))],
      [
        "reissue",
        "POST",
        () => service.reissue(new Request(apiUrl("reissue"), { method: "POST" })),
      ],
    ] as const) {
      const response = await handler();
      expect(response.status, `${method} ${route}`).toBe(401);
      expect(response.headers.get("www-authenticate"), route).not.toBeNull();
    }
  });

  test("caller-supplied pod/webid are rejected 400 in query and body", async () => {
    const query = await service.flows(
      await authedRequest(borrower, "GET", "flows", { query: `?pod=${podBase}` }),
    );
    expect(query.status).toBe(400);
    const body = await service.issue(
      await authedRequest(borrower, "POST", "issue", {
        body: JSON.stringify({ flow: "employment", webid: borrower.webid }),
      }),
    );
    expect(body.status).toBe(400);
    expect(((await body.json()) as { error: string }).error).toBe("param_rejected");
  });

  test("a trusted caller with no pod binding is refused 403", async () => {
    const response = await service.flows(await authedRequest(unbound, "GET", "flows"));
    expect(response.status).toBe(403);
  });

  test("an unknown flow is rejected before any pod IO", async () => {
    const response = await service.issue(
      await authedRequest(borrower, "POST", "issue", {
        body: JSON.stringify({ flow: "mallory" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  test("an unconfigured service identity fails closed with 503 (never anonymous IO)", async () => {
    const unconfigured = createIssuerService({
      config: { ...config, podServiceClientSecret: undefined },
      keys: { employment: issuerKeys.employment },
      statusHostFetch: fetch,
    });
    const response = await unconfigured.issue(
      await authedRequest(borrower, "POST", "issue", {
        body: JSON.stringify({ flow: "employment" }),
      }),
    );
    expect(response.status).toBe(503);
  });

  test("an unconfigured issuer flow fails closed with 503", async () => {
    const unconfigured = createIssuerService({
      config: {
        ...config,
        issuers: {
          ...config.issuers,
          employment: { ...config.issuers.employment, webid: undefined },
        },
      },
      statusHostFetch: fetch,
    });
    const response = await unconfigured.issue(
      await authedRequest(borrower, "POST", "issue", {
        body: JSON.stringify({ flow: "employment" }),
      }),
    );
    expect(response.status).toBe(503);
  });
});

describe("scene 1 — REAL issuance into a real WAC-enforcing pod", () => {
  let employmentIndex: string | undefined;
  let creditIndex: string | undefined;

  test("employment: issue → pod write via the REAL service identity → real verify", async () => {
    const response = await service.issue(
      await authedRequest(borrower, "POST", "issue", {
        body: JSON.stringify({ flow: "employment" }),
      }),
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      credential: { id: string; statusListIndex?: string; statusListCredential: string };
      anchor: { id: string } | null;
    };
    employmentIndex = payload.credential.statusListIndex;
    expect(payload.credential.id).toBe(`${podBase}mortgage/credentials/income`);
    expect(payload.credential.statusListCredential).toBe(statusListUrls.employment);
    expect(employmentIndex).toBeDefined();
    expect(payload.anchor?.id).toBe(`${podBase}${ANCHOR_POD_PATHS.employment.slice(1)}`);

    // WAC is REAL: the vault refuses an anonymous read of the credential.
    const anonymous = await fetch(payload.credential.id);
    expect([401, 403]).toContain(anonymous.status);

    // Read back (owner-authenticated) and verify with the REAL fail-closed
    // gate chain: WebID-document key resolution, Bitstring status over the
    // hosted list, shape, window, signature.
    const body = await readVault("/mortgage/credentials/income");
    const outcome = await verifyStored(body, "employment", "employment-income-credential", clock);
    expect(outcome.errors).toEqual([]);
    expect(outcome.verified).toBe(true);
    expect(outcome.credential?.issuer).toBe(issuerWebIds.employment);
    expect(outcome.credential?.subject).toBe(borrower.webid);
    expect(isFresh(outcome.credential ?? {}, clock)).toBe(true);

    // The operand anchor landed beside it and verifies as its own credential,
    // carrying the CAPTURED genuine encoding of the signed income value.
    const anchorBody = await readVault(ANCHOR_POD_PATHS.employment);
    const anchorOutcome = await verifyStored(anchorBody, "employment", "zk-operand-anchor", clock);
    expect(anchorOutcome.errors).toEqual([]);
    expect(anchorOutcome.verified).toBe(true);
    expect(anchorBody).toContain(CAPTURED_OPERAND_ENC[8500]);
  }, 120_000);

  test("a tampered pod document fails the real signature check", async () => {
    const body = await readVault("/mortgage/credentials/income");
    const outcome = await verifyStored(
      body.replace("8500", "9100"),
      "employment",
      "employment-income-credential",
      clock,
    );
    expect(outcome.verified).toBe(false);
    expect(outcome.errors.map((error) => error.code)).toContain("INVALID_SIGNATURE");
  });

  test("issuing the same flow twice is refused 409 (renewal is the re-issue rail)", async () => {
    const response = await service.issue(
      await authedRequest(borrower, "POST", "issue", {
        body: JSON.stringify({ flow: "employment" }),
      }),
    );
    expect(response.status).toBe(409);
    expect(((await response.json()) as { error: string }).error).toBe("already_issued");
  });

  test("assets (env-JWK key path) and credit issue + verify; asset flow has no anchor", async () => {
    const assets = await service.issue(
      await authedRequest(borrower, "POST", "issue", { body: JSON.stringify({ flow: "assets" }) }),
    );
    expect(assets.status).toBe(200);
    const assetsPayload = (await assets.json()) as { anchor: unknown; credential: { id: string } };
    expect(assetsPayload.anchor).toBeNull();
    const assetsBody = await readVault("/mortgage/credentials/assets");
    const assetsOutcome = await verifyStored(assetsBody, "assets", "asset-credential", clock);
    expect(assetsOutcome.errors).toEqual([]);
    expect(assetsOutcome.verified).toBe(true);

    const credit = await service.issue(
      await authedRequest(borrower, "POST", "issue", { body: JSON.stringify({ flow: "credit" }) }),
    );
    expect(credit.status).toBe(200);
    creditIndex = ((await credit.json()) as { credential: { statusListIndex?: string } }).credential
      .statusListIndex;
    const creditBody = await readVault("/mortgage/credentials/credit");
    const creditOutcome = await verifyStored(
      creditBody,
      "credit",
      "credit-score-credential",
      clock,
    );
    expect(creditOutcome.errors).toEqual([]);
    expect(creditOutcome.verified).toBe(true);
    const creditAnchor = await readVault(ANCHOR_POD_PATHS.credit);
    expect(creditAnchor).toContain(CAPTURED_OPERAND_ENC[742]);
  }, 120_000);

  test("the flows dashboard reflects the live vault state", async () => {
    const response = await service.flows(await authedRequest(borrower, "GET", "flows"));
    expect(response.status).toBe(200);
    const { flows } = (await response.json()) as {
      flows: readonly { id: string; issued?: boolean; verified?: boolean; fresh?: boolean }[];
    };
    for (const id of ["employment", "assets", "credit"]) {
      expect(
        flows.find((entry) => entry.id === id),
        id,
      ).toMatchObject({
        fresh: true,
        issued: true,
        verified: true,
      });
    }
  }, 120_000);

  describe("scene 4 — staleness, revocation and one-click re-issue (REAL status list)", () => {
    test("expired → re-issue revokes the old index and restores validity", async () => {
      const staleAt = new Date(clock.getTime() + 15 * DAY_MS);
      const oldBody = await readVault("/mortgage/credentials/income");

      // 15 days on, the employment VC (validUntil +14d) is genuinely stale.
      const stale = await verifyStored(
        oldBody,
        "employment",
        "employment-income-credential",
        staleAt,
      );
      expect(stale.verified).toBe(false);
      expect(stale.errors.map((error) => error.code)).toContain("EXPIRED");
      expect(isFresh(stale.credential ?? {}, staleAt)).toBe(false);

      // One click, through the existing grant.
      clock = staleAt;
      const response = await service.reissue(
        await authedRequest(borrower, "POST", "reissue", {
          body: JSON.stringify({ flow: "employment" }),
        }),
      );
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        credential: { id: string };
        anchor: { id: string } | null;
        revokedIndex: number;
        newIndex: number;
      };
      expect(String(payload.revokedIndex)).toBe(employmentIndex);
      expect(payload.newIndex).not.toBe(payload.revokedIndex);
      expect(payload.credential.id).toBe(`${podBase}mortgage/credentials/income`);
      expect(payload.anchor?.id).toBe(`${podBase}${ANCHOR_POD_PATHS.employment.slice(1)}`);

      // The OLD document is now expired AND revoked — the revocation is
      // observed through the REAL hosted Bitstring list, not a stub.
      const oldOutcome = await verifyStored(
        oldBody,
        "employment",
        "employment-income-credential",
        staleAt,
      );
      expect(oldOutcome.verified).toBe(false);
      expect(oldOutcome.errors.map((error) => error.code)).toEqual(
        expect.arrayContaining(["EXPIRED", "STATUS_REVOKED"]),
      );

      // The replacement verifies cleanly at the same instant: green tick back.
      const freshBody = await readVault("/mortgage/credentials/income");
      const freshOutcome = await verifyStored(
        freshBody,
        "employment",
        "employment-income-credential",
        staleAt,
      );
      expect(freshOutcome.errors).toEqual([]);
      expect(freshOutcome.verified).toBe(true);
      expect(isFresh(freshOutcome.credential ?? {}, staleAt)).toBe(true);

      // The operand anchor was renewed in the same click.
      const anchorBody = await readVault(ANCHOR_POD_PATHS.employment);
      const anchorOutcome = await verifyStored(
        anchorBody,
        "employment",
        "zk-operand-anchor",
        staleAt,
      );
      expect(anchorOutcome.errors).toEqual([]);
      expect(anchorOutcome.verified).toBe(true);
      expect(anchorBody).toContain(CAPTURED_OPERAND_ENC[8500]);
    }, 120_000);

    test("re-issuing a flow with no stored credential is 404", async () => {
      // Empty the assets slot (an owner act) — the rail must answer 404, not mint.
      const deleted = await owner.authFetch(`${podBase}mortgage/credentials/assets`, {
        method: "DELETE",
      });
      expect(deleted.ok).toBe(true);
      const response = await service.reissue(
        await authedRequest(borrower, "POST", "reissue", {
          body: JSON.stringify({ flow: "assets" }),
        }),
      );
      expect(response.status).toBe(404);
    }, 120_000);

    test("a REVOKED credential fails verification and is refused one-click re-issue", async () => {
      // The issuer explicitly revokes the credit credential's index on the
      // REAL hosted list (an issuer decision, outside the one-click rail).
      const list = new StatusListClient({
        fetch,
        issuer: issuerWebIds.credit,
        key: issuerKeys.credit,
        url: statusListUrls.credit,
      });
      expect(creditIndex).toBeDefined();
      await list.revoke(Number(creditIndex), { now: clock });

      const creditBody = await readVault("/mortgage/credentials/credit");
      const outcome = await verifyStored(creditBody, "credit", "credit-score-credential", clock);
      expect(outcome.verified).toBe(false);
      expect(outcome.errors.map((error) => error.code)).toContain("STATUS_REVOKED");

      const response = await service.reissue(
        await authedRequest(borrower, "POST", "reissue", {
          body: JSON.stringify({ flow: "credit" }),
        }),
      );
      expect(response.status).toBe(409);
      const payload = (await response.json()) as { error: string; verifyErrors?: string[] };
      expect(payload.error).toBe("reissue_refused");
      expect(payload.verifyErrors).toContain("STATUS_REVOKED");

      // And the revoked document STAYS revoked — nothing was re-signed.
      const after = await verifyStored(
        await readVault("/mortgage/credentials/credit"),
        "credit",
        "credit-score-credential",
        clock,
      );
      expect(after.verified).toBe(false);
    }, 120_000);
  });
});
