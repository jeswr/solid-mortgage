import {
  type LenderConfig,
  configFromEnv as lenderConfigFromEnv,
} from "../../../lender-boa/lib/server/config";

export interface ClosingConfig extends LenderConfig {
  /** Existing lender agent whose read grant is removed after transfer. */
  readonly lenderWebId: string | undefined;
  /** Truist-modelled servicing agent whose read grant is approved. */
  readonly servicerWebId: string | undefined;
  /**
   * The closing app's OWN service WebID (decision 0015 L4) — the agent the borrower's
   * grant (sm-28) names, kept in every ACL this app writes so it retains Control.
   */
  readonly serviceWebId: string | undefined;
  /** OIDC issuer of the service identity (client_credentials + DPoP). */
  readonly podServiceIssuer: string | undefined;
  /** Confidential client id for the service identity. */
  readonly podServiceClientId: string | undefined;
  /** Confidential client secret for the service identity (server env only). */
  readonly podServiceClientSecret: string | undefined;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ClosingConfig {
  return {
    ...lenderConfigFromEnv(env),
    lenderWebId: env.MORTGAGE_LENDER_SERVICE_WEBID,
    servicerWebId: env.MORTGAGE_SERVICER_SERVICE_WEBID,
    serviceWebId: env.MORTGAGE_CLOSING_SERVICE_WEBID,
    podServiceIssuer: env.MORTGAGE_CLOSING_POD_SERVICE_ISSUER,
    podServiceClientId: env.MORTGAGE_CLOSING_POD_SERVICE_CLIENT_ID,
    podServiceClientSecret: env.MORTGAGE_CLOSING_POD_SERVICE_CLIENT_SECRET,
  };
}

/** A required, non-empty config string — absent values fail closed as 503 upstream. */
export function requiredConfig(value: string | undefined, label: string): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${label} is unset`);
  }
  return value;
}

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
