/**
 * Server-side configuration for the wallet's Mode-2 grant rail (decisions
 * 0006 + 0015). The wallet is the ISSUING side of decision 0015 L4: the
 * borrower approves a party, the wallet materialises WAC on the pod for that
 * party's service WebID, and every change writes a DPV consent receipt.
 *
 * Everything fails closed: an unset allowlist or an unconfigured party
 * disables the affected rail (503/400) rather than opening it. Party WebIDs
 * come from operator env, NEVER from request payloads — the borrower picks a
 * party by its short id; the WebID it resolves to is operator-pinned.
 */
import {
  type LenderConfig,
  configFromEnv as lenderConfigFromEnv,
} from "../../../lender-boa/lib/server/config";

/** The grantable parties (decision 0002 app set) and the modes each needs. */
export const GRANT_PARTY_IDS = ["lender-boa", "lender-53", "gse", "closing", "servicer"] as const;

export type GrantPartyId = (typeof GRANT_PARTY_IDS)[number];

export interface GrantPartyDefinition {
  readonly id: GrantPartyId;
  /** Role-first display label (R1 framing — never "by {Org}"). */
  readonly label: string;
  /** Scene 3: the lender writes the Loan Estimate back into the pod. */
  readonly write: boolean;
  /** Scene 5: the closing app manages the closing-record ACL (decision 0015 L4). */
  readonly control: boolean;
  /** The env var naming this party's service WebID. */
  readonly envVar: string;
}

/**
 * What each party's grant covers on the `/mortgage/` container. Modes are the
 * minimum the scene needs — Read everywhere, Write only where a document
 * lands back in the pod, Control only for the closing app (it rebuilds the
 * closing-record ACL, decision 0015 L4).
 */
export const GRANT_PARTIES: Readonly<Record<GrantPartyId, GrantPartyDefinition>> = {
  "lender-boa": {
    id: "lender-boa",
    label: "Primary mortgage lender — modelled on Bank of America",
    write: true,
    control: false,
    envVar: "MORTGAGE_LENDER_SERVICE_WEBID",
  },
  "lender-53": {
    id: "lender-53",
    label: "Second lender — modelled on Fifth Third Bank",
    write: false,
    control: false,
    envVar: "MORTGAGE_LENDER53_SERVICE_WEBID",
  },
  gse: {
    id: "gse",
    label: "Automated underwriting service — the Freddie Mac role",
    write: false,
    control: false,
    envVar: "MORTGAGE_GSE_SERVICE_WEBID",
  },
  closing: {
    id: "closing",
    label: "eClosing platform — modelled on Wolters Kluwer (eOriginal)",
    write: true,
    control: true,
    envVar: "MORTGAGE_CLOSING_SERVICE_WEBID",
  },
  servicer: {
    id: "servicer",
    label: "Mortgage servicer — modelled on Truist",
    write: false,
    control: false,
    envVar: "MORTGAGE_SERVICER_SERVICE_WEBID",
  },
};

export function isGrantPartyId(value: string): value is GrantPartyId {
  return Object.hasOwn(GRANT_PARTIES, value);
}

export interface WalletConfig extends LenderConfig {
  /**
   * The wallet's OWN service WebID (decision 0015 L4) — the custodian agent
   * the pod's container ACL names with Control, kept in every ACL this app
   * writes so it never locks itself out of the ACL it manages.
   */
  readonly serviceWebId: string | undefined;
  /** OIDC issuer of the service identity (client_credentials + DPoP). */
  readonly podServiceIssuer: string | undefined;
  /** Confidential client id for the service identity. */
  readonly podServiceClientId: string | undefined;
  /** Confidential client secret for the service identity (server env only). */
  readonly podServiceClientSecret: string | undefined;
  /** Configured party WebIDs, keyed by party id (unset parties are absent). */
  readonly partyWebIds: Partial<Record<GrantPartyId, string>>;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): WalletConfig {
  const partyWebIds: Partial<Record<GrantPartyId, string>> = {};
  for (const party of GRANT_PARTY_IDS) {
    const value = env[GRANT_PARTIES[party].envVar];
    if (value !== undefined && value.trim() !== "") partyWebIds[party] = value.trim();
  }
  return {
    ...lenderConfigFromEnv(env),
    serviceWebId: env.MORTGAGE_WALLET_SERVICE_WEBID,
    podServiceIssuer: env.MORTGAGE_WALLET_POD_SERVICE_ISSUER,
    podServiceClientId: env.MORTGAGE_WALLET_POD_SERVICE_CLIENT_ID,
    podServiceClientSecret: env.MORTGAGE_WALLET_POD_SERVICE_CLIENT_SECRET,
    partyWebIds,
  };
}

/** A required, non-empty config string — absent values fail closed as 503 upstream. */
export function requiredConfig(value: string | undefined, label: string): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${label} is unset`);
  }
  return value;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** A configured agent WebID: https (loopback http in dev only), no userinfo. */
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
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  const transportAllowed =
    url.protocol === "https:" || (allowInsecureLoopback && loopback && url.protocol === "http:");
  if (!transportAllowed || url.username !== "" || url.password !== "") {
    throw new Error(`${label} must be an https WebID without userinfo (loopback http in dev only)`);
  }
  return url.href;
}
