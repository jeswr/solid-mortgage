/**
 * Shared test rig for the lender-boa suites: a stub in-memory HTTP host, a
 * deterministic anchor/credential issuer over a hosted Bitstring status list,
 * and captured sparq operand encodings for live Tier A proving.
 *
 * OPERAND_ENC PROVENANCE: genuine sparq term encodings of
 * `"<value>"^^xsd:integer`, captured from
 * `sparq_zk_compose::build::encode_int_literal` at sparq checkout commit
 * 947480b02fcbd174f80f9247b55ee02202d2e345 — the same fixture set as
 * `packages/vc-kit/test/zk-support.ts` (copied because vc-kit does not export
 * its test rig; follow-up bead files the shared `./testing` subpath).
 */

import { MORT } from "@mortgage/data-model";
import {
  generateKeyPairForSuite,
  type IssuedCredential,
  issueCredential,
  type KeyPair,
  StatusListClient,
} from "@mortgage/vc-kit";

export const OPERAND_ENC: Readonly<Record<number, string>> = {
  8500: "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
  7000: "0x205e4dd0c2526b48ae2a94bfcdbbe30e19de4e8b85ce29ec0e7b35cba051b053",
  9999: "0x0ad5c5f2163a0400c5cd2a1a80fb43229689797c2b53ac9f93c6af28930e3c91",
  742: "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
};

export function encOf(value: number): string {
  const enc = OPERAND_ENC[value];
  if (enc === undefined) throw new Error(`no captured operand_enc fixture for ${value}`);
  return enc;
}

export const ANCHOR_ISSUER = "https://issuer.example/org";
export const ANCHOR_KEY_ID = `${ANCHOR_ISSUER}#key-1`;
export const STATUS_LIST_URL = "https://issuer.example/status/prequal";

let cachedKey: Promise<KeyPair> | undefined;
export function issuerKey(): Promise<KeyPair> {
  cachedKey ??= generateKeyPairForSuite(ANCHOR_KEY_ID, "Ed25519");
  return cachedKey;
}

/** `resolveKey` seam: exactly the issuer key, fail-closed for anything else. */
export async function resolveIssuerKey(verificationMethod: string): Promise<CryptoKey | undefined> {
  const key = await issuerKey();
  return verificationMethod === key.verificationMethod ? key.publicKey : undefined;
}

/** `isControlledBy` seam matching the stub issuer. */
export function issuerControls(verificationMethod: string, issuer: string): boolean {
  return verificationMethod === ANCHOR_KEY_ID && issuer === ANCHOR_ISSUER;
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
      status: 200,
      headers: { "content-type": existing.contentType, etag: `"v${existing.version}"` },
    });
  };
  return { fetch: fetchImpl, resources };
}

export interface AnchorRig {
  readonly host: StubHost;
  readonly list: StatusListClient;
  issueAnchor(overrides?: {
    field?: string;
    operandEnc?: string;
    subject: string;
    index?: number;
  }): Promise<IssuedCredential>;
  issueEmployment(options: {
    subject: string;
    credentialId: string;
    validFrom: Date;
    validUntil: Date;
    index?: number;
    monthlyGrossIncomeUsd?: number;
  }): Promise<IssuedCredential>;
}

/** A hosted all-clear status list + an issuer signing against it. */
export async function anchorRig(now: Date): Promise<AnchorRig> {
  const host = stubHost();
  const list = new StatusListClient({
    url: STATUS_LIST_URL,
    issuer: ANCHOR_ISSUER,
    key: await issuerKey(),
    fetch: host.fetch,
  });
  await list.create({ now });
  return {
    host,
    list,
    issueAnchor: async (overrides = { subject: "" }) =>
      issueCredential({
        kind: "zk-operand-anchor",
        credentialId: "https://alex.example/credentials/income-anchor",
        issuer: ANCHOR_ISSUER,
        subject: overrides.subject,
        claims: {
          kind: "zk-operand-anchor",
          field: overrides.field ?? MORT.monthlyGrossIncomeUsd,
          operandEnc: overrides.operandEnc ?? encOf(8500),
        },
        validity: {
          validFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          validUntil: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
        status: list.entry(overrides.index ?? 7),
        key: await issuerKey(),
      }),
    issueEmployment: async (options) =>
      issueCredential({
        kind: "employment-income-credential",
        credentialId: options.credentialId,
        issuer: ANCHOR_ISSUER,
        subject: options.subject,
        claims: {
          kind: "employment-income-credential",
          employer: { name: "Ridgeline Analytics LLC" },
          jobTitle: "Senior Data Engineer",
          startDate: "2021-03-01",
          monthlyGrossIncomeUsd: options.monthlyGrossIncomeUsd ?? 8500,
        },
        validity: { validFrom: options.validFrom, validUntil: options.validUntil },
        status: list.entry(options.index ?? 42),
        key: await issuerKey(),
      }),
  };
}
