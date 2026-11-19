/**
 * SECURITY-CRITICAL suite: the wallet's HOLDER-side VP-POST client against
 * the REAL lender verifier (decision 0012 rail 1). Nothing about the
 * verifier is mocked — `presentToLender` drives lender-boa's actual
 * `createPrequalService` (the same module lender-53 shares) through a fetch
 * seam that attaches REAL DPoP-bound Solid-OIDC headers, with REAL UltraHonk
 * proofs produced in this process and REAL issuer-signed anchors over a
 * hosted status list. If the wallet's wire shape ever drifts from the
 * verifier contract, this suite is what breaks.
 */
import { MORT } from "@mortgage/data-model";
import { createApiVerifier, createNonceStore } from "@mortgage/solid-kit/auth/api";
import { type DevOidcIssuer, startDevOidcIssuer } from "@mortgage/solid-kit/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { LenderConfig } from "../../lender-boa/lib/server/config";
import { createPrequalService, type PrequalService } from "../../lender-boa/lib/server/prequal";
import {
  ANCHOR_ISSUER,
  type AnchorRig,
  anchorRig,
  encOf,
  issuerControls,
  resolveIssuerKey,
} from "../../lender-boa/test/support";
import type { AnchorMaterial } from "../lib/pod/credentials";
import { presentToLender } from "../lib/prequal/present";

const PROVE_TIMEOUT = 300_000;
const LENDER = {
  id: "lender-boa",
  label: "Primary lender — modelled on Bank of America",
  basePath: "/lender-boa",
} as const;
/** The public origin the wallet's relative zone paths resolve against. */
const ZONE_ORIGIN = "https://demo.example";

let issuer: DevOidcIssuer;
let rig: AnchorRig;
let service: PrequalService;

/** Pod-held proof material, exactly as `readProofMaterial` would return it. */
let anchors: AnchorMaterial[];
const hiddenValues = new Map<string, number>([
  [MORT.monthlyGrossIncomeUsd, 8500],
  [MORT.creditScoreValue, 742],
]);

beforeAll(async () => {
  issuer = await startDevOidcIssuer();
  rig = await anchorRig(new Date());
  const config: LenderConfig = {
    trustedOidcIssuers: [issuer.issuer],
    trustedAnchorIssuers: [ANCHOR_ISSUER],
    trustedCredentialIssuers: [ANCHOR_ISSUER],
    podAllowedOrigins: [],
    allowInsecureLoopback: true,
    trustForwardedHeaders: false,
  };
  service = createPrequalService({
    config,
    nonces: createNonceStore(),
    verifier: createApiVerifier({
      trustedIssuers: config.trustedOidcIssuers,
      allowInsecureLoopback: true,
      webidFetch: issuer.profileFetch,
    }),
    anchorSeams: {
      resolveKey: resolveIssuerKey,
      isControlledBy: issuerControls,
      statusFetch: rig.host.fetch,
    },
  });
  const [income, score] = await Promise.all([
    rig.issueAnchor({
      subject: issuer.webid,
      field: MORT.monthlyGrossIncomeUsd,
      operandEnc: encOf(8500),
      index: 7,
    }),
    rig.issueAnchor({
      subject: issuer.webid,
      field: MORT.creditScoreValue,
      operandEnc: encOf(742),
      index: 9,
    }),
  ]);
  anchors = [
    { field: MORT.monthlyGrossIncomeUsd, operandEnc: encOf(8500), turtle: income.body },
    { field: MORT.creditScoreValue, operandEnc: encOf(742), turtle: score.body },
  ];
}, 60_000);

afterAll(async () => {
  await issuer?.stop();
});

/**
 * The zone-boundary fetch seam: routes the wallet's SAME-ORIGIN relative
 * calls to the REAL service handlers, attaching genuine DPoP headers minted
 * for the FULL public URL (the htu the verifier reconstructs). This is the
 * only substitution in the suite — a transport, never a verdict.
 */
function zoneFetch(authenticated: boolean): typeof fetch {
  return async (input, init) => {
    const relative = String(input instanceof Request ? input.url : input);
    const url = `${ZONE_ORIGIN}${relative}`;
    const headers = new Headers(init?.headers);
    if (authenticated) {
      for (const [name, value] of Object.entries(
        await issuer.authHeaders(init?.method ?? "GET", url),
      )) {
        headers.set(name, value);
      }
    }
    const request = new Request(url, { ...init, headers });
    if (relative.endsWith("/api/prequal/challenge")) return service.challenge(request);
    if (relative.endsWith("/api/prequal/verify")) return service.verify(request);
    throw new Error(`unexpected zone request: ${relative}`);
  };
}

describe("wallet VP-POST client ↔ lender verifier contract", () => {
  test(
    "HAPPY PATH: two anchored live proofs qualify against the real verifier",
    async () => {
      const stages: string[] = [];
      const outcome = await presentToLender({
        lender: LENDER,
        anchors,
        hiddenValues,
        fetch: zoneFetch(true),
        onStage: (stage) => stages.push(stage),
      });
      expect(outcome.kind, JSON.stringify(outcome)).toBe("qualified");
      if (outcome.kind !== "qualified") throw new Error("unreachable");
      expect(outcome.proofs.map((proof) => proof.statementId).sort()).toEqual(["income", "score"]);
      // R5: the payload itself is tagged illustrative / not-an-offer.
      expect(outcome.rateQuote).toMatchObject({ illustrative: true, notAnOffer: true });
      expect(stages).toEqual(["challenge", "prove:income", "prove:score", "verify"]);
    },
    PROVE_TIMEOUT,
  );

  test(
    "a hidden value that mismatches its anchor is UNSATISFIABLE client-side — nothing is sent",
    async () => {
      let verifyReached = false;
      const guardedFetch: typeof fetch = async (input, init) => {
        const relative = String(input instanceof Request ? input.url : input);
        if (relative.endsWith("/verify")) verifyReached = true;
        return zoneFetch(true)(input, init);
      };
      const outcome = await presentToLender({
        lender: LENDER,
        anchors,
        // Real income 6500 (< bound) with the genuine 8500 anchor: the
        // circuit binds digits to operand_enc, so no witness exists.
        hiddenValues: new Map([
          [MORT.monthlyGrossIncomeUsd, 6500],
          [MORT.creditScoreValue, 742],
        ]),
        fetch: guardedFetch,
      });
      expect(outcome.kind).toBe("rejected");
      expect(verifyReached).toBe(false);
    },
    PROVE_TIMEOUT,
  );

  test("an anonymous session is surfaced honestly (401 → unauthenticated, no proving)", async () => {
    const outcome = await presentToLender({
      lender: LENDER,
      anchors,
      hiddenValues,
      fetch: zoneFetch(false),
    });
    expect(outcome.kind).toBe("unauthenticated");
  });

  test("a lender advertising an unsupported operator is refused before proving", async () => {
    const tamperingFetch: typeof fetch = async (input, init) => {
      const response = await zoneFetch(true)(input, init);
      const body = (await response.json()) as {
        statements?: { id: string; op: string }[];
      };
      if (Array.isArray(body.statements)) {
        for (const statement of body.statements) statement.op = "le";
      }
      return Response.json(body);
    };
    const outcome = await presentToLender({
      lender: LENDER,
      anchors,
      hiddenValues,
      fetch: tamperingFetch,
    });
    expect(outcome.kind).toBe("unavailable");
  });
});
