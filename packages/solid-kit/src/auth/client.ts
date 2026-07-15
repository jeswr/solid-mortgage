/**
 * The REAL browser auth client (sm-22): `@jeswr/solid-auth-core`'s keystone engine
 * (WebID-first issuer discovery, DPoP authorization-code login, silent restore via
 * `@jeswr/solid-session-restore`, fail-closed allowed-origin credential boundary) exposed
 * through the kit-standard {@link AuthSession} shape, with `authFetch` wrapped in the
 * `@jeswr/guarded-fetch` SSRF guard.
 *
 * The issuer is CONFIGURABLE by construction: `login(webId)` resolves the issuer from the
 * WebID profile (`solid:oidcIssuer`), so pointing the client at the test harness's dev
 * issuer (see `dev-issuer.ts` + `allowInsecureLoopback`) or a real hosted issuer (Mode 2b,
 * decision 0011) is a data change, not a code change.
 */
import { createGuardedFetch, type GuardOptions, refuseRedirects } from "@jeswr/guarded-fetch";
import { createSolidAuth, type SolidAuth, type SolidAuthConfig } from "@jeswr/solid-auth-core";
import type { RealAuthSession } from "./types.js";

/**
 * Pod documents legitimately exceed guarded-fetch's 1 MiB default (scanned statements,
 * VC bundles), so the kit default is roomier; override via {@link CreateAuthClientOptions.guard}.
 */
const DEFAULT_POD_MAX_BYTES = 32 * 1024 * 1024;

/**
 * Options for {@link createAuthClient} — the full engine configuration (see
 * `@jeswr/solid-auth-core`'s `SolidAuthConfig` for every seam: `callbackUri`, static
 * `clientId` per the solid-client-id pattern, `authFlow`, `store`, `allowedOrigins`,
 * `allowInsecureLoopback`, …) plus the kit's guard control.
 */
export interface CreateAuthClientOptions extends SolidAuthConfig {
  /**
   * `@jeswr/guarded-fetch` policy for {@link AuthClient.authFetch}. Merged over the kit
   * defaults (`allowLoopback` follows `allowInsecureLoopback`; `maxBytes` raised for pod
   * documents). Pass `false` to skip the guard entirely (e.g. a service-worker pod runtime
   * whose fetch never leaves the page) — prefer keeping it on.
   */
  guard?: GuardOptions | false;
}

/**
 * The client {@link createAuthClient} returns: the kit-standard session shape
 * ({@link RealAuthSession}) PLUS the full engine surface (`handleRedirect`,
 * `beginRedirectLogin`, `dropLiveSession`, `reArmAllowedOrigins`, `recentAccounts`, …)
 * for apps that need it.
 */
export interface AuthClient extends SolidAuth, RealAuthSession {
  readonly simulated: false;
  /**
   * {@link SolidAuth.authenticatedFetch} behind the SSRF guard — the fetch apps should
   * use for pod/API IO. Reads the LIVE session on every call, so a later login/restore
   * is reflected without re-wiring.
   */
  readonly authFetch: typeof fetch;
}

/**
 * Build the kit's real Solid auth client. All engine semantics (pristine-fetch capture,
 * fail-closed restore, credential boundary) are `@jeswr/solid-auth-core`'s; this wrapper
 * adds only the kit session shape and the guarded `authFetch`.
 */
export function createAuthClient(options: CreateAuthClientOptions): AuthClient {
  const { guard, ...config } = options;
  const auth = createSolidAuth(config);

  // Delegate per-request so the guard always sees the CURRENT session's fetch (the
  // engine swaps `authenticatedFetch` across login/restore/logout).
  const liveAuthenticatedFetch: typeof fetch = (input, init) =>
    auth.authenticatedFetch(input, init);
  // Credentialed fetches REFUSE redirects (suite posture; roborev sm-22 High): following
  // a 3xx re-enters the engine, which would re-attach a fresh DPoP credential on an
  // allowed-origin hop — silent credentialed cross-origin forwarding, including 307/308
  // body forwards. A refused redirect surfaces as RedirectRefusedError for the caller.
  const redirectSafeFetch = refuseRedirects(liveAuthenticatedFetch);
  const authFetch: typeof fetch =
    guard === false
      ? redirectSafeFetch
      : createGuardedFetch({
          allowLoopback: config.allowInsecureLoopback === true,
          maxBytes: DEFAULT_POD_MAX_BYTES,
          ...guard,
          fetch: redirectSafeFetch,
        });

  // A facade with FORWARDING GETTERS — spreading `auth` would freeze its live
  // `webId`/`issuer`/`authenticatedFetch` getters at construction-time values.
  return {
    simulated: false as const,
    authFetch,
    get webId() {
      return auth.webId;
    },
    get issuer() {
      return auth.issuer;
    },
    get publicFetch() {
      return auth.publicFetch;
    },
    get authenticatedFetch() {
      return auth.authenticatedFetch;
    },
    recentAccounts: () => auth.recentAccounts(),
    rememberAccount: (webId, displayName, avatarUrl) =>
      auth.rememberAccount(webId, displayName, avatarUrl),
    restore: () => auth.restore(),
    login: (webId) => auth.login(webId),
    logout: () => auth.logout(),
    dropLiveSession: () => auth.dropLiveSession(),
    dropSession: () => auth.dropLiveSession(),
    reArmAllowedOrigins: (origins) => auth.reArmAllowedOrigins(origins),
    onSessionChange: (listener) => auth.onSessionChange(listener),
    handleRedirect: (currentUrl) => auth.handleRedirect(currentUrl),
    beginRedirectLogin: (redirectOptions) => auth.beginRedirectLogin(redirectOptions),
    completeRedirectLogin: (callbackUrl) => auth.completeRedirectLogin(callbackUrl),
    hasPendingRedirect: () => auth.hasPendingRedirect(),
  };
}
