/**
 * The ONE session shape every solid-kit auth entry point returns (sm-22): a REAL
 * Solid-OIDC session from {@link ../client.js createAuthClient} and a Mode-1 SIMULATED
 * session from {@link ../demo.js demoLogin} present the same surface to UI code, so an
 * app renders either without branching — EXCEPT on {@link AuthSession.simulated}, which
 * the UI MUST surface (decision 0011's honesty rule: simulated login is always disclosed).
 */
import type { LoginResult, RestoreOutcome } from "@jeswr/solid-auth-core";

/** Re-exported so consumers type against solid-kit, not the underlying engine. */
export type { LoginResult, RestoreOutcome };

/**
 * The common session contract. `simulated` discriminates the union: a REAL session is
 * `simulated: false` ({@link RealAuthSession}), a Mode-1 demo session is `simulated: true`
 * ({@link SimulatedAuthSession}) and the UI must say so.
 */
export interface AuthSession {
  /**
   * Decision 0011 honesty flag. `true` = this session was NOT established by real
   * Solid-OIDC (Mode-1 persona binding); every surface rendering data from it MUST show
   * the simulation disclosure. Discriminates {@link RealAuthSession} vs
   * {@link SimulatedAuthSession}.
   */
  readonly simulated: boolean;
  /** The session's WebID, or null when logged out. */
  readonly webId: string | null;
  /**
   * The session-bound fetch for pod/API IO. Real sessions: the engine's DPoP-bound
   * authenticated fetch wrapped in the `@jeswr/guarded-fetch` SSRF guard. Demo sessions:
   * the bound pod fetch behind the same guard (no credentials exist to attach).
   */
  readonly authFetch: typeof fetch;
  /** A credential-free fetch (never carries the session). */
  readonly publicFetch: typeof fetch;
  /** Establish (or re-establish) the session. Resolves with the bound WebID. */
  login(webId?: string): Promise<LoginResult>;
  /** Attempt a silent on-load restore. Fail-closed: errors resolve to `login`. */
  restore(): Promise<RestoreOutcome>;
  /** Tear the session down (real sessions also delete the persisted credential). */
  logout(): Promise<void>;
  /**
   * Subscribe to session changes (login / restore / logout). Returns an unsubscribe
   * function.
   */
  onSessionChange(listener: (session: { webId: string | null }) => void): () => void;
}

/** A session established by real Solid-OIDC (createAuthClient). */
export interface RealAuthSession extends AuthSession {
  readonly simulated: false;
}

/** A Mode-1 simulated session (demoLogin) — the UI must surface the disclosure. */
export interface SimulatedAuthSession extends AuthSession {
  readonly simulated: true;
}
