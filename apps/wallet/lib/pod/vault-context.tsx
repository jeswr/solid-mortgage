"use client";

/**
 * The Data Vault's pod context (decision 0011): mounts the Mode-1 in-browser
 * pod ONCE for the whole app and renders the simulated-login disclosure as a
 * persistent strip the pages cannot omit — the banner lives HERE, above every
 * route, not in any page (decision 0011's "impossible to hide" rule; the
 * session object itself is only constructible under the acknowledgement).
 */
import type { BrowserPodConnection } from "@mortgage/solid-kit/browser-pod";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { openWalletPod } from "./connect";

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
            . This pod runs entirely inside your browser
            {state.connection.kind === "shared"
              ? " (one pod, shared across your tabs)"
              : " (per-tab fallback pod)"}
            ; no real login or real personal data is involved.
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
  const opened = useRef(false);

  useEffect(() => {
    // React 18/19 dev StrictMode double-invokes effects; a SharedWorker
    // connection is per-visitor state we open exactly once and never tear
    // down for the page's lifetime (the shared pod outlives any one tab).
    if (opened.current) return;
    opened.current = true;
    let cancelled = false;
    openWalletPod().then(
      (connection) => {
        if (!cancelled) setState({ status: "ready", connection });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <VaultContext.Provider value={state}>
      <SimulatedLoginStrip state={state} />
      {children}
    </VaultContext.Provider>
  );
}
