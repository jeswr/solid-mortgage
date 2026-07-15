/**
 * Shared test rig: fixed instants (the library never reads the clock, so the
 * suite doesn't either), a deterministic issuer key, an in-memory HTTP host
 * for status lists, and valid claim fixtures per credential kind.
 */

import { generateKeyPairForSuite, type KeyPair } from "@jeswr/solid-vc";
import type { DatasetCore } from "@rdfjs/types";
import { Parser, Store } from "n3";
import type {
  AppraisalClaims,
  AssetClaims,
  CreditScoreClaims,
  EmploymentIncomeClaims,
  TitleClearClaims,
  ZkOperandAnchorClaims,
} from "../src/index.js";
import { issueCredential, StatusListClient } from "../src/index.js";

export const DAY_MS = 24 * 60 * 60 * 1000;
/** The suite's "wall clock" - explicit everywhere. */
export const NOW = new Date("2026-07-15T12:00:00Z");
/** Scene-4 backdated window (decision 0012): -30d .. +14d around NOW. */
export const BACKDATED_VALIDITY = {
  validFrom: new Date(NOW.getTime() - 30 * DAY_MS),
  validUntil: new Date(NOW.getTime() + 14 * DAY_MS),
};

export const ISSUER = "https://issuer.example/org";
export const KEY_ID = `${ISSUER}#key-1`;
export const SUBJECT = "https://alex.example/profile/card#me";
export const LIST_URL = "https://issuer.example/status/employment";
export const CREDENTIAL_ID = "https://alex.example/credentials/income";

let cachedKey: Promise<KeyPair> | undefined;
/** One deterministic-enough Ed25519 issuer key per suite run. */
export function issuerKey(): Promise<KeyPair> {
  cachedKey ??= generateKeyPairForSuite(KEY_ID, "Ed25519");
  return cachedKey;
}

/** `resolveKey` stub: exactly the issuer key, fail-closed for anything else. */
export async function resolveIssuerKey(verificationMethod: string): Promise<CryptoKey | undefined> {
  const key = await issuerKey();
  return verificationMethod === key.verificationMethod ? key.publicKey : undefined;
}

export interface StubHost {
  readonly fetch: typeof fetch;
  readonly resources: Map<string, { body: string; contentType: string; version: number }>;
}

/**
 * A tiny in-memory resource host honouring GET / PUT with `ETag`,
 * `If-None-Match: *` and `If-Match` - the surface StatusListClient uses.
 */
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
      status: 200,
      headers: { "content-type": existing.contentType, etag: `"v${existing.version}"` },
    });
  };
  return { fetch: fetchImpl, resources };
}

/** A hosted, all-clear revocation list on the stub host. */
export async function hostedStatusList(
  host: StubHost,
  overrides: Partial<ConstructorParameters<typeof StatusListClient>[0]> = {},
): Promise<StatusListClient> {
  const client = new StatusListClient({
    url: LIST_URL,
    issuer: ISSUER,
    key: await issuerKey(),
    fetch: host.fetch,
    ...overrides,
  });
  await client.create({ now: NOW });
  return client;
}

export function employmentClaims(
  overrides: Partial<EmploymentIncomeClaims> = {},
): EmploymentIncomeClaims {
  return {
    kind: "employment-income-credential",
    employer: { name: "Ridgeline Analytics LLC" },
    jobTitle: "Senior Data Engineer",
    startDate: "2021-03-01",
    monthlyGrossIncomeUsd: 8500,
    ...overrides,
  };
}

export function assetClaims(): AssetClaims {
  return {
    kind: "asset-credential",
    accounts: [
      {
        provider: { name: "First Example Bank" },
        amountUsd: 64_000,
        accountLast4: "4821",
      },
    ],
  };
}

export function creditScoreClaims(overrides: Partial<CreditScoreClaims> = {}): CreditScoreClaims {
  return {
    kind: "credit-score-credential",
    creditScoreValue: 742,
    totalMonthlyDebtUsd: 1180,
    ...overrides,
  };
}

export function appraisalClaims(): AppraisalClaims {
  return {
    kind: "appraisal-credential",
    property: {
      address: {
        streetAddress: "1121 Maple Hollow Court",
        addressLocality: "Columbus",
        addressRegion: "OH",
        postalCode: "43230",
      },
      appraisedValueUsd: 425_000,
    },
    appraiser: { name: "Morgan Ellis", licenseId: "OH-CG-2025-118342" },
    reportIssued: "2026-07-07",
  };
}

export function titleClearClaims(): TitleClearClaims {
  return {
    kind: "title-clear-credential",
    property: {
      address: {
        streetAddress: "1121 Maple Hollow Court",
        addressLocality: "Columbus",
        addressRegion: "OH",
        postalCode: "43230",
      },
    },
    titleStatus: "clear",
    searchedThrough: "2026-07-09",
  };
}

export function anchorClaims(
  overrides: Partial<ZkOperandAnchorClaims> = {},
): ZkOperandAnchorClaims {
  return {
    kind: "zk-operand-anchor",
    field: "https://solid-mortgage-vocab.vercel.app/mort#monthlyGrossIncomeUsd",
    operandEnc: "0x1f6a9c02dd41e87b3355c04a9ee1d0f244ab6690c15e8d7a41f3b2c8a90d6e21",
    ...overrides,
  };
}

/** Issue the canonical scene-4 employment credential against `list`. */
export async function issueEmployment(list: StatusListClient, index = 42) {
  return issueCredential({
    kind: "employment-income-credential",
    credentialId: CREDENTIAL_ID,
    issuer: ISSUER,
    subject: SUBJECT,
    claims: employmentClaims(),
    validity: BACKDATED_VALIDITY,
    status: list.entry(index),
    key: await issuerKey(),
  });
}

/** Parse a Turtle credential document into a mutable Store. */
export function parseTurtle(body: string): Store & DatasetCore {
  return new Store(new Parser({ format: "text/turtle" }).parse(body));
}
