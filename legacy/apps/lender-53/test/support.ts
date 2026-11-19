/** Real anchor/status fixtures and captured sparq operand encodings. */
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
  9999: "0x0ad5c5f2163a0400c5cd2a1a80fb43229689797c2b53ac9f93c6af28930e3c91",
  742: "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
};

export function encOf(value: number): string {
  const enc = OPERAND_ENC[value];
  if (enc === undefined) throw new Error(`no captured operand_enc fixture for ${value}`);
  return enc;
}

export const ANCHOR_ISSUER = "https://issuer.example/org";
const ANCHOR_KEY_ID = `${ANCHOR_ISSUER}#key-1`;
const STATUS_LIST_URL = "https://issuer.example/status/prequal";

let cachedKey: Promise<KeyPair> | undefined;
function issuerKey(): Promise<KeyPair> {
  cachedKey ??= generateKeyPairForSuite(ANCHOR_KEY_ID, "Ed25519");
  return cachedKey;
}

export async function resolveIssuerKey(verificationMethod: string): Promise<CryptoKey | undefined> {
  const key = await issuerKey();
  return verificationMethod === key.verificationMethod ? key.publicKey : undefined;
}

export function issuerControls(verificationMethod: string, issuer: string): boolean {
  return verificationMethod === ANCHOR_KEY_ID && issuer === ANCHOR_ISSUER;
}

interface StubHost {
  readonly fetch: typeof fetch;
  readonly resources: Map<string, { body: string; contentType: string; version: number }>;
}

function stubHost(): StubHost {
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
  issueAnchor(overrides: {
    field?: string;
    operandEnc?: string;
    subject: string;
    index?: number;
  }): Promise<IssuedCredential>;
}

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
    issueAnchor: async (overrides) =>
      issueCredential({
        kind: "zk-operand-anchor",
        credentialId: "https://alex.example/credentials/operand-anchor",
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
  };
}
