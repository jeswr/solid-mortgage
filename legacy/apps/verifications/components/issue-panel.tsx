"use client";

/**
 * The live issue/re-issue panel for one issuer flow. Calls the app's Mode-2
 * rail (`/api/issue`, `/api/reissue`), which requires a REAL DPoP-bound
 * Solid-OIDC session and a borrower grant naming this app's service identity.
 * Without one the rail answers 401 and this panel says nothing was issued — it
 * never fakes a success (the disclosed-simulation posture of decision 0015).
 */
import { useCallback, useState } from "react";
import { BASE_PATH } from "@/lib/paths";

interface IssuedSummary {
  id: string;
  kind: string;
  validFrom: string;
  validUntil?: string;
  statusListCredential: string;
  statusListIndex?: string;
}

interface RailResult {
  simulated?: boolean;
  credential?: IssuedSummary;
  anchor?: IssuedSummary | null;
  revokedIndex?: number;
  newIndex?: number;
  error?: string;
  detail?: string;
}

type PanelState =
  | { phase: "idle" }
  | { phase: "busy"; action: string }
  | { phase: "done"; action: string; result: RailResult }
  | { phase: "failed"; action: string; status: number; result: RailResult };

export interface IssuePanelProps {
  flow: string;
  reissueHint: string;
}

export function IssuePanel({ flow, reissueHint }: IssuePanelProps) {
  const [state, setState] = useState<PanelState>({ phase: "idle" });

  const call = useCallback(
    async (action: "issue" | "reissue") => {
      setState({ action, phase: "busy" });
      try {
        const response = await fetch(`${BASE_PATH}/api/${action}`, {
          body: JSON.stringify({ flow }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const result = (await response.json().catch(() => ({}))) as RailResult;
        setState(
          response.ok
            ? { action, phase: "done", result }
            : { action, phase: "failed", result, status: response.status },
        );
      } catch {
        setState({ action, phase: "failed", result: {}, status: 0 });
      }
    },
    [flow],
  );

  return (
    <section
      aria-labelledby={`${flow}-panel`}
      className="rounded-lg border border-border bg-card p-6"
    >
      <h2 className="font-semibold text-xl" id={`${flow}-panel`}>
        Issue the credential
      </h2>
      <p className="mt-2 text-muted-foreground text-sm">{reissueHint}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-md px-4 py-2 font-medium text-sm disabled:opacity-60"
          disabled={state.phase === "busy"}
          onClick={() => call("issue")}
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          type="button"
        >
          {state.phase === "busy" && state.action === "issue" ? "Issuing…" : "Issue credential"}
        </button>
        <button
          className="rounded-md border border-border px-4 py-2 font-medium text-sm disabled:opacity-60"
          disabled={state.phase === "busy"}
          onClick={() => call("reissue")}
          type="button"
        >
          {state.phase === "busy" && state.action === "reissue"
            ? "Issuing replacement…"
            : "Issue replacement credential"}
        </button>
      </div>
      <div aria-live="polite" className="mt-4 text-sm">
        {state.phase === "done" && (
          <div data-panel-outcome="ok">
            <p className="font-medium" style={{ color: "var(--primary)" }}>
              {state.action === "issue"
                ? "Credential saved in Alex's pod."
                : "Replacement saved; the previous credential is revoked."}
            </p>
            {state.result.credential !== undefined && (
              <>
                <p className="mt-2 text-muted-foreground">
                  Valid from {state.result.credential.validFrom} to{" "}
                  {state.result.credential.validUntil}
                </p>
                <details className="mt-2 text-muted-foreground text-xs" data-panel-technical="">
                  <summary className="cursor-pointer">Technical details</summary>
                  <ul className="mt-1 list-none space-y-1 p-0 break-all">
                    <li>
                      Credential: <code>{state.result.credential.id}</code>
                    </li>
                    {state.result.anchor != null && (
                      <li>
                        Issuer-signed value encoding: <code>{state.result.anchor.id}</code>
                      </li>
                    )}
                    {state.result.revokedIndex !== undefined && (
                      <li>
                        Previous credential revoked on the status list (entry{" "}
                        {state.result.revokedIndex}). New entry: {state.result.newIndex}.
                      </li>
                    )}
                  </ul>
                </details>
              </>
            )}
          </div>
        )}
        {state.phase === "failed" && (
          <p className="text-muted-foreground" data-panel-outcome="failed">
            {state.status === 401
              ? "Sign-in is simulated here, so nothing was issued. Issuing needs a real Solid sign-in and Alex's permission for this provider."
              : `The request was refused (${state.status || "network error"}${
                  state.result.error !== undefined ? `: ${state.result.error}` : ""
                }). ${state.result.detail ?? ""}`}
          </p>
        )}
      </div>
    </section>
  );
}
