/**
 * The scene-2 HOLDER-side presentation client (decision 0012 rail 1): fetch a
 * challenge from a lender's VP-POST rail, produce one Tier A proof per
 * advertised statement ENTIRELY in this browser (the hidden values are the
 * private witness and never leave the device), and POST proof + issuer-signed
 * operand-anchor VC back. The wire shape matches the lender verifier contract
 * EXACTLY (apps/lender-boa/lib/server/prequal.ts, shared by lender-53):
 *
 *   POST {base}/api/prequal/challenge          → { statements: [{id, field,
 *                                                 op, bound, nonce}] }
 *   POST {base}/api/prequal/verify
 *        { presentations: { [id]: { nonce, proof, anchorVc } } }
 *                                              → 200 {qualified, rateQuote}
 *                                              | 403 {qualified: false}
 *
 * HOLDER POLICY (fail closed, before any proving):
 *   - only `>=` statements over fields the pod holds BOTH a hidden value and
 *     an issuer-signed anchor for are provable — anything else refuses;
 *   - the challenge nonce is always the LENDER's (never self-minted — a
 *     self-minted nonce would be exactly the replayable artifact the
 *     challenge rail exists to prevent);
 *   - a 401 challenge is surfaced honestly as "no live session" (Mode 1
 *     cannot mint DPoP proofs by construction — decision 0015 mode table).
 */
import type { AnchorMaterial } from "../pod/credentials";

export interface LenderTarget {
  readonly id: string;
  /** Role-first display label (R1). */
  readonly label: string;
  /** Same-origin zone base under the shared demo domain, e.g. "/lender-boa". */
  readonly basePath: string;
}

/** The two lender apps of scene 2 (decision 0002), as same-origin zones. */
export const LENDER_TARGETS: readonly LenderTarget[] = [
  {
    id: "lender-boa",
    label: "Primary lender — modelled on Bank of America",
    basePath: "/lender-boa",
  },
  {
    id: "lender-53",
    label: "Competing lender — modelled on Fifth Third Bank",
    basePath: "/lender-53",
  },
];

interface ChallengeStatement {
  readonly id: string;
  readonly field: string;
  readonly op: string;
  readonly bound: number;
  readonly nonce: string;
}

export interface ProducedProofInfo {
  readonly statementId: string;
  readonly member: string;
  readonly proveMs: number;
  readonly threads: number;
}

export type PresentOutcome =
  | {
      readonly kind: "qualified";
      readonly proofs: readonly ProducedProofInfo[];
      readonly rateQuote: Record<string, unknown> | undefined;
    }
  | {
      readonly kind: "rejected";
      readonly proofs: readonly ProducedProofInfo[];
      readonly detail: string;
    }
  | { readonly kind: "unauthenticated"; readonly detail: string }
  | { readonly kind: "unavailable"; readonly detail: string };

export interface PresentToLenderOptions {
  readonly lender: LenderTarget;
  /** The pod-held anchors (income + score) — see `readProofMaterial`. */
  readonly anchors: readonly AnchorMaterial[];
  /** Hidden values keyed by field IRI. PRIVATE WITNESS ONLY — never sent. */
  readonly hiddenValues: ReadonlyMap<string, number>;
  /**
   * The fetch carrying the caller's session. Mode 1 passes the simulated
   * session's fetch (the lender answers 401 — surfaced honestly); a live
   * Mode-2b session or a test passes a DPoP-attaching fetch.
   */
  readonly fetch: typeof fetch;
  /** Progress callback for the UI ("challenge", "prove:income", "verify"). */
  readonly onStage?: (stage: string) => void;
}

/** Holder-side bounds on an UNTRUSTED challenge response (a hostile lender
 * must not be able to drive unbounded proving work or oversized inputs). */
const MAX_STATEMENTS = 8;
const MAX_NONCE_LENGTH = 1024; // the verifier's own cap — mirror it
const MAX_ID_LENGTH = 64;

function parseStatements(payload: unknown): ChallengeStatement[] {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("challenge response is not an object");
  }
  const { statements } = payload as { statements?: unknown };
  if (!Array.isArray(statements) || statements.length === 0) {
    throw new Error("challenge response advertises no statements");
  }
  if (statements.length > MAX_STATEMENTS) {
    throw new Error(
      `the lender advertised ${statements.length} statements — refusing (> ${MAX_STATEMENTS})`,
    );
  }
  return statements.map((entry) => {
    const { id, field, op, bound, nonce } = (entry ?? {}) as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      id.length > MAX_ID_LENGTH ||
      typeof field !== "string" ||
      typeof op !== "string" ||
      typeof bound !== "number" ||
      !Number.isSafeInteger(bound) ||
      bound < 0 ||
      typeof nonce !== "string" ||
      nonce.length === 0 ||
      nonce.length > MAX_NONCE_LENGTH
    ) {
      throw new Error("challenge statement is malformed");
    }
    return { id, field, op, bound, nonce };
  });
}

/**
 * Run the full holder flow against ONE lender. Proofs are per-lender by
 * construction: each is bound to that lender's own single-use nonce.
 */
export async function presentToLender(options: PresentToLenderOptions): Promise<PresentOutcome> {
  const { lender } = options;
  const stage = options.onStage ?? (() => {});
  const anchorsByField = new Map(options.anchors.map((anchor) => [anchor.field, anchor]));

  stage("challenge");
  let challengeResponse: Response;
  try {
    challengeResponse = await options.fetch(`${lender.basePath}/api/prequal/challenge`, {
      method: "POST",
    });
  } catch (error) {
    return {
      kind: "unavailable",
      detail: `could not reach the lender: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (challengeResponse.status === 401) {
    return {
      kind: "unauthenticated",
      detail:
        "the lender's VP-POST rail requires a DPoP-bound Solid-OIDC session — the simulated " +
        "in-browser login cannot mint one (and honestly says so)",
    };
  }
  if (!challengeResponse.ok) {
    return {
      kind: "unavailable",
      detail: `challenge request failed with ${challengeResponse.status}`,
    };
  }

  let statements: ChallengeStatement[];
  try {
    statements = parseStatements(await challengeResponse.json());
  } catch (error) {
    return {
      kind: "unavailable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  // Holder policy gates BEFORE any proving work (see the module header).
  for (const statement of statements) {
    if (statement.op !== "ge") {
      return {
        kind: "unavailable",
        detail: `this wallet only proves ">=" statements; the lender advertised "${statement.op}"`,
      };
    }
    if (!anchorsByField.has(statement.field) || !options.hiddenValues.has(statement.field)) {
      return {
        kind: "unavailable",
        detail: `the pod holds no credential + anchor for the advertised field ${statement.field}`,
      };
    }
  }

  // Heavy toolchain behind a dynamic import — only a prove click pays it.
  const { proveTierA, tierAProofToJson, ZkError } = await import("@mortgage/vc-kit");

  const proofs: ProducedProofInfo[] = [];
  const presentations: Record<string, { nonce: string; proof: unknown; anchorVc: string }> = {};
  for (const statement of statements) {
    stage(`prove:${statement.id}`);
    const anchor = anchorsByField.get(statement.field);
    const value = options.hiddenValues.get(statement.field);
    if (anchor === undefined || value === undefined) {
      return { kind: "unavailable", detail: `proof material missing for ${statement.field}` };
    }
    let proof: Awaited<ReturnType<typeof proveTierA>>;
    try {
      proof = await proveTierA({
        statement: { field: statement.field, op: "ge", bound: statement.bound },
        value,
        operandEnc: anchor.operandEnc,
        nonce: statement.nonce,
      });
    } catch (error) {
      // UNSATISFIABLE is the honest "you cannot forge eligibility" outcome.
      const detail = error instanceof ZkError ? `${error.code}: ${error.message}` : String(error);
      return { kind: "rejected", proofs, detail };
    }
    proofs.push({
      statementId: statement.id,
      member: proof.member,
      proveMs: proof.proveMs,
      threads: proof.threads,
    });
    presentations[statement.id] = {
      nonce: statement.nonce,
      proof: tierAProofToJson(proof),
      anchorVc: anchor.turtle,
    };
  }

  stage("verify");
  let verifyResponse: Response;
  try {
    verifyResponse = await options.fetch(`${lender.basePath}/api/prequal/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ presentations }),
    });
  } catch (error) {
    return {
      kind: "unavailable",
      detail: `could not reach the lender verifier: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (verifyResponse.status === 401) {
    return {
      kind: "unauthenticated",
      detail: "the lender rejected the session mid-flow (401)",
    };
  }
  const payload = (await verifyResponse.json().catch(() => undefined)) as
    | { qualified?: unknown; rateQuote?: Record<string, unknown> }
    | undefined;
  if (verifyResponse.ok && payload?.qualified === true) {
    return { kind: "qualified", proofs, rateQuote: payload.rateQuote };
  }
  if (verifyResponse.status === 403) {
    return { kind: "rejected", proofs, detail: "the lender's fail-closed verification refused" };
  }
  return {
    kind: "unavailable",
    detail: `verify request failed with ${verifyResponse.status}`,
  };
}
