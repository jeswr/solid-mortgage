/**
 * The wallet's Mode-1 pod seed (decisions 0011 + 0012): everything the Data
 * Vault demo needs, provisioned into the per-visitor in-browser pod at boot —
 * self-contained on the pod's own (virtual) origin so nothing dereferences
 * off-device.
 *
 * SINCE sm-65 the pinned values live in the SHARED scripted-persona override
 * layer (`@mortgage/solid-kit/mortgage-seed/overrides`): claim values,
 * validity windows (incl. the scene-4 backdated employment VC, −30d/+14d),
 * status indexes, pod paths and the CAPTURED genuine operand encodings are
 * the same objects the dev-server and e2e global-setup seeds consume, so the
 * Mode-1 pod can never drift from the server-seeded pods again. This module
 * keeps only what is Mode-1-specific: in-browser issuer provisioning (fresh
 * per-visitor keys + pod-hosted status lists) and the fixture assembly for
 * `createBrowserPod`.
 *
 * Contents:
 *   - the sm-20 primary persona's non-credential documents (borrower profile,
 *     loan application, underwriting decision, closing record) plus the WebID
 *     profile card (`foaf:name` + `pim:storage`);
 *   - five SIGNED verifiable credentials issued through the vc-kit gate
 *     (SHACL-validated, `eddsa-rdfc-2022`) by five demo issuer identities
 *     HOSTED ON THE POD ORIGIN — their WebID/verification-method documents
 *     and per-issuer Bitstring status lists are seeded beside the data, so
 *     verify-on-view runs the FULL fail-closed gate chain (signature, issuer
 *     control, window, status, shape) against pod-served documents;
 *   - two issuer-signed `mort:ZkOperandAnchor` credentials (decision 0012:
 *     a bare filter proof is forgeable) at borrower-only paths, carrying the
 *     CAPTURED genuine sparq term encodings — an operand encoding is NEVER
 *     fabricated here (capturing new values needs the native toolchain —
 *     packages/vc-kit/scripts/capture-fixtures.mjs).
 *
 * WORKER-SIDE module: heavy (data-model + vc-kit issuance) by design — it is
 * imported ONLY by the pod worker entry and the Vitest suite, never by page
 * code.
 */

import { Buffer } from "node:buffer";
import { PERSONA_VALUES, personas } from "@mortgage/data-model";
import type { ResourceFixture, SeedablePersona } from "@mortgage/solid-kit/browser-pod/worker";
import { personaSeedFixtures } from "@mortgage/solid-kit/browser-pod/worker";
import {
  anchorValidity,
  CAPTURED_OPERAND_ENC,
  MORTGAGE_ANCHOR_POD_PATHS,
  MORTGAGE_CREDENTIAL_POD_PATHS,
  MORTGAGE_SEED_ISSUER_ROLES,
  type MortgageSeedIssuerRole,
  type ScriptedCredentialSeed,
  scriptedCredentialSeeds,
} from "@mortgage/solid-kit/mortgage-seed/overrides";
import {
  type CredentialClaims,
  generateKeyPairForSuite,
  type IssuedCredential,
  issueCredential,
  type KeyPair,
  MIN_STATUS_LIST_LENGTH,
  publishVerificationMethod,
  StatusListClient,
} from "@mortgage/vc-kit";

/** The Mode-1 persona (sm-20 primary borrower; pod origin is VIRTUAL). */
export const WALLET_POD_BASE = "https://alex.pod.example/";
export const WALLET_WEB_ID = `${WALLET_POD_BASE}profile/card#me`;
export const WALLET_DISPLAY_NAME = "Alex Rivera";

/** Pod paths of the five credentials and the two anchors (shared sm-65 layer). */
export const CREDENTIAL_POD_PATHS = MORTGAGE_CREDENTIAL_POD_PATHS;
export const ANCHOR_POD_PATHS = {
  income: MORTGAGE_ANCHOR_POD_PATHS.income,
  score: MORTGAGE_ANCHOR_POD_PATHS.score,
} as const;

export { CAPTURED_OPERAND_ENC };

/** The five pod-hosted demo issuers (role-first labels; .example per sm-20). */
export const POD_ISSUERS = MORTGAGE_SEED_ISSUER_ROLES;

export type PodIssuerId = MortgageSeedIssuerRole;

export function podIssuerIri(id: PodIssuerId, podBase: string = WALLET_POD_BASE): string {
  return `${podBase.slice(0, -1)}${POD_ISSUERS[id].docPath}`;
}

/** Every issuer IRI — the client's `trustedIssuers` for verify-on-view. */
export function podIssuerIris(podBase: string = WALLET_POD_BASE): string[] {
  return (Object.keys(POD_ISSUERS) as PodIssuerId[]).map((id) => podIssuerIri(id, podBase));
}

/**
 * A tiny in-memory resource host handed to `StatusListClient` so the signed
 * list bodies can be CAPTURED as seed fixtures (the pod does not exist yet at
 * seed-build time). Honours the client's strict-create/If-Match discipline.
 */
function memoryResourceStore(): {
  fetch: typeof fetch;
  body(url: string): { body: string; contentType: string };
} {
  const resources = new Map<string, { body: string; contentType: string; version: number }>();
  const memoryFetch: typeof fetch = (input, init) => {
    const request = new Request(input instanceof Request ? input : String(input), init);
    const key = new URL(request.url).href;
    const existing = resources.get(key);
    if (request.method === "PUT") {
      const ifMatch = request.headers.get("if-match");
      const ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch === "*" && existing !== undefined) {
        return Promise.resolve(new Response(null, { status: 412 }));
      }
      if (ifMatch !== null && `"v${existing?.version ?? 0}"` !== ifMatch) {
        return Promise.resolve(new Response(null, { status: 412 }));
      }
      return request.text().then((body) => {
        resources.set(key, {
          body,
          contentType: request.headers.get("content-type") ?? "application/octet-stream",
          version: (existing?.version ?? 0) + 1,
        });
        return new Response(null, { status: existing === undefined ? 201 : 204 });
      });
    }
    if (existing === undefined) return Promise.resolve(new Response("not found", { status: 404 }));
    return Promise.resolve(
      new Response(existing.body, {
        status: 200,
        headers: { "content-type": existing.contentType, etag: `"v${existing.version}"` },
      }),
    );
  };
  return {
    fetch: memoryFetch,
    body(url: string) {
      const stored = resources.get(new URL(url).href);
      if (stored === undefined) throw new Error(`status list was never written: ${url}`);
      return { body: stored.body, contentType: stored.contentType };
    },
  };
}

interface SeededIssuer {
  readonly iri: string;
  readonly key: KeyPair;
  readonly status: StatusListClient;
  readonly fixtures: ResourceFixture[];
  readonly finishStatusFixture: () => ResourceFixture;
}

async function provisionIssuer(id: PodIssuerId, now: Date): Promise<SeededIssuer> {
  const definition = POD_ISSUERS[id];
  const iri = podIssuerIri(id);
  const key = await generateKeyPairForSuite(`${iri}#key-1`, "Ed25519");
  const published = await publishVerificationMethod({ controller: iri, key });
  const store = memoryResourceStore();
  const statusUrl = `${WALLET_POD_BASE.slice(0, -1)}${definition.statusPath}`;
  const status = new StatusListClient({ url: statusUrl, issuer: iri, key, fetch: store.fetch });
  // Demo lists live as long as the longest credential window (+180d) — a
  // per-visitor pod is reseeded on every boot, so staleness cannot accrue.
  // The all-clear bitstring is passed as a BUFFER explicitly: in the browser
  // bundle, solid-vc's gzip runs through the bundler's zlib polyfill, whose
  // input check accepts (polyfill) Buffers but rejects plain Uint8Arrays —
  // in Node this is byte-identical to the default.
  await status.create({
    now,
    validUntil: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
    bits: Buffer.alloc(MIN_STATUS_LIST_LENGTH / 8),
  });
  return {
    iri,
    key,
    status,
    fixtures: [{ path: definition.docPath, body: published.turtle }],
    finishStatusFixture: () => {
      const captured = store.body(statusUrl);
      return {
        path: definition.statusPath,
        body: captured.body,
        contentType: captured.contentType,
      };
    },
  };
}

export interface WalletPodSeed {
  readonly fixtures: readonly ResourceFixture[];
  readonly persona: SeedablePersona;
}

/**
 * Build the full Mode-1 seed. Deterministic given `now` except for the demo
 * issuer keys, which are freshly generated per boot — honest for a simulated,
 * per-visitor pod (there is no cross-visitor issuer identity to preserve),
 * and it keeps private keys out of the bundle.
 */
export async function buildWalletPodSeed(now: Date): Promise<WalletPodSeed> {
  const [alex] = await personas({ now, podBases: { "alex-rivera": WALLET_POD_BASE } });
  if (alex === undefined || alex.id !== "alex-rivera") {
    throw new Error("sm-20 persona fixtures missing the primary borrower");
  }
  const values = PERSONA_VALUES.find((entry) => entry.id === "alex-rivera");
  if (values === undefined) throw new Error("sm-20 persona values missing the primary borrower");

  // The four non-credential documents keep the sm-20 persona build (SHACL
  // validated, deterministic); the five credentials are REPLACED below by
  // signed vc-kit issuances at the same paths, driven by the SHARED sm-65
  // scripted-persona override layer.
  const documents = alex.resources.filter((resource) =>
    ["borrower-profile", "loan-application", "underwriting-decision", "closing-record"].includes(
      resource.kind,
    ),
  );

  const specs = scriptedCredentialSeeds(values, now);
  const issuerIds = Object.keys(POD_ISSUERS) as PodIssuerId[];
  const issuers = new Map<PodIssuerId, SeededIssuer>();
  for (const id of issuerIds) issuers.set(id, await provisionIssuer(id, now));
  const issuer = (id: PodIssuerId): SeededIssuer => {
    const provisioned = issuers.get(id);
    if (provisioned === undefined) throw new Error(`issuer ${id} was not provisioned`);
    return provisioned;
  };

  async function issueSpec(spec: ScriptedCredentialSeed): Promise<IssuedCredential> {
    // No cast: the shared override layer must stay STRUCTURALLY assignable to
    // vc-kit's typed claims — drift is a compile error here.
    const claims: CredentialClaims = spec.claims;
    return issueCredential({
      kind: spec.kind,
      credentialId: `${WALLET_POD_BASE.slice(0, -1)}${spec.path}`,
      issuer: issuer(spec.issuerRole).iri,
      subject: WALLET_WEB_ID,
      claims,
      validity: { validFrom: spec.validFrom, validUntil: spec.validUntil },
      status: issuer(spec.issuerRole).status.entry(spec.statusIndex),
      key: issuer(spec.issuerRole).key,
    });
  }

  /**
   * Decision 0012: the issuer-signed operand anchor that makes Tier A proofs
   * forgery-resistant, carrying the CAPTURED genuine sparq term encoding of
   * exactly the hidden claim value issued above (pinned in the shared spec;
   * the browser has no native toolchain, so the encoding is never computed —
   * only replayed from capture).
   */
  async function issueAnchor(spec: ScriptedCredentialSeed): Promise<IssuedCredential> {
    const anchor = spec.anchor;
    if (anchor === undefined) throw new Error(`credential ${spec.id} has no anchor spec`);
    return issueCredential({
      kind: "zk-operand-anchor",
      credentialId: `${WALLET_POD_BASE.slice(0, -1)}${anchor.path}`,
      issuer: issuer(spec.issuerRole).iri,
      subject: WALLET_WEB_ID,
      claims: { kind: "zk-operand-anchor", field: anchor.field, operandEnc: anchor.operandEnc },
      validity: anchorValidity(now),
      status: issuer(spec.issuerRole).status.entry(anchor.statusIndex),
      key: issuer(spec.issuerRole).key,
    });
  }

  const credentialFixtures: ResourceFixture[] = [];
  for (const spec of specs) {
    const credential = await issueSpec(spec);
    credentialFixtures.push({
      path: spec.path,
      body: credential.body,
      contentType: credential.contentType,
    });
    if (spec.anchor !== undefined) {
      const anchor = await issueAnchor(spec);
      credentialFixtures.push({
        path: spec.anchor.path,
        body: anchor.body,
        contentType: anchor.contentType,
      });
    }
  }

  const persona: SeedablePersona = {
    webId: WALLET_WEB_ID,
    podBase: WALLET_POD_BASE,
    displayName: WALLET_DISPLAY_NAME,
    resources: documents.map((resource) => ({ path: resource.path, turtle: resource.turtle })),
  };

  const fixtures: ResourceFixture[] = [
    // Profile card + the four persona documents.
    ...personaSeedFixtures(persona),
    // Signed credentials + borrower-only anchors at the shared sm-65 paths.
    ...credentialFixtures,
    // Issuer identity documents + status lists, pod-hosted (see header).
    ...issuerIds.flatMap((id) => issuer(id).fixtures),
    ...issuerIds.map((id) => issuer(id).finishStatusFixture()),
  ];

  return { fixtures, persona };
}
