/**
 * Browser-safe auth surface of @mortgage/solid-kit (`@mortgage/solid-kit/auth`):
 * the real Solid-OIDC client, the Mode-1 simulated login, and Client Identifier
 * Document helpers. Server-side API verification lives on `./auth/api` (server-only);
 * the dev issuer + storage test doubles live on `./testing`.
 */
export {
  type AuthClient,
  type CreateAuthClientOptions,
  createAuthClient,
} from "./client.js";
export {
  type ClientIdDocumentOptions,
  clientIdDocument,
  clientIdDocumentResponse,
  SOLID_OIDC_CONTEXT,
  type SolidClientIdDocument,
} from "./client-id.js";
export {
  type DemoLoginOptions,
  type DemoSession,
  demoLogin,
  SIMULATED_LOGIN_DISCLOSURE,
  type SimulatedLoginDisclosure,
} from "./demo.js";
export type {
  AuthSession,
  LoginResult,
  RealAuthSession,
  RestoreOutcome,
  SimulatedAuthSession,
} from "./types.js";
