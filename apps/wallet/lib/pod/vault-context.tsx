"use client";

/**
 * The Data Vault's pod context (decision 0011): mounts the Mode-1 in-browser
 * pod ONCE for the whole app and renders the simulated-login disclosure as a
 * persistent strip the pages cannot omit — the banner lives HERE, above every
 * route, not in any page (decision 0011's "impossible to hide" rule; the
 * session object itself is only constructible under the acknowledgement).
 */
import type { BrowserPodConnection } from "@mortgage/solid-kit/browser-pod";
import { connectRemoteDemoPod, SIMULATED_LOGIN_DISCLOSURE } from "@mortgage/solid-kit/browser-pod";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { discoverSharedDemoPod, setActivePodBase } from "./active-pod";
import { openWalletPod } from "./connect";

/** The local demo server's shared pod when there is one, else the in-browser pod. */
async function openVaultPod(): Promise<BrowserPodConnection> {
  const shared = await discoverSharedDemoPod();
  if (shared === undefined) return openWalletPod();
  setActivePodBase(shared.podBase);
  return connectRemoteDemoPod({
    podBaseUrl: shared.podBase,
    webId: shared.webid,
    displayName: shared.name,
    acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE,
  });
}

/**
 * ONE pod connection per page load, opened lazily and SHARED across effect
 * invocations. React StrictMode double-invokes effects in dev (setup →
 * cleanup → setup); binding the connection to a module-scoped promise (rather
 * than a per-mount ref + cancel flag) means the second setup attaches to the
 * SAME in-flight connection and still applies its result — the earlier bug
 * where cleanup cancelled the only attempt and the retry was suppressed
 * (roborev sm-28 Medium) cannot recur. The shared pod outlives any one tab by
 * design, so there is nothing to tear down.
 */
let sharedPod: Promise<BrowserPodConnection> | undefined;
function connectSharedPod(): Promise<BrowserPodConnection> {
  sharedPod ??= openVaultPod().catch((error: unknown) => {
    // A failed open must not poison the singleton — a later mount may retry.
    sharedPod = undefined;
    throw error;
  });
  return sharedPod;
}

export type VaultState =
  | { readonly status: "booting" }
  | { readonly status: "ready"; readonly connection: BrowserPodConnection }
  | { readonly status: "error"; readonly message: string };

const VaultContext = createContext<VaultState>({ status: "booting" });

export function useVault(): VaultState {
  return useContext(VaultContext);
}

/** The connection when ready, else `undefined` (pages render their own states). */
export function useVaultConnection(): BrowserPodConnection | undefined {
  const vault = useVault();
  return vault.status === "ready" ? vault.connection : undefined;
}

function SimulatedLoginStrip({ state }: { state: VaultState }) {
  return (
    <aside
      aria-label="Simulated session disclosure"
      className="border-amber-300 border-b bg-amber-50 text-amber-950"
      data-simulated-login=""
      data-vault-status={state.status}
    >
      <p className="mx-auto w-full max-w-5xl px-6 py-2 text-xs sm:text-sm">
        <strong>Simulated login.</strong>{" "}
        {state.status === "ready" ? (
          <>
            You are browsing as the demo persona{" "}
            <span data-vault-display-name="">
              {state.connection.displayName ?? state.connection.webId}
            </span>
            .{" "}
            {state.connection.kind === "remote" ? (
              <>
                This is the persona&apos;s pod on your local demo server, shared with every other
                app in the demo; you were signed in automatically and no real personal data is
                involved.
              </>
            ) : (
              <>
                This pod runs entirely inside your browser
                {state.connection.kind === "shared"
                  ? " (one pod, shared across your tabs)"
                  : " (per-tab fallback pod)"}
                ; no real login or real personal data is involved.
              </>
            )}
          </>
        ) : state.status === "booting" ? (
          <>The demo persona&apos;s in-browser pod is starting. No real login is involved.</>
        ) : (
          <>The in-browser demo pod failed to start: {state.message}. No real login is involved.</>
        )}
      </p>
    </aside>
  );
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VaultState>({ status: "booting" });

  useEffect(() => {
    // Attach to the SHARED connection (see connectSharedPod). `active` guards
    // only against a post-UNMOUNT state update; it never suppresses applying
    // the result on a re-mount, because every invocation re-subscribes to the
    // same promise (StrictMode-safe — roborev sm-28 Medium).
    let active = true;
    connectSharedPod().then(
      (connection) => {
        if (active) setState({ status: "ready", connection });
      },
      (error: unknown) => {
        if (active) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <VaultContext.Provider value={state}>
      <SimulatedLoginStrip state={state} />
      {children}
    </VaultContext.Provider>
  );
}
