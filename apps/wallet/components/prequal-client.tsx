"use client";

import { IllustrativeFigure } from "@mortgage/ui";
import { useEffect, useState } from "react";
import { readProofMaterial } from "@/lib/pod/credentials";
import { useVault } from "@/lib/pod/vault-context";
import {
  LENDER_TARGETS,
  type LenderTarget,
  type PresentOutcome,
  presentToLender,
} from "@/lib/prequal/present";

type LenderState =
  | { readonly phase: "idle" }
  | { readonly phase: "running"; readonly stage: string }
  | { readonly phase: "done"; readonly outcome: PresentOutcome }
  | { readonly phase: "failed"; readonly detail: string };

function OutcomeView({ outcome }: { outcome: PresentOutcome }) {
  if (outcome.kind === "qualified") {
    const rate = outcome.rateQuote as
      | { product?: string; interestRatePercent?: number; aprPercent?: number }
      | undefined;
    return (
      <div data-prequal-outcome="qualified">
        <p className="font-semibold text-card-foreground text-sm">Qualified — values undisclosed</p>
        {outcome.proofs.map((proof) => (
          <p className="mt-1 text-muted-foreground text-xs" key={proof.statementId}>
            {proof.statementId}: {proof.member} proof in {Math.round(proof.proveMs)} ms (
            {proof.threads} {proof.threads === 1 ? "thread" : "threads"})
          </p>
        ))}
        {rate?.interestRatePercent !== undefined && (
          <p className="mt-2 text-sm">
            <IllustrativeFigure>
              {rate.product ?? "rate quote"}: {rate.interestRatePercent}%
              {rate.aprPercent !== undefined ? ` (${rate.aprPercent}% APR)` : ""}
            </IllustrativeFigure>
          </p>
        )}
      </div>
    );
  }
  if (outcome.kind === "unauthenticated") {
    return (
      <div data-prequal-outcome="unauthenticated">
        <p className="font-semibold text-card-foreground text-sm">
          Live lender rail requires a real login
        </p>
        <p className="mt-1 text-muted-foreground text-xs">{outcome.detail}</p>
      </div>
    );
  }
  if (outcome.kind === "rejected") {
    return (
      <div data-prequal-outcome="rejected">
        <p className="font-semibold text-card-foreground text-sm">Not qualified</p>
        <p className="mt-1 text-muted-foreground text-xs">{outcome.detail}</p>
      </div>
    );
  }
  return (
    <div data-prequal-outcome="unavailable">
      <p className="font-semibold text-card-foreground text-sm">Lender unavailable</p>
      <p className="mt-1 text-muted-foreground text-xs">{outcome.detail}</p>
    </div>
  );
}

const STAGE_LABELS: Record<string, string> = {
  challenge: "requesting single-use challenge nonces…",
  "prove:income": "proving income threshold in your browser…",
  "prove:score": "proving credit-score threshold in your browser…",
  verify: "presenting proofs (VP-POST)…",
};

export function PrequalClient() {
  const vault = useVault();
  const [states, setStates] = useState<Record<string, LenderState>>(
    Object.fromEntries(LENDER_TARGETS.map((lender) => [lender.id, { phase: "idle" }])),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Pay the prover cold start on mount, not on the first click (UX only).
    void import("@mortgage/vc-kit").then(({ prewarmProver }) => prewarmProver()).catch(() => {});
  }, []);

  const setLenderState = (id: string, state: LenderState) =>
    setStates((previous) => ({ ...previous, [id]: state }));

  async function run(lender: LenderTarget): Promise<void> {
    if (vault.status !== "ready") return;
    const session = vault.connection.session;
    setLenderState(lender.id, { phase: "running", stage: "challenge" });
    try {
      const material = await readProofMaterial(session.authFetch);
      const outcome = await presentToLender({
        lender,
        anchors: material.anchors,
        hiddenValues: material.hiddenValues,
        // Same-origin zone calls ride the session's public fetch: the lender
        // apps are OTHER zones on the shared domain, outside the pod boundary.
        fetch: session.publicFetch,
        onStage: (stage) => setLenderState(lender.id, { phase: "running", stage }),
      });
      setLenderState(lender.id, { phase: "done", outcome });
    } catch (error) {
      setLenderState(lender.id, {
        phase: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function runAll(): Promise<void> {
    setBusy(true);
    try {
      // Sequential: the two flows share one wasm prover instance.
      for (const lender of LENDER_TARGETS) await run(lender);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="present-heading" className="mt-8">
      <h2 className="text-xl font-semibold text-foreground" id="present-heading">
        Present to both lenders
      </h2>
      <button
        className="mt-3 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm disabled:opacity-50"
        data-prequal-run=""
        disabled={busy || vault.status !== "ready"}
        onClick={() => void runAll()}
        type="button"
      >
        {vault.status === "ready"
          ? busy
            ? "Proving…"
            : "Prove income ≥ threshold and score ≥ 620"
          : "Waiting for the in-browser pod…"}
      </button>
      <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
        {LENDER_TARGETS.map((lender) => {
          const state = states[lender.id] ?? { phase: "idle" as const };
          return (
            <li
              className="rounded-lg border border-border bg-card p-4"
              data-prequal-lender={lender.id}
              key={lender.id}
            >
              <p className="text-muted-foreground text-sm">{lender.label}</p>
              <div className="mt-2" data-prequal-phase={state.phase}>
                {state.phase === "idle" && (
                  <p className="text-muted-foreground text-sm">Not yet presented.</p>
                )}
                {state.phase === "running" && (
                  <p aria-live="polite" className="text-muted-foreground text-sm">
                    {STAGE_LABELS[state.stage] ?? state.stage}
                  </p>
                )}
                {state.phase === "done" && <OutcomeView outcome={state.outcome} />}
                {state.phase === "failed" && (
                  <p className="text-muted-foreground text-sm" role="alert">
                    Presentation failed: {state.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
