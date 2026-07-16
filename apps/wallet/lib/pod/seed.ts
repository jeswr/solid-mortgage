/**
 * The wallet's Mode-1 pod seed (decisions 0011 + 0012): everything the Data
 * Vault demo needs, provisioned into the per-visitor in-browser pod at boot —
 * self-contained on the pod's own (virtual) origin so nothing dereferences
 * off-device.
 *
 * Contents:
 *   - the sm-20 primary persona's non-credential documents (borrower profile,
 *     loan application, underwriting decision, closing record) plus the WebID
 *     profile card (`foaf:name` + `pim:storage`);
 *   - five SIGNED verifiable credentials (employment+income, asset,
 *     credit-score, appraisal, title) issued through the vc-kit gate
 *     (SHACL-validated, `eddsa-rdfc-2022`) by five demo issuer identities
 *     HOSTED ON THE POD ORIGIN — their WebID/verification-method documents
 *     and per-issuer Bitstring status lists are seeded beside the data, so
 *     verify-on-view runs the FULL fail-closed gate chain (signature, issuer
 *     control, window, status, shape) against pod-served documents;
 *   - two issuer-signed `mort:ZkOperandAnchor` credentials (decision 0012:
 *     a bare filter proof is forgeable) at borrower-only paths.
 *
 * VALUE DISCIPLINE: the ZK-provable claim values are the vc-kit canonical
 * demo inputs (income $8,500/mo, score 742) — the values whose GENUINE sparq
 * term encodings were captured from `encode_int_literal` (see the provenance
 * note on {@link CAPTURED_OPERAND_ENC}). They intentionally track the sm-20
 * persona's employer/role while using the captured-encoding values; an
 * operand encoding is NEVER fabricated here (capturing new values needs the
 * native toolchain — packages/vc-kit/scripts/capture-fixtures.mjs).
 *
 * Validity windows are relative to the caller's `now` (the worker boots with
 * the real clock): the employment VC is genuinely near-expiry
 * (validFrom −30d / validUntil +14d — the scene-4 beat, no fake clock).
 *
 * WORKER-SIDE module: heavy (data-model + vc-kit issuance) by design — it is
 * imported ONLY by the pod worker entry and the Vitest suite, never by page
 * code.
 */

import { Buffer } from "node:buffer";
import { MORT, PERSONA_VALUES, personas } from "@mortgage/data-model";
import type { ResourceFixture, SeedablePersona } from "@mortgage/solid-kit/browser-pod/worker";
import { personaSeedFixtures } from "@mortgage/solid-kit/browser-pod/worker";
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

/** Pod paths of the five credentials (sm-20 layout) and the two anchors. */
export const CREDENTIAL_POD_PATHS = {
  income: "/mortgage/credentials/income",
  assets: "/mortgage/credentials/assets",
  credit: "/mortgage/credentials/credit",
  appraisal: "/mortgage/credentials/appraisal",
  title: "/mortgage/credentials/title",
} as const;

export const ANCHOR_POD_PATHS = {
  income: "/mortgage/zk/anchor-income",
  score: "/mortgage/zk/anchor-score",
} as const;

/**
 * PROVENANCE: genuine sparq term encodings of `"<value>"^^xsd:integer` from
 * `sparq_zk_compose::build::encode_int_literal` at sparq commit 947480b0,
 * captured programmatically by packages/vc-kit/scripts/capture-fixtures.mjs
 * (fixtures/operand-enc.json + PROVENANCE.json). Copied here — the same
 * consuming pattern as e2e/lender-boa.spec.ts — because the browser worker
 * cannot read test fixtures at runtime. NEVER hand-edit; recapture instead.
 */
export const CAPTURED_OPERAND_ENC = {
  8500: "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
  742: "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
} as const;

/** The ZK-provable demo values (vc-kit canonical demo inputs — see header). */
export const DEMO_MONTHLY_INCOME_USD = 8500;
export const DEMO_CREDIT_SCORE = 742;

/** The five pod-hosted demo issuers (role-first labels; .example per sm-20). */
export const POD_ISSUERS = {
  employment: {
    docPath: "/issuers/employment-verifier",
    statusPath: "/status/employment",
    label: "employment and income verifier",
  },
  bank: {
    docPath: "/issuers/bank",
    statusPath: "/status/assets",
    label: "depository institution",
  },
  bureau: {
    docPath: "/issuers/credit-bureau",
    statusPath: "/status/credit",
    label: "credit bureau",
  },
  appraisal: {
    docPath: "/issuers/appraisal-management",
    statusPath: "/status/appraisal",
    label: "appraisal management company",
  },
  title: {
    docPath: "/issuers/title-company",
    statusPath: "/status/title",
    label: "title company",
  },
} as const;

export type PodIssuerId = keyof typeof POD_ISSUERS;

export function podIssuerIri(id: PodIssuerId): string {
  return `${WALLET_POD_BASE.slice(0, -1)}${POD_ISSUERS[id].docPath}`;
}

/** Every issuer IRI — the client's `trustedIssuers` for verify-on-view. */
export function podIssuerIris(): string[] {
  return (Object.keys(POD_ISSUERS) as PodIssuerId[]).map(podIssuerIri);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
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
    validUntil: daysFrom(now, 180),
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

interface IssueSpec {
  readonly path: string;
  readonly issuer: SeededIssuer;
  readonly statusIndex: number;
  readonly claims: CredentialClaims;
  readonly validFromDays: number;
  readonly validUntilDays: number;
}

async function issueInto(spec: IssueSpec, now: Date): Promise<IssuedCredential> {
  return issueCredential({
    kind: spec.claims.kind,
    credentialId: `${WALLET_POD_BASE.slice(0, -1)}${spec.path}`,
    issuer: spec.issuer.iri,
    subject: WALLET_WEB_ID,
    claims: spec.claims,
    validity: {
      validFrom: daysFrom(now, spec.validFromDays),
      validUntil: daysFrom(now, spec.validUntilDays),
    },
    status: spec.issuer.status.entry(spec.statusIndex),
    key: spec.issuer.key,
  });
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
  // signed vc-kit issuances at the same paths.
  const documents = alex.resources.filter((resource) =>
    ["borrower-profile", "loan-application", "underwriting-decision", "closing-record"].includes(
      resource.kind,
    ),
  );

  const issuerIds = Object.keys(POD_ISSUERS) as PodIssuerId[];
  const issuers = new Map<PodIssuerId, SeededIssuer>();
  for (const id of issuerIds) issuers.set(id, await provisionIssuer(id, now));
  const issuer = (id: PodIssuerId): SeededIssuer => {
    const provisioned = issuers.get(id);
    if (provisioned === undefined) throw new Error(`issuer ${id} was not provisioned`);
    return provisioned;
  };

  const [income, assets, credit, appraisal, title] = await Promise.all([
    issueInto(
      {
        path: CREDENTIAL_POD_PATHS.income,
        issuer: issuer("employment"),
        statusIndex: 42,
        // Scene-4 freshness beat: genuinely near-expiry, no fake clock.
        validFromDays: -30,
        validUntilDays: 14,
        claims: {
          kind: "employment-income-credential",
          employer: { name: values.employerName },
          jobTitle: values.jobTitle,
          startDate: values.employmentStartDate,
          monthlyGrossIncomeUsd: DEMO_MONTHLY_INCOME_USD,
        },
      },
      now,
    ),
    issueInto(
      {
        path: CREDENTIAL_POD_PATHS.assets,
        issuer: issuer("bank"),
        statusIndex: 7,
        validFromDays: -14,
        validUntilDays: 16,
        claims: {
          kind: "asset-credential",
          accounts: [
            {
              provider: { name: values.bankName },
              amountUsd: values.bankBalanceUsd,
              accountLast4: "4821",
            },
          ],
        },
      },
      now,
    ),
    issueInto(
      {
        path: CREDENTIAL_POD_PATHS.credit,
        issuer: issuer("bureau"),
        statusIndex: 11,
        validFromDays: -10,
        validUntilDays: 80,
        claims: {
          kind: "credit-score-credential",
          creditScoreValue: DEMO_CREDIT_SCORE,
          totalMonthlyDebtUsd: values.totalMonthlyDebtUsd,
        },
      },
      now,
    ),
    issueInto(
      {
        path: CREDENTIAL_POD_PATHS.appraisal,
        issuer: issuer("appraisal"),
        statusIndex: 5,
        validFromDays: -7,
        validUntilDays: 177,
        claims: {
          kind: "appraisal-credential",
          property: {
            address: values.subjectPropertyAddress,
            appraisedValueUsd: values.appraisedValueUsd,
          },
          appraiser: { name: values.appraiserName, licenseId: values.appraiserLicenseId },
          reportIssued: isoDate(daysFrom(now, -8)),
        },
      },
      now,
    ),
    issueInto(
      {
        path: CREDENTIAL_POD_PATHS.title,
        issuer: issuer("title"),
        statusIndex: 9,
        validFromDays: -5,
        validUntilDays: 87,
        claims: {
          kind: "title-clear-credential",
          property: { address: values.subjectPropertyAddress },
          titleStatus: "clear",
          searchedThrough: isoDate(daysFrom(now, -6)),
        },
      },
      now,
    ),
  ]);

  // Decision 0012: the issuer-signed operand anchors that make Tier A proofs
  // forgery-resistant. The encodings are the CAPTURED genuine sparq term
  // encodings of exactly the hidden claim values issued above.
  const [incomeAnchor, scoreAnchor] = await Promise.all([
    issueCredential({
      kind: "zk-operand-anchor",
      credentialId: `${WALLET_POD_BASE.slice(0, -1)}${ANCHOR_POD_PATHS.income}`,
      issuer: issuer("employment").iri,
      subject: WALLET_WEB_ID,
      claims: {
        kind: "zk-operand-anchor",
        field: MORT.monthlyGrossIncomeUsd,
        operandEnc: CAPTURED_OPERAND_ENC[DEMO_MONTHLY_INCOME_USD],
      },
      validity: { validFrom: daysFrom(now, -1), validUntil: daysFrom(now, 14) },
      status: issuer("employment").status.entry(43),
      key: issuer("employment").key,
    }),
    issueCredential({
      kind: "zk-operand-anchor",
      credentialId: `${WALLET_POD_BASE.slice(0, -1)}${ANCHOR_POD_PATHS.score}`,
      issuer: issuer("bureau").iri,
      subject: WALLET_WEB_ID,
      claims: {
        kind: "zk-operand-anchor",
        field: MORT.creditScoreValue,
        operandEnc: CAPTURED_OPERAND_ENC[DEMO_CREDIT_SCORE],
      },
      validity: { validFrom: daysFrom(now, -1), validUntil: daysFrom(now, 14) },
      status: issuer("bureau").status.entry(12),
      key: issuer("bureau").key,
    }),
  ]);

  const persona: SeedablePersona = {
    webId: WALLET_WEB_ID,
    podBase: WALLET_POD_BASE,
    displayName: WALLET_DISPLAY_NAME,
    resources: documents.map((resource) => ({ path: resource.path, turtle: resource.turtle })),
  };

  const credentialFixture = (path: string, credential: IssuedCredential): ResourceFixture => ({
    path,
    body: credential.body,
    contentType: credential.contentType,
  });

  const fixtures: ResourceFixture[] = [
    // Profile card + the four persona documents.
    ...personaSeedFixtures(persona),
    // Signed credentials at the sm-20 pod paths.
    credentialFixture(CREDENTIAL_POD_PATHS.income, income),
    credentialFixture(CREDENTIAL_POD_PATHS.assets, assets),
    credentialFixture(CREDENTIAL_POD_PATHS.credit, credit),
    credentialFixture(CREDENTIAL_POD_PATHS.appraisal, appraisal),
    credentialFixture(CREDENTIAL_POD_PATHS.title, title),
    // Borrower-only ZK material (SPEC §3: witness inputs beside the VCs).
    credentialFixture(ANCHOR_POD_PATHS.income, incomeAnchor),
    credentialFixture(ANCHOR_POD_PATHS.score, scoreAnchor),
    // Issuer identity documents + status lists, pod-hosted (see header).
    ...issuerIds.flatMap((id) => issuer(id).fixtures),
    ...issuerIds.map((id) => issuer(id).finishStatusFixture()),
  ];

  return { fixtures, persona };
}
