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

import type { PodLayout, ResourceExpander, ResourceSpec, SeedTarget } from "@jeswr/solid-seed";
import type { Persona, PersonaResourceKind } from "@mortgage/data-model";
import { profileCardFixture } from "../seed.js";
import type { ScriptedCredentialSeed } from "./overrides.js";

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
  /** Absolute resource IRI for a pod-root-relative path. */
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
): ResourceExpander {
  return async (context): Promise<readonly ResourceSpec[]> => {
    const issued = await issuance.issue(spec, {
      webid: context.webid,
      resolve: context.resolve,
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
        path: spec.path,
        source: { body: issued.vc.body },
        contentType: issued.vc.contentType,
      },
      ...anchors.map((anchor) => ({
        path: anchor.path,
        source: { body: anchor.body },
        contentType: anchor.contentType,
      })),
      ...(issued.witness === undefined
        ? []
        : [
            {
              path: issued.witness.path,
              source: { body: issued.witness.body },
              contentType: issued.witness.contentType,
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
  const origin = new URL(target.baseUrl).origin;
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
      storage: `${origin}/`,
      path: webidUrl.pathname,
      publicRead: false,
    });
    resources.push({ path: card.path, source: { body: card.body } });
  }

  const kinds = options.documents ?? MORTGAGE_DOCUMENT_KINDS;
  for (const kind of kinds) {
    const resource = options.persona.resources.find((candidate) => candidate.kind === kind);
    if (resource === undefined) {
      throw new Error(`persona ${options.persona.id} has no ${kind} resource to seed`);
    }
    resources.push({ path: resource.path, source: { body: resource.turtle } });
  }

  for (const spec of options.credentials) {
    resources.push(credentialExpander(spec, options.issuance));
  }

  resources.push(async (context): Promise<readonly ResourceSpec[]> => {
    const issuerResources = await options.issuance.issuerResources({
      webid: context.webid,
      resolve: context.resolve,
    });
    if (issuerResources.length === 0) {
      throw new Error("issuance returned no issuer resources — verification would fail closed");
    }
    return issuerResources.map((resource) => ({
      path: resource.path,
      source: { body: resource.body },
      contentType: resource.contentType,
    }));
  });

  return { pods: [{ account: { target }, resources }] };
}
