/**
 * sm-65 — seed one borrower pod with the full scripted-persona mortgage
 * layout through `@jeswr/solid-seed`. This is the ONE seeding path all three
 * consumption points share (seeder-design §4.3):
 *
 * - dev server: `scripts/dev-pod.ts` boots a harness account and calls this
 *   with `mode: "create"` (fresh in-memory pod per boot);
 * - e2e global-setup: `e2e/support/global-setup.ts` does the same once per
 *   Playwright run and exports the pod origin/WebID to the suites;
 * - Mode-1 in-browser pod: the wallet worker consumes the SAME override layer
 *   (`./overrides`) through its fixture-based boot path (`seedFixtures` on
 *   `createBrowserPod` — the browser pod is seeded at construction, before
 *   any fetch interface exists for solid-seed to write through).
 *
 * The injected {@link MortgageCredentialIssuance} carries the vc-kit signing
 * (see layout.ts for why it is injected).
 */

import { type SeedManifest, type SeedTarget, seedPods } from "@jeswr/solid-seed";
import {
  PERSONA_VALUES,
  type Persona,
  type PersonaId,
  type PersonaValues,
  personas,
} from "@mortgage/data-model";
import {
  type MortgageCredentialIssuance,
  type MortgagePodLayoutOptions,
  mortgagePodLayout,
} from "./layout.js";
import { type ScriptedCredentialSeed, scriptedCredentialSeeds } from "./overrides.js";

export interface SeedMortgagePodOptions {
  /** The live pod (harness account or any Fetch-compatible target). */
  readonly target: SeedTarget;
  readonly issuance: MortgageCredentialIssuance;
  /** The demo reference instant — REQUIRED, never ambient (decision 0012). */
  readonly now: Date;
  /** Scripted persona to seed. Default: the primary borrower. */
  readonly personaId?: PersonaId;
  /** Deterministic variation seed for the persona fixtures. */
  readonly seed?: string;
  /**
   * Write mode (solid-seed semantics): `create` strict-creates (e2e default —
   * a doubly seeded pod is a harness bug), `ensure` converges a long-lived
   * dev pod, `replace` deterministically rewrites.
   */
  readonly mode?: "create" | "ensure" | "replace";
  readonly documents?: MortgagePodLayoutOptions["documents"];
  readonly profileCard?: boolean;
}

export interface SeededMortgagePod {
  readonly manifest: SeedManifest;
  readonly persona: Persona;
  readonly credentials: readonly ScriptedCredentialSeed[];
  readonly webid: string;
  readonly baseUrl: string;
}

/** Build the persona for a pod origin and seed the full mortgage layout. */
export async function seedMortgagePod(options: SeedMortgagePodOptions): Promise<SeededMortgagePod> {
  const personaId = options.personaId ?? "alex-rivera";
  const podBase = `${new URL(options.target.baseUrl).origin}/`;
  const built = await personas({
    now: options.now,
    ...(options.seed === undefined ? {} : { seed: options.seed }),
    podBases: { [personaId]: podBase },
    webIds: { [personaId]: options.target.webid },
  });
  const persona = built.find((candidate) => candidate.id === personaId);
  if (persona === undefined) {
    throw new Error(`sm-20 persona fixtures are missing ${personaId}`);
  }
  const credentials = scriptedCredentialSeedsFor(personaId, options.now);
  const layout = mortgagePodLayout(options.target, {
    persona,
    credentials,
    issuance: options.issuance,
    ...(options.documents === undefined ? {} : { documents: options.documents }),
    ...(options.profileCard === undefined ? {} : { profileCard: options.profileCard }),
  });
  const manifest = await seedPods({ layout, mode: options.mode ?? "create" });
  return {
    manifest,
    persona,
    credentials,
    webid: options.target.webid,
    baseUrl: options.target.baseUrl,
  };
}

/** The scripted credential seeds for a persona id (values from sm-20). */
export function scriptedCredentialSeedsFor(
  personaId: PersonaId,
  now: Date,
): readonly ScriptedCredentialSeed[] {
  return scriptedCredentialSeeds(personaValuesFor(personaId), now);
}

function personaValuesFor(personaId: PersonaId): PersonaValues {
  const values = PERSONA_VALUES.find((candidate) => candidate.id === personaId);
  if (values === undefined) {
    throw new Error(`sm-20 persona values are missing ${personaId}`);
  }
  return values;
}
