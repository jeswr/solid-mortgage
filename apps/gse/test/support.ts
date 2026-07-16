/**
 * Shared test rig for the gse suites: a deterministic credential issuer over
 * a hosted Bitstring status list, signing REAL Ed25519 data-integrity proofs
 * with @mortgage/vc-kit's own issue path — the credentials the AUS verifies
 * in tests are genuinely signed and genuinely status-listed; only the key
 * RESOLUTION and status-list TRANSPORT are in-process fixtures (the
 * `resolveKey`/`statusFetch` seams vc-kit documents for tests).
 *
 * Adapted from the reviewed `apps/lender-boa/test/support.ts` (stub host +
 * issuer rig; copied because vc-kit does not export its test rig — the
 * follow-up bead for a shared `./testing` subpath is already filed there).
 */
import { PERSONA_VALUES } from "@mortgage/data-model";
import {
  generateKeyPairForSuite,
  type IssuedCredential,
  issueCredential,
  type KeyPair,
  StatusListClient,
} from "@mortgage/vc-kit";

export const CREDENTIAL_ISSUER = "https://issuer.example/org";
export const CREDENTIAL_KEY_ID = `${CREDENTIAL_ISSUER}#key-1`;
export const STATUS_LIST_URL = "https://issuer.example/status/loan-file";

const DAY_MS = 24 * 60 * 60 * 1000;

export const alex = (() => {
  const persona = PERSONA_VALUES[0];
  if (persona === undefined) throw new Error("persona fixtures missing");
  return persona;
})();

let cachedKey: Promise<KeyPair> | undefined;
export function issuerKey(): Promise<KeyPair> {
  cachedKey ??= generateKeyPairForSuite(CREDENTIAL_KEY_ID, "Ed25519");
  return cachedKey;
}

/** `resolveKey` seam: exactly the issuer key, fail-closed for anything else. */
export async function resolveIssuerKey(verificationMethod: string): Promise<CryptoKey | undefined> {
  const key = await issuerKey();
  return verificationMethod === key.verificationMethod ? key.publicKey : undefined;
}

/** `isControlledBy` seam matching the rig issuer. */
export function issuerControls(verificationMethod: string, issuer: string): boolean {
  return verificationMethod === CREDENTIAL_KEY_ID && issuer === CREDENTIAL_ISSUER;
}

export interface StubHost {
  readonly fetch: typeof fetch;
  readonly resources: Map<string, { body: string; contentType: string; version: number }>;
}

/** In-memory GET/PUT host with ETag + If-None-Match/If-Match (StatusListClient surface). */
export function stubHost(): StubHost {
  const resources = new Map<string, { body: string; contentType: string; version: number }>();
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    const existing = resources.get(url);
    if (method === "PUT") {
      if (headers.get("if-none-match") === "*" && existing !== undefined) {
        return new Response(null, { status: 412 });
      }
      const ifMatch = headers.get("if-match");
      if (ifMatch !== null && (existing === undefined || `"v${existing.version}"` !== ifMatch)) {
        return new Response(null, { status: 412 });
      }
      const version = (existing?.version ?? 0) + 1;
      resources.set(url, {
        body: String(init?.body ?? ""),
        contentType: headers.get("content-type") ?? "application/octet-stream",
        version,
      });
      return new Response(null, { status: existing === undefined ? 201 : 204 });
    }
    if (existing === undefined) return new Response("not found", { status: 404 });
    return new Response(existing.body, {
      headers: { "content-type": existing.contentType, etag: `"v${existing.version}"` },
      status: 200,
    });
  };
  return { fetch: fetchImpl, resources };
}

/** A validity window relative to the rig's reference instant. */
export interface WindowDays {
  readonly validFromDays: number;
  readonly validUntilDays: number;
}

export const FRESH_WINDOW: WindowDays = { validFromDays: -1, validUntilDays: 14 };
export const STALE_WINDOW: WindowDays = { validFromDays: -60, validUntilDays: -5 };

export interface CredentialRig {
  readonly host: StubHost;
  readonly list: StatusListClient;
  issueEmployment(options: {
    credentialId: string;
    subject: string;
    window: WindowDays;
    index: number;
    monthlyGrossIncomeUsd?: number;
  }): Promise<IssuedCredential>;
  issueAssets(options: {
    credentialId: string;
    subject: string;
    window: WindowDays;
    index: number;
    amountUsd?: number;
  }): Promise<IssuedCredential>;
  issueCredit(options: {
    credentialId: string;
    subject: string;
    window: WindowDays;
    index: number;
    creditScoreValue?: number;
    totalMonthlyDebtUsd?: number;
  }): Promise<IssuedCredential>;
  issueAppraisal(options: {
    credentialId: string;
    subject: string;
    window: WindowDays;
    index: number;
    appraisedValueUsd?: number;
  }): Promise<IssuedCredential>;
}

/** A hosted all-clear status list + an issuer signing the loan-file credentials. */
export async function credentialRig(now: Date): Promise<CredentialRig> {
  const host = stubHost();
  const list = new StatusListClient({
    fetch: host.fetch,
    issuer: CREDENTIAL_ISSUER,
    key: await issuerKey(),
    url: STATUS_LIST_URL,
  });
  await list.create({ now });

  const validity = (window: WindowDays) => ({
    validFrom: new Date(now.getTime() + window.validFromDays * DAY_MS),
    validUntil: new Date(now.getTime() + window.validUntilDays * DAY_MS),
  });

  return {
    host,
    issueAppraisal: async (options) =>
      issueCredential({
        claims: {
          appraiser: { licenseId: alex.appraiserLicenseId, name: alex.appraiserName },
          kind: "appraisal-credential",
          property: {
            address: alex.subjectPropertyAddress,
            appraisedValueUsd: options.appraisedValueUsd ?? alex.appraisedValueUsd,
          },
          reportIssued: new Date(now.getTime() - 8 * DAY_MS).toISOString().slice(0, 10),
        },
        credentialId: options.credentialId,
        issuer: CREDENTIAL_ISSUER,
        key: await issuerKey(),
        kind: "appraisal-credential",
        status: list.entry(options.index),
        subject: options.subject,
        validity: validity(options.window),
      }),
    issueAssets: async (options) =>
      issueCredential({
        claims: {
          accounts: [
            {
              accountLast4: "4821",
              amountUsd: options.amountUsd ?? alex.bankBalanceUsd,
              provider: { name: alex.bankName },
            },
          ],
          kind: "asset-credential",
        },
        credentialId: options.credentialId,
        issuer: CREDENTIAL_ISSUER,
        key: await issuerKey(),
        kind: "asset-credential",
        status: list.entry(options.index),
        subject: options.subject,
        validity: validity(options.window),
      }),
    issueCredit: async (options) =>
      issueCredential({
        claims: {
          creditScoreValue: options.creditScoreValue ?? alex.creditScoreValue,
          kind: "credit-score-credential",
          totalMonthlyDebtUsd: options.totalMonthlyDebtUsd ?? alex.totalMonthlyDebtUsd,
        },
        credentialId: options.credentialId,
        issuer: CREDENTIAL_ISSUER,
        key: await issuerKey(),
        kind: "credit-score-credential",
        status: list.entry(options.index),
        subject: options.subject,
        validity: validity(options.window),
      }),
    issueEmployment: async (options) =>
      issueCredential({
        claims: {
          employer: { name: alex.employerName },
          jobTitle: alex.jobTitle,
          kind: "employment-income-credential",
          monthlyGrossIncomeUsd: options.monthlyGrossIncomeUsd ?? alex.monthlyGrossIncomeUsd,
          startDate: alex.employmentStartDate,
        },
        credentialId: options.credentialId,
        issuer: CREDENTIAL_ISSUER,
        key: await issuerKey(),
        kind: "employment-income-credential",
        status: list.entry(options.index),
        subject: options.subject,
        validity: validity(options.window),
      }),
    list,
  };
}
