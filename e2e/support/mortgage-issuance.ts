/**
 * sm-65 — the `MortgageCredentialIssuance` implementation for the Node
 * consumption points (e2e global-setup, `scripts/dev-pod.ts`, the root
 * integration suite). Lives at the workspace root because it composes
 * `@mortgage/vc-kit` INTO `@mortgage/solid-kit`'s injected issuance seam —
 * solid-kit itself cannot depend on vc-kit (vc-kit's test rig dev-depends on
 * solid-kit; the edge back would cycle the turbo task graph).
 *
 * Signing is REAL everywhere (SECURITY BAR):
 * - every credential goes through vc-kit's SHACL-gated `issueCredential`
 *   (eddsa-rdfc-2022, fresh Ed25519 issuer keys, hosted Bitstring status
 *   lists — the full fail-closed verify chain passes against pod-served
 *   documents, exactly the wallet Mode-1 posture);
 * - operand anchors are emitted through the sm-26 seed tooling
 *   (`mintOperandAnchors`), fed either by the REAL native helper
 *   (`SparqSeedHelper`, when `SPARQ_CHECKOUT` points at a sparq checkout —
 *   this rail also dual-signs via `SparqCredentialSeedPipeline` and seeds
 *   the borrower-only witness) or by the fail-closed captured-encodings
 *   bridge (genuine `encode_int_literal` outputs with provenance; anything
 *   uncaptured or requiring a signature is refused, never fabricated).
 */

import { Buffer } from "node:buffer";
import type {
  MortgageCredentialIssuance,
  MortgageIssuanceContext,
  ScriptedCredentialSeed,
  SeededAnchorResource,
  SeededCredentialGroup,
} from "@mortgage/solid-kit/mortgage-seed";
import {
  anchorValidity,
  capturedOperandBridge,
  MORTGAGE_SCHNORR_ISSUER_SEEDS,
  MORTGAGE_SEED_ISSUER_ROLES,
  type MortgageSeedIssuerRole,
  normalizedPodBase,
} from "@mortgage/solid-kit/mortgage-seed";
import {
  type CredentialClaims,
  exportPrivateJwk,
  generateKeyPairForSuite,
  type IssuedCredential,
  issueCredential,
  type KeyPair,
  MIN_STATUS_LIST_LENGTH,
  publishVerificationMethod,
  StatusListClient,
} from "@mortgage/vc-kit";
import {
  mintOperandAnchors,
  SparqCredentialSeedPipeline,
  type SparqNativeBridge,
  SparqSeedHelper,
} from "@mortgage/vc-kit/seed-tooling";

const DAY_MS = 24 * 60 * 60 * 1000;

/** In-memory GET/PUT host so signed status-list bodies can be captured as
 * seed fixtures (the wallet Mode-1 pattern — the pod resources are written
 * by solid-seed afterwards, in one manifest-tracked pass). */
function memoryResourceStore(): {
  fetch: typeof fetch;
  body(url: string): { body: string; contentType: string };
} {
  const resources = new Map<string, { body: string; contentType: string; version: number }>();
  const memoryFetch: typeof fetch = async (input, init) => {
    const request = new Request(input instanceof Request ? input : String(input), init);
    const key = new URL(request.url).href;
    const existing = resources.get(key);
    if (request.method === "PUT") {
      if (request.headers.get("if-none-match") === "*" && existing !== undefined) {
        return new Response(null, { status: 412 });
      }
      const ifMatch = request.headers.get("if-match");
      if (ifMatch !== null && `"v${existing?.version ?? 0}"` !== ifMatch) {
        return new Response(null, { status: 412 });
      }
      const body = await request.text();
      resources.set(key, {
        body,
        contentType: request.headers.get("content-type") ?? "application/octet-stream",
        version: (existing?.version ?? 0) + 1,
      });
      return new Response(null, { status: existing === undefined ? 201 : 204 });
    }
    if (existing === undefined) return new Response("not found", { status: 404 });
    return new Response(existing.body, {
      status: 200,
      headers: { "content-type": existing.contentType, etag: `"v${existing.version}"` },
    });
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

interface SeedIssuer {
  readonly iri: string;
  readonly key: KeyPair;
  readonly status: StatusListClient;
  readonly docPath: string;
  readonly docBody: string;
  readonly statusPath: string;
  readonly finishStatusFixture: () => { path: string; body: string; contentType: string };
}

export interface CreateMortgageIssuanceOptions {
  /**
   * Pod BASE URL hosting the issuer documents + status lists — a bare origin
   * or an origin + storage-root path (`https://host/alex/`); any path is
   * PRESERVED in the issuer IRIs.
   */
  readonly podOrigin: string;
  /** The demo reference instant (drives status-list windows). */
  readonly now: Date;
  /**
   * The sm-26 native bridge. Default: {@link capturedOperandBridge} (genuine
   * captured encodings, no signatures — anchors only). Pass a real
   * `SparqSeedHelper` (see {@link nativeBridgeFromEnv}) to also dual-sign
   * and seed the borrower-only ZK witnesses.
   */
  readonly native?: SparqNativeBridge;
  /** Whether `native` is the REAL helper (enables the dual-sign rail). */
  readonly nativeDualSign?: boolean;
}

/** The real sm-26 native helper when `SPARQ_CHECKOUT` names a checkout. */
export function nativeBridgeFromEnv():
  | { native: SparqNativeBridge; nativeDualSign: true }
  | undefined {
  const checkout = process.env.SPARQ_CHECKOUT;
  if (checkout === undefined || checkout === "") return undefined;
  return { native: new SparqSeedHelper({ sparqCheckout: checkout }), nativeDualSign: true };
}

/**
 * One provisioned seed issuer's identity material, exported so the sm-36
 * journey can hand the SAME issuer identity to the verifications app: the
 * scene-4 one-click re-issue re-signs the SEEDED credential, which only the
 * key that signed it can do. Keys are per-run ephemeral (never committed);
 * the export exists only inside the test-run process environment.
 */
export interface SeedIssuerExport {
  readonly role: MortgageSeedIssuerRole;
  /** The issuer identity IRI (the pod-hosted issuer document). */
  readonly iri: string;
  /** The verification-method IRI the issuer document publishes. */
  readonly verificationMethod: string;
  /** The pod-hosted Bitstring status list URL this issuer signs. */
  readonly statusListUrl: string;
  /** The private signing JWK, JSON-serialised (vc-kit `importKeyPair` input). */
  readonly privateJwkJson: string;
}

/** {@link createMortgageIssuance}'s full surface: issuance + issuer export. */
export type MortgageSeedIssuance = MortgageCredentialIssuance & {
  /** Export every issuer provisioned so far (call AFTER seeding). */
  exportSeedIssuers(): Promise<readonly SeedIssuerExport[]>;
};

/**
 * Build the vc-kit-backed issuance for one pod. Issuer keys are freshly
 * generated per seed run (honest for per-suite/per-boot demo pods — no
 * cross-run issuer identity exists, and no private key is ever committed).
 */
export function createMortgageIssuance(
  options: CreateMortgageIssuanceOptions,
): MortgageSeedIssuance {
  // Storage-root path preserved; trailing slash dropped so `${podRoot}${"/x"}`
  // joins cleanly with the pod-base-relative issuer paths.
  const podRoot = normalizedPodBase(options.podOrigin).slice(0, -1);
  const native = options.native ?? capturedOperandBridge();
  const dualSign = options.nativeDualSign === true;
  const issuers = new Map<MortgageSeedIssuerRole, Promise<SeedIssuer>>();

  async function provisionIssuer(role: MortgageSeedIssuerRole): Promise<SeedIssuer> {
    const definition = MORTGAGE_SEED_ISSUER_ROLES[role];
    const iri = `${podRoot}${definition.docPath}`;
    const key = await generateKeyPairForSuite(`${iri}#key-1`, "Ed25519");
    const published = await publishVerificationMethod({ controller: iri, key });
    const store = memoryResourceStore();
    const statusUrl = `${podRoot}${definition.statusPath}`;
    const status = new StatusListClient({ url: statusUrl, issuer: iri, key, fetch: store.fetch });
    await status.create({
      now: options.now,
      validUntil: new Date(options.now.getTime() + 180 * DAY_MS),
      bits: Buffer.alloc(MIN_STATUS_LIST_LENGTH / 8),
    });
    return {
      iri,
      key,
      status,
      docPath: definition.docPath,
      docBody: published.turtle,
      statusPath: definition.statusPath,
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

  function issuerFor(role: MortgageSeedIssuerRole): Promise<SeedIssuer> {
    let issuer = issuers.get(role);
    if (issuer === undefined) {
      issuer = provisionIssuer(role);
      issuers.set(role, issuer);
    }
    return issuer;
  }

  async function issueViaPipeline(
    spec: ScriptedCredentialSeed,
    context: MortgageIssuanceContext,
    issuer: SeedIssuer,
  ): Promise<SeededCredentialGroup> {
    const anchor = spec.anchor;
    if (anchor === undefined) throw new Error(`pipeline rail requires an anchor spec (${spec.id})`);
    const schnorrIssuerSeed = MORTGAGE_SCHNORR_ISSUER_SEEDS[spec.issuerRole];
    if (schnorrIssuerSeed === undefined) {
      throw new Error(`no demo Schnorr issuer seed for role ${spec.issuerRole}`);
    }
    const pipeline = new SparqCredentialSeedPipeline({
      issuer: issuer.iri,
      key: issuer.key,
      schnorrIssuerSeed,
      native,
    });
    // No cast: the solid-kit override layer must stay STRUCTURALLY assignable
    // to vc-kit's typed claims — drift is a compile error here.
    const claims: CredentialClaims = spec.claims;
    const issued = await pipeline.issue({
      kind: spec.kind,
      credentialId: context.resolve(spec.path),
      subjectWebid: context.webid,
      claims,
      validFrom: spec.validFrom,
      validUntil: spec.validUntil,
      status: issuer.status.entry(spec.statusIndex),
      hiddenFields: [anchor.field],
      anchorIdFor: () => context.resolve(anchor.path),
      anchorStatusFor: () => issuer.status.entry(anchor.statusIndex),
      zkStatus: anchor.zkStatus,
    });
    const anchors: SeededAnchorResource[] = issued.anchors.map((minted) => ({
      path: anchor.path,
      field: minted.field,
      operandEnc: minted.operandEnc,
      body: minted.vc,
      contentType: minted.contentType,
    }));
    if (issued.witness === undefined || issued.witnessContentType === undefined) {
      throw new Error(`native dual-sign returned no witness for ${spec.id}`);
    }
    return {
      vc: { body: issued.vc, contentType: issued.vcContentType },
      anchors,
      witness: {
        path: anchor.witnessPath,
        body: issued.witness,
        contentType: issued.witnessContentType,
      },
    };
  }

  async function issueCaptured(
    spec: ScriptedCredentialSeed,
    context: MortgageIssuanceContext,
    issuer: SeedIssuer,
  ): Promise<SeededCredentialGroup> {
    const claims: CredentialClaims = spec.claims;
    const credential: IssuedCredential = await issueCredential({
      kind: spec.kind,
      credentialId: context.resolve(spec.path),
      issuer: issuer.iri,
      subject: context.webid,
      claims,
      validity: { validFrom: spec.validFrom, validUntil: spec.validUntil },
      status: issuer.status.entry(spec.statusIndex),
      key: issuer.key,
    });
    let anchors: SeededAnchorResource[] = [];
    const anchor = spec.anchor;
    if (anchor !== undefined) {
      // sm-26 operand-anchor emission: budget-gated, typed-accessor read of
      // the EXACT wrapper-emitted literal, encoding from the native seam.
      const minted = await mintOperandAnchors({
        credential,
        hiddenFields: [anchor.field],
        subject: context.webid,
        issuer: issuer.iri,
        anchorIdFor: () => context.resolve(anchor.path),
        statusFor: () => issuer.status.entry(anchor.statusIndex),
        // The wallet Mode-1 anchor window (−1d/+14d from the seed instant).
        validity: anchorValidity(options.now),
        key: issuer.key,
        native,
      });
      anchors = minted.map((entry) => ({
        path: anchor.path,
        field: entry.field,
        operandEnc: entry.operandEnc,
        body: entry.credential.body,
        contentType: entry.credential.contentType,
      }));
    }
    return { vc: { body: credential.body, contentType: credential.contentType }, anchors };
  }

  return {
    async issue(spec, context) {
      const issuer = await issuerFor(spec.issuerRole);
      if (dualSign && spec.anchor !== undefined) {
        return issueViaPipeline(spec, context, issuer);
      }
      return issueCaptured(spec, context, issuer);
    },
    async issuerResources() {
      const provisioned = await Promise.all([...issuers.values()]);
      if (provisioned.length === 0) {
        throw new Error("no issuer was provisioned — issue() must run before issuerResources()");
      }
      return provisioned.flatMap((issuer) => [
        { path: issuer.docPath, body: issuer.docBody, contentType: "text/turtle" },
        issuer.finishStatusFixture(),
      ]);
    },
    async exportSeedIssuers() {
      return Promise.all(
        [...issuers.entries()].map(async ([role, pending]) => {
          const issuer = await pending;
          return {
            role,
            iri: issuer.iri,
            verificationMethod: issuer.key.verificationMethod,
            statusListUrl: `${podRoot}${issuer.statusPath}`,
            privateJwkJson: JSON.stringify(await exportPrivateJwk(issuer.key)),
          };
        }),
      );
    },
  };
}
