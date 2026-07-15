/**
 * Mode-1 SIMULATED login (decision 0011): bind a demo persona's WebID to the
 * in-browser/harness pod WITHOUT real OIDC. The default visitor experience runs
 * per-visitor sparq-wasm pods where every request already acts as the pod owner, so
 * "login" is an honest persona binding — and decision 0011's honesty rule makes the
 * disclosure non-optional: a {@link demoLogin} session cannot be constructed without
 * acknowledging (at the type level AND at runtime) that the UI surfaces
 * {@link AuthSession.simulated}.
 */
import { createGuardedFetch, type GuardOptions, refuseRedirects } from "@jeswr/guarded-fetch";
import {
  computeAllowedOrigins,
  isOriginAllowed,
  sameWebId,
  validateWebId,
} from "@jeswr/solid-auth-core";
import type { LoginResult, RestoreOutcome, SimulatedAuthSession } from "./types.js";

/**
 * The exact acknowledgement {@link demoLogin} requires. Passing it is the caller's
 * assertion that the rendering UI displays the decision-0011 simulation disclosure —
 * there is no other value that type-checks, and the runtime check refuses anything else,
 * so a demo session is impossible to construct without acknowledging the flag.
 */
export const SIMULATED_LOGIN_DISCLOSURE =
  "this session is simulated and the UI displays the decision-0011 disclosure" as const;

/** The literal type of {@link SIMULATED_LOGIN_DISCLOSURE}. */
export type SimulatedLoginDisclosure = typeof SIMULATED_LOGIN_DISCLOSURE;

/** Options for {@link demoLogin}. */
export interface DemoLoginOptions {
  /** The demo persona's WebID (validated: https, or loopback http under the dev flag). */
  webId: string;
  /** The persona's pod origin/base (the in-browser or harness pod). */
  podBaseUrl: string;
  /**
   * The fetch reaching the pod: the harness account's fetch in tests, the
   * service-worker-backed fetch in the browser. Defaults to the global fetch (correct for
   * the fixed-owner in-browser pod, where every request already acts as the owner).
   */
  fetch?: typeof fetch;
  /** Permit `http:` for LOOPBACK hosts only (dev/test pods). Default false. */
  allowInsecureLoopback?: boolean;
  /**
   * Extra resource ORIGINS the injected (possibly owner-capable) fetch may serve, beyond
   * the pod's and the persona WebID's origins — the same fail-closed credential boundary
   * `createAuthClient` enforces. Requests outside the boundary fall back to the
   * credential-free global fetch, never the injected one.
   */
  allowedOrigins?: string[];
  /**
   * `@jeswr/guarded-fetch` policy for the session's `authFetch` (parity with
   * `createAuthClient`). Merged over the kit defaults; pass `false` to skip the guard
   * (e.g. a service-worker pod runtime with a virtual origin).
   */
  guard?: GuardOptions | false;
  /** MUST be {@link SIMULATED_LOGIN_DISCLOSURE} — see its doc. */
  acknowledgeSimulated: SimulatedLoginDisclosure;
}

/** The session {@link demoLogin} returns — `simulated` is the literal `true`. */
export interface DemoSession extends SimulatedAuthSession {
  readonly simulated: true;
  /** The pod origin/base this persona is bound to. */
  readonly podBaseUrl: string;
}

/** Mirror of the auth engine's demo-session pod-IO byte cap (see client.ts). */
const DEFAULT_POD_MAX_BYTES = 32 * 1024 * 1024;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Cleartext guard for the pod base: https, or loopback http under the dev flag. */
function validatePodBaseUrl(input: string, allowInsecureLoopback: boolean): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`demoLogin: podBaseUrl is not a valid URL: ${JSON.stringify(input)}`);
  }
  if (url.username !== "" || url.password !== "") {
    throw new Error("demoLogin: podBaseUrl must not carry userinfo credentials");
  }
  if (url.protocol === "https:") return url.href;
  if (
    url.protocol === "http:" &&
    allowInsecureLoopback &&
    LOOPBACK_HOSTS.has(url.host.replace(/:\d+$/, ""))
  ) {
    return url.href;
  }
  throw new Error(
    `demoLogin: podBaseUrl must be https (or loopback http under allowInsecureLoopback), got ${url.protocol}//${url.host}`,
  );
}

/**
 * Bind a demo persona to a pod as a SIMULATED session. Same session interface as
 * `createAuthClient` — plus the mandatory `simulated: true` flag the UI must surface.
 */
export function demoLogin(options: DemoLoginOptions): DemoSession {
  // Runtime enforcement of the honesty rule (the type alone can be cast away).
  if (options.acknowledgeSimulated !== SIMULATED_LOGIN_DISCLOSURE) {
    throw new Error(
      "demoLogin: refusing to create a simulated session without the decision-0011 " +
        "acknowledgement. Pass acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE and " +
        "surface session.simulated in the UI.",
    );
  }
  const allowInsecureLoopback = options.allowInsecureLoopback === true;
  const personaWebId = validateWebId(options.webId, allowInsecureLoopback);
  const podBaseUrl = validatePodBaseUrl(options.podBaseUrl, allowInsecureLoopback);
  const baseFetch = options.fetch ?? fetch;
  const publicFetch = fetch;
  // The injected fetch may carry OWNER authority (harness accounts; a future credentialed
  // Mode-1 variant), so it gets the SAME fail-closed origin boundary as a real session
  // (roborev sm-22): pod origin + persona WebID origin + explicit allowedOrigins, cleartext
  // guarded. Outside the boundary requests ride the credential-free global fetch.
  const allowedOrigins = computeAllowedOrigins({
    allowedOrigins: [podBaseUrl, ...(options.allowedOrigins ?? [])],
    webId: personaWebId,
    allowInsecureLoopback,
  });

  let boundWebId: string | null = personaWebId;
  const listeners = new Set<(session: { webId: string | null }) => void>();
  const emit = (): void => {
    for (const listener of listeners) {
      try {
        listener({ webId: boundWebId });
      } catch {
        // A throwing listener never disturbs the session (engine parity).
      }
    }
  };

  // Credentialed branch refuses redirects (parity with createAuthClient's authFetch).
  const credentialedFetch = refuseRedirects((input, init) => baseFetch(input, init));
  const boundaryFetch: typeof fetch = (input, init) => {
    let url: string;
    if (input instanceof Request) {
      url = input.url;
    } else {
      try {
        // Pod-relative convenience: bare paths resolve against the pod base.
        url = new URL(String(input), podBaseUrl).toString();
      } catch {
        return publicFetch(input, init); // fail-closed: never the credentialed fetch
      }
    }
    return isOriginAllowed(allowedOrigins, url)
      ? credentialedFetch(input instanceof Request ? input : url, init)
      : publicFetch(input, init);
  };
  const authFetch: typeof fetch =
    options.guard === false
      ? boundaryFetch
      : createGuardedFetch({
          allowLoopback: allowInsecureLoopback,
          maxBytes: DEFAULT_POD_MAX_BYTES,
          ...options.guard,
          fetch: boundaryFetch,
        });

  return {
    simulated: true as const,
    podBaseUrl,
    authFetch,
    publicFetch,
    get webId() {
      return boundWebId;
    },
    login(webId?: string): Promise<LoginResult> {
      // The pod/fetch binding belongs to THIS persona: a different WebID must not gain
      // its authority (roborev sm-22). Persona switches are a new demoLogin().
      if (webId !== undefined && !sameWebId(webId, personaWebId)) {
        return Promise.reject(
          new Error(
            `demoLogin: this simulated session is bound to ${personaWebId}; ` +
              "construct a new demoLogin to switch personas (the pod binding switches with the identity)",
          ),
        );
      }
      boundWebId = personaWebId;
      emit();
      return Promise.resolve({ webId: boundWebId });
    },
    restore(): Promise<RestoreOutcome> {
      return Promise.resolve(
        boundWebId === null
          ? { outcome: "login" as const }
          : { outcome: "restored" as const, webId: boundWebId },
      );
    },
    logout(): Promise<void> {
      boundWebId = null;
      emit();
      return Promise.resolve();
    },
    onSessionChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
