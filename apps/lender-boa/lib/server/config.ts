/**
 * Server-side configuration for the lender-boa rails (scene 2 VP-POST verify,
 * scene 3 pod prefill/LE delivery, scene 4 freshness). EVERYTHING here fails
 * closed: an unset allowlist disables the rail (503) rather than opening it.
 *
 * SECURITY: `allowInsecureLoopback` exists ONLY for the local dev/e2e loop
 * (loopback-HTTP dev issuer + in-memory pods). It relaxes transport rules
 * (http on loopback, plain fetch for WebID/status-list dereferencing instead
 * of the DNS-pinned SSRF-guarded default). It NEVER relaxes any verification
 * gate: the operand-anchor equality check, nonce burn, holder binding, shape,
 * status and signature checks all run identically.
 */

export interface LenderConfig {
  /** Solid-OIDC issuers trusted to mint presenter access tokens (rail 1). */
  readonly trustedOidcIssuers: readonly string[];
  /** Issuers trusted to sign operand-anchor VCs (decision 0012). */
  readonly trustedAnchorIssuers: readonly string[];
  /**
   * Issuers trusted to sign the borrower's credentials (employment/asset/
   * credit VCs) the lender reads under a grant. REQUIRED for a credential to
   * pass full `verifyCredential` (signature + issuer + window + status +
   * shape); an empty list fails those credentials closed — no green tick, no
   * "verified" claim.
   */
  readonly trustedCredentialIssuers: readonly string[];
  /** Pod ORIGINS the server-side pod reads/writes may touch (SSRF allowlist). */
  readonly podAllowedOrigins: readonly string[];
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

/** Read the config from the environment (documented in the app README). */
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): LenderConfig {
  return {
    trustedOidcIssuers: splitList(env.MORTGAGE_TRUSTED_OIDC_ISSUERS),
    trustedAnchorIssuers: splitList(env.MORTGAGE_TRUSTED_ANCHOR_ISSUERS),
    trustedCredentialIssuers: splitList(env.MORTGAGE_TRUSTED_CREDENTIAL_ISSUERS),
    podAllowedOrigins: splitList(env.MORTGAGE_POD_ALLOWED_ORIGINS),
    allowInsecureLoopback: env.MORTGAGE_DEV_ALLOW_LOOPBACK === "1",
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
