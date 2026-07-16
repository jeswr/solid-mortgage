/**
 * SECURITY-CRITICAL suite: the scene-2 VP-POST verifier wiring, driven
 * end-to-end through the service layer with REAL DPoP-bound Solid-OIDC
 * credentials (solid-kit dev issuer), REAL UltraHonk proofs (proved live in
 * this suite), and a REAL hosted Bitstring status list.
 *
 * Layering note: the exhaustive per-gate negative matrix of `verifyTierA`
 * (expired/revoked anchors, forbidden flavours, budget overflows, statement
 * tampering, ...) lives in packages/vc-kit/test/zk-tier-a.test.ts. THIS suite
 * exhausts the negatives the APP layer introduces — auth passthrough, config
 * fail-closure, payload parsing bounds, per-statement nonce sessions — plus
 * the decision-0012 FORGERY scenario and holder-binding end-to-end (the two
 * ways an attacker would actually present at this route).
 */
import { createApiVerifier, createNonceStore, type NonceStore } from "@mortgage/solid-kit/auth/api";
import { type DevOidcIssuer, startDevOidcIssuer } from "@mortgage/solid-kit/testing";
import { proveTierA, tierAProofToJson } from "@mortgage/vc-kit";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { LenderConfig } from "../lib/server/config";
import { createPrequalService, type PrequalService } from "../lib/server/prequal";
import { ILLUSTRATIVE_RATE_QUOTE, PREQUAL_STATEMENTS } from "../lib/server/statements";
import {
  ANCHOR_ISSUER,
  type AnchorRig,
  anchorRig,
  encOf,
  issuerControls,
  resolveIssuerKey,
} from "./support";

const PROVE_TIMEOUT = 300_000;
// The URLs carry the app's basePath, so the DPoP `htu` the service
// reconstructs (basePath re-added — lib/server/url.ts) matches these directly.
const CHALLENGE_URL = "https://lender.example/lender-boa/api/prequal/challenge";
const VERIFY_URL = "https://lender.example/lender-boa/api/prequal/verify";

let issuer: DevOidcIssuer;
let rig: AnchorRig;
let service: PrequalService;
let nonces: NonceStore;

function makeConfig(overrides: Partial<LenderConfig> = {}): LenderConfig {
  return {
    trustedOidcIssuers: [issuer.issuer],
    trustedAnchorIssuers: [ANCHOR_ISSUER],
    podAllowedOrigins: [],
    allowInsecureLoopback: true,
    trustForwardedHeaders: false,
    ...overrides,
  };
}

function makeService(configOverrides: Partial<LenderConfig> = {}): PrequalService {
  const serviceConfig = makeConfig(configOverrides);
  return createPrequalService({
    config: serviceConfig,
    nonces,
    verifier: createApiVerifier({
      trustedIssuers: serviceConfig.trustedOidcIssuers,
      allowInsecureLoopback: true,
      webidFetch: issuer.profileFetch,
    }),
    anchorSeams: {
      resolveKey: resolveIssuerKey,
      isControlledBy: issuerControls,
      statusFetch: rig.host.fetch,
    },
  });
}

async function authedRequest(url: string, body?: unknown): Promise<Request> {
  const headers = new Headers(await issuer.authHeaders("POST", url));
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(url, {
    method: "POST",
    headers,
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });
}

interface ChallengeStatement {
  id: "income" | "score";
  field: string;
  op: string;
  bound: number;
  nonce: string;
}

async function mintChallenges(): Promise<Record<"income" | "score", ChallengeStatement>> {
  const response = await service.challenge(await authedRequest(CHALLENGE_URL));
  expect(response.status).toBe(200);
  const { statements } = (await response.json()) as { statements: ChallengeStatement[] };
  const byId = Object.fromEntries(statements.map((entry) => [entry.id, entry]));
  return byId as Record<"income" | "score", ChallengeStatement>;
}

/** A full, genuine two-statement presentation for freshly minted challenges. */
async function genuinePresentations(subject: string) {
  const challenges = await mintChallenges();
  const [incomeProof, scoreProof] = await Promise.all([
    proveTierA({
      statement: PREQUAL_STATEMENTS.income,
      value: 8500,
      operandEnc: encOf(8500),
      nonce: challenges.income.nonce,
    }),
    proveTierA({
      statement: PREQUAL_STATEMENTS.score,
      value: 742,
      operandEnc: encOf(742),
      nonce: challenges.score.nonce,
    }),
  ]);
  const incomeAnchor = await rig.issueAnchor({ subject, index: 7 });
  const scoreAnchor = await rig.issueAnchor({
    subject,
    field: PREQUAL_STATEMENTS.score.field,
    operandEnc: encOf(742),
    index: 9,
  });
  return {
    challenges,
    body: {
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
    },
  };
}

beforeAll(async () => {
  issuer = await startDevOidcIssuer();
  rig = await anchorRig(new Date());
  nonces = createNonceStore();
  service = makeService();
}, 60_000);

afterAll(async () => {
  await issuer.stop();
});

describe("fail-closed configuration", () => {
  test("challenge 503s when no OIDC issuer is configured", async () => {
    // No injected verifier: the fail-closed config check must trip BEFORE the
    // service ever constructs one (an empty allowlist cannot build a verifier).
    const unconfigured = createPrequalService({
      config: makeConfig({ trustedOidcIssuers: [] }),
      nonces,
    });
    const response = await unconfigured.challenge(await authedRequest(CHALLENGE_URL));
    expect(response.status).toBe(503);
    expect(((await response.json()) as { error: string }).error).toBe("not_configured");
  });

  test("verify 503s when no anchor issuer is configured (never verifies anchorless)", async () => {
    const unconfigured = makeService({ trustedAnchorIssuers: [] });
    const response = await unconfigured.verify(await authedRequest(VERIFY_URL, {}));
    expect(response.status).toBe(503);
  });
});

describe("authentication passthrough (solid-kit verifyApiRequest)", () => {
  test("anonymous challenge is rejected 401 + WWW-Authenticate", async () => {
    const response = await service.challenge(new Request(CHALLENGE_URL, { method: "POST" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBeTruthy();
  });

  test("anonymous verify is rejected 401", async () => {
    const response = await service.verify(new Request(VERIFY_URL, { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
  });

  test("a replayed DPoP proof is rejected (jti single-use)", async () => {
    const headers = await issuer.authHeaders("POST", CHALLENGE_URL);
    const make = () => new Request(CHALLENGE_URL, { method: "POST", headers });
    expect((await service.challenge(make())).status).toBe(200);
    expect((await service.challenge(make())).status).toBe(401);
  });
});

describe("challenge minting", () => {
  test("mints one nonce per advertised statement, and re-minting rotates them", async () => {
    const first = await mintChallenges();
    expect(first.income.field).toBe(PREQUAL_STATEMENTS.income.field);
    expect(first.income.bound).toBe(7000);
    expect(first.score.bound).toBe(620);
    expect(first.income.nonce).not.toBe(first.score.nonce);
    const second = await mintChallenges();
    expect(second.income.nonce).not.toBe(first.income.nonce);
    expect(second.score.nonce).not.toBe(first.score.nonce);
  });
});

describe("payload parsing (400 before any cryptographic work)", () => {
  test.each([
    ["non-JSON body", "not json"],
    ["missing presentations", {}],
    [
      "missing a statement",
      { presentations: { income: { nonce: "n", proof: {}, anchorVc: "x" } } },
    ],
    [
      "unknown statement id",
      {
        presentations: {
          income: { nonce: "n", proof: {}, anchorVc: "x" },
          score: { nonce: "n", proof: {}, anchorVc: "x" },
          dti: { nonce: "n", proof: {}, anchorVc: "x" },
        },
      },
    ],
    [
      "non-string nonce",
      {
        presentations: {
          income: { nonce: 5, proof: {}, anchorVc: "x" },
          score: { nonce: "n", proof: {}, anchorVc: "x" },
        },
      },
    ],
  ])("rejects %s", async (_label, body) => {
    const response = await service.verify(await authedRequest(VERIFY_URL, body));
    expect(response.status).toBe(400);
  });

  test("rejects an oversized anchor document", async () => {
    const body = {
      presentations: {
        income: { nonce: "n", proof: {}, anchorVc: "x".repeat(131_073) },
        score: { nonce: "n", proof: {}, anchorVc: "x" },
      },
    };
    const response = await service.verify(await authedRequest(VERIFY_URL, body));
    expect(response.status).toBe(400);
  });

  test("rejects a structurally malformed proof payload", async () => {
    const body = {
      presentations: {
        income: { nonce: "n", proof: { member: 42 }, anchorVc: "x" },
        score: { nonce: "n", proof: { member: 42 }, anchorVc: "x" },
      },
    };
    const response = await service.verify(await authedRequest(VERIFY_URL, body));
    expect(response.status).toBe(400);
  });
});

describe("the verification rail (REAL proofs)", () => {
  let happyBody: unknown;

  test(
    "HAPPY PATH: two genuine anchored proofs qualify and return the illustrative quote",
    async () => {
      const { body } = await genuinePresentations(issuer.webid);
      happyBody = body;
      const response = await service.verify(await authedRequest(VERIFY_URL, body));
      const payload = (await response.json()) as {
        simulated: boolean;
        qualified: boolean;
        results: Record<string, { verified: boolean; checks: Record<string, boolean> }>;
        rateQuote: unknown;
      };
      expect(response.status).toBe(200);
      expect(payload.simulated).toBe(true);
      expect(payload.qualified).toBe(true);
      expect(payload.results.income?.verified).toBe(true);
      expect(payload.results.score?.verified).toBe(true);
      expect(payload.results.income?.checks.operandBinding).toBe(true);
      expect(payload.rateQuote).toEqual(ILLUSTRATIVE_RATE_QUOTE);
    },
    PROVE_TIMEOUT,
  );

  test("REPLAY: the identical accepted presentation is rejected (nonces are burned)", async () => {
    const response = await service.verify(await authedRequest(VERIFY_URL, happyBody));
    expect(response.status).toBe(403);
    const payload = (await response.json()) as {
      qualified: boolean;
      results: Record<string, { errors: { code: string }[] }>;
    };
    expect(payload.qualified).toBe(false);
    expect(payload.results.income?.errors[0]?.code).toBe("NONCE_INVALID");
    expect(payload.results.score?.errors[0]?.code).toBe("NONCE_INVALID");
  });

  test(
    "FORGERY (decision 0012): a genuine proof over a self-computed encoding is rejected " +
      "by the anchor-operand gate",
    async () => {
      // The adversary's real income is below threshold, so they compute the
      // salt-free encoding of 9999 themselves and HONESTLY prove 9999 >= 7000.
      // Every cryptographic step succeeds; only the issuer-anchored operand
      // equality can reject it — and it must.
      const challenges = await mintChallenges();
      const [forgedIncome, genuineScore] = await Promise.all([
        proveTierA({
          statement: PREQUAL_STATEMENTS.income,
          value: 9999,
          operandEnc: encOf(9999),
          nonce: challenges.income.nonce,
        }),
        proveTierA({
          statement: PREQUAL_STATEMENTS.score,
          value: 742,
          operandEnc: encOf(742),
          nonce: challenges.score.nonce,
        }),
      ]);
      // The only anchor the adversary can obtain is the genuine one for 8500.
      const genuineAnchor = await rig.issueAnchor({ subject: issuer.webid, index: 7 });
      const scoreAnchor = await rig.issueAnchor({
        subject: issuer.webid,
        field: PREQUAL_STATEMENTS.score.field,
        operandEnc: encOf(742),
        index: 9,
      });
      const response = await service.verify(
        await authedRequest(VERIFY_URL, {
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
        }),
      );
      expect(response.status).toBe(403);
      const payload = (await response.json()) as {
        qualified: boolean;
        results: Record<
          string,
          { verified: boolean; errors: { code: string }[]; checks: Record<string, boolean> }
        >;
      };
      expect(payload.qualified).toBe(false);
      expect(payload.results.income?.verified).toBe(false);
      expect(payload.results.income?.errors[0]?.code).toBe("ANCHOR_OPERAND_MISMATCH");
      // The genuine score statement verified — the forgery alone sank it.
      expect(payload.results.score?.verified).toBe(true);
    },
    PROVE_TIMEOUT,
  );

  test(
    "HOLDER BINDING: presenting someone else's genuine anchor is rejected " +
      "(anchor subject must equal the DPoP-verified WebID)",
    async () => {
      const victim = "https://victim.example/profile/card#me";
      const challenges = await mintChallenges();
      const [incomeProof, scoreProof] = await Promise.all([
        proveTierA({
          statement: PREQUAL_STATEMENTS.income,
          value: 8500,
          operandEnc: encOf(8500),
          nonce: challenges.income.nonce,
        }),
        proveTierA({
          statement: PREQUAL_STATEMENTS.score,
          value: 742,
          operandEnc: encOf(742),
          nonce: challenges.score.nonce,
        }),
      ]);
      const stolenAnchor = await rig.issueAnchor({ subject: victim, index: 7 });
      const scoreAnchor = await rig.issueAnchor({
        subject: issuer.webid,
        field: PREQUAL_STATEMENTS.score.field,
        operandEnc: encOf(742),
        index: 9,
      });
      const response = await service.verify(
        await authedRequest(VERIFY_URL, {
          presentations: {
            income: {
              nonce: challenges.income.nonce,
              proof: tierAProofToJson(incomeProof),
              anchorVc: stolenAnchor.body,
            },
            score: {
              nonce: challenges.score.nonce,
              proof: tierAProofToJson(scoreProof),
              anchorVc: scoreAnchor.body,
            },
          },
        }),
      );
      expect(response.status).toBe(403);
      const payload = (await response.json()) as {
        results: Record<string, { errors: { code: string }[] }>;
      };
      expect(payload.results.income?.errors[0]?.code).toBe("ANCHOR_SUBJECT_MISMATCH");
    },
    PROVE_TIMEOUT,
  );

  test(
    "a Tier A proof can never be minted for an untrusted anchor issuer list at runtime",
    async () => {
      // Belt-and-braces: a service whose anchor allowlist names a DIFFERENT
      // issuer rejects the genuine presentation with ANCHOR_INVALID.
      const wrongIssuerService = makeService({
        trustedAnchorIssuers: ["https://not-the-issuer.example/org"],
      });
      const { body } = await genuinePresentations(issuer.webid);
      const response = await wrongIssuerService.verify(await authedRequest(VERIFY_URL, body));
      expect(response.status).toBe(403);
      const payload = (await response.json()) as {
        results: Record<string, { errors: { code: string }[] }>;
      };
      expect(payload.results.income?.errors[0]?.code).toBe("ANCHOR_INVALID");
    },
    PROVE_TIMEOUT,
  );
});
