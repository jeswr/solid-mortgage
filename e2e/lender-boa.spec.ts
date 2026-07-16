/**
 * lender-boa (sm-30) e2e: the scene-2 ZK pre-qual rail end-to-end against the
 * REAL production app server (real DPoP-bound Solid-OIDC, real UltraHonk
 * proofs proved in this process, real hosted anchor issuer + status list over
 * loopback HTTP), the scene-3 pod-prefilled application, the scene-4
 * freshness surface, the R1 banner, COOP/COEP headers, and axe passes on the
 * two main pages.
 *
 * OPERAND_ENC PROVENANCE: genuine sparq term encodings captured from
 * `sparq_zk_compose::build::encode_int_literal` at sparq commit 947480b0 —
 * the same fixture set as packages/vc-kit/test/zk-support.ts.
 */
import { type ChildProcess, spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import AxeBuilder from "@axe-core/playwright";
import { MORT, personas } from "@mortgage/data-model";
import {
  type DevOidcIssuer,
  type SolidTestServer,
  seedPod,
  startDevOidcIssuer,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import {
  generateKeyPairForSuite,
  issueCredential,
  proveTierA,
  publishVerificationMethod,
  StatusListClient,
  tierAProofToJson,
} from "@mortgage/vc-kit";
import { expect, type Page, test } from "@playwright/test";
import { bannerFullText } from "../packages/ui/src/disclaimers";

const OPERAND_ENC: Readonly<Record<number, string>> = {
  8500: "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
  9999: "0x0ad5c5f2163a0400c5cd2a1a80fb43229689797c2b53ac9f93c6af28930e3c91",
  742: "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
};

const INCOME_STATEMENT = { field: MORT.monthlyGrossIncomeUsd, op: "ge", bound: 7000 } as const;
const SCORE_STATEMENT = { field: MORT.creditScoreValue, op: "ge", bound: 620 } as const;
const PROVE_TIMEOUT = 300_000;

// ── loopback fixture host: anchor-issuer WebID doc + Bitstring status list ──

interface FixtureHost {
  origin: string;
  resources: Map<string, { body: string; contentType: string; version: number }>;
  server: Server;
}

async function startFixtureHost(): Promise<FixtureHost> {
  const resources = new Map<string, { body: string; contentType: string; version: number }>();
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const existing = resources.get(path);
    if (request.method === "PUT") {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        const ifMatch = request.headers["if-match"];
        if (ifMatch !== undefined && `"v${existing?.version ?? 0}"` !== ifMatch) {
          response.writeHead(412).end();
          return;
        }
        resources.set(path, {
          body: Buffer.concat(chunks).toString("utf8"),
          contentType: String(request.headers["content-type"] ?? "application/octet-stream"),
          version: (existing?.version ?? 0) + 1,
        });
        response.writeHead(existing === undefined ? 201 : 204).end();
      });
      return;
    }
    if (existing === undefined) {
      response.writeHead(404).end("not found");
      return;
    }
    response
      .writeHead(200, { "content-type": existing.contentType, etag: `"v${existing.version}"` })
      .end(existing.body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no fixture port");
  return { origin: `http://127.0.0.1:${address.port}`, resources, server };
}

// ── the app under test ──────────────────────────────────────────────────────

let appOrigin = "";
let appChild: ChildProcess | undefined;
const appLogs: string[] = [];
let issuer: DevOidcIssuer;
let pods: SolidTestServer;
let podBase = "";
let borrowerWebId = "";
let fixtures: FixtureHost;
let anchorIssuer = "";
let statusList: StatusListClient;
let issuerKeyPair: Awaited<ReturnType<typeof generateKeyPairForSuite>>;

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no free port");
  const { port } = address;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function startApp(env: NodeJS.ProcessEnv): Promise<string> {
  const port = await reservePort();
  const origin = `http://127.0.0.1:${port}`;
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  appChild = spawn(
    pnpm,
    [
      "--filter",
      "@mortgage/app-lender-boa",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: process.cwd(),
      detached: process.platform !== "win32",
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  appChild.stdout?.on("data", (chunk: Buffer) => appLogs.push(chunk.toString()));
  appChild.stderr?.on("data", (chunk: Buffer) => appLogs.push(chunk.toString()));
  await expect
    .poll(
      async () => {
        if (appChild?.exitCode != null) {
          throw new Error(`app exited early (${appChild.exitCode})\n${appLogs.join("")}`);
        }
        try {
          return (await fetch(`${origin}/lender-boa/api/health`)).status;
        } catch {
          return 0;
        }
      },
      { message: "wait for lender-boa", timeout: 90_000 },
    )
    .toBe(200);
  return origin;
}

// ── VP-POST helpers ─────────────────────────────────────────────────────────

/**
 * POST to a lender-boa API route with a DPoP-bound Solid-OIDC token. The DPoP
 * `htu` is bound to the PUBLIC URL (basePath included) and the request carries
 * `X-Forwarded-*` so the app (trustForwardedHeaders on) reconstructs the same
 * `htu` — the production Vercel posture, exercised locally.
 */
async function authedPost(url: string, body?: unknown): Promise<Response> {
  const target = new URL(url);
  const headers: Record<string, string> = await issuer.authHeaders("POST", url);
  headers["x-forwarded-host"] = target.host;
  headers["x-forwarded-proto"] = target.protocol.replace(/:$/, "");
  if (body !== undefined) headers["content-type"] = "application/json";
  return fetch(url, {
    method: "POST",
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

interface ChallengeStatement {
  id: "income" | "score";
  nonce: string;
}

async function mintChallenges(): Promise<Record<"income" | "score", ChallengeStatement>> {
  const response = await authedPost(`${appOrigin}/lender-boa/api/prequal/challenge`);
  expect(
    response.status,
    `WWW-Authenticate: ${response.headers.get("www-authenticate") ?? "<none>"}`,
  ).toBe(200);
  const { statements } = (await response.json()) as { statements: ChallengeStatement[] };
  return Object.fromEntries(statements.map((entry) => [entry.id, entry])) as Record<
    "income" | "score",
    ChallengeStatement
  >;
}

async function issueAnchor(options: {
  field: string;
  operandEnc: string;
  subject: string;
  index: number;
}) {
  return issueCredential({
    kind: "zk-operand-anchor",
    credentialId: `${podBase}mortgage/credentials/anchor`,
    issuer: anchorIssuer,
    subject: options.subject,
    claims: { kind: "zk-operand-anchor", field: options.field, operandEnc: options.operandEnc },
    validity: {
      validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    status: statusList.entry(options.index),
    key: issuerKeyPair,
  });
}

// ── suite ───────────────────────────────────────────────────────────────────

test.describe("lender-boa (sm-30)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    test.setTimeout(240_000);
    issuer = await startDevOidcIssuer();

    // Pods: the borrower persona's granted pod, seeded from the fixtures.
    pods = await startSolidServer({});
    podBase = `${pods.baseUrl}/`;
    const [alex] = await personas({ now: new Date(), podBases: { "alex-rivera": podBase } });
    if (alex === undefined) throw new Error("persona fixtures missing");
    borrowerWebId = alex.webId;
    await seedPod(
      pods.baseUrl,
      alex.resources.map((resource) => ({ path: resource.path, body: resource.turtle })),
    );

    // Anchor issuer: WebID document + verification method + status list, all
    // hosted over loopback HTTP so the app's default resolvers dereference it.
    fixtures = await startFixtureHost();
    anchorIssuer = `${fixtures.origin}/org`;
    issuerKeyPair = await generateKeyPairForSuite(`${anchorIssuer}#key-1`, "Ed25519");
    const published = await publishVerificationMethod({
      controller: anchorIssuer,
      key: issuerKeyPair,
    });
    fixtures.resources.set("/org", {
      body: published.turtle,
      contentType: "text/turtle",
      version: 1,
    });
    statusList = new StatusListClient({
      url: `${fixtures.origin}/status/prequal`,
      issuer: anchorIssuer,
      key: issuerKeyPair,
      fetch,
    });
    await statusList.create({ now: new Date() });

    appOrigin = await startApp({
      MORTGAGE_TRUSTED_OIDC_ISSUERS: issuer.issuer,
      MORTGAGE_TRUSTED_ANCHOR_ISSUERS: anchorIssuer,
      MORTGAGE_POD_ALLOWED_ORIGINS: pods.baseUrl,
      MORTGAGE_DEV_ALLOW_LOOPBACK: "1",
      // Reconstruct the DPoP htu from the forwarded host (the Vercel posture).
      MORTGAGE_TRUST_FORWARDED_HEADERS: "1",
    });
  });

  test.afterAll(async () => {
    if (appChild !== undefined && appChild.exitCode === null && appChild.pid !== undefined) {
      try {
        process.kill(process.platform === "win32" ? appChild.pid : -appChild.pid, "SIGTERM");
      } catch {
        // already gone
      }
    }
    await pods?.stop();
    await issuer?.stop();
    await new Promise<void>((resolve) => fixtures?.server.close(() => resolve()));
  });

  async function expectBannerAndAxe(page: Page) {
    const banner = page.locator("[data-concept-demo-banner]");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      bannerFullText({ organization: "Bank of America", role: "primary mortgage lender" }),
    );
    // WCAG 2.1 A/AA conformance. The axe "best-practice" bucket is excluded:
    // its landmark-containment rule flags the shared ConceptDemoBanner
    // (packages/ui — not this app's surface; follow-up bead filed).
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }

  test("health probe answers for the tour dock @smoke", async () => {
    const response = await fetch(`${appOrigin}/lender-boa/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, app: "lender-boa", simulated: true });
  });

  test("prequal page: banner, ZK honesty panel, COOP/COEP, axe @smoke", async ({ page }) => {
    const response = await page.goto(`${appOrigin}/lender-boa/prequal`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response?.headers()["cross-origin-embedder-policy"]).toBe("require-corp");
    await expect(
      page.getByRole("heading", {
        name: "Prove you qualify — without sharing your income or credit score",
      }),
    ).toBeVisible();
    // The decision-0005/0012 honesty items render verbatim on the ZK surface.
    await expect(
      page.getByText("Live proofs are bound to an issuer-signed operand anchor"),
    ).toBeVisible();
    await expect(page.getByText("research-grade", { exact: false }).first()).toBeVisible();
    await expectBannerAndAxe(page);
  });

  test(
    "ZK pre-qual verify: HAPPY PATH — two anchored live proofs earn the quote",
    async () => {
      const challenges = await mintChallenges();
      const [incomeProof, scoreProof] = await Promise.all([
        proveTierA({
          statement: INCOME_STATEMENT,
          value: 8500,
          operandEnc: OPERAND_ENC[8500] as string,
          nonce: challenges.income.nonce,
        }),
        proveTierA({
          statement: SCORE_STATEMENT,
          value: 742,
          operandEnc: OPERAND_ENC[742] as string,
          nonce: challenges.score.nonce,
        }),
      ]);
      const incomeAnchor = await issueAnchor({
        field: INCOME_STATEMENT.field,
        operandEnc: OPERAND_ENC[8500] as string,
        subject: issuer.webid,
        index: 7,
      });
      const scoreAnchor = await issueAnchor({
        field: SCORE_STATEMENT.field,
        operandEnc: OPERAND_ENC[742] as string,
        subject: issuer.webid,
        index: 9,
      });
      const response = await authedPost(`${appOrigin}/lender-boa/api/prequal/verify`, {
        presentations: {
          income: {
            nonce: challenges.income.nonce,
            proof: tierAProofToJson(incomeProof),
            anchorVc: incomeAnchor.body,
          },
          score: {
            nonce: challenges.score.nonce,
            proof: tierAProofToJson(scoreProof),
            anchorVc: scoreAnchor.body,
          },
        },
      });
      const payload = (await response.json()) as {
        qualified: boolean;
        simulated: boolean;
        rateQuote: { illustrative: boolean; notAnOffer: boolean };
        results: Record<string, { verified: boolean }>;
      };
      expect(response.status, JSON.stringify(payload)).toBe(200);
      expect(payload.qualified).toBe(true);
      expect(payload.simulated).toBe(true);
      expect(payload.results.income?.verified).toBe(true);
      expect(payload.results.score?.verified).toBe(true);
      expect(payload.rateQuote.illustrative).toBe(true);
      expect(payload.rateQuote.notAnOffer).toBe(true);
    },
    PROVE_TIMEOUT,
  );

  test(
    "ZK pre-qual verify: FORGERY is rejected 403 by the anchor-operand gate",
    async () => {
      // Decision 0012: encodings are salt-free, so the adversary proves
      // 9999 >= 7000 honestly over an encoding no issuer ever anchored. The
      // ONLY anchor they hold is the genuine one for 8500 — the equality gate
      // must sink the presentation.
      const challenges = await mintChallenges();
      const [forgedIncome, genuineScore] = await Promise.all([
        proveTierA({
          statement: INCOME_STATEMENT,
          value: 9999,
          operandEnc: OPERAND_ENC[9999] as string,
          nonce: challenges.income.nonce,
        }),
        proveTierA({
          statement: SCORE_STATEMENT,
          value: 742,
          operandEnc: OPERAND_ENC[742] as string,
          nonce: challenges.score.nonce,
        }),
      ]);
      const genuineAnchor = await issueAnchor({
        field: INCOME_STATEMENT.field,
        operandEnc: OPERAND_ENC[8500] as string,
        subject: issuer.webid,
        index: 7,
      });
      const scoreAnchor = await issueAnchor({
        field: SCORE_STATEMENT.field,
        operandEnc: OPERAND_ENC[742] as string,
        subject: issuer.webid,
        index: 9,
      });
      const response = await authedPost(`${appOrigin}/lender-boa/api/prequal/verify`, {
        presentations: {
          income: {
            nonce: challenges.income.nonce,
            proof: tierAProofToJson(forgedIncome),
            anchorVc: genuineAnchor.body,
          },
          score: {
            nonce: challenges.score.nonce,
            proof: tierAProofToJson(genuineScore),
            anchorVc: scoreAnchor.body,
          },
        },
      });
      expect(response.status).toBe(403);
      const payload = (await response.json()) as {
        qualified: boolean;
        results: Record<string, { verified: boolean; errors: { code: string }[] }>;
      };
      expect(payload.qualified).toBe(false);
      expect(payload.results.income?.verified).toBe(false);
      expect(payload.results.income?.errors[0]?.code).toBe("ANCHOR_OPERAND_MISMATCH");
    },
    PROVE_TIMEOUT,
  );

  test("anonymous verify is challenged 401", async () => {
    const response = await fetch(`${appOrigin}/lender-boa/api/prequal/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBeTruthy();
  });

  test("application page prefills the URLA subset FROM the granted pod + axe @smoke", async ({
    page,
  }) => {
    const response = await page.goto(
      `${appOrigin}/lender-boa/application?pod=${encodeURIComponent(podBase)}&webid=${encodeURIComponent(borrowerWebId)}`,
    );
    expect(response?.status()).toBe(200);
    await expect(
      page.getByText("read live from your granted pod data", { exact: false }),
    ).toBeVisible();
    // Pod-sourced values (persona fixtures), rendered in demo-locked fields.
    await expect(page.getByLabel("Name")).toHaveValue("Alex Rivera");
    await expect(page.getByLabel("Employer")).toHaveValue("Ridgeline Analytics LLC");
    await expect(page.getByLabel("Monthly gross income")).toHaveValue("$8,200");
    await expectBannerAndAxe(page);
  });

  test("submitting delivers the Loan Estimate back into the pod", async ({ page }) => {
    await page.goto(
      `${appOrigin}/lender-boa/application?pod=${encodeURIComponent(podBase)}&webid=${encodeURIComponent(borrowerWebId)}`,
    );
    await page.getByRole("button", { name: "Submit application (demo)" }).click();
    const estimate = page.locator("[data-loan-estimate]");
    await expect(estimate).toBeVisible();
    await expect(estimate).toContainText("delivered or placed in the mail within 3 business days");
    await expect(estimate).toContainText("illustrative figure, not an offer");
    // The application document now exists in the pod.
    const written = await fetch(`${podBase}mortgage/application`, {
      headers: { accept: "text/turtle" },
    });
    expect(written.status).toBe(200);
  });

  test("freshness page runs the scene-4 re-check", async ({ page }) => {
    await page.goto(`${appOrigin}/lender-boa/freshness?pod=${encodeURIComponent(podBase)}`);
    await page.getByRole("button", { name: "Run freshness check" }).click();
    const result = page.locator("[data-freshness-result]");
    await expect(result).toBeVisible();
    // The seeded persona VC is window-fresh (validUntil +14d) but its status
    // list lives on an unreachable fixture origin — fail-closed, never green.
    await expect(page.getByText("fresh", { exact: true })).toBeVisible();
    await expect(result).toHaveAttribute("data-freshness-result", "blocked");
    await page.getByRole("button", { name: "Request re-verification (one click)" }).click();
    await expect(page.locator("[data-reissue-requested]")).toBeVisible();
  });
});
