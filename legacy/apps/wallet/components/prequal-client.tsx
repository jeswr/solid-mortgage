"use client";

import { IllustrativeFigure } from "@mortgage/ui";
import { useEffect, useState } from "react";
import { readProofMaterial } from "@/lib/pod/credentials";
import { useVault } from "@/lib/pod/vault-context";
import {
  describeOutcome,
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
  const { title, detail } = describeOutcome(outcome);
  const rate =
    outcome.kind === "qualified"
      ? (outcome.rateQuote as
          | { product?: string; interestRatePercent?: number; aprPercent?: number }
          | undefined)
      : undefined;
  return (
    <div data-prequal-outcome={outcome.kind}>
      <p className="font-semibold text-card-foreground text-sm">{title}</p>
      {detail !== undefined && <p className="mt-1 text-muted-foreground text-xs">{detail}</p>}
      {outcome.kind === "qualified" && (
        <p className="mt-1 text-muted-foreground text-xs">
          {outcome.proofs.length} proofs sent. Exact figures are not sent directly.
        </p>
      )}
      {rate?.interestRatePercent !== undefined && (
        <p className="mt-2 text-sm">
          <IllustrativeFigure>
            {rate.product ?? "Rate quote"}: {rate.interestRatePercent}%
            {rate.aprPercent !== undefined ? ` (${rate.aprPercent}% APR)` : ""}
          </IllustrativeFigure>
        </p>
      )}
    </div>
  );
}

const STAGE_LABELS: Record<string, string> = {
  challenge: "Getting a challenge from the lender…",
  "prove:income": "Building the income proof in this browser…",
  "prove:score": "Building the credit-score proof in this browser…",
  verify: "Sending the proofs…",
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

  const done = Object.values(states).filter((state) => state.phase === "done");
  const anyDone = done.length > 0;
  const anyQuote = done.some(
    (state) => state.phase === "done" && state.outcome.kind === "qualified",
  );

  return (
    <section aria-labelledby="present-heading" className="mt-8">
      <h2 className="text-xl font-semibold text-foreground" id="present-heading">
        Send proofs to both lenders
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
            ? "Building proofs…"
            : "Send proofs"
          : "Starting the demo pod…"}
      </button>
      {anyQuote && (
        <p className="mt-4 text-muted-foreground text-sm" data-prequal-quote-notice="">
          Your actual rate, payment, and costs could be higher. Get an official Loan Estimate before
          choosing a loan.
        </p>
      )}
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
                  <p className="text-muted-foreground text-sm">No proofs sent yet.</p>
                )}
                {state.phase === "running" && (
                  <p aria-live="polite" className="text-muted-foreground text-sm">
                    {STAGE_LABELS[state.stage] ?? state.stage}
                  </p>
                )}
                {state.phase === "done" && <OutcomeView outcome={state.outcome} />}
                {state.phase === "failed" && (
                  <p className="text-muted-foreground text-sm" role="alert">
                    We could not send the proofs: {state.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {anyDone && (
        <p className="mt-3 text-muted-foreground text-xs">
          Prequalification is not credit approval or a commitment to lend.
        </p>
      )}
    </section>
  );
}
