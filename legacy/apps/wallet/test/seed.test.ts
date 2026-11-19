/**
 * The Mode-1 pod seed (lib/pod/seed.ts): the exact fixture set the worker
 * provisions, validated OUTSIDE a browser — signed credentials that pass the
 * full vc-kit verification chain against pod-served issuer documents, anchors
 * carrying the CAPTURED genuine operand encodings, and the scene-4
 * near-expiry employment window.
 */
import { CRED, MORT, validate } from "@mortgage/data-model";
import { verifyCredential } from "@mortgage/vc-kit";
import { DataFactory, Parser, Store } from "n3";
import { describe, expect, test } from "vitest";
import {
  ANCHOR_POD_PATHS,
  buildWalletPodSeed,
  CAPTURED_OPERAND_ENC,
  CREDENTIAL_POD_PATHS,
  podIssuerIris,
  WALLET_POD_BASE,
  WALLET_WEB_ID,
  type WalletPodSeed,
} from "../lib/pod/seed";

const NOW = new Date("2026-07-16T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

let cached: Promise<WalletPodSeed> | undefined;
function seed(): Promise<WalletPodSeed> {
  cached ??= buildWalletPodSeed(NOW);
  return cached;
}

function iriOf(path: string): string {
  return `${WALLET_POD_BASE.slice(0, -1)}${path}`;
}

/** Serve the seed fixtures the way the pod would (GET by pod URL). */
function fixtureFetch(fixtures: WalletPodSeed["fixtures"]): typeof fetch {
  const byUrl = new Map(
    fixtures.map((fixture) => [
      iriOf(fixture.path),
      { body: fixture.body, contentType: fixture.contentType ?? "text/turtle" },
    ]),
  );
  return (input) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    url.hash = "";
    const stored = byUrl.get(url.href);
    if (stored === undefined) {
      return Promise.resolve(new Response("not found", { status: 404 }));
    }
    return Promise.resolve(
      new Response(stored.body, {
        status: 200,
        headers: { "content-type": stored.contentType },
      }),
    );
  };
}

describe("the wallet Mode-1 pod seed", () => {
  test("every credential passes the FULL verification chain against pod-served documents", async () => {
    const { fixtures } = await seed();
    const podFetch = fixtureFetch(fixtures);
    const expectations = [
      [CREDENTIAL_POD_PATHS.income, "employment-income-credential"],
      [CREDENTIAL_POD_PATHS.assets, "asset-credential"],
      [CREDENTIAL_POD_PATHS.credit, "credit-score-credential"],
      [CREDENTIAL_POD_PATHS.appraisal, "appraisal-credential"],
      [CREDENTIAL_POD_PATHS.title, "title-clear-credential"],
      [ANCHOR_POD_PATHS.income, "zk-operand-anchor"],
      [ANCHOR_POD_PATHS.score, "zk-operand-anchor"],
    ] as const;
    for (const [path, kind] of expectations) {
      const fixture = fixtures.find((entry) => entry.path === path);
      expect(fixture, path).toBeDefined();
      const result = await verifyCredential(fixture?.body ?? "", {
        expectShape: kind,
        now: NOW,
        trustedIssuers: podIssuerIris(),
        webIdFetch: podFetch,
        statusFetch: podFetch,
      });
      expect(result.verified, `${path}: ${JSON.stringify(result.errors)}`).toBe(true);
      // Decision-0015 L3 subject binding holds for every seeded credential.
      expect(result.credential?.subject).toBe(WALLET_WEB_ID);
    }
  }, 60_000);

  test("the anchors carry the CAPTURED genuine operand encodings (never fabricated)", async () => {
    const { fixtures } = await seed();
    const income = fixtures.find((entry) => entry.path === ANCHOR_POD_PATHS.income);
    const score = fixtures.find((entry) => entry.path === ANCHOR_POD_PATHS.score);
    expect(income?.body).toContain(CAPTURED_OPERAND_ENC[8500]);
    expect(income?.body).toContain(MORT.monthlyGrossIncomeUsd);
    expect(score?.body).toContain(CAPTURED_OPERAND_ENC[742]);
    expect(score?.body).toContain(MORT.creditScoreValue);
  });

  test("the employment credential is genuinely near-expiry (scene 4, no fake clock)", async () => {
    const { fixtures } = await seed();
    const income = fixtures.find((entry) => entry.path === CREDENTIAL_POD_PATHS.income);
    const store = new Store(new Parser({ format: "text/turtle" }).parse(income?.body ?? ""));
    const validUntil = [...store.match(null, DataFactory.namedNode(CRED.validUntil), null)];
    expect(validUntil).toHaveLength(1);
    const lexical = validUntil[0]?.object.value ?? "";
    expect(new Date(lexical).getTime()).toBe(NOW.getTime() + 14 * DAY_MS);
  });

  test("the persona documents and profile card are present and SHACL-valid", async () => {
    const { fixtures } = await seed();
    for (const [path, kind, focus] of [
      ["/mortgage/profile", "borrower-profile", WALLET_WEB_ID],
      ["/mortgage/application", "loan-application", iriOf("/mortgage/application")],
      ["/mortgage/decision", "underwriting-decision", iriOf("/mortgage/decision")],
      ["/mortgage/closing", "closing-record", iriOf("/mortgage/closing")],
    ] as const) {
      const fixture = fixtures.find((entry) => entry.path === path);
      expect(fixture, path).toBeDefined();
      const dataset = new Store(new Parser({ format: "text/turtle" }).parse(fixture?.body ?? ""));
      const report = await validate(dataset, { expect: kind, focusNode: focus });
      expect(report.conforms, path).toBe(true);
    }
    expect(fixtures.some((entry) => entry.path === "/profile/card")).toBe(true);
  });
});
