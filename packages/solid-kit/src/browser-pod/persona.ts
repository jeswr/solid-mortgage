/**
 * Adapter from the sm-20 persona fixtures (`@mortgage/data-model`'s `personas()`) to the
 * sm-4 seeder's `ResourceFixture` shape, for seeding the Mode-1 in-browser borrower pod
 * (sm-23). The persona type here is STRUCTURAL — solid-kit consumes the data-model
 * contract without depending on the package, so the worker bundle only carries the
 * pre-serialized Turtle it actually seeds.
 */
import { profileCardFixture, type ResourceFixture } from "../seed.js";

/** One pre-serialized persona pod resource (matches `PersonaResource` structurally). */
export interface SeedablePersonaResource {
  /** Pod-root-relative path (starts with `/`). */
  path: string;
  /** Shape-validated, deterministic Turtle (the data-model layer's output). */
  turtle: string;
}

/** The slice of `@mortgage/data-model`'s `Persona` the seeder needs. */
export interface SeedablePersona {
  webId: string;
  /** Pod base IRI with trailing slash, e.g. `https://alex.pod.example/`. */
  podBase: string;
  displayName: string;
  resources: readonly SeedablePersonaResource[];
}

/** The pod host origin for a persona (`createBrowserPod`'s `podBaseUrl`). */
export function personaPodOrigin(persona: Pick<SeedablePersona, "podBase">): string {
  return new URL(persona.podBase).origin;
}

export interface PersonaSeedOptions {
  /**
   * Also seed the WebID profile document (`foaf:name` + `pim:storage`) at the WebID's own
   * path, so the persona's WebID dereferences inside its pod. Default true; requires the
   * WebID to live on the pod origin.
   */
  profileCard?: boolean;
  /**
   * Attach public-read WAC ACLs to every seeded resource. Default false: the Mode-1 pod is
   * fixed-owner and single-visitor — no anonymous reader exists (unlike the Mode-2a org
   * pods, whose public-read ACLs keep WAC evaluation real).
   */
  publicRead?: boolean;
}

/**
 * Map a persona to seeder fixtures: the WebID profile card plus every pre-serialized pod
 * resource (Alex Rivera's nine mortgage documents, when fed the sm-20 primary persona).
 */
export function personaSeedFixtures(
  persona: SeedablePersona,
  options: PersonaSeedOptions = {},
): ResourceFixture[] {
  const publicRead = options.publicRead ?? false;
  const origin = personaPodOrigin(persona);
  const fixtures: ResourceFixture[] = [];
  if (options.profileCard ?? true) {
    const webIdUrl = new URL(persona.webId);
    if (webIdUrl.origin !== origin) {
      throw new Error(
        `personaSeedFixtures: WebID ${persona.webId} is not on the pod origin ${origin} — ` +
          "its profile document cannot be seeded here; pass profileCard: false",
      );
    }
    fixtures.push(
      profileCardFixture({
        webid: persona.webId,
        name: persona.displayName,
        storage: persona.podBase,
        path: webIdUrl.pathname,
        publicRead,
      }),
    );
  }
  for (const resource of persona.resources) {
    fixtures.push({ path: resource.path, body: resource.turtle, publicRead });
  }
  return fixtures;
}
