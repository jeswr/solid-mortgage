/**
 * Scene-2 ZK pre-qualification verifier (SECURITY-CRITICAL; decisions 0005 +
 * 0012). This is the lender-boa verify wiring, reused without weakening:
 * DPoP WebID auth, per-statement single-use nonces, real `verifyTierA`, and
 * the mandatory issuer-signed operand-anchor equality check. A bare Tier A
 * proof is forgeable and can never qualify here.
 */
import {
  createApiVerifier,
  createNonceStore,
  type DpopApiVerifier,
  type NonceStore,
  type RateLimiter,
  TokenBucketRateLimiter,
  verifyApiRequest,
} from "@mortgage/solid-kit/auth/api";
import {
  type TierAVerifyResult,
  tierAProofFromJson,
  type VerifyTierAOptions,
  verifyTierA,
  ZkError,
} from "@mortgage/vc-kit";
import { type Lender53Config, notConfigured } from "./config";
import {
  ILLUSTRATIVE_RATE_QUOTE,
  PREQUAL_STATEMENTS,
  STATEMENT_IDS,
  type StatementId,
} from "./statements";
import { publicRequestUrl } from "./url";

const MAX_VERIFY_BODY_BYTES = 1_048_576;
const MAX_ANCHOR_VC_BYTES = 131_072;

export type AnchorVerifySeams = Pick<
  VerifyTierAOptions,
  | "resolveKey"
  | "isControlledBy"
  | "webIdFetch"
  | "statusFetch"
  | "trustedStatusIssuers"
  | "registry"
>;

export interface PrequalServiceOptions {
  readonly config: Lender53Config;
  readonly verifier?: DpopApiVerifier;
  readonly nonces?: NonceStore;
  readonly now?: () => Date;
  readonly anchorSeams?: AnchorVerifySeams;
  readonly rateLimiter?: RateLimiter;
}

export interface PrequalService {
  challenge(request: Request): Promise<Response>;
  verify(request: Request): Promise<Response>;
}

interface ParsedPresentation {
  readonly id: StatementId;
  readonly nonce: string;
  readonly proofJson: unknown;
  readonly anchorVc: string;
}

class BadRequestError extends Error {}

function parsePresentations(body: unknown): readonly ParsedPresentation[] {
  if (typeof body !== "object" || body === null) {
    throw new BadRequestError("request body must be a JSON object");
  }
  const { presentations } = body as Record<string, unknown>;
  if (typeof presentations !== "object" || presentations === null) {
    throw new BadRequestError("body.presentations must be an object keyed by statement id");
  }
  const entries = presentations as Record<string, unknown>;
  const extraneous = Object.keys(entries).filter(
    (key) => !STATEMENT_IDS.includes(key as StatementId),
  );
  if (extraneous.length > 0) {
    throw new BadRequestError(`unknown statement ids: ${extraneous.join(", ")}`);
  }
  const parsed: ParsedPresentation[] = [];
  for (const id of STATEMENT_IDS) {
    const entry = entries[id];
    if (entry === undefined) {
      throw new BadRequestError(
        `a qualifying presentation must cover every advertised statement; missing "${id}"`,
      );
    }
    if (typeof entry !== "object" || entry === null) {
      throw new BadRequestError(`presentations.${id} must be an object`);
    }
    const { nonce, proof, anchorVc } = entry as Record<string, unknown>;
    if (typeof nonce !== "string" || nonce.length === 0 || nonce.length > 1024) {
      throw new BadRequestError(`presentations.${id}.nonce must be a short string`);
    }
    if (typeof anchorVc !== "string" || anchorVc.length === 0) {
      throw new BadRequestError(`presentations.${id}.anchorVc must be a Turtle document string`);
    }
    if (anchorVc.length > MAX_ANCHOR_VC_BYTES) {
      throw new BadRequestError(`presentations.${id}.anchorVc exceeds the size bound`);
    }
    parsed.push({ id, nonce, proofJson: proof, anchorVc });
  }
  return parsed;
}

function sessionKeyOf(webid: string, id: StatementId): string {
  return `${webid}\u0000${id}`;
}

function errorSummary(result: TierAVerifyResult) {
  return {
    verified: result.verified,
    checks: result.checks,
    errors: result.errors.map((error) => ({ code: error.code, message: error.message })),
  };
}

export function createPrequalService(options: PrequalServiceOptions): PrequalService {
  const { config } = options;
  const now = options.now ?? (() => new Date());
  const nonces = options.nonces ?? createNonceStore();
  const rateLimiter =
    options.rateLimiter ?? new TokenBucketRateLimiter({ capacity: 30, refillPerSec: 0.5 });
  // Process-wide in route usage: this verifier owns jti replay state + JWKS cache.
  let verifier: DpopApiVerifier | undefined = options.verifier;
  const getVerifier = (): DpopApiVerifier => {
    verifier ??= createApiVerifier({
      trustedIssuers: config.trustedOidcIssuers,
      allowInsecureLoopback: config.allowInsecureLoopback,
      trustForwardedHeaders: config.trustForwardedHeaders,
    });
    return verifier;
  };
  const anchorSeams: AnchorVerifySeams =
    options.anchorSeams ??
    (config.allowInsecureLoopback
      ? { webIdFetch: fetch.bind(globalThis), statusFetch: fetch.bind(globalThis) }
      : {});

  async function authenticate(request: Request): Promise<{ webid: string } | Response> {
    if (config.trustedOidcIssuers.length === 0) {
      return notConfigured("MORTGAGE_TRUSTED_OIDC_ISSUERS is unset");
    }
    return verifyApiRequest(
      { headers: request.headers, method: request.method, url: publicRequestUrl(request) },
      { verifier: getVerifier(), rateLimiter },
    );
  }

  return {
    async challenge(request: Request): Promise<Response> {
      const caller = await authenticate(request);
      if (caller instanceof Response) return caller;
      const statements = STATEMENT_IDS.map((id) => ({
        id,
        ...PREQUAL_STATEMENTS[id],
        nonce: nonces.mint(sessionKeyOf(caller.webid, id)),
      }));
      return Response.json({ simulated: true, statements });
    },

    async verify(request: Request): Promise<Response> {
      if (config.trustedAnchorIssuers.length === 0) {
        return notConfigured("MORTGAGE_TRUSTED_ANCHOR_ISSUERS is unset");
      }
      const caller = await authenticate(request);
      if (caller instanceof Response) return caller;

      let presentations: readonly ParsedPresentation[];
      try {
        const raw = await request.text();
        if (raw.length > MAX_VERIFY_BODY_BYTES) {
          return Response.json({ simulated: true, error: "payload_too_large" }, { status: 413 });
        }
        presentations = parsePresentations(JSON.parse(raw));
      } catch (error) {
        const detail = error instanceof BadRequestError ? error.message : "body is not valid JSON";
        return Response.json(
          { simulated: true, error: "malformed_request", detail },
          { status: 400 },
        );
      }

      const results: Partial<Record<StatementId, ReturnType<typeof errorSummary>>> = {};
      let allVerified = true;
      for (const presentation of presentations) {
        let presented: ReturnType<typeof tierAProofFromJson>;
        try {
          presented = tierAProofFromJson(presentation.proofJson);
        } catch (error) {
          const detail = error instanceof ZkError ? error.message : "proof payload is malformed";
          return Response.json(
            {
              simulated: true,
              error: "malformed_request",
              detail: `presentations.${presentation.id}.proof: ${detail}`,
            },
            { status: 400 },
          );
        }
        // The lender-boa nine-gate call, including nonce burn first and the
        // mandatory anchor.operandEnc === proof public input comparison.
        const result = await verifyTierA(presented, {
          statement: PREQUAL_STATEMENTS[presentation.id],
          anchorVc: presentation.anchorVc,
          webid: caller.webid,
          nonce: presentation.nonce,
          nonces,
          sessionKey: sessionKeyOf(caller.webid, presentation.id),
          now: now(),
          trustedIssuers: config.trustedAnchorIssuers,
          ...anchorSeams,
        });
        results[presentation.id] = errorSummary(result);
        allVerified &&= result.verified;
      }

      if (!allVerified) {
        return Response.json({ simulated: true, qualified: false, results }, { status: 403 });
      }
      return Response.json({
        simulated: true,
        qualified: true,
        results,
        rateQuote: ILLUSTRATIVE_RATE_QUOTE,
      });
    },
  };
}
