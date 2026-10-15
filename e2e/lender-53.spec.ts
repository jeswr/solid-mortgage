/**
 * Thin scene-2 verifier end-to-end against the production Next server. Uses
 * real DPoP-bound Solid-OIDC, real UltraHonk proofs, and real signed
 * operand-anchor/status fixtures; the verify route is never mocked.
 */
import { createServer, type Server } from "node:http";
import AxeBuilder from "@axe-core/playwright";
import { MORT } from "@mortgage/data-model";
import { type DevOidcIssuer, startDevOidcIssuer } from "@mortgage/solid-kit/testing";
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
import { AppRunner } from "./support/app-runner";

const OPERAND_ENC: Readonly<Record<number, string>> = {
  8500: "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
  9999: "0x0ad5c5f2163a0400c5cd2a1a80fb43229689797c2b53ac9f93c6af28930e3c91",
  742: "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
};
const INCOME_STATEMENT = { field: MORT.monthlyGrossIncomeUsd, op: "ge", bound: 7000 } as const;
const SCORE_STATEMENT = { field: MORT.creditScoreValue, op: "ge", bound: 620 } as const;
const PROVE_TIMEOUT = 300_000;

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

let appOrigin = "";
let issuer: DevOidcIssuer;
let fixtures: FixtureHost;
let anchorIssuer = "";
let statusList: StatusListClient;
let issuerKeyPair: Awaited<ReturnType<typeof generateKeyPairForSuite>>;
const runner = new AppRunner();

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
  const response = await authedPost(`${appOrigin}/lender-53/api/prequal/challenge`);
  expect(response.status).toBe(200);
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
    credentialId: `${fixtures.origin}/credentials/anchor-${options.index}`,
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

test.describe("lender-53 thin competing quote (sm-31)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    test.setTimeout(240_000);
    issuer = await startDevOidcIssuer();
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

    appOrigin = await runner.start({
      packageName: "@mortgage/app-lender-53",
      readyPath: "/lender-53/api/health",
      command: "start",
      env: {
        MORTGAGE_TRUSTED_OIDC_ISSUERS: issuer.issuer,
        MORTGAGE_TRUSTED_ANCHOR_ISSUERS: anchorIssuer,
        MORTGAGE_DEV_ALLOW_LOOPBACK: "1",
        // Exercise the same forwarded-host DPoP htu reconstruction used on Vercel.
        MORTGAGE_TRUST_FORWARDED_HEADERS: "1",
      },
    });
  });

  test.afterAll(async () => {
    runner.stopAll();
    await issuer?.stop();
    const fixtureServer = fixtures?.server;
    if (fixtureServer !== undefined) {
      await new Promise<void>((resolve) => fixtureServer.close(() => resolve()));
    }
  });

  async function expectBannerAndAxe(page: Page) {
    const banner = page.locator("[data-concept-demo-banner]");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      bannerFullText({ organization: "Fifth Third Bank", role: "competing mortgage lender" }),
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }

  test("quote page has banner, honesty panel, COOP/COEP, and passes axe @smoke", async ({
    page,
  }) => {
    const response = await page.goto(`${appOrigin}/lender-53`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response?.headers()["cross-origin-embedder-policy"]).toBe("require-corp");
    await page.getByRole("button", { name: "I understand — enter the demo" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Second lender's prequalification criteria",
      }),
    ).toBeVisible();
    // The limitation items sit in the collapsed "Technical details" disclosure.
    await page.locator("summary", { hasText: "Technical details" }).click();
    await expect(
      page.getByText("Live proofs are bound to an issuer-signed operand anchor"),
    ).toBeVisible();
    await expect(page.getByText("research-grade", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("6.000%", { exact: false })).toHaveCount(0);
    await expectBannerAndAxe(page);
  });

  test("health probe answers for the tour dock @smoke", async () => {
    const response = await fetch(`${appOrigin}/lender-53/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "lender-53", simulated: true });
  });

  test(
    "prove and quote happy path uses the real Tier A verifier",
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
      const [incomeAnchor, scoreAnchor] = await Promise.all([
        issueAnchor({
          field: INCOME_STATEMENT.field,
          operandEnc: OPERAND_ENC[8500] as string,
          subject: issuer.webid,
          index: 7,
        }),
        issueAnchor({
          field: SCORE_STATEMENT.field,
          operandEnc: OPERAND_ENC[742] as string,
          subject: issuer.webid,
          index: 9,
        }),
      ]);
      const response = await authedPost(`${appOrigin}/lender-53/api/prequal/verify`, {
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
        rateQuote: { illustrative: boolean; notAnOffer: boolean; interestRatePercent: number };
      };
      expect(response.status, JSON.stringify(payload)).toBe(200);
      expect(payload.qualified).toBe(true);
      expect(payload.rateQuote.illustrative).toBe(true);
      expect(payload.rateQuote.notAnOffer).toBe(true);
      expect(payload.rateQuote.interestRatePercent).toBe(6);
    },
    PROVE_TIMEOUT,
  );

  test(
    "forged operand encoding is rejected 403 end-to-end",
    async () => {
      const challenges = await mintChallenges();
      const [forgedIncome, scoreProof] = await Promise.all([
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
      const [genuineIncomeAnchor, scoreAnchor] = await Promise.all([
        issueAnchor({
          field: INCOME_STATEMENT.field,
          operandEnc: OPERAND_ENC[8500] as string,
          subject: issuer.webid,
          index: 7,
        }),
        issueAnchor({
          field: SCORE_STATEMENT.field,
          operandEnc: OPERAND_ENC[742] as string,
          subject: issuer.webid,
          index: 9,
        }),
      ]);
      const response = await authedPost(`${appOrigin}/lender-53/api/prequal/verify`, {
        presentations: {
          income: {
            nonce: challenges.income.nonce,
            proof: tierAProofToJson(forgedIncome),
            anchorVc: genuineIncomeAnchor.body,
          },
          score: {
            nonce: challenges.score.nonce,
            proof: tierAProofToJson(scoreProof),
            anchorVc: scoreAnchor.body,
          },
        },
      });
      expect(response.status).toBe(403);
      const payload = (await response.json()) as {
        qualified: boolean;
        results: Record<string, { errors: { code: string }[] }>;
      };
      expect(payload.qualified).toBe(false);
      expect(payload.results.income?.errors[0]?.code).toBe("ANCHOR_OPERAND_MISMATCH");
    },
    PROVE_TIMEOUT,
  );
});
