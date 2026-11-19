/**
 * sm-65 — ROOT integration: the REAL seeded harness pod. Boots the sparq
 * dev-server, seeds the scripted-persona mortgage layout through
 * `@jeswr/solid-seed` with the REAL vc-kit issuance
 * (e2e/support/mortgage-issuance.ts — the same composition the e2e
 * global-setup and `pnpm run dev:pod` use), then proves the SECURITY BAR:
 * every seeded credential, read back over HTTP from the live pod, passes
 * vc-kit's FULL fail-closed verification chain (signature, issuer control,
 * validity window, hosted status list, SHACL shape) with only pod-served
 * documents — and the anchors carry the CAPTURED genuine operand encodings
 * the other apps pin.
 *
 * Lives at the workspace root because it needs BOTH @mortgage/solid-kit and
 * @mortgage/vc-kit (see e2e/support/mortgage-issuance.ts for why the
 * composition cannot live inside solid-kit).
 *
 * The native dual-sign rail (SPARQ_CHECKOUT) is covered by a gated test at
 * the end — same gating convention as packages/vc-kit's native suite.
 */

import { execFileSync } from "node:child_process";
import { CRED, validate } from "@mortgage/data-model";
import {
  CAPTURED_OPERAND_ENC,
  DEMO_CREDIT_SCORE,
  DEMO_MONTHLY_INCOME_USD,
  MORTGAGE_ANCHOR_POD_PATHS,
  MORTGAGE_CREDENTIAL_POD_PATHS,
  MORTGAGE_SEED_ISSUER_ROLES,
  MORTGAGE_WITNESS_POD_PATHS,
  type SeededMortgagePod,
  scriptedCredentialSeedsFor,
  seedMortgagePod,
} from "@mortgage/solid-kit/mortgage-seed";
import { type SolidTestServer, startSolidServer } from "@mortgage/solid-kit/testing";
import { verifyCredential } from "@mortgage/vc-kit";
import { DataFactory, Parser, Store } from "n3";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createMortgageIssuance, nativeBridgeFromEnv } from "../e2e/support/mortgage-issuance";

const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;

let server: SolidTestServer;
let seeded: SeededMortgagePod;

beforeAll(async () => {
  server = await startSolidServer({});
  const account = server.accounts[0];
  if (account === undefined) throw new Error("no primary account");
  seeded = await seedMortgagePod({
    target: { webid: account.webid, baseUrl: account.baseUrl, authFetch: account.authFetch },
    issuance: createMortgageIssuance({ podOrigin: account.baseUrl, now: NOW }),
    now: NOW,
    mode: "create",
  });
}, 120_000);

afterAll(async () => {
  await server?.stop();
});

function podUrl(path: string): string {
  return `${new URL(seeded.baseUrl).origin}${path}`;
}

async function fetchBody(path: string): Promise<string> {
  const response = await fetch(podUrl(path));
  expect(response.ok, `${path}: HTTP ${response.status}`).toBe(true);
  return response.text();
}

function trustedIssuers(): string[] {
  const origin = new URL(seeded.baseUrl).origin;
  return Object.values(MORTGAGE_SEED_ISSUER_ROLES).map((role) => `${origin}${role.docPath}`);
}

describe("the seeded harness pod (REAL issuance, REAL verifiers)", () => {
  test("every seeded credential passes the FULL verification chain read back from the pod", async () => {
    const expectations = [
      [MORTGAGE_CREDENTIAL_POD_PATHS.income, "employment-income-credential"],
      [MORTGAGE_CREDENTIAL_POD_PATHS.assets, "asset-credential"],
      [MORTGAGE_CREDENTIAL_POD_PATHS.credit, "credit-score-credential"],
      [MORTGAGE_CREDENTIAL_POD_PATHS.appraisal, "appraisal-credential"],
      [MORTGAGE_CREDENTIAL_POD_PATHS.title, "title-clear-credential"],
      [MORTGAGE_ANCHOR_POD_PATHS.income, "zk-operand-anchor"],
      [MORTGAGE_ANCHOR_POD_PATHS.score, "zk-operand-anchor"],
    ] as const;
    for (const [path, kind] of expectations) {
      const result = await verifyCredential(await fetchBody(path), {
        expectShape: kind,
        now: NOW,
        trustedIssuers: trustedIssuers(),
        webIdFetch: fetch,
        statusFetch: fetch,
      });
      expect(result.verified, `${path}: ${JSON.stringify(result.errors)}`).toBe(true);
      // Decision-0015 subject binding: credentialSubject == pod owner WebID.
      expect(result.credential?.subject).toBe(seeded.webid);
    }
  }, 120_000);

  test("the employment VC is the BACKDATED scene-4 credential (−30d/+14d, genuinely lapsing)", async () => {
    const body = await fetchBody(MORTGAGE_CREDENTIAL_POD_PATHS.income);
    const store = new Store(
      new Parser({
        format: "text/turtle",
        baseIRI: podUrl(MORTGAGE_CREDENTIAL_POD_PATHS.income),
      }).parse(body),
    );
    const lexical = (predicate: string): string => {
      const matches = [...store.match(null, DataFactory.namedNode(predicate), null)];
      expect(matches).toHaveLength(1);
      return matches[0]?.object.value ?? "";
    };
    expect(new Date(lexical(CRED.validFrom)).getTime()).toBe(NOW.getTime() - 30 * DAY_MS);
    expect(new Date(lexical(CRED.validUntil)).getTime()).toBe(NOW.getTime() + 14 * DAY_MS);
  });

  test("the anchors carry the CAPTURED genuine operand encodings (cross-app canon)", async () => {
    const income = await fetchBody(MORTGAGE_ANCHOR_POD_PATHS.income);
    const score = await fetchBody(MORTGAGE_ANCHOR_POD_PATHS.score);
    expect(income).toContain(CAPTURED_OPERAND_ENC[DEMO_MONTHLY_INCOME_USD]);
    expect(score).toContain(CAPTURED_OPERAND_ENC[DEMO_CREDIT_SCORE]);
  });

  test("the persona documents read back SHACL-valid", async () => {
    for (const [path, kind, focus] of [
      ["/mortgage/profile", "borrower-profile", seeded.webid],
      ["/mortgage/application", "loan-application", podUrl("/mortgage/application")],
      ["/mortgage/decision", "underwriting-decision", podUrl("/mortgage/decision")],
      ["/mortgage/closing", "closing-record", podUrl("/mortgage/closing")],
    ] as const) {
      const dataset = new Store(
        new Parser({ format: "text/turtle", baseIRI: podUrl(path) }).parse(await fetchBody(path)),
      );
      const report = await validate(dataset, { expect: kind, focusNode: focus });
      expect(report.conforms, `${path}: ${JSON.stringify(report.violations)}`).toBe(true);
    }
  }, 60_000);

  test("the captured rail seeds NO witness resources (they exist only when genuinely dual-signed)", async () => {
    for (const path of Object.values(MORTGAGE_WITNESS_POD_PATHS)) {
      const response = await fetch(podUrl(path));
      expect(response.status, path).toBe(404);
    }
  });
});

describe("seeded access control under OIDC (REAL DPoP + REAL WAC + REAL issuance)", () => {
  test("a SECOND verified identity and anonymous readers are DENIED the borrower's credentials and anchors, while verification still passes with ANONYMOUS issuer-doc/status-list fetches", {
    timeout: 180_000,
  }, async () => {
    const server = await startSolidServer({ oidc: true });
    try {
      const owner = server.accounts[0];
      if (owner === undefined) throw new Error("no primary account");
      const oidcSeeded = await seedMortgagePod({
        target: { webid: owner.webid, baseUrl: owner.baseUrl, authFetch: owner.authFetch },
        issuance: createMortgageIssuance({ podOrigin: owner.baseUrl, now: NOW }),
        now: NOW,
        mode: "create",
      });
      const stranger = await server.provisionAccount();
      expect(stranger.webid).not.toBe(owner.webid);
      const origin = new URL(owner.baseUrl).origin;

      for (const path of [
        ...Object.values(MORTGAGE_CREDENTIAL_POD_PATHS),
        MORTGAGE_ANCHOR_POD_PATHS.income,
        MORTGAGE_ANCHOR_POD_PATHS.score,
      ]) {
        const url = `${origin}${path}`;
        const strangerRead = await stranger.authFetch(url);
        expect([401, 403], `stranger read ${path}: HTTP ${strangerRead.status}`).toContain(
          strangerRead.status,
        );
        const anonymousRead = await fetch(url);
        expect([401, 403], `anonymous read ${path}: HTTP ${anonymousRead.status}`).toContain(
          anonymousRead.status,
        );
      }

      // The owner reads its own credential, and the FULL fail-closed
      // verification chain passes with plain ANONYMOUS fetches for the
      // issuer documents and status lists — the public-read ACLs are
      // exactly what keeps external verification working.
      const ownerRead = await owner.authFetch(`${origin}${MORTGAGE_CREDENTIAL_POD_PATHS.credit}`);
      expect(ownerRead.status).toBe(200);
      const result = await verifyCredential(await ownerRead.text(), {
        expectShape: "credit-score-credential",
        now: NOW,
        trustedIssuers: Object.values(MORTGAGE_SEED_ISSUER_ROLES).map(
          (role) => `${origin}${role.docPath}`,
        ),
        webIdFetch: fetch,
        statusFetch: fetch,
      });
      expect(result.verified, JSON.stringify(result.errors)).toBe(true);
      expect(result.credential?.subject).toBe(oidcSeeded.webid);
    } finally {
      await server.stop();
    }
  });
});

describe("path-based pod bases (issuer IRIs never collapse to the origin)", () => {
  test("createMortgageIssuance preserves a storage-root path in issuer + credential IRIs", async () => {
    // Never dereferenced: the captured-rail issuance is entirely in-memory.
    const base = "http://127.0.0.1:39999/alex";
    const resolve = (path: string): string => `${base}${path}`;
    const context = { webid: resolve("/profile/card#me"), resolve };
    const issuance = createMortgageIssuance({ podOrigin: base, now: NOW });
    const spec = scriptedCredentialSeedsFor("alex-rivera", NOW).find(
      (entry) => entry.id === "credit",
    );
    if (spec === undefined) throw new Error("scripted seeds are missing the credit credential");
    const issued = await issuance.issue(spec, context);
    expect(issued.vc.body).toContain(`${base}${MORTGAGE_SEED_ISSUER_ROLES.bureau.docPath}`);
    expect(issued.vc.body).toContain(`${base}${MORTGAGE_CREDENTIAL_POD_PATHS.credit}`);
    // Pod-hosted issuer resources stay pod-BASE-relative for the layout to place.
    const issuerDocs = await issuance.issuerResources(context);
    expect(issuerDocs.map((resource) => resource.path)).toContain(
      MORTGAGE_SEED_ISSUER_ROLES.bureau.docPath,
    );
  }, 60_000);
});

// ── native dual-sign rail (gated, same convention as vc-kit's native suite) ──

function cargoAvailable(): boolean {
  try {
    execFileSync("cargo", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const nativeEnabled =
  process.env.SPARQ_CHECKOUT !== undefined && process.env.SPARQ_CHECKOUT !== "" && cargoAvailable();
// First run compiles the sparq crates — allow plenty.
const NATIVE_TIMEOUT = 20 * 60 * 1000;

describe.skipIf(!nativeEnabled)("native dual-sign rail (gated on SPARQ_CHECKOUT)", () => {
  test(
    "seeds REAL Schnorr-BJJ witnesses beside the anchored credentials — and they are OWNER-ONLY under real WAC",
    async () => {
      // OIDC mode: the witness denial below is evaluated by real WAC, not
      // vacuously satisfied by fixed-owner serving.
      const nativeServer = await startSolidServer({ oidc: true });
      try {
        const account = nativeServer.accounts[0];
        if (account === undefined) throw new Error("no primary account");
        const native = nativeBridgeFromEnv();
        if (native === undefined) throw new Error("SPARQ_CHECKOUT vanished mid-test");
        await seedMortgagePod({
          target: { webid: account.webid, baseUrl: account.baseUrl, authFetch: account.authFetch },
          issuance: createMortgageIssuance({
            podOrigin: account.baseUrl,
            now: NOW,
            ...native,
          }),
          now: NOW,
          mode: "create",
        });
        const stranger = await nativeServer.provisionAccount();
        const origin = new URL(account.baseUrl).origin;
        for (const [id, path] of Object.entries(MORTGAGE_WITNESS_POD_PATHS)) {
          // The REAL witness is borrower-only: anonymous and cross-identity
          // reads are denied before the owner's read is trusted.
          const anonymousRead = await fetch(`${origin}${path}`);
          expect([401, 403], `anonymous read ${path}`).toContain(anonymousRead.status);
          const strangerRead = await stranger.authFetch(`${origin}${path}`);
          expect([401, 403], `stranger read ${path}`).toContain(strangerRead.status);
          const response = await account.authFetch(`${origin}${path}`);
          expect(response.status, path).toBe(200);
          const witness = (await response.json()) as {
            type: string;
            attestation: { cryptosuite: string; signature: string; commitment: string };
            witness: { saltHex: string; indexBlindingHex: string };
          };
          expect(witness.type, id).toBe("urn:sparq:zk:SeedWitness");
          expect(witness.attestation.cryptosuite).toContain("poseidon2-schnorr");
          // sparq Schnorr-BJJ signatures serialise as BARE hex (128 chars,
          // R‖s), unlike the 0x-prefixed field elements.
          expect(witness.attestation.signature).toMatch(/^[0-9a-f]{128}$/);
          expect(witness.attestation.commitment).toMatch(/^0x[0-9a-f]+$/);
          expect(witness.witness.saltHex).toMatch(/^0x[0-9a-f]+$/);
        }
      } finally {
        await nativeServer.stop();
      }
    },
    NATIVE_TIMEOUT,
  );
});
