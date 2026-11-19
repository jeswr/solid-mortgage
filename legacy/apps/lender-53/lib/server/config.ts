/**
 * Fail-closed configuration for the thin scene-2 verifier. No pod origins or
 * credential-read configuration exists because this app never reads a pod.
 */
export interface Lender53Config {
  readonly trustedOidcIssuers: readonly string[];
  readonly trustedAnchorIssuers: readonly string[];
  /** Dev/e2e transport relaxation only; never relaxes a verification gate. */
  readonly allowInsecureLoopback: boolean;
  /** Trust X-Forwarded-* only behind a known TLS-terminating proxy. */
  readonly trustForwardedHeaders: boolean;
}

function splitList(value: string | undefined): readonly string[] {
  if (value === undefined) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): Lender53Config {
  return {
    trustedOidcIssuers: splitList(env.MORTGAGE_TRUSTED_OIDC_ISSUERS),
    trustedAnchorIssuers: splitList(env.MORTGAGE_TRUSTED_ANCHOR_ISSUERS),
    allowInsecureLoopback: env.MORTGAGE_DEV_ALLOW_LOOPBACK === "1",
    trustForwardedHeaders: env.VERCEL === "1" || env.MORTGAGE_TRUST_FORWARDED_HEADERS === "1",
  };
}

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
