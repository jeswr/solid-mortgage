/**
 * Test-only surface of @mortgage/solid-kit (`@mortgage/solid-kit/testing`): the dev/test
 * Solid-server harness and pod seeding. Kept off the package root so app bundles importing
 * the runtime kit never pull the server, jose, or port-probing machinery.
 */
export {
  type SolidServerImplementation,
  type SolidTestAccount,
  type SolidTestServer,
  type StartSolidServerOptions,
  sparqWasmServer,
  startSolidServer,
} from "./harness.js";
export {
  type ProfileCardFixtureOptions,
  profileCardFixture,
  publicReadAcl,
  type ResourceFixture,
  type SeedPodOptions,
  seedPod,
} from "./seed.js";
