/**
 * sm-65 — the mort pod-LAYOUT module (seeder-design §5.3): maps the scripted
 * persona to the SPEC §3 pod paths as a `@jeswr/solid-seed` `PodLayout`.
 * Every credential is one solid-seed EXPANDER GROUP — one issuance call
 * materialises the VC, its operand-anchor VC and (native rail only) the
 * borrower-only witness, so the outputs stay mutually consistent and a
 * partially-seeded group is a loud error, never a silent mix (§4.2).
 *
 * The ISSUANCE itself is injected ({@link MortgageCredentialIssuance}) — the
 * implementations live beside the callers that can depend on
 * `@mortgage/vc-kit` (e2e/support, scripts, the wallet worker); solid-kit
 * cannot (vc-kit's test rig dev-depends on solid-kit; a dependency edge back
 * would cycle the turbo task graph). Signing is REAL in every implementation:
 * vc-kit's SHACL-gated `issueCredential` (eddsa-rdfc-2022) and the sm-26
 * seed tooling for anchors/dual-sign — never stubbed.
 */

import type {
  AccessSpec,
  PodLayout,
  ResourceExpander,
  ResourceSpec,
  SeedTarget,
} from "@jeswr/solid-seed";
import type { Persona, PersonaResourceKind } from "@mortgage/data-model";
import { profileCardFixture, type ResourceFixture } from "../seed.js";
import type { ScriptedCredentialSeed } from "./overrides.js";

// ── Affirmative least-privilege access (every seeded resource carries an ──
// EXPLICIT solid-seed `AccessSpec`, so the written `.acl` never inherits the
// serving host's default posture — a WAC/OIDC Mode-2 host must not be able to
// expose the borrower-only ZK witness). solid-seed authors each ACL through
// the typed @solid/object wrappers and ALWAYS grants the pod owner
// read/write/control; these constants only decide who ELSE may read.

/** Borrower-private: owner agent read/write/control only. */
export const MORTGAGE_OWNER_ONLY_ACCESS: AccessSpec = { publicRead: false };

/**
 * World-readable (plus full owner control): issuer identity documents and
 * status lists, which external verifiers must dereference anonymously.
 */
export const MORTGAGE_PUBLIC_READ_ACCESS: AccessSpec = { publicRead: true };

/**
 * Bridge a pre-authored {@link ResourceFixture} to a solid-seed `ResourceSpec`
 * WITHOUT dropping its access posture: `publicRead` maps onto solid-seed's
 * `access` field, explicitly `false` when absent — a fixture is private
 * unless it opts in.
 */
export function fixtureResourceSpec(fixture: ResourceFixture): ResourceSpec {
  return {
    path: fixture.path,
    source: { body: fixture.body },
    ...(fixture.contentType === undefined ? {} : { contentType: fixture.contentType }),
    access: { publicRead: fixture.publicRead === true },
  };
}

/**
 * Normalize a pod base URL: PRESERVE any storage-root path (pods are not
 * always origin-rooted — `https://host/alex/` is a valid pod base) and end
 * with exactly one trailing slash.
 */
export function normalizedPodBase(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") {
    throw new Error(`pod base URL must not carry credentials, a query, or a fragment: ${baseUrl}`);
  }
  url.pathname = url.pathname.replace(/\/*$/, "/");
  return url.href;
}

/** One issued pod resource body (a `{ body }` solid-seed `DataSource`). */
export interface SeedResourceBody {
  readonly body: string;
  readonly contentType: string;
}

/** A seeded operand anchor: the signed VC plus its emission metadata. */
export interface SeededAnchorResource extends SeedResourceBody {
  readonly path: string;
  readonly field: string;
  /** The sm-26-emitted operand encoding bound into the anchor VC. */
  readonly operandEnc: string;
}

/** Everything one scripted-credential issuance materialises (one group). */
export interface SeededCredentialGroup {
  readonly vc: SeedResourceBody;
  readonly anchors: readonly SeededAnchorResource[];
  /** Borrower-only native dual-sign witness (native rail only). */
  readonly witness?: SeedResourceBody & { readonly path: string };
}

export interface MortgageIssuanceContext {
  readonly webid: string;
  /** Absolute resource IRI for a pod-BASE-relative path (base path preserved). */
  resolve(path: string): string;
}

/**
 * The injected issuance seam (see the module header). `issuerResources` is
 * called AFTER every `issue()` (solid-seed materialises expanders in entry
 * order), so status lists are final when the issuer fixtures are collected.
 */
export interface MortgageCredentialIssuance {
  issue(
    spec: ScriptedCredentialSeed,
    context: MortgageIssuanceContext,
  ): Promise<SeededCredentialGroup>;
  /** Issuer identity documents + status lists (pod-hosted, pod-relative paths). */
  issuerResources(
    context: MortgageIssuanceContext,
  ): Promise<readonly ({ readonly path: string } & SeedResourceBody)[]>;
}

/** The four non-credential persona documents the wallet Mode-1 seed ships. */
export const MORTGAGE_DOCUMENT_KINDS: readonly PersonaResourceKind[] = [
  "borrower-profile",
  "loan-application",
  "underwriting-decision",
  "closing-record",
];

export interface MortgagePodLayoutOptions {
  /** The sm-20 persona built for this pod (podBase/webId already aligned). */
  readonly persona: Persona;
  readonly credentials: readonly ScriptedCredentialSeed[];
  readonly issuance: MortgageCredentialIssuance;
  /**
   * Persona document kinds to seed beside the credentials. Defaults to
   * {@link MORTGAGE_DOCUMENT_KINDS} (the wallet Mode-1 set).
   */
  readonly documents?: readonly PersonaResourceKind[];
  /**
   * Seed the WebID profile card (`foaf:name` + `pim:storage`). Default: only
   * when the WebID lives on the pod origin (OIDC-mode identities live at
   * their dev issuer and cannot be seeded here).
   */
  readonly profileCard?: boolean;
}

function credentialExpander(
  spec: ScriptedCredentialSeed,
  issuance: MortgageCredentialIssuance,
  podPath: (path: string) => string,
): ResourceExpander {
  return async (context): Promise<readonly ResourceSpec[]> => {
    const issued = await issuance.issue(spec, {
      webid: context.webid,
      resolve: (path) => context.resolve(podPath(path)),
    });
    const anchors = spec.anchor === undefined ? [] : issued.anchors;
    if (spec.anchor !== undefined) {
      const emitted = issued.anchors.find((anchor) => anchor.field === spec.anchor?.field);
      if (emitted === undefined) {
        throw new Error(
          `issuance for ${spec.id} returned no operand anchor for ${spec.anchor.field}`,
        );
      }
      // Drift gate: the sm-26-emitted encoding must be the CAPTURED genuine
      // encoding of the pinned value the other apps compare against.
      if (emitted.operandEnc !== spec.anchor.operandEnc) {
        throw new Error(
          `operand encoding drift for ${spec.anchor.field}: issuance emitted ` +
            `${emitted.operandEnc} but the captured canon pins ${spec.anchor.operandEnc}`,
        );
      }
    }
    return [
      {
        path: podPath(spec.path),
        source: { body: issued.vc.body },
        contentType: issued.vc.contentType,
        access: MORTGAGE_OWNER_ONLY_ACCESS,
      },
      ...anchors.map((anchor) => ({
        path: podPath(anchor.path),
        source: { body: anchor.body },
        contentType: anchor.contentType,
        access: MORTGAGE_OWNER_ONLY_ACCESS,
      })),
      ...(issued.witness === undefined
        ? []
        : [
            {
              path: podPath(issued.witness.path),
              source: { body: issued.witness.body },
              contentType: issued.witness.contentType,
              // The borrower-only ZK witness is the MOST private resource in
              // the pod: owner-only, affirmatively.
              access: MORTGAGE_OWNER_ONLY_ACCESS,
            },
          ]),
    ];
  };
}

/**
 * Build the borrower-pod layout for one seed target: WebID profile card,
 * the persona documents, one expander group per scripted credential, and a
 * final expander for the issuer identity documents + status lists.
 */
export function mortgagePodLayout(
  target: SeedTarget,
  options: MortgagePodLayoutOptions,
): PodLayout {
  const podBase = normalizedPodBase(target.baseUrl);
  const baseUrl = new URL(podBase);
  const origin = baseUrl.origin;
  // solid-seed resolves resource paths against the pod ORIGIN (its
  // `SeedTarget.baseUrl` must be an origin), so pod-BASE-relative paths are
  // prefixed with the base's pathname here and solid-seed receives the
  // origin-rooted target — the storage-root path is never discarded.
  const pathPrefix = baseUrl.pathname === "/" ? "" : baseUrl.pathname.slice(0, -1);
  const podPath = (path: string): string => `${pathPrefix}${path}`;
  const webidUrl = new URL(target.webid);
  const resources: (ResourceSpec | ResourceExpander)[] = [];

  const wantsCard = options.profileCard ?? webidUrl.origin === origin;
  if (wantsCard) {
    if (webidUrl.origin !== origin) {
      throw new Error(
        `profileCard: WebID ${target.webid} is not on the pod origin ${origin} — ` +
          "its profile document cannot be seeded here",
      );
    }
    const card = profileCardFixture({
      webid: target.webid,
      name: options.persona.displayName,
      storage: podBase,
      // The WebID's own pathname is already origin-rooted — no prefixing.
      path: webidUrl.pathname,
      publicRead: false,
    });
    resources.push(fixtureResourceSpec(card));
  }

  const kinds = options.documents ?? MORTGAGE_DOCUMENT_KINDS;
  for (const kind of kinds) {
    const resource = options.persona.resources.find((candidate) => candidate.kind === kind);
    if (resource === undefined) {
      throw new Error(`persona ${options.persona.id} has no ${kind} resource to seed`);
    }
    resources.push({
      path: podPath(resource.path),
      source: { body: resource.turtle },
      access: MORTGAGE_OWNER_ONLY_ACCESS,
    });
  }

  for (const spec of options.credentials) {
    resources.push(credentialExpander(spec, options.issuance, podPath));
  }

  resources.push(async (context): Promise<readonly ResourceSpec[]> => {
    const issuerResources = await options.issuance.issuerResources({
      webid: context.webid,
      resolve: (path) => context.resolve(podPath(path)),
    });
    if (issuerResources.length === 0) {
      throw new Error("issuance returned no issuer resources — verification would fail closed");
    }
    return issuerResources.map((resource) => ({
      path: podPath(resource.path),
      source: { body: resource.body },
      contentType: resource.contentType,
      access: MORTGAGE_PUBLIC_READ_ACCESS,
    }));
  });

  return { pods: [{ account: { target: { ...target, baseUrl: origin } }, resources }] };
}
