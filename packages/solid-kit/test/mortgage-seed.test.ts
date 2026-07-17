/**
 * sm-65 — the mortgage-seed layer's OWN plumbing: scripted-persona override
 * pinning, the captured-encodings bridge's fail-closed contract, the pod
 * layout + solid-seed write path against a real harness pod, the mort SHACL
 * inputs, and the pinned upstream synthetic-rdf capability gap.
 *
 * The issuance injected here is a PLUMBING FAKE (clearly-labelled bodies) —
 * real signed seeding is covered by the ROOT integration suite
 * (test/mortgage-seed-integration.test.ts), which composes the real
 * @mortgage/vc-kit issuance this package cannot depend on, and by the wallet
 * Mode-1 suite (apps/wallet/test/seed.test.ts).
 */

import { MORT, validate } from "@mortgage/data-model";
import { DataFactory, Parser, Store } from "n3";
import { afterAll, describe, expect, test } from "vitest";
import { type SolidTestServer, startSolidServer } from "../src/harness.js";
import {
  anchorValidity,
  CAPTURED_OPERAND_ENC,
  capturedOperandBridge,
  DEMO_CREDIT_SCORE,
  DEMO_MONTHLY_INCOME_USD,
  fixtureResourceSpec,
  generateMortgageInstances,
  MORT_SHAPE_IRIS,
  MORTGAGE_ANCHOR_POD_PATHS,
  MORTGAGE_CREDENTIAL_POD_PATHS,
  MORTGAGE_SEED_ISSUER_ROLES,
  MORTGAGE_WITNESS_POD_PATHS,
  type MortgageCredentialIssuance,
  mortgageShapesDataset,
  normalizedPodBase,
  type ScriptedCredentialSeed,
  type SeededMortgagePod,
  scriptedCredentialSeedsFor,
  seedMortgagePod,
} from "../src/mortgage-seed/index.js";

const NOW = new Date("2026-07-16T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const servers: SolidTestServer[] = [];
afterAll(async () => {
  await Promise.all(servers.map((server) => server.stop()));
});

async function freshServer(): Promise<SolidTestServer> {
  const server = await startSolidServer({});
  servers.push(server);
  return server;
}

/** A clearly-labelled plumbing fake (see the module header). */
function fakeIssuance(
  overrides: {
    operandEncFor?: (spec: ScriptedCredentialSeed) => string;
    /**
     * Also emit a plumbing-fake WITNESS resource at the anchor's witness
     * path. The native dual-sign rail is env-gated (SPARQ_CHECKOUT — real
     * witness coverage lives in the root integration suite's gated test), but
     * the witness resource's ACCESS posture must be provable everywhere: this
     * materialises a resource at the real witness pod path so the layout's
     * owner-only ACL is exercised, faking no signature and no encoding.
     */
    withWitness?: boolean;
  } = {},
): MortgageCredentialIssuance {
  return {
    issue(spec, context) {
      const body = `# plumbing-fake credential for ${context.resolve(spec.path)}\n<#it> a <https://schema.org/Thing> .\n`;
      return Promise.resolve({
        vc: { body, contentType: "text/turtle" },
        anchors:
          spec.anchor === undefined
            ? []
            : [
                {
                  path: spec.anchor.path,
                  field: spec.anchor.field,
                  operandEnc: overrides.operandEncFor?.(spec) ?? spec.anchor.operandEnc,
                  body: `# plumbing-fake anchor\n<#it> a <https://schema.org/Thing> .\n`,
                  contentType: "text/turtle",
                },
              ],
        ...(overrides.withWitness === true && spec.anchor !== undefined
          ? {
              witness: {
                path: spec.anchor.witnessPath,
                body: '{"type":"plumbing-fake-witness"}',
                contentType: "application/json",
              },
            }
          : {}),
      });
    },
    issuerResources() {
      return Promise.resolve(
        Object.values(MORTGAGE_SEED_ISSUER_ROLES).flatMap((role) => [
          {
            path: role.docPath,
            body: "<#it> a <https://schema.org/Thing> .\n",
            contentType: "text/turtle",
          },
          {
            path: role.statusPath,
            body: "<#it> a <https://schema.org/Thing> .\n",
            contentType: "text/turtle",
          },
        ]),
      );
    },
  };
}

describe("scripted-persona overrides (sm-65 §5.1)", () => {
  const seeds = scriptedCredentialSeedsFor("alex-rivera", NOW);

  test("the employment credential is the scene-4 BACKDATED VC (−30d/+14d, decision 0012)", () => {
    const income = seeds.find((spec) => spec.id === "income");
    expect(income?.validFrom.getTime()).toBe(NOW.getTime() - 30 * DAY_MS);
    expect(income?.validUntil.getTime()).toBe(NOW.getTime() + 14 * DAY_MS);
    expect(income?.claims).toMatchObject({ monthlyGrossIncomeUsd: DEMO_MONTHLY_INCOME_USD });
  });

  test("both anchors pin the CAPTURED genuine operand encodings for the demo values", () => {
    const income = seeds.find((spec) => spec.id === "income");
    const credit = seeds.find((spec) => spec.id === "credit");
    expect(income?.anchor?.field).toBe(MORT.monthlyGrossIncomeUsd);
    expect(income?.anchor?.operandEnc).toBe(CAPTURED_OPERAND_ENC[DEMO_MONTHLY_INCOME_USD]);
    expect(credit?.anchor?.field).toBe(MORT.creditScoreValue);
    expect(credit?.anchor?.operandEnc).toBe(CAPTURED_OPERAND_ENC[DEMO_CREDIT_SCORE]);
    // The pinned encodings are the exact bytes the other apps compare against
    // (apps/wallet, apps/verifications CAPTURED_OPERAND_ENC copies).
    expect(CAPTURED_OPERAND_ENC[8500]).toBe(
      "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
    );
    expect(CAPTURED_OPERAND_ENC[742]).toBe(
      "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
    );
  });

  test("all five credentials cover the sm-20 pod paths with per-role issuers", () => {
    expect(seeds.map((spec) => spec.path).sort()).toEqual(
      Object.values(MORTGAGE_CREDENTIAL_POD_PATHS).sort(),
    );
    expect(new Set(seeds.map((spec) => spec.issuerRole)).size).toBe(5);
  });

  test("anchor validity follows the wallet convention (−1d/+14d)", () => {
    const window = anchorValidity(NOW);
    expect(window.validFrom.getTime()).toBe(NOW.getTime() - 1 * DAY_MS);
    expect(window.validUntil.getTime()).toBe(NOW.getTime() + 14 * DAY_MS);
  });
});

describe("capturedOperandBridge (fail-closed sm-26 seam)", () => {
  test("serves the captured genuine encodings", async () => {
    const result = await capturedOperandBridge().run({ encodeInts: [8500, 742] });
    expect(result.encodings["8500"]).toBe(CAPTURED_OPERAND_ENC[8500]);
    expect(result.encodings["742"]).toBe(CAPTURED_OPERAND_ENC[742]);
  });

  test("REFUSES uncaptured values (encodings are never fabricated)", async () => {
    await expect(capturedOperandBridge().run({ encodeInts: [610] })).rejects.toThrow(
      /no captured operand encoding for 610/,
    );
  });

  test("REFUSES dual-sign and composite jobs (signatures are never stubbed)", async () => {
    await expect(capturedOperandBridge().run({ credentials: [{}] })).rejects.toThrow(
      /REAL native toolchain/,
    );
    await expect(capturedOperandBridge().run({ composite: {} })).rejects.toThrow(
      /REAL native toolchain/,
    );
  });
});

describe("mortgagePodLayout + seedMortgagePod (solid-seed write path)", () => {
  async function seeded(): Promise<{ server: SolidTestServer; pod: SeededMortgagePod }> {
    const server = await freshServer();
    const account = server.accounts[0];
    if (account === undefined) throw new Error("no primary account");
    const pod = await seedMortgagePod({
      target: { webid: account.webid, baseUrl: account.baseUrl, authFetch: account.authFetch },
      issuance: fakeIssuance(),
      now: NOW,
      mode: "create",
    });
    return { server, pod };
  }

  test("seeds the full layout: card, documents, credential groups, anchors, issuer docs", async () => {
    const { server, pod } = await seeded();
    const outcomes = pod.manifest.pods[0];
    expect(outcomes).toBeDefined();
    const byPath = new Map(outcomes?.resources.map((entry) => [entry.path, entry.status]));
    const expectedPaths = [
      "/profile/card",
      "/mortgage/profile",
      "/mortgage/application",
      "/mortgage/decision",
      "/mortgage/closing",
      ...Object.values(MORTGAGE_CREDENTIAL_POD_PATHS),
      MORTGAGE_ANCHOR_POD_PATHS.income,
      MORTGAGE_ANCHOR_POD_PATHS.score,
      ...Object.values(MORTGAGE_SEED_ISSUER_ROLES).flatMap((role) => [
        role.docPath,
        role.statusPath,
      ]),
    ];
    for (const path of expectedPaths) {
      expect(byPath.get(path), path).toBe("created");
    }
    // Every seeded resource carries an AFFIRMATIVE least-privilege ACL — the
    // access posture must never be inherited from the serving host's default.
    // Fixed-owner mode can only prove the `.acl` documents were written;
    // allow/deny semantics are proven in the OIDC describe below.
    for (const path of expectedPaths) {
      const aclResponse = await fetch(`${server.baseUrl}${path}.acl`);
      expect(aclResponse.status, `${path}.acl`).toBe(200);
    }
    // Six expander groups: five credentials + the issuer fixtures.
    expect(outcomes?.groups).toHaveLength(6);
    expect(outcomes?.groups.every((group) => group.status === "written")).toBe(true);

    // The persona documents read back SHACL-valid from the live pod.
    const response = await fetch(`${server.baseUrl}/mortgage/application`);
    expect(response.ok).toBe(true);
    const dataset = new Store(
      new Parser({
        format: "text/turtle",
        baseIRI: `${server.baseUrl}/mortgage/application`,
      }).parse(await response.text()),
    );
    const report = await validate(dataset, {
      expect: "loan-application",
      focusNode: `${server.baseUrl}/mortgage/application`,
    });
    expect(report.conforms).toBe(true);
  }, 60_000);

  test("create mode refuses a double seed (a doubly seeded pod is a harness bug)", async () => {
    const { server } = await seeded();
    const account = server.accounts[0];
    if (account === undefined) throw new Error("no primary account");
    await expect(
      seedMortgagePod({
        target: { webid: account.webid, baseUrl: account.baseUrl, authFetch: account.authFetch },
        issuance: fakeIssuance(),
        now: NOW,
        mode: "create",
      }),
    ).rejects.toThrow();
  }, 60_000);

  test("an issuance emitting a DIFFERENT encoding than the captured canon is refused (drift gate)", async () => {
    const server = await freshServer();
    const account = server.accounts[0];
    if (account === undefined) throw new Error("no primary account");
    // solid-seed wraps expander failures in SeedError with the cause attached.
    const failure = await seedMortgagePod({
      target: { webid: account.webid, baseUrl: account.baseUrl, authFetch: account.authFetch },
      issuance: fakeIssuance({ operandEncFor: () => "0xdeadbeef" }),
      now: NOW,
      mode: "create",
    }).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(Error);
    expect(String((failure as Error).cause)).toMatch(/operand encoding drift/);
  }, 60_000);
});

describe("seeded access control (affirmative least-privilege ACLs)", () => {
  test("fixtureResourceSpec never drops the publicRead flag", () => {
    const body = "<#it> a <https://schema.org/Thing> .\n";
    // Absent and explicit-false both map to an affirmatively private ACL.
    expect(fixtureResourceSpec({ path: "/x", body }).access).toEqual({ publicRead: false });
    expect(fixtureResourceSpec({ path: "/x", body, publicRead: false }).access).toEqual({
      publicRead: false,
    });
    expect(
      fixtureResourceSpec({ path: "/x", body, publicRead: true, contentType: "text/turtle" }),
    ).toEqual({
      path: "/x",
      source: { body },
      contentType: "text/turtle",
      access: { publicRead: true },
    });
  });

  test("OIDC + real WAC: a SECOND verified identity and anonymous readers are DENIED every borrower-private resource (ZK witnesses, credentials, anchors, persona documents) while issuer docs + status lists stay public and the owner reads everything", {
    timeout: 120_000,
  }, async () => {
    const server = await startSolidServer({ oidc: true });
    servers.push(server);
    const owner = server.accounts[0];
    if (owner === undefined) throw new Error("no primary account");
    // The witness resources are materialised at the REAL witness pod paths
    // via the plumbing-fake issuance (`withWitness` — see its doc comment);
    // DPoP verification and WAC evaluation below are fully real.
    await seedMortgagePod({
      target: { webid: owner.webid, baseUrl: owner.baseUrl, authFetch: owner.authFetch },
      issuance: fakeIssuance({ withWitness: true }),
      now: NOW,
      mode: "create",
    });
    const stranger = await server.provisionAccount();
    expect(stranger.webid).not.toBe(owner.webid);

    const borrowerPrivate = [
      MORTGAGE_WITNESS_POD_PATHS.income,
      MORTGAGE_WITNESS_POD_PATHS.score,
      ...Object.values(MORTGAGE_CREDENTIAL_POD_PATHS),
      MORTGAGE_ANCHOR_POD_PATHS.income,
      MORTGAGE_ANCHOR_POD_PATHS.score,
      "/mortgage/profile",
      "/mortgage/application",
      "/mortgage/decision",
      "/mortgage/closing",
    ];
    for (const path of borrowerPrivate) {
      const url = `${owner.baseUrl}${path}`;
      const strangerRead = await stranger.authFetch(url);
      expect([401, 403], `stranger read ${path}: HTTP ${strangerRead.status}`).toContain(
        strangerRead.status,
      );
      const anonymousRead = await fetch(url);
      expect([401, 403], `anonymous read ${path}: HTTP ${anonymousRead.status}`).toContain(
        anonymousRead.status,
      );
      const ownerRead = await owner.authFetch(url);
      expect(ownerRead.status, `owner read ${path}`).toBe(200);
    }

    // External verifiers must dereference these without credentials.
    const publicResources = Object.values(MORTGAGE_SEED_ISSUER_ROLES).flatMap((role) => [
      role.docPath,
      role.statusPath,
    ]);
    for (const path of publicResources) {
      const url = `${owner.baseUrl}${path}`;
      const anonymousRead = await fetch(url);
      expect(anonymousRead.status, `anonymous read ${path}`).toBe(200);
      const strangerRead = await stranger.authFetch(url);
      expect(strangerRead.status, `stranger read ${path}`).toBe(200);
      const ownerRead = await owner.authFetch(url);
      expect(ownerRead.status, `owner read ${path}`).toBe(200);
    }
  });
});

describe("non-root pod bases (storage-root path preserved)", () => {
  test("normalizedPodBase keeps the path and ensures exactly one trailing slash", () => {
    expect(normalizedPodBase("https://host.example/alex")).toBe("https://host.example/alex/");
    expect(normalizedPodBase("https://host.example/alex/")).toBe("https://host.example/alex/");
    expect(normalizedPodBase("https://host.example/alex//")).toBe("https://host.example/alex/");
    expect(normalizedPodBase("https://host.example")).toBe("https://host.example/");
    expect(() => normalizedPodBase("https://host.example/alex/?x=1")).toThrow(/query/);
    expect(() => normalizedPodBase("https://host.example/alex/#frag")).toThrow(/fragment/);
  });

  test("seeding a pod based at /alex/ writes under /alex/ with base-rooted IRIs", {
    timeout: 60_000,
  }, async () => {
    const server = await freshServer();
    const account = server.accounts[0];
    if (account === undefined) throw new Error("no primary account");
    const origin = new URL(account.baseUrl).origin;
    const pod = await seedMortgagePod({
      // No trailing slash on purpose: normalization is part of the contract.
      target: { webid: account.webid, baseUrl: `${origin}/alex`, authFetch: account.authFetch },
      issuance: fakeIssuance(),
      now: NOW,
      mode: "create",
    });

    // Manifest URLs resolve under the BASE, not the bare origin.
    const outcomes = pod.manifest.pods[0];
    const income = outcomes?.resources.find(
      (entry) => entry.path === `/alex${MORTGAGE_CREDENTIAL_POD_PATHS.income}`,
    );
    expect(income?.status).toBe("created");
    expect(income?.url).toBe(`${origin}/alex${MORTGAGE_CREDENTIAL_POD_PATHS.income}`);

    // The issuance context resolved the credential id against the base.
    const incomeRead = await fetch(income?.url as string);
    expect(incomeRead.status).toBe(200);
    expect(await incomeRead.text()).toContain(
      `${origin}/alex${MORTGAGE_CREDENTIAL_POD_PATHS.income}`,
    );

    // The persona documents live under the base and carry base-rooted IRIs.
    const applicationUrl = `${origin}/alex/mortgage/application`;
    const application = await fetch(applicationUrl);
    expect(application.status).toBe(200);
    const dataset = new Store(
      new Parser({ format: "text/turtle", baseIRI: applicationUrl }).parse(
        await application.text(),
      ),
    );
    const report = await validate(dataset, {
      expect: "loan-application",
      focusNode: applicationUrl,
    });
    expect(report.conforms, JSON.stringify(report.violations)).toBe(true);

    // The profile card advertises the pod BASE as pim:storage.
    const card = await fetch(`${origin}/profile/card`);
    expect(card.status).toBe(200);
    expect(await card.text()).toContain(`<${origin}/alex/>`);
  });
});

describe("mort SHACL inputs (sm-65 §5.1)", () => {
  test("the merged shapes graph carries every resource shape", async () => {
    const shapes = await mortgageShapesDataset();
    for (const iri of Object.values(MORT_SHAPE_IRIS)) {
      expect(shapes.match(DataFactory.namedNode(iri), null, null).size, iri).toBeGreaterThan(0);
    }
  });

  test("a generation subset excludes untargeted documents", async () => {
    const subset = await mortgageShapesDataset(["underwriting-decision"]);
    expect(
      subset.match(DataFactory.namedNode(MORT_SHAPE_IRIS["underwriting-decision"]), null, null)
        .size,
    ).toBeGreaterThan(0);
    expect(
      subset.match(DataFactory.namedNode(MORT_SHAPE_IRIS["appraisal-credential"]), null, null).size,
    ).toBe(0);
  });

  test("PINNED upstream gap: synthetic-rdf v1 refuses the sm-19 shapes loudly (node-level sh:node)", async () => {
    // The shared `common` support shapes use node-level sh:node conjunction
    // (mshape:AppraisedPropertyShape sh:node mshape:PropertyShape), which is
    // documented out-of-v1-scope. When upstream gains support this test
    // FAILS — flip mort background generation on then (filed follow-up).
    await expect(
      generateMortgageInstances({
        seed: "sm-65",
        now: NOW,
        targets: [{ document: "underwriting-decision", count: 1 }],
      }),
    ).rejects.toThrow(/Unsupported/);
  });
});
