/**
 * Server-side configuration for the AUS rail (scenes 3 + 4: deterministic
 * automated underwriting over the granted loan file). Extends the reviewed
 * lender-boa config shape (decision 0015) with this app's OWN service
 * identity (L4): a DPoP-bound `client_credentials` session whose WebID the
 * borrower's grant (sm-28) names. EVERYTHING fails closed — an unset
 * allowlist or an unconfigured service identity disables the rail (503)
 * rather than opening it.
 *
 * The pod-IO/owner/config base modules are consumed from lender-boa (the
 * reviewed decision-0015 implementation) exactly as apps/closing does; the
 * sm-emv hoist into @mortgage/solid-kit unifies the consumers.
 */
import {
  type LenderConfig,
  configFromEnv as lenderConfigFromEnv,
} from "../../../lender-boa/lib/server/config";

export { notConfigured } from "../../../lender-boa/lib/server/config";

export interface AusConfig extends LenderConfig {
  /**
   * The AUS app's OWN service WebID (decision 0015 L4) — the agent the
   * borrower's grant names for read access to the loan file and write access
   * for the decision + findings delivery.
   */
  readonly serviceWebId: string | undefined;
  /** OIDC issuer of the service identity (client_credentials + DPoP). */
  readonly podServiceIssuer: string | undefined;
  /** Confidential client id for the service identity. */
  readonly podServiceClientId: string | undefined;
  /** Confidential client secret for the service identity (server env only). */
  readonly podServiceClientSecret: string | undefined;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): AusConfig {
  return {
    ...lenderConfigFromEnv(env),
    serviceWebId: env.MORTGAGE_AUS_SERVICE_WEBID,
    podServiceIssuer: env.MORTGAGE_AUS_POD_SERVICE_ISSUER,
    podServiceClientId: env.MORTGAGE_AUS_POD_SERVICE_CLIENT_ID,
    podServiceClientSecret: env.MORTGAGE_AUS_POD_SERVICE_CLIENT_SECRET,
  };
}

/**
 * A required, non-empty config string — absent values fail closed as 503
 * upstream. Copied from the reviewed `apps/closing/lib/server/config.ts`
 * (third consumer; the sm-emv hoist into solid-kit unifies them).
 */
export function requiredConfig(value: string | undefined, label: string): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${label} is unset`);
  }
  return value;
}

/** A configured agent WebID: absolute https URL (loopback http in dev only). */
export function configuredAgent(
  value: string | undefined,
  label: string,
  allowInsecureLoopback = false,
): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${label} is unset`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute WebID URL`);
  }
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]).has(url.hostname);
  const transportAllowed =
    url.protocol === "https:" || (allowInsecureLoopback && loopback && url.protocol === "http:");
  if (!transportAllowed || url.username !== "" || url.password !== "") {
    throw new Error(`${label} must be an https WebID without userinfo (loopback http in dev only)`);
  }
  return url.href;
}
