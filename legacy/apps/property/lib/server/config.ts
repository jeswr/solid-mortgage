/**
 * Server-side configuration for the property issuer rails (Cotality-modelled
 * appraisal + First American-modelled title). Mirrors the reviewed
 * `apps/lender-boa/lib/server/config.ts` shape (decision 0015): EVERYTHING
 * fails closed — an unset OIDC-issuer list or pod allowlist disables the rail
 * (401/503) rather than opening it.
 *
 * SECURITY: `allowInsecureLoopback` exists ONLY for the local dev/e2e loop
 * (loopback-HTTP dev issuer + in-memory pods). It relaxes transport rules
 * (http on loopback, plain fetch for WebID dereferencing instead of the
 * DNS-pinned SSRF-guarded default). It NEVER relaxes any verification gate:
 * caller authentication, holder binding, subject binding, shape validation and
 * signature all run identically.
 *
 * FOLLOW-UP (decision 0015): the caller boundary + `resolveAuthorizedPod`
 * resolver were copied from lender-boa (second consumer). When a third reader
 * app needs them, hoist the boundary into `@mortgage/solid-kit` unchanged
 * (extract-on-third-use) — tracked as a bead.
 */

export interface PropertyConfig {
  /** Solid-OIDC issuers trusted to mint the borrower's access tokens (L1). */
  readonly trustedOidcIssuers: readonly string[];
  /** Pod ORIGINS the server-side pod writes may touch (SSRF allowlist). */
  readonly podAllowedOrigins: readonly string[];
  /**
   * Enable RUNTIME credential signing. Off by default so a production deploy
   * never holds an accidental signing key: the issue rail answers 503 until an
   * operator opts in (or the dev/e2e loopback flag is set). When on, the
   * per-process issuer keys are generated in-memory (demo keys — a real
   * deployment would inject an org KMS key through the `issuers` seam).
   */
  readonly enableRuntimeIssuance: boolean;
  /** Issuer WebID for the appraisal (Cotality-modelled) flow. */
  readonly appraisalIssuerWebId: string;
  /** Issuer WebID for the title (First American-modelled) flow. */
  readonly titleIssuerWebId: string;
  /** Hosted Bitstring Status List URL for the appraisal issuer (decision 0007). */
  readonly appraisalStatusListUrl: string;
  /** Hosted Bitstring Status List URL for the title issuer. */
  readonly titleStatusListUrl: string;
  /** Dev/e2e only — see the module header. */
  readonly allowInsecureLoopback: boolean;
  /** Trust X-Forwarded-* for htu reconstruction (TLS-terminating proxy only). */
  readonly trustForwardedHeaders: boolean;
}

function splitList(value: string | undefined): readonly string[] {
  if (value === undefined) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

// Demo issuer identities: the exact DEFAULT_ISSUERS the seed layer signs the
// appraisal/title VCs with (packages/data-model personas.ts). Keeping them
// identical means an issued credential's `cred:issuer` matches the seeded
// fixtures and the RFC-2606 `.example` demo convention (decision 0010 — never a
// real org's IRI).
const DEFAULT_APPRAISAL_ISSUER = "https://amc.example/orgs/appraisal-management#id";
const DEFAULT_TITLE_ISSUER = "https://title.example/orgs/title-company#id";

/** Status-list URL on the issuer's origin (matches personas.ts `statusEntry`). */
function defaultStatusListUrl(issuerWebId: string, list: string): string {
  return `${new URL(issuerWebId).origin}/status/${list}`;
}

/** Read the config from the environment (documented in the app README). */
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): PropertyConfig {
  const allowInsecureLoopback = env.MORTGAGE_DEV_ALLOW_LOOPBACK === "1";
  const appraisalIssuerWebId = env.MORTGAGE_APPRAISAL_ISSUER_WEBID ?? DEFAULT_APPRAISAL_ISSUER;
  const titleIssuerWebId = env.MORTGAGE_TITLE_ISSUER_WEBID ?? DEFAULT_TITLE_ISSUER;
  return {
    trustedOidcIssuers: splitList(env.MORTGAGE_TRUSTED_OIDC_ISSUERS),
    podAllowedOrigins: splitList(env.MORTGAGE_POD_ALLOWED_ORIGINS),
    // Runtime signing is enabled explicitly OR implied by the dev/e2e loopback
    // flag (which already relaxes transport for the local demo).
    enableRuntimeIssuance: env.MORTGAGE_ENABLE_RUNTIME_ISSUANCE === "1" || allowInsecureLoopback,
    appraisalIssuerWebId,
    titleIssuerWebId,
    appraisalStatusListUrl:
      env.MORTGAGE_APPRAISAL_STATUS_LIST_URL ??
      defaultStatusListUrl(appraisalIssuerWebId, "appraisal"),
    titleStatusListUrl:
      env.MORTGAGE_TITLE_STATUS_LIST_URL ?? defaultStatusListUrl(titleIssuerWebId, "title"),
    allowInsecureLoopback,
    // Vercel terminates TLS ahead of the function, so the forwarded headers are
    // authoritative there; anywhere else they are attacker-controlled (default off).
    trustForwardedHeaders: env.VERCEL === "1" || env.MORTGAGE_TRUST_FORWARDED_HEADERS === "1",
  };
}

/** Standard "rail not configured" fail-closed response. */
export function notConfigured(detail: string): Response {
  return Response.json(
    {
      simulated: true,
      error: "not_configured",
      detail: `${detail} — this rail fails closed until an operator configures it`,
    },
    { status: 503 },
  );
}
