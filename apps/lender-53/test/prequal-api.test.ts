/**
 * Security acceptance for the thin verifier: real DPoP auth, real UltraHonk
 * proofs, real signed anchors/status, and the decision-0012 forgery attack.
 * Nothing in the verify path is mocked.
 */
import { createApiVerifier, createNonceStore, type NonceStore } from "@mortgage/solid-kit/auth/api";
import { type DevOidcIssuer, startDevOidcIssuer } from "@mortgage/solid-kit/testing";
import { proveTierA, tierAProofToJson } from "@mortgage/vc-kit";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { Lender53Config } from "../lib/server/config";
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
const CHALLENGE_URL = "https://lender.example/lender-53/api/prequal/challenge";
const VERIFY_URL = "https://lender.example/lender-53/api/prequal/verify";

let issuer: DevOidcIssuer;
let rig: AnchorRig;
let service: PrequalService;
let nonces: NonceStore;

function config(): Lender53Config {
  return {
    trustedOidcIssuers: [issuer.issuer],
    trustedAnchorIssuers: [ANCHOR_ISSUER],
    allowInsecureLoopback: true,
    trustForwardedHeaders: false,
  };
}

async function authedRequest(url: string, body?: unknown): Promise<Request> {
  const headers = new Headers(await issuer.authHeaders("POST", url));
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(url, {
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
  const response = await service.challenge(await authedRequest(CHALLENGE_URL));
  expect(response.status).toBe(200);
  const { statements } = (await response.json()) as { statements: ChallengeStatement[] };
  return Object.fromEntries(statements.map((entry) => [entry.id, entry])) as Record<
    "income" | "score",
    ChallengeStatement
  >;
}

async function genuinePresentation() {
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
  const [incomeAnchor, scoreAnchor] = await Promise.all([
    rig.issueAnchor({ subject: issuer.webid, index: 7 }),
    rig.issueAnchor({
      subject: issuer.webid,
      field: PREQUAL_STATEMENTS.score.field,
      operandEnc: encOf(742),
      index: 9,
    }),
  ]);
  return {
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
  };
}

beforeAll(async () => {
  issuer = await startDevOidcIssuer();
  rig = await anchorRig(new Date());
  nonces = createNonceStore();
  const serviceConfig = config();
  service = createPrequalService({
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
}, 60_000);

afterAll(async () => issuer.stop());

describe("lender-53 real Tier A verifier", () => {
  let acceptedBody: unknown;

  test(
    "happy path returns the competing illustrative quote",
    async () => {
      acceptedBody = await genuinePresentation();
      const response = await service.verify(await authedRequest(VERIFY_URL, acceptedBody));
      const payload = (await response.json()) as {
        qualified: boolean;
        rateQuote: unknown;
        results: Record<string, { verified: boolean; checks: Record<string, boolean> }>;
      };
      expect(response.status).toBe(200);
      expect(payload.qualified).toBe(true);
      expect(payload.results.income?.checks.operandBinding).toBe(true);
      expect(payload.results.score?.verified).toBe(true);
      expect(payload.rateQuote).toEqual(ILLUSTRATIVE_RATE_QUOTE);
    },
    PROVE_TIMEOUT,
  );

  test("replay is rejected because both statement nonces were burned", async () => {
    const response = await service.verify(await authedRequest(VERIFY_URL, acceptedBody));
    expect(response.status).toBe(403);
    const payload = (await response.json()) as {
      results: Record<string, { errors: { code: string }[] }>;
    };
    expect(payload.results.income?.errors[0]?.code).toBe("NONCE_INVALID");
    expect(payload.results.score?.errors[0]?.code).toBe("NONCE_INVALID");
  });

  test(
    "forgery with a mismatched operand anchor is rejected 403",
    async () => {
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
      const [genuineIncomeAnchor, scoreAnchor] = await Promise.all([
        rig.issueAnchor({ subject: issuer.webid, operandEnc: encOf(8500), index: 7 }),
        rig.issueAnchor({
          subject: issuer.webid,
          field: PREQUAL_STATEMENTS.score.field,
          operandEnc: encOf(742),
          index: 9,
        }),
      ]);
      const response = await service.verify(
        await authedRequest(VERIFY_URL, {
          presentations: {
            income: {
              nonce: challenges.income.nonce,
              proof: tierAProofToJson(forgedIncome),
              anchorVc: genuineIncomeAnchor.body,
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
        results: Record<string, { errors: { code: string }[] }>;
      };
      expect(payload.qualified).toBe(false);
      expect(payload.results.income?.errors[0]?.code).toBe("ANCHOR_OPERAND_MISMATCH");
    },
    PROVE_TIMEOUT,
  );
});
